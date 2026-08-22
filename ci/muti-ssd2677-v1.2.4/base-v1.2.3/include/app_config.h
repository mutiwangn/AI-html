#pragma once

#include <Arduino.h>

namespace muti::config {

inline constexpr char kFirmwareName[] = "Muti-SSD2677-LocalWeb-C3";
inline constexpr char kFirmwareVersion[] = "1.2.3";
inline constexpr char kBuildDate[] = __DATE__ " " __TIME__;

inline constexpr uint16_t kDisplayWidth = 960;
inline constexpr uint16_t kDisplayHeight = 640;
inline constexpr size_t kFrameBytes = 153600;
inline constexpr size_t kRowBytes = kDisplayWidth / 4;

inline constexpr int kPinSck = 4;
inline constexpr int kPinMosi = 6;
inline constexpr int kPinCs = 7;
inline constexpr int kPinDc = 1;
inline constexpr int kPinRst = 2;
inline constexpr int kPinBusy = 10;
inline constexpr int kPinPower = -1;

inline constexpr uint8_t kPsrByte0 = 0x9F;  // scan-up, 960 x 640
inline constexpr uint8_t kPsrByte1 = 0xA9;
inline constexpr uint8_t kVcom = 0x9C;
inline constexpr uint8_t kLutVcom = 0x1C;
inline constexpr uint8_t kVbd = 0x37;

inline constexpr uint32_t kSoftwareSpiHalfPeriodUs = 1;
inline constexpr uint32_t kResetReadyTimeoutMs = 15000;
inline constexpr uint32_t kPowerOnBusyAssertTimeoutMs = 3000;
inline constexpr uint32_t kPowerOnCompleteTimeoutMs = 30000;
inline constexpr uint32_t kRefreshBusyAssertTimeoutMs = 3000;
inline constexpr uint32_t kRefreshCompleteTimeoutMs = 45000;
inline constexpr uint32_t kPowerOffBusyAssertTimeoutMs = 3000;
inline constexpr uint32_t kPowerOffCompleteTimeoutMs = 30000;
inline constexpr uint32_t kRefreshCooldownMs = 180000;
inline constexpr uint32_t kRefreshQueueDelayMs = 700;
inline constexpr size_t kStreamChunkBytes = 1024;

inline constexpr char kPreferencesNamespace[] = "mutitrmnl";
inline constexpr uint32_t kSettingsVersion = 3;
inline constexpr char kDefaultApName[] = "Muti-10.2";
inline constexpr uint8_t kApChannel = 6;
inline constexpr uint8_t kApMaxClients = 4;
inline constexpr uint32_t kStaConnectTimeoutMs = 20000;
inline constexpr uint32_t kStaReconnectWindowMs = 30000;
inline constexpr uint32_t kNetworkTickMs = 250;
inline constexpr uint32_t kNetworkSwitchDelayMs = 900;
inline constexpr char kMdnsHostname[] = "muti";
inline constexpr uint32_t kStatusPollMs = 2000;
inline constexpr uint16_t kWebPort = 80;

// v1.0.x/v1.1.x used the Arduino-default label "spiffs" while
// v1.2.0/v1.2.1 complete images used "littlefs".  The runtime probes
// both labels without formatting first, so app-only upgrades preserve data.
inline constexpr char kLittleFsPreferredPartitionLabel[] = "spiffs";
inline constexpr char kLittleFsAlternatePartitionLabel[] = "littlefs";
inline constexpr char kLittleFsBasePath[] = "/littlefs";
inline constexpr char kFramePath[] = "/frame.bin";
inline constexpr char kUploadTempPath[] = "/upload.tmp";
inline constexpr char kFrameBackupPath[] = "/frame.bak";
inline constexpr char kFrameMetaPath[] = "/frame.meta";

inline constexpr uint8_t kLogicalBlack = 0;
inline constexpr uint8_t kLogicalWhite = 1;
inline constexpr uint8_t kLogicalYellow = 2;
inline constexpr uint8_t kLogicalRed = 3;

}  // namespace muti::config
