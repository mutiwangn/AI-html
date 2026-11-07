#pragma once

#include <Arduino.h>
#include <FS.h>

namespace muti {

struct EpdTbRefreshReport {
  bool success = false;
  bool resetReady = false;
  bool powerOnBusyAsserted = false;
  bool powerOnCompleted = false;
  bool refreshBusyAsserted = false;
  bool refreshCompleted = false;
  bool powerOffBusyAsserted = false;
  bool powerOffCompleted = false;
  bool faultLatched = false;
  bool needsPhysicalPowerCycle = false;
  bool expectedCrcMatched = true;
  uint8_t psr0 = 0;
  uint8_t psr1 = 0;
  int busyAtStart = -1;
  int busyAtEnd = -1;
  size_t bytesRead = 0;
  size_t bytesSent = 0;
  uint32_t frameCrc32 = 0;
  uint32_t initMs = 0;
  uint32_t transferMs = 0;
  uint32_t refreshMs = 0;
  uint32_t totalMs = 0;
  String stage;
  String error;
};

class EpdSsd2677Tb {
 public:
  EpdSsd2677Tb();

  bool displayFile(fs::FS& fs, const char* path, uint32_t expectedCrc32 = 0);
  void begin();
  bool faultLatched() const { return faultLatched_; }
  const EpdTbRefreshReport& report() const { return report_; }

 private:
  void configurePins();
  void setSafeLevels();
  void spiWriteByte(uint8_t value);
  void sendCommand(uint8_t command);
  void sendData(uint8_t data);
  void sendData(const uint8_t* data, size_t length);
  bool hardReset();
  bool waitBusyHigh(uint32_t timeoutMs, const char* stage);
  bool waitBusyLow(uint32_t timeoutMs, const char* stage);
  bool loadTbProfile();
  bool powerOn();
  bool streamFrame(File& file, uint32_t expectedCrc32);
  bool refreshPanel();
  bool powerOffAndSleep();
  uint8_t tbBodyByte(uint8_t row, uint8_t column) const;
  static bool tbReplaceRow(uint8_t row);
  static uint32_t crc32Update(uint32_t crc, const uint8_t* data, size_t length);
  void fail(const char* stage, const String& message, bool latchFault);

  bool pinsConfigured_ = false;
  bool powerIsOn_ = false;
  bool faultLatched_ = false;
  EpdTbRefreshReport report_;
};

}  // namespace muti
