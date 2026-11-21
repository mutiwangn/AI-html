#include <Arduino.h>
#include <DNSServer.h>
#include <ESPmDNS.h>
#include <FS.h>
#include <LittleFS.h>
#include <Preferences.h>
#include <WebServer.h>
#include <WiFi.h>
#include <esp_system.h>

#include "app_config.h"
#include "epd_ssd2677_tb.h"
#include "web_ui.h"

namespace {

using muti::config::kFrameBytes;

struct DeviceSettings {
  uint32_t version = muti::config::kSettingsVersion;
  String deviceName = "Muti 10.2 四色";
  String apName = muti::config::kDefaultApName;
  String staSsid;
  String staPassword;
};

enum class NetworkState {
  Booting,
  StaConnecting,
  StaOnline,
  ApPortal,
};

enum class PendingNetworkAction {
  None,
  StartSta,
  StartAp,
};

struct UploadState {
  File file;
  size_t bytes = 0;
  uint32_t crc = 0;
  uint32_t browserCrc = 0;
  bool browserCrcPresent = false;
  bool started = false;
  bool completed = false;
  bool failed = false;
  String error;
};

struct DisplayState {
  bool pending = false;
  bool displaying = false;
  uint32_t queuedAtMs = 0;
  uint32_t lastRefreshAtMs = 0;
  uint32_t storedFrameCrc = 0;
  uint32_t displayedFrameCrc = 0;
  uint32_t lastRefreshDurationMs = 0;
  bool lastRefreshSuccess = false;
  String message = "等待操作";
};

Preferences preferences;
WebServer server(muti::config::kWebPort);
DNSServer dnsServer;
muti::EpdSsd2677Tb epd;
DeviceSettings settings;
UploadState uploadState;
DisplayState displayState;
NetworkState networkState = NetworkState::Booting;
String hostname = muti::config::kMdnsHostname;
String scanCacheJson = "[]";
bool scanActive = false;
bool scanStartedFromAp = false;
bool apReady = false;
PendingNetworkAction pendingNetworkAction = PendingNetworkAction::None;
uint32_t pendingNetworkActionAtMs = 0;
bool storageMounted = false;
bool storageFormattedOnBoot = false;
String storagePartitionLabel;
String storageError;
uint32_t networkStateStartedAtMs = 0;
uint32_t restartAtMs = 0;
uint32_t lastNetworkTickMs = 0;

uint32_t crc32Update(uint32_t crc, const uint8_t* data, size_t length) {
  crc = ~crc;
  for (size_t i = 0; i < length; ++i) {
    crc ^= data[i];
    for (uint8_t bit = 0; bit < 8; ++bit) {
      crc = (crc >> 1U) ^ (0xEDB88320UL & static_cast<uint32_t>(-(static_cast<int32_t>(crc & 1U))));
    }
  }
  return ~crc;
}

String hex32(uint32_t value) {
  char buffer[9];
  snprintf(buffer, sizeof(buffer), "%08lX", static_cast<unsigned long>(value));
  return String(buffer);
}

bool parseHex32(const String& text, uint32_t& value) {
  if (text.length() != 8) {
    return false;
  }
  char* end = nullptr;
  const unsigned long parsed = strtoul(text.c_str(), &end, 16);
  if (end == nullptr || *end != '\0') {
    return false;
  }
  value = static_cast<uint32_t>(parsed);
  return true;
}

String jsonEscape(const String& input) {
  String out;
  out.reserve(input.length() + 16);
  for (size_t i = 0; i < input.length(); ++i) {
    const char c = input[i];
    switch (c) {
      case '\\': out += F("\\\\"); break;
      case '"': out += F("\\\""); break;
      case '\n': out += F("\\n"); break;
      case '\r': out += F("\\r"); break;
      case '\t': out += F("\\t"); break;
      default:
        if (static_cast<uint8_t>(c) < 0x20) {
          char escaped[7];
          snprintf(escaped, sizeof(escaped), "\\u%04X", static_cast<unsigned>(static_cast<uint8_t>(c)));
          out += escaped;
        } else {
          out += c;
        }
    }
  }
  return out;
}

String boolJson(bool value) {
  return value ? F("true") : F("false");
}

String networkStateName() {
  switch (networkState) {
    case NetworkState::StaConnecting: return F("sta_connecting");
    case NetworkState::StaOnline: return F("sta");
    case NetworkState::ApPortal: return F("ap");
    default: return F("booting");
  }
}

String currentIp() {
  if (networkState == NetworkState::StaOnline || networkState == NetworkState::StaConnecting) {
    return WiFi.localIP().toString();
  }
  if (networkState == NetworkState::ApPortal) {
    return WiFi.softAPIP().toString();
  }
  return F("0.0.0.0");
}

uint32_t cooldownRemainingMs() {
  if (displayState.lastRefreshAtMs == 0) {
    return 0;
  }
  const uint32_t elapsed = millis() - displayState.lastRefreshAtMs;
  return elapsed >= muti::config::kRefreshCooldownMs ? 0 : muti::config::kRefreshCooldownMs - elapsed;
}

uint32_t crcFile(const char* path, size_t* sizeOut = nullptr) {
  if (!storageMounted) {
    if (sizeOut) *sizeOut = 0;
    return 0;
  }
  File file = LittleFS.open(path, FILE_READ);
  if (!file) {
    if (sizeOut) *sizeOut = 0;
    return 0;
  }
  uint8_t buffer[1024];
  uint32_t crc = 0;
  size_t total = 0;
  while (file.available()) {
    const size_t count = file.read(buffer, sizeof(buffer));
    if (count == 0) break;
    crc = crc32Update(crc, buffer, count);
    total += count;
    yield();
  }
  file.close();
  if (sizeOut) *sizeOut = total;
  return total == 0 ? 0 : crc;
}

void saveSettings() {
  preferences.begin(muti::config::kPreferencesNamespace, false);
  preferences.putUInt("cfgVersion", settings.version);
  preferences.putString("deviceName", settings.deviceName);
  preferences.putString("apName", settings.apName);
  preferences.putString("staSsid", settings.staSsid);
  preferences.putString("staPass", settings.staPassword);
  preferences.end();
}

void loadSettings() {
  preferences.begin(muti::config::kPreferencesNamespace, false);
  settings.version = preferences.getUInt("cfgVersion", 1);
  settings.deviceName = preferences.getString("deviceName", "Muti 10.2 四色");
  settings.apName = preferences.getString("apName", muti::config::kDefaultApName);
  settings.staSsid = preferences.getString("staSsid", "");
  settings.staPassword = preferences.getString("staPass", "");

  bool migratedLegacyWifi = false;
  if (settings.staSsid.isEmpty()) {
    const String legacySsid = preferences.getString("ssid", "");
    if (!legacySsid.isEmpty()) {
      settings.staSsid = legacySsid;
      migratedLegacyWifi = true;
    }
  }
  if (settings.staPassword.isEmpty()) {
    settings.staPassword = preferences.getString("staPassword", "");
  }
  if (settings.staPassword.isEmpty()) {
    const String legacyPassword = preferences.getString("pass", "");
    if (!legacyPassword.isEmpty()) {
      settings.staPassword = legacyPassword;
      migratedLegacyWifi = true;
    }
  }

  displayState.displayedFrameCrc = preferences.getUInt("shownCrc", 0);
  settings.version = muti::config::kSettingsVersion;
  preferences.putUInt("cfgVersion", settings.version);
  preferences.putString("staSsid", settings.staSsid);
  preferences.putString("staPass", settings.staPassword);
  preferences.end();
  if (migratedLegacyWifi) {
    Serial.printf("[NVS] migrated legacy Wi-Fi keys for SSID=%s\n", settings.staSsid.c_str());
  }

  settings.deviceName.trim();
  settings.apName.trim();
  if (settings.deviceName.isEmpty()) settings.deviceName = "Muti 10.2 四色";
  if (settings.apName.isEmpty()) settings.apName = muti::config::kDefaultApName;
  if (settings.apName.length() > 31) settings.apName.remove(31);
}

void saveDisplayedCrc(uint32_t crc) {
  preferences.begin(muti::config::kPreferencesNamespace, false);
  preferences.putUInt("shownCrc", crc);
  preferences.end();
}

String makeHostname() {
  return String(muti::config::kMdnsHostname);
}

void stopMdns() {
  MDNS.end();
}

void startMdns() {
  stopMdns();
  if (MDNS.begin(hostname.c_str())) {
    MDNS.addService("http", "tcp", muti::config::kWebPort);
    Serial.printf("[NET] mDNS: http://%s.local/\n", hostname.c_str());
  } else {
    Serial.println(F("[NET] mDNS start failed; use the numeric IP address"));
  }
}

String pendingNetworkActionName() {
  switch (pendingNetworkAction) {
    case PendingNetworkAction::StartSta: return F("start_sta");
    case PendingNetworkAction::StartAp: return F("start_ap");
    default: return F("none");
  }
}

void scheduleNetworkAction(PendingNetworkAction action, uint32_t delayMs) {
  pendingNetworkAction = action;
  pendingNetworkActionAtMs = millis() + delayMs;
}

void startApPortal() {
  Serial.printf("[NET] starting AP-only: %s\n", settings.apName.c_str());
  stopMdns();
  dnsServer.stop();
  pendingNetworkAction = PendingNetworkAction::None;
  apReady = false;
  WiFi.softAPdisconnect(true);
  WiFi.disconnect(true, false);
  WiFi.mode(WIFI_OFF);
  delay(120);

  const IPAddress apIp(192, 168, 4, 1);
  const IPAddress subnet(255, 255, 255, 0);
  bool ok = false;
  for (uint8_t attempt = 1; attempt <= 3 && !ok; ++attempt) {
    WiFi.mode(WIFI_AP);
    WiFi.setSleep(false);
    const bool configured = WiFi.softAPConfig(apIp, apIp, subnet);
    ok = configured && WiFi.softAP(settings.apName.c_str(), nullptr, muti::config::kApChannel, false,
                                   muti::config::kApMaxClients);
    Serial.printf("[NET] AP attempt %u configured=%s started=%s\n", attempt,
                  configured ? "yes" : "no", ok ? "yes" : "no");
    if (!ok) {
      WiFi.softAPdisconnect(true);
      WiFi.mode(WIFI_OFF);
      delay(220);
    }
  }

  networkState = NetworkState::ApPortal;
  networkStateStartedAtMs = millis();
  apReady = ok;
  if (ok) {
    dnsServer.start(53, "*", WiFi.softAPIP());
    startMdns();
    Serial.printf("[NET] AP ready: %s IP=%s mDNS=http://%s.local/\n", settings.apName.c_str(),
                  WiFi.softAPIP().toString().c_str(), hostname.c_str());
  } else if (!settings.staSsid.isEmpty()) {
    Serial.println(F("[NET][ERROR] AP start failed; retrying saved STA"));
    scheduleNetworkAction(PendingNetworkAction::StartSta, 300);
  } else {
    Serial.println(F("[NET][ERROR] AP start failed; restart device to retry"));
  }
}

void startStaConnection() {
  if (settings.staSsid.isEmpty()) {
    startApPortal();
    return;
  }
  Serial.printf("[NET] starting STA-only: %s\n", settings.staSsid.c_str());
  pendingNetworkAction = PendingNetworkAction::None;
  apReady = false;
  stopMdns();
  dnsServer.stop();
  WiFi.softAPdisconnect(true);
  WiFi.disconnect(true, false);
  delay(50);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.persistent(false);
  WiFi.begin(settings.staSsid.c_str(), settings.staPassword.c_str());
  networkState = NetworkState::StaConnecting;
  networkStateStartedAtMs = millis();
}

void manageNetwork() {
  if (millis() - lastNetworkTickMs < muti::config::kNetworkTickMs) return;
  lastNetworkTickMs = millis();

  if (pendingNetworkAction != PendingNetworkAction::None &&
      static_cast<int32_t>(millis() - pendingNetworkActionAtMs) >= 0 && !displayState.displaying) {
    const PendingNetworkAction action = pendingNetworkAction;
    pendingNetworkAction = PendingNetworkAction::None;
    if (action == PendingNetworkAction::StartSta) startStaConnection();
    else if (action == PendingNetworkAction::StartAp) startApPortal();
    return;
  }

  if (networkState == NetworkState::ApPortal && apReady) {
    dnsServer.processNextRequest();
  }

  if (networkState == NetworkState::StaConnecting) {
    if (WiFi.status() == WL_CONNECTED) {
      networkState = NetworkState::StaOnline;
      networkStateStartedAtMs = millis();
      startMdns();
      Serial.printf("[NET] STA connected: %s IP=%s RSSI=%d\n", settings.staSsid.c_str(),
                    WiFi.localIP().toString().c_str(), WiFi.RSSI());
    } else if (millis() - networkStateStartedAtMs >= muti::config::kStaConnectTimeoutMs) {
      Serial.printf("[NET] STA timeout (%d); falling back to AP-only\n", static_cast<int>(WiFi.status()));
      startApPortal();
    }
  } else if (networkState == NetworkState::StaOnline && WiFi.status() != WL_CONNECTED) {
    Serial.println(F("[NET] STA disconnected; retrying in STA-only mode"));
    WiFi.reconnect();
    networkState = NetworkState::StaConnecting;
    networkStateStartedAtMs = millis() -
        (muti::config::kStaConnectTimeoutMs > muti::config::kStaReconnectWindowMs
             ? muti::config::kStaConnectTimeoutMs - muti::config::kStaReconnectWindowMs
             : 0);
  }

  if (scanActive) {
    const int result = WiFi.scanComplete();
    if (result >= 0) {
      String json = "[";
      for (int i = 0; i < result; ++i) {
        if (i) json += ',';
        json += F("{\"ssid\":\"");
        json += jsonEscape(WiFi.SSID(i));
        json += F("\",\"rssi\":");
        json += WiFi.RSSI(i);
        json += F(",\"channel\":");
        json += WiFi.channel(i);
        json += F(",\"secure\":");
        json += boolJson(WiFi.encryptionType(i) != WIFI_AUTH_OPEN);
        json += '}';
      }
      json += ']';
      scanCacheJson = json;
      WiFi.scanDelete();
      scanActive = false;
      if (scanStartedFromAp) {
        WiFi.mode(WIFI_AP);
        scanStartedFromAp = false;
      }
      Serial.printf("[NET] scan complete: %d networks\n", result);
    } else if (result == WIFI_SCAN_FAILED) {
      scanActive = false;
      scanCacheJson = "[]";
      if (scanStartedFromAp) {
        WiFi.mode(WIFI_AP);
        scanStartedFromAp = false;
      }
      Serial.println(F("[NET] scan failed"));
    }
  }
}

bool startWifiScan() {
  if (scanActive || displayState.displaying) return false;
  WiFi.scanDelete();
  scanStartedFromAp = networkState == NetworkState::ApPortal;
  if (scanStartedFromAp) {
    WiFi.mode(WIFI_AP_STA);  // temporary only; AP remains available during scan
  }
  const int rc = WiFi.scanNetworks(true, true, false, 250);
  scanActive = rc == WIFI_SCAN_RUNNING;
  if (!scanActive && scanStartedFromAp) {
    WiFi.mode(WIFI_AP);
    scanStartedFromAp = false;
  }
  return scanActive;
}

bool atomicInstallTempFrame() {
  if (!storageMounted) return false;
  LittleFS.remove(muti::config::kFrameBackupPath);
  const bool hadCurrent = LittleFS.exists(muti::config::kFramePath);
  if (hadCurrent && !LittleFS.rename(muti::config::kFramePath, muti::config::kFrameBackupPath)) {
    return false;
  }
  if (!LittleFS.rename(muti::config::kUploadTempPath, muti::config::kFramePath)) {
    if (hadCurrent) LittleFS.rename(muti::config::kFrameBackupPath, muti::config::kFramePath);
    return false;
  }
  LittleFS.remove(muti::config::kFrameBackupPath);
  return true;
}

void resetUploadState() {
  if (uploadState.file) uploadState.file.close();
  uploadState = UploadState{};
}

void handleUploadChunk() {
  HTTPUpload& upload = server.upload();
  switch (upload.status) {
    case UPLOAD_FILE_START: {
      resetUploadState();
      uploadState.started = true;
      uint32_t browserCrc = 0;
      uploadState.browserCrcPresent = parseHex32(server.header("X-Frame-CRC32"), browserCrc);
      uploadState.browserCrc = browserCrc;
      if (!storageMounted) {
        uploadState.failed = true;
        uploadState.error = storageError.isEmpty() ? "LittleFS未挂载" : storageError;
        break;
      }
      LittleFS.remove(muti::config::kUploadTempPath);
      uploadState.file = LittleFS.open(muti::config::kUploadTempPath, FILE_WRITE);
      if (!uploadState.file) {
        uploadState.failed = true;
        uploadState.error = String("无法创建 /upload.tmp；LittleFS mounted=") + (storageMounted ? "true" : "false") +
                            " label=" + storagePartitionLabel +
                            " total=" + LittleFS.totalBytes() + " used=" + LittleFS.usedBytes();
      }
      break;
    }
    case UPLOAD_FILE_WRITE:
      if (!uploadState.failed) {
        if (uploadState.bytes + upload.currentSize > kFrameBytes) {
          uploadState.failed = true;
          uploadState.error = "上传长度超过153600字节";
        } else {
          const size_t written = uploadState.file.write(upload.buf, upload.currentSize);
          if (written != upload.currentSize) {
            uploadState.failed = true;
            uploadState.error = "LittleFS写入失败";
          } else {
            uploadState.crc = crc32Update(uploadState.crc, upload.buf, upload.currentSize);
            uploadState.bytes += upload.currentSize;
          }
        }
      }
      break;
    case UPLOAD_FILE_END:
      if (uploadState.file) uploadState.file.close();
      uploadState.completed = true;
      break;
    case UPLOAD_FILE_ABORTED:
      if (uploadState.file) uploadState.file.close();
      uploadState.failed = true;
      uploadState.completed = true;
      uploadState.error = "上传被中止";
      if (storageMounted) LittleFS.remove(muti::config::kUploadTempPath);
      break;
    default:
      break;
  }
}

void sendJson(int statusCode, const String& body) {
  server.sendHeader("Cache-Control", "no-store");
  server.send(statusCode, "application/json; charset=utf-8", body);
}

void handleUploadComplete() {
  if (!uploadState.started || !uploadState.completed) {
    sendJson(400, F("{\"ok\":false,\"error\":\"上传状态不完整\"}"));
    resetUploadState();
    return;
  }
  if (uploadState.failed || uploadState.bytes != kFrameBytes) {
    if (storageMounted) LittleFS.remove(muti::config::kUploadTempPath);
    String error = uploadState.failed ? uploadState.error : String("帧长度为") + uploadState.bytes + "，必须为153600";
    sendJson(400, String("{\"ok\":false,\"error\":\"") + jsonEscape(error) + "\"}");
    resetUploadState();
    return;
  }
  if (uploadState.browserCrcPresent && uploadState.browserCrc != uploadState.crc) {
    if (storageMounted) LittleFS.remove(muti::config::kUploadTempPath);
    String body = String("{\"ok\":false,\"error\":\"浏览器CRC与设备CRC不一致\",\"browserCrc32\":\"") +
                  hex32(uploadState.browserCrc) + "\",\"deviceCrc32\":\"" + hex32(uploadState.crc) + "\"}";
    sendJson(422, body);
    resetUploadState();
    return;
  }

  const uint32_t newCrc = uploadState.crc;
  if (!atomicInstallTempFrame()) {
    if (storageMounted) LittleFS.remove(muti::config::kUploadTempPath);
    sendJson(500, F("{\"ok\":false,\"error\":\"无法原子替换frame.bin\"}"));
    resetUploadState();
    return;
  }

  displayState.storedFrameCrc = newCrc;
  const bool sameAsDisplayed = displayState.displayedFrameCrc != 0 && newCrc == displayState.displayedFrameCrc;
  if (!sameAsDisplayed) {
    displayState.pending = true;
    displayState.queuedAtMs = millis();
    displayState.message = cooldownRemainingMs() ? "画面已保存，等待冷却后刷新" : "画面已保存，等待刷新";
  } else {
    displayState.pending = false;
    displayState.message = "相同画面，已跳过刷新";
  }

  String body;
  body.reserve(220);
  body += F("{\"ok\":true,\"bytes\":153600,\"crc32\":\"");
  body += hex32(newCrc);
  body += F("\",\"queued\":");
  body += boolJson(!sameAsDisplayed);
  body += F(",\"sameFrame\":");
  body += boolJson(sameAsDisplayed);
  body += F(",\"cooldownRemainingMs\":");
  body += cooldownRemainingMs();
  body += '}';
  sendJson(200, body);
  resetUploadState();
}

uint8_t packedByte(uint8_t a, uint8_t b, uint8_t c, uint8_t d) {
  return static_cast<uint8_t>((a << 6U) | (b << 4U) | (c << 2U) | d);
}

void setPackedPixel(uint8_t* row, uint16_t x, uint8_t code) {
  const uint16_t byteIndex = x >> 2U;
  const uint8_t shift = 6U - static_cast<uint8_t>((x & 3U) * 2U);
  row[byteIndex] = static_cast<uint8_t>((row[byteIndex] & ~(0x03U << shift)) | ((code & 0x03U) << shift));
}

enum class PatternKind { Raw, Palette, Gray16, White };

bool generatePattern(PatternKind kind, uint32_t& crcOut) {
  if (!storageMounted) return false;
  LittleFS.remove(muti::config::kUploadTempPath);
  File file = LittleFS.open(muti::config::kUploadTempPath, FILE_WRITE);
  if (!file) return false;

  static constexpr uint8_t bayer4[4][4] = {
      {0, 8, 2, 10}, {12, 4, 14, 6}, {3, 11, 1, 9}, {15, 7, 13, 5}};
  uint8_t row[muti::config::kRowBytes];
  uint32_t crc = 0;

  for (uint16_t y = 0; y < muti::config::kDisplayHeight; ++y) {
    memset(row, 0x55, sizeof(row));  // white code 1
    for (uint16_t x = 0; x < muti::config::kDisplayWidth; ++x) {
      uint8_t code = muti::config::kLogicalWhite;
      if (kind == PatternKind::White) {
        code = muti::config::kLogicalWhite;
      } else if (kind == PatternKind::Raw) {
        code = static_cast<uint8_t>((x / (muti::config::kDisplayWidth / 4)) > 3 ? 3 : (x / (muti::config::kDisplayWidth / 4)));
      } else if (kind == PatternKind::Palette) {
        const bool top = y < muti::config::kDisplayHeight / 2;
        const bool left = x < muti::config::kDisplayWidth / 2;
        code = top ? (left ? 0 : 1) : (left ? 2 : 3);
        const uint16_t border = 12;
        if (x < border || y < border || x >= muti::config::kDisplayWidth - border ||
            y >= muti::config::kDisplayHeight - border) {
          code = muti::config::kLogicalWhite;
        }
      } else if (kind == PatternKind::Gray16) {
        const uint8_t rawLevel = static_cast<uint8_t>(x / (muti::config::kDisplayWidth / 16));
        const uint8_t level = rawLevel > 15 ? 15 : rawLevel;
        const uint8_t blackCells = static_cast<uint8_t>((static_cast<uint16_t>(level) * 16U + 7U) / 15U);
        code = bayer4[y & 3U][x & 3U] < blackCells ? muti::config::kLogicalBlack
                                                   : muti::config::kLogicalWhite;
      }
      setPackedPixel(row, x, code);
    }
    if (file.write(row, sizeof(row)) != sizeof(row)) {
      file.close();
      LittleFS.remove(muti::config::kUploadTempPath);
      return false;
    }
    crc = crc32Update(crc, row, sizeof(row));
    yield();
  }
  file.close();
  if (!atomicInstallTempFrame()) return false;
  crcOut = crc;
  displayState.storedFrameCrc = crc;
  displayState.pending = displayState.displayedFrameCrc != crc;
  displayState.queuedAtMs = millis();
  displayState.message = displayState.pending ? "测试图已生成，等待刷新" : "测试图与已显示画面相同";
  return true;
}

void processPendingDisplay() {
  if (!displayState.pending || displayState.displaying || epd.faultLatched()) return;
  if (!storageMounted) {
    displayState.pending = false;
    displayState.message = storageError.isEmpty() ? "LittleFS未挂载，无法刷新" : storageError;
    return;
  }
  if (millis() - displayState.queuedAtMs < muti::config::kRefreshQueueDelayMs) return;
  if (cooldownRemainingMs() != 0) return;
  if (!LittleFS.exists(muti::config::kFramePath)) {
    displayState.pending = false;
    displayState.message = "frame.bin不存在";
    return;
  }

  displayState.displaying = true;
  displayState.message = "屏幕刷新中；网页请求会暂时等待";
  Serial.printf("[DISPLAY] starting frame crc=%s\n", hex32(displayState.storedFrameCrc).c_str());
  const bool ok = epd.displayFile(LittleFS, muti::config::kFramePath, displayState.storedFrameCrc);
  displayState.displaying = false;
  displayState.lastRefreshSuccess = ok;
  displayState.lastRefreshDurationMs = epd.report().totalMs;
  if (ok) {
    displayState.pending = false;
    displayState.lastRefreshAtMs = millis();
    displayState.displayedFrameCrc = epd.report().frameCrc32;
    saveDisplayedCrc(displayState.displayedFrameCrc);
    displayState.message = "刷新完成";
  } else {
    displayState.pending = false;
    displayState.message = epd.report().needsPhysicalPowerCycle
                               ? "刷新故障已锁定：同时断开USB和驱动板供电至少30秒"
                               : String("刷新失败：") + epd.report().error;
  }
}

String statusJson() {
  size_t frameSize = 0;
  const bool frameExists = storageMounted && LittleFS.exists(muti::config::kFramePath);
  if (frameExists) {
    File f = LittleFS.open(muti::config::kFramePath, FILE_READ);
    if (f) {
      frameSize = f.size();
      f.close();
    }
  }
  const muti::EpdTbRefreshReport& r = epd.report();
  String json;
  json.reserve(1800);
  json += F("{\"firmware\":{\"name\":\"");
  json += muti::config::kFirmwareName;
  json += F("\",\"version\":\"");
  json += muti::config::kFirmwareVersion;
  json += F("\",\"build\":\"");
  json += jsonEscape(muti::config::kBuildDate);
  json += F("\"},\"device\":{\"name\":\"");
  json += jsonEscape(settings.deviceName);
  json += F("\",\"uptimeMs\":");
  json += millis();
  json += F("},\"network\":{\"mode\":\"");
  json += networkStateName();
  json += F("\",\"ssid\":\"");
  json += jsonEscape(networkState == NetworkState::ApPortal ? settings.apName : settings.staSsid);
  json += F("\",\"ip\":\"");
  json += currentIp();
  json += F("\",\"hostname\":\"");
  json += hostname;
  json += F("\",\"rssi\":");
  json += networkState == NetworkState::StaOnline ? WiFi.RSSI() : 0;
  json += F(",\"savedSsid\":\"");
  json += jsonEscape(settings.staSsid);
  json += F("\",\"apReady\":");
  json += boolJson(apReady);
  json += F(",\"apClients\":");
  json += networkState == NetworkState::ApPortal && apReady ? WiFi.softAPgetStationNum() : 0;
  json += F(",\"pendingAction\":\"");
  json += pendingNetworkActionName();
  json += F("\",\"scanActive\":");
  json += boolJson(scanActive);
  json += F("},\"display\":{\"state\":\"");
  if (displayState.displaying) json += F("refreshing");
  else if (epd.faultLatched()) json += F("fault");
  else if (displayState.pending) json += F("queued");
  else json += F("idle");
  json += F("\",\"message\":\"");
  json += jsonEscape(displayState.message);
  json += F("\",\"busyPin\":");
  json += digitalRead(muti::config::kPinBusy);
  json += F(",\"fault\":");
  json += boolJson(epd.faultLatched());
  json += F(",\"pending\":");
  json += boolJson(displayState.pending);
  json += F(",\"cooldownRemainingMs\":");
  json += cooldownRemainingMs();
  json += F(",\"lastRefreshMs\":");
  json += displayState.lastRefreshDurationMs;
  json += F(",\"lastRefreshSuccess\":");
  json += boolJson(displayState.lastRefreshSuccess);
  json += F(",\"driverStage\":\"");
  json += jsonEscape(r.stage);
  json += F("\",\"driverError\":\"");
  json += jsonEscape(r.error);
  json += F("\",\"psr\":\"9F A9\",\"vcom\":\"9C\",\"vbd\":\"37\"},\"frame\":{\"exists\":");
  json += boolJson(frameExists);
  json += F(",\"bytes\":");
  json += frameSize;
  json += F(",\"storedCrc32\":\"");
  json += hex32(displayState.storedFrameCrc);
  json += F("\",\"displayedCrc32\":\"");
  json += hex32(displayState.displayedFrameCrc);
  json += F("\"},\"storage\":{\"mounted\":");
  json += boolJson(storageMounted);
  json += F(",\"partitionLabel\":\"");
  json += jsonEscape(storagePartitionLabel);
  json += F("\",\"formattedOnBoot\":");
  json += boolJson(storageFormattedOnBoot);
  json += F(",\"error\":\"");
  json += jsonEscape(storageError);
  json += F("\",\"totalBytes\":");
  json += storageMounted ? LittleFS.totalBytes() : 0;
  json += F(",\"usedBytes\":");
  json += storageMounted ? LittleFS.usedBytes() : 0;
  json += F("},\"screen\":{\"width\":960,\"height\":640,\"colors\":4,\"frameBytes\":153600,\"controller\":\"SSD2677\",\"partialRefresh\":false}}\n");
  return json;
}

void serveUi() {
  server.sendHeader("Content-Encoding", "gzip");
  server.sendHeader("Cache-Control", "no-store");
  server.sendHeader("X-Content-Type-Options", "nosniff");
  server.sendHeader("Referrer-Policy", "no-referrer");
  server.sendHeader("Content-Security-Policy",
                    "default-src 'self' data: blob:; connect-src 'self'; img-src 'self' data: blob:; "
                    "style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; object-src 'none'");
  server.send_P(200, "text/html; charset=utf-8", reinterpret_cast<PGM_P>(WEB_UI_GZ), WEB_UI_GZ_LEN);
}

void setupWebServer() {
  const char* headers[] = {"X-Frame-CRC32"};
  server.collectHeaders(headers, 1);

  server.on("/", HTTP_GET, serveUi);
  server.on("/generate_204", HTTP_ANY, serveUi);
  server.on("/hotspot-detect.html", HTTP_ANY, serveUi);
  server.on("/connecttest.txt", HTTP_ANY, serveUi);
  server.on("/ncsi.txt", HTTP_ANY, serveUi);

  server.on("/api/status", HTTP_GET, []() { sendJson(200, statusJson()); });

  server.on("/api/wifi/scan", HTTP_GET, []() {
    if (server.hasArg("start") && server.arg("start") == "1") startWifiScan();
    String body = String("{\"ok\":true,\"scanning\":") + boolJson(scanActive) +
                  ",\"networks\":" + scanCacheJson + "}";
    sendJson(200, body);
  });

  server.on("/api/wifi/save", HTTP_POST, []() {
    String ssid = server.arg("ssid");
    const String password = server.arg("password");
    ssid.trim();
    if (ssid.isEmpty() || ssid.length() > 32 || password.length() > 64) {
      sendJson(400, F("{\"ok\":false,\"error\":\"SSID或密码长度无效\"}"));
      return;
    }
    settings.staSsid = ssid;
    settings.staPassword = password;
    saveSettings();
    scheduleNetworkAction(PendingNetworkAction::StartSta, muti::config::kNetworkSwitchDelayMs);
    sendJson(200, String("{\"ok\":true,\"message\":\"已保存，将切换到局域网 ") +
                      jsonEscape(ssid) + "\"}");
  });

  server.on("/api/wifi/forget", HTTP_POST, []() {
    settings.staSsid = "";
    settings.staPassword = "";
    saveSettings();
    scheduleNetworkAction(PendingNetworkAction::StartAp, muti::config::kNetworkSwitchDelayMs);
    sendJson(200, F("{\"ok\":true,\"message\":\"已忘记局域网，将保持配置热点\"}"));
  });

  server.on("/api/network/sta", HTTP_POST, []() {
    if (settings.staSsid.isEmpty()) {
      sendJson(409, F("{\"ok\":false,\"error\":\"没有已保存的局域网配置\"}"));
      return;
    }
    scheduleNetworkAction(PendingNetworkAction::StartSta, muti::config::kNetworkSwitchDelayMs);
    sendJson(200, String("{\"ok\":true,\"message\":\"将关闭配置热点并连接 ") +
                      jsonEscape(settings.staSsid) + "\"}");
  });

  server.on("/api/network/ap", HTTP_POST, []() {
    scheduleNetworkAction(PendingNetworkAction::StartAp, muti::config::kNetworkSwitchDelayMs);
    sendJson(200, String("{\"ok\":true,\"message\":\"将关闭局域网并开启配置热点 ") +
                      jsonEscape(settings.apName) + "\"}");
  });

  server.on("/api/device/save", HTTP_POST, []() {
    String deviceName = server.arg("deviceName");
    String apName = server.arg("apName");
    deviceName.trim();
    apName.trim();
    if (deviceName.isEmpty() || deviceName.length() > 48 || apName.isEmpty() || apName.length() > 31) {
      sendJson(400, F("{\"ok\":false,\"error\":\"设备名或热点名长度无效\"}"));
      return;
    }
    const bool apNameChanged = settings.apName != apName;
    settings.deviceName = deviceName;
    settings.apName = apName;
    saveSettings();
    if (apNameChanged && networkState == NetworkState::ApPortal) {
      scheduleNetworkAction(PendingNetworkAction::StartAp, muti::config::kNetworkSwitchDelayMs);
      sendJson(200, F("{\"ok\":true,\"message\":\"设置已保存，将以新名称重启配置热点\"}"));
    } else {
      sendJson(200, F("{\"ok\":true,\"message\":\"设置已保存，无需重启\"}"));
    }
  });

  server.on("/api/upload", HTTP_POST, handleUploadComplete, handleUploadChunk);

  server.on("/api/action", HTTP_POST, []() {
    const String action = server.arg("action");
    if (displayState.displaying) {
      sendJson(409, F("{\"ok\":false,\"error\":\"屏幕正在刷新\"}"));
      return;
    }
    if (epd.faultLatched() && action != "reboot") {
      sendJson(423, F("{\"ok\":false,\"error\":\"驱动故障已锁定，需物理断电30秒\"}"));
      return;
    }
    if (action == "reboot") {
      restartAtMs = millis() + 800;
      sendJson(200, F("{\"ok\":true,\"message\":\"设备将重启\"}"));
      return;
    }
    if (action == "refresh") {
      if (!storageMounted) {
        sendJson(503, String("{\"ok\":false,\"error\":\"") + jsonEscape(storageError.isEmpty() ? "LittleFS未挂载" : storageError) + "\"}");
        return;
      }
      if (!LittleFS.exists(muti::config::kFramePath)) {
        sendJson(404, F("{\"ok\":false,\"error\":\"frame.bin不存在\"}"));
        return;
      }
      displayState.pending = true;
      displayState.queuedAtMs = millis();
      displayState.message = "已请求重新显示当前帧";
      sendJson(200, F("{\"ok\":true,\"queued\":true}"));
      return;
    }

    PatternKind kind;
    if (action == "raw") kind = PatternKind::Raw;
    else if (action == "palette") kind = PatternKind::Palette;
    else if (action == "gray") kind = PatternKind::Gray16;
    else if (action == "white") kind = PatternKind::White;
    else {
      sendJson(400, F("{\"ok\":false,\"error\":\"未知操作\"}"));
      return;
    }
    uint32_t crc = 0;
    if (!generatePattern(kind, crc)) {
      if (!storageMounted) {
        sendJson(503, String("{\"ok\":false,\"error\":\"") + jsonEscape(storageError.isEmpty() ? "LittleFS未挂载" : storageError) + "\"}");
      } else {
        sendJson(500, F("{\"ok\":false,\"error\":\"测试帧生成失败\"}"));
      }
      return;
    }
    String body = String("{\"ok\":true,\"crc32\":\"") + hex32(crc) +
                  "\",\"queued\":" + boolJson(displayState.pending) + "}";
    sendJson(200, body);
  });

  server.on("/frame.bin", HTTP_GET, []() {
    if (!storageMounted) {
      server.send(503, "text/plain; charset=utf-8", storageError.isEmpty() ? "LittleFS未挂载" : storageError);
      return;
    }
    File file = LittleFS.open(muti::config::kFramePath, FILE_READ);
    if (!file) {
      server.send(404, "text/plain; charset=utf-8", "frame.bin不存在");
      return;
    }
    server.sendHeader("Content-Disposition", "attachment; filename=frame.bin");
    server.sendHeader("Cache-Control", "no-store");
    server.streamFile(file, "application/octet-stream");
    file.close();
  });

  server.onNotFound(serveUi);
  server.begin();
  Serial.println(F("[WEB] HTTP server started"));
}

bool tryMountStorageLabel(const char* label, bool allowFormatRecovery) {
  Serial.printf("[FS] try label=%s base=%s format-recovery=%s\n", label,
                muti::config::kLittleFsBasePath, allowFormatRecovery ? "yes" : "no");
  if (LittleFS.begin(false, muti::config::kLittleFsBasePath, 10, label)) {
    storageMounted = true;
    storageFormattedOnBoot = false;
    storagePartitionLabel = label;
    return true;
  }
  Serial.printf("[FS] label=%s mount failed\n", label);
  if (!allowFormatRecovery) {
    return false;
  }

  // begin(false, ..., label) above selects the target partition label for
  // LittleFS.format(). Formatting is delayed until both labels have already
  // failed their non-destructive probes in mountStorage().
  Serial.printf("[FS] formatting recovery label=%s\n", label);
  if (!LittleFS.format()) {
    Serial.printf("[FS] label=%s format failed\n", label);
    return false;
  }
  if (!LittleFS.begin(false, muti::config::kLittleFsBasePath, 10, label)) {
    Serial.printf("[FS] label=%s remount after format failed\n", label);
    return false;
  }
  storageMounted = true;
  storageFormattedOnBoot = true;
  storagePartitionLabel = label;
  return true;
}

void mountStorage() {
  storageMounted = false;
  storageFormattedOnBoot = false;
  storagePartitionLabel = "";
  storageError = "";

  // Compatibility order:
  //   v1.0.x/v1.1.x and v1.2.2 complete images -> label "spiffs"
  //   v1.2.0/v1.2.1 complete images           -> label "littlefs"
  // Never format until both labels have first been tried without formatting.
  if (!tryMountStorageLabel(muti::config::kLittleFsPreferredPartitionLabel, false) &&
      !tryMountStorageLabel(muti::config::kLittleFsAlternatePartitionLabel, false) &&
      !tryMountStorageLabel(muti::config::kLittleFsPreferredPartitionLabel, true) &&
      !tryMountStorageLabel(muti::config::kLittleFsAlternatePartitionLabel, true)) {
    storageError = String("LittleFS挂载失败：已尝试 ") +
                   muti::config::kLittleFsPreferredPartitionLabel + " / " +
                   muti::config::kLittleFsAlternatePartitionLabel;
    Serial.printf("[FS][ERROR] %s\n", storageError.c_str());
    return;
  }

  size_t size = 0;
  const uint32_t crc = crcFile(muti::config::kFramePath, &size);
  if (size == kFrameBytes) {
    displayState.storedFrameCrc = crc;
  } else if (size != 0) {
    Serial.printf("[FS] removing invalid frame: %u bytes\n", static_cast<unsigned>(size));
    LittleFS.remove(muti::config::kFramePath);
  }
  LittleFS.remove(muti::config::kUploadTempPath);
  LittleFS.remove(muti::config::kFrameBackupPath);
  Serial.printf("[FS] mounted label=%s formatted=%s total=%u used=%u frame=%u crc=%s\n",
                storagePartitionLabel.c_str(), storageFormattedOnBoot ? "yes" : "no",
                static_cast<unsigned>(LittleFS.totalBytes()),
                static_cast<unsigned>(LittleFS.usedBytes()),
                static_cast<unsigned>(size), hex32(displayState.storedFrameCrc).c_str());
}

}  // namespace

void setup() {
  Serial.begin(115200);
  delay(350);
  Serial.println();
  Serial.printf("[BOOT] %s v%s (%s)\n", muti::config::kFirmwareName,
                muti::config::kFirmwareVersion, muti::config::kBuildDate);
  Serial.println(F("[BOOT] display auto-refresh is disabled; use the local web UI to trigger a test"));
  Serial.printf("[BOOT] pins SCK=%d MOSI=%d CS=%d DC=%d RST=%d BUSY=%d PWR=%d\n",
                muti::config::kPinSck, muti::config::kPinMosi, muti::config::kPinCs,
                muti::config::kPinDc, muti::config::kPinRst, muti::config::kPinBusy,
                muti::config::kPinPower);

  epd.begin();
  mountStorage();
  loadSettings();
  hostname = makeHostname();
  setupWebServer();

  if (settings.staSsid.isEmpty()) startApPortal();
  else startStaConnection();
}

void loop() {
  server.handleClient();
  manageNetwork();
  processPendingDisplay();

  if (restartAtMs != 0 && static_cast<int32_t>(millis() - restartAtMs) >= 0) {
    Serial.println(F("[SYS] restarting"));
    delay(50);
    ESP.restart();
  }
  delay(1);
}
