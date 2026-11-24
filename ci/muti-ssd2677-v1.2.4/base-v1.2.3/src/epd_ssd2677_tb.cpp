#include "epd_ssd2677_tb.h"

#include <LittleFS.h>
#include <pgmspace.h>

#include "app_config.h"
#include "lut_profiles.h"

namespace muti {
namespace {

constexpr uint8_t kCmdPsr = 0x00;
constexpr uint8_t kCmdPwr = 0x01;
constexpr uint8_t kCmdPowerOff = 0x02;
constexpr uint8_t kCmdPowerOn = 0x04;
constexpr uint8_t kCmdDeepSleep = 0x07;
constexpr uint8_t kCmdDtm = 0x10;
constexpr uint8_t kCmdDisplayRefresh = 0x12;
constexpr uint8_t kCmdLut = 0x20;

uint8_t readW1(size_t index) {
  return pgm_read_byte(&lut::kE5Wsf1[index]);
}

uint8_t readW3(size_t index) {
  return pgm_read_byte(&lut::kE5Wsf[index]);
}

}  // namespace

EpdSsd2677Tb::EpdSsd2677Tb() = default;

void EpdSsd2677Tb::begin() {
  configurePins();
  setSafeLevels();
}

void EpdSsd2677Tb::configurePins() {
  if (pinsConfigured_) {
    return;
  }
  pinMode(config::kPinSck, OUTPUT);
  pinMode(config::kPinMosi, OUTPUT);
  pinMode(config::kPinCs, OUTPUT);
  pinMode(config::kPinDc, OUTPUT);
  pinMode(config::kPinRst, OUTPUT);
  pinMode(config::kPinBusy, INPUT);
  if (config::kPinPower >= 0) {
    pinMode(config::kPinPower, OUTPUT);
    digitalWrite(config::kPinPower, HIGH);
  }
  pinsConfigured_ = true;
}

void EpdSsd2677Tb::setSafeLevels() {
  digitalWrite(config::kPinCs, HIGH);
  digitalWrite(config::kPinSck, LOW);
  digitalWrite(config::kPinMosi, LOW);
  digitalWrite(config::kPinDc, LOW);
  digitalWrite(config::kPinRst, HIGH);
}

void EpdSsd2677Tb::spiWriteByte(uint8_t value) {
  digitalWrite(config::kPinCs, LOW);
  for (int bit = 7; bit >= 0; --bit) {
    digitalWrite(config::kPinSck, LOW);
    digitalWrite(config::kPinMosi, (value >> bit) & 0x01U);
    delayMicroseconds(config::kSoftwareSpiHalfPeriodUs);
    digitalWrite(config::kPinSck, HIGH);
    delayMicroseconds(config::kSoftwareSpiHalfPeriodUs);
  }
  digitalWrite(config::kPinSck, LOW);
  digitalWrite(config::kPinCs, HIGH);
}

void EpdSsd2677Tb::sendCommand(uint8_t command) {
  digitalWrite(config::kPinDc, LOW);
  spiWriteByte(command);
}

void EpdSsd2677Tb::sendData(uint8_t data) {
  digitalWrite(config::kPinDc, HIGH);
  spiWriteByte(data);
}

void EpdSsd2677Tb::sendData(const uint8_t* data, size_t length) {
  for (size_t i = 0; i < length; ++i) {
    sendData(data[i]);
  }
}

bool EpdSsd2677Tb::waitBusyHigh(uint32_t timeoutMs, const char* stage) {
  const uint32_t startedAt = millis();
  while (digitalRead(config::kPinBusy) == LOW) {
    if (millis() - startedAt >= timeoutMs) {
      fail(stage, String("BUSY remained LOW for ") + timeoutMs + " ms", true);
      return false;
    }
    delay(2);
    yield();
  }
  return true;
}

bool EpdSsd2677Tb::waitBusyLow(uint32_t timeoutMs, const char* stage) {
  const uint32_t startedAt = millis();
  while (digitalRead(config::kPinBusy) == HIGH) {
    if (millis() - startedAt >= timeoutMs) {
      fail(stage, String("BUSY did not assert LOW within ") + timeoutMs + " ms", true);
      return false;
    }
    delay(2);
    yield();
  }
  return true;
}

bool EpdSsd2677Tb::hardReset() {
  report_.stage = "reset";
  delay(100);
  digitalWrite(config::kPinRst, LOW);
  delay(10);
  digitalWrite(config::kPinRst, HIGH);
  delay(20);
  report_.resetReady = waitBusyHigh(config::kResetReadyTimeoutMs, "reset-ready");
  return report_.resetReady;
}

bool EpdSsd2677Tb::tbReplaceRow(uint8_t row) {
  const uint8_t local = row & 0x0FU;
  return local >= 4 && local <= 7;
}

uint8_t EpdSsd2677Tb::tbBodyByte(uint8_t row, uint8_t column) const {
  const size_t index = static_cast<size_t>(row) + static_cast<size_t>(48) * column;
  return tbReplaceRow(row) ? readW1(index) : readW3(index);
}

bool EpdSsd2677Tb::loadTbProfile() {
  report_.stage = "load-profile";

  const uint8_t psr[] = {config::kPsrByte0, config::kPsrByte1};
  sendCommand(kCmdPsr);
  sendData(psr, sizeof(psr));

  const uint8_t btst[] = {0x0F, 0x8B, 0x93, 0xC1};
  sendCommand(0x06);
  sendData(btst, sizeof(btst));

  sendCommand(0x50);
  sendData(config::kVbd);

  const uint8_t tres[] = {0x03, 0xC0, 0x02, 0x80};
  sendCommand(0x61);
  sendData(tres, sizeof(tres));

  sendCommand(0x41);
  sendData(0x00);

  const uint8_t tcon[] = {0x02, 0x02};
  sendCommand(0x60);
  sendData(tcon, sizeof(tcon));

  const uint8_t gst[] = {0x98, 0x98, 0x98, 0x75, 0xCA, 0xB2, 0x98, 0x7E};
  sendCommand(0x62);
  sendData(gst, sizeof(gst));

  const uint8_t gss[] = {0x00, 0x00, 0x00, 0x00};
  sendCommand(0x65);
  sendData(gss, sizeof(gss));

  sendCommand(0xE7);
  sendData(config::kLutVcom);
  sendCommand(0xE3);
  sendData(0x00);
  sendCommand(0xE9);
  sendData(0x01);

  sendCommand(kCmdPwr);
  sendData(0x07);
  sendData(readW3(528));
  sendData(readW3(529));
  sendData(readW3(531));
  sendData(readW3(530));
  sendData(readW3(532));

  sendCommand(0x82);
  sendData(config::kVcom);

  sendCommand(0x30);
  sendData(readW3(534));

  sendCommand(kCmdLut);
  for (size_t i = 528; i < 535; ++i) {
    sendData(i == 533 ? config::kLutVcom : readW3(i));
  }
  for (uint8_t row = 0; row < 48; ++row) {
    for (uint8_t column = 0; column < 11; ++column) {
      sendData(tbBodyByte(row, column));
    }
  }
  return true;
}

bool EpdSsd2677Tb::powerOn() {
  report_.stage = "power-on";
  sendCommand(kCmdPowerOn);
  report_.powerOnBusyAsserted =
      waitBusyLow(config::kPowerOnBusyAssertTimeoutMs, "power-on-assert");
  if (!report_.powerOnBusyAsserted) {
    return false;
  }
  report_.powerOnCompleted =
      waitBusyHigh(config::kPowerOnCompleteTimeoutMs, "power-on-complete");
  powerIsOn_ = report_.powerOnCompleted;
  return report_.powerOnCompleted;
}

uint32_t EpdSsd2677Tb::crc32Update(uint32_t crc, const uint8_t* data, size_t length) {
  crc = ~crc;
  for (size_t i = 0; i < length; ++i) {
    crc ^= data[i];
    for (uint8_t bit = 0; bit < 8; ++bit) {
      crc = (crc >> 1U) ^ (0xEDB88320UL & static_cast<uint32_t>(-(static_cast<int32_t>(crc & 1U))));
    }
  }
  return ~crc;
}

bool EpdSsd2677Tb::streamFrame(File& file, uint32_t expectedCrc32) {
  report_.stage = "transfer";
  sendCommand(kCmdDtm);

  uint8_t buffer[config::kStreamChunkBytes];
  uint32_t crc = 0;
  size_t total = 0;
  while (file.available()) {
    const size_t count = file.read(buffer, sizeof(buffer));
    if (count == 0) {
      break;
    }
    crc = crc32Update(crc, buffer, count);
    for (size_t i = 0; i < count; ++i) {
      sendData(buffer[i]);
    }
    total += count;
    if ((total & 0x1FFFU) == 0) {
      yield();
    }
  }

  report_.bytesRead = total;
  report_.bytesSent = total;
  report_.frameCrc32 = crc;
  report_.expectedCrcMatched = expectedCrc32 == 0 || expectedCrc32 == crc;

  if (total != config::kFrameBytes) {
    fail("transfer", String("frame length ") + total + ", expected " + config::kFrameBytes, false);
    return false;
  }
  if (!report_.expectedCrcMatched) {
    fail("transfer", "frame CRC changed between storage and display", false);
    return false;
  }
  return true;
}

bool EpdSsd2677Tb::refreshPanel() {
  report_.stage = "refresh";
  sendCommand(kCmdDisplayRefresh);
  sendData(0x00);
  report_.refreshBusyAsserted =
      waitBusyLow(config::kRefreshBusyAssertTimeoutMs, "refresh-assert");
  if (!report_.refreshBusyAsserted) {
    return false;
  }
  report_.refreshCompleted =
      waitBusyHigh(config::kRefreshCompleteTimeoutMs, "refresh-complete");
  return report_.refreshCompleted;
}

bool EpdSsd2677Tb::powerOffAndSleep() {
  report_.stage = "power-off";
  sendCommand(kCmdPowerOff);
  sendData(0x00);
  report_.powerOffBusyAsserted =
      waitBusyLow(config::kPowerOffBusyAssertTimeoutMs, "power-off-assert");
  if (!report_.powerOffBusyAsserted) {
    return false;
  }
  report_.powerOffCompleted =
      waitBusyHigh(config::kPowerOffCompleteTimeoutMs, "power-off-complete");
  if (!report_.powerOffCompleted) {
    return false;
  }
  powerIsOn_ = false;
  delay(100);
  sendCommand(kCmdDeepSleep);
  sendData(0xA5);
  setSafeLevels();
  return true;
}

void EpdSsd2677Tb::fail(const char* stage, const String& message, bool latchFault) {
  report_.stage = stage;
  report_.error = message;
  if (latchFault) {
    faultLatched_ = true;
    report_.faultLatched = true;
    report_.needsPhysicalPowerCycle = true;
  }
  Serial.printf("[EPD][ERROR] %s: %s\n", stage, message.c_str());
}

bool EpdSsd2677Tb::displayFile(fs::FS& fs, const char* path, uint32_t expectedCrc32) {
  report_ = EpdTbRefreshReport{};
  report_.psr0 = config::kPsrByte0;
  report_.psr1 = config::kPsrByte1;
  report_.busyAtStart = digitalRead(config::kPinBusy);
  const uint32_t totalStartedAt = millis();

  if (faultLatched_) {
    fail("guard", "display driver is fault-latched; fully remove USB and driver-board power for at least 30 seconds", true);
    report_.totalMs = millis() - totalStartedAt;
    return false;
  }

  File file = fs.open(path, FILE_READ);
  if (!file) {
    fail("open", String("cannot open ") + path, false);
    report_.totalMs = millis() - totalStartedAt;
    return false;
  }
  if (file.size() != config::kFrameBytes) {
    const size_t actual = file.size();
    file.close();
    fail("open", String("frame length ") + actual + ", expected " + config::kFrameBytes, false);
    report_.totalMs = millis() - totalStartedAt;
    return false;
  }

  configurePins();
  setSafeLevels();
  const uint32_t initStartedAt = millis();
  if (!hardReset() || !loadTbProfile() || !powerOn()) {
    file.close();
    report_.initMs = millis() - initStartedAt;
    report_.totalMs = millis() - totalStartedAt;
    report_.busyAtEnd = digitalRead(config::kPinBusy);
    return false;
  }
  report_.initMs = millis() - initStartedAt;

  const uint32_t transferStartedAt = millis();
  if (!streamFrame(file, expectedCrc32)) {
    file.close();
    report_.transferMs = millis() - transferStartedAt;
    if (powerIsOn_ && !faultLatched_) {
      powerOffAndSleep();
    }
    report_.totalMs = millis() - totalStartedAt;
    report_.busyAtEnd = digitalRead(config::kPinBusy);
    return false;
  }
  file.close();
  report_.transferMs = millis() - transferStartedAt;

  const uint32_t refreshStartedAt = millis();
  if (!refreshPanel()) {
    report_.refreshMs = millis() - refreshStartedAt;
    report_.totalMs = millis() - totalStartedAt;
    report_.busyAtEnd = digitalRead(config::kPinBusy);
    return false;
  }
  report_.refreshMs = millis() - refreshStartedAt;

  if (!powerOffAndSleep()) {
    report_.totalMs = millis() - totalStartedAt;
    report_.busyAtEnd = digitalRead(config::kPinBusy);
    return false;
  }

  report_.stage = "complete";
  report_.success = true;
  report_.faultLatched = faultLatched_;
  report_.totalMs = millis() - totalStartedAt;
  report_.busyAtEnd = digitalRead(config::kPinBusy);
  Serial.printf("[EPD] complete bytes=%u crc=%08lX init=%lu transfer=%lu refresh=%lu total=%lu ms\n",
                static_cast<unsigned>(report_.bytesSent),
                static_cast<unsigned long>(report_.frameCrc32),
                static_cast<unsigned long>(report_.initMs),
                static_cast<unsigned long>(report_.transferMs),
                static_cast<unsigned long>(report_.refreshMs),
                static_cast<unsigned long>(report_.totalMs));
  return true;
}

}  // namespace muti
