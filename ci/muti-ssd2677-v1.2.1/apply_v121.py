#!/usr/bin/env python3
from pathlib import Path
import sys
ROOT=Path(sys.argv[1] if len(sys.argv)>1 else '.').resolve()

def rw(rel, fn):
    p=ROOT/rel; s=p.read_text(encoding='utf-8'); n=fn(s); p.write_text(n,encoding='utf-8'); return n

def rep(s,a,b,label):
    if a not in s: raise RuntimeError(f'missing pattern: {label}')
    return s.replace(a,b)

# config
rw('include/app_config.h', lambda s: rep(rep(s,'kFirmwareVersion[] = "1.2.0"','kFirmwareVersion[] = "1.2.1"','version'),
    'inline constexpr char kFramePath[] = "/frame.bin";',
    'inline constexpr char kLittleFsPartitionLabel[] = "littlefs";\ninline constexpr char kLittleFsBasePath[] = "/littlefs";\ninline constexpr char kFramePath[] = "/frame.bin";','fs config'))

# main.cpp
p=ROOT/'src/main.cpp'; s=p.read_text(encoding='utf-8')
s=rep(s,'bool scanStartedFromAp = false;\nuint32_t networkStateStartedAtMs = 0;','bool scanStartedFromAp = false;\nbool storageMounted = false;\nString storageError;\nuint32_t networkStateStartedAtMs = 0;','storage vars')
s=rep(s,'uint32_t crcFile(const char* path, size_t* sizeOut = nullptr) {\n  File file = LittleFS.open(path, FILE_READ);','uint32_t crcFile(const char* path, size_t* sizeOut = nullptr) {\n  if (!storageMounted) {\n    if (sizeOut) *sizeOut = 0;\n    return 0;\n  }\n  File file = LittleFS.open(path, FILE_READ);','crc guard')
s=rep(s,'bool atomicInstallTempFrame() {\n  LittleFS.remove(muti::config::kFrameBackupPath);','bool atomicInstallTempFrame() {\n  if (!storageMounted) return false;\n  LittleFS.remove(muti::config::kFrameBackupPath);','atomic guard')
s=rep(s,'case UPLOAD_FILE_START: {\n      resetUploadState();\n      LittleFS.remove(muti::config::kUploadTempPath);\n      uploadState.started = true;','case UPLOAD_FILE_START: {\n      resetUploadState();\n      uploadState.started = true;','upload pre-remove')
s=rep(s,'      uploadState.browserCrc = browserCrc;\n      uploadState.file = LittleFS.open(muti::config::kUploadTempPath, FILE_WRITE);\n      if (!uploadState.file) {\n        uploadState.failed = true;\n        uploadState.error = "无法创建 /upload.tmp";\n      }','      uploadState.browserCrc = browserCrc;\n      if (!storageMounted) {\n        uploadState.failed = true;\n        uploadState.error = storageError.isEmpty() ? "LittleFS未挂载" : storageError;\n        break;\n      }\n      LittleFS.remove(muti::config::kUploadTempPath);\n      uploadState.file = LittleFS.open(muti::config::kUploadTempPath, FILE_WRITE);\n      if (!uploadState.file) {\n        uploadState.failed = true;\n        uploadState.error = String("无法创建 /upload.tmp；LittleFS mounted=") + (storageMounted ? "true" : "false") +\n                            " total=" + LittleFS.totalBytes() + " used=" + LittleFS.usedBytes();\n      }','upload mount guard')
s=s.replace('      LittleFS.remove(muti::config::kUploadTempPath);\n      break;\n    default:','      if (storageMounted) LittleFS.remove(muti::config::kUploadTempPath);\n      break;\n    default:',1)
start=s.index('void handleUploadComplete()'); end=s.index('uint8_t packedByte',start); ch=s[start:end]; ch=ch.replace('    LittleFS.remove(muti::config::kUploadTempPath);','    if (storageMounted) LittleFS.remove(muti::config::kUploadTempPath);'); s=s[:start]+ch+s[end:]
s=rep(s,'bool generatePattern(PatternKind kind, uint32_t& crcOut) {\n  LittleFS.remove(muti::config::kUploadTempPath);','bool generatePattern(PatternKind kind, uint32_t& crcOut) {\n  if (!storageMounted) return false;\n  LittleFS.remove(muti::config::kUploadTempPath);','pattern guard')
s=rep(s,'void processPendingDisplay() {\n  if (!displayState.pending || displayState.displaying || epd.faultLatched()) return;','void processPendingDisplay() {\n  if (!displayState.pending || displayState.displaying || epd.faultLatched()) return;\n  if (!storageMounted) {\n    displayState.pending = false;\n    displayState.message = storageError.isEmpty() ? "LittleFS未挂载，无法刷新" : storageError;\n    return;\n  }','display guard')
s=rep(s,'const bool frameExists = LittleFS.exists(muti::config::kFramePath);','const bool frameExists = storageMounted && LittleFS.exists(muti::config::kFramePath);','status frame guard')
s=rep(s,'  json += F("\\\"},\\\"storage\\\":{\\\"totalBytes\\\":");\n  json += LittleFS.totalBytes();\n  json += F(",\\\"usedBytes\\\":");\n  json += LittleFS.usedBytes();','  json += F("\\\"},\\\"storage\\\":{\\\"mounted\\\":");\n  json += boolJson(storageMounted);\n  json += F(",\\\"partitionLabel\\\":\\\"");\n  json += muti::config::kLittleFsPartitionLabel;\n  json += F("\\\",\\\"error\\\":\\\"");\n  json += jsonEscape(storageError);\n  json += F("\\\",\\\"totalBytes\\\":");\n  json += storageMounted ? LittleFS.totalBytes() : 0;\n  json += F(",\\\"usedBytes\\\":");\n  json += storageMounted ? LittleFS.usedBytes() : 0;','status storage')
s=rep(s,'    if (action == "refresh") {\n      if (!LittleFS.exists(muti::config::kFramePath)) {','    if (action == "refresh") {\n      if (!storageMounted) {\n        sendJson(503, String("{\\\"ok\\\":false,\\\"error\\\":\\\"") + jsonEscape(storageError.isEmpty() ? "LittleFS未挂载" : storageError) + "\\\"}");\n        return;\n      }\n      if (!LittleFS.exists(muti::config::kFramePath)) {','refresh guard')
s=rep(s,'    if (!generatePattern(kind, crc)) {\n      sendJson(500, F("{\\\"ok\\\":false,\\\"error\\\":\\\"测试帧生成失败\\\"}"));\n      return;\n    }','    if (!generatePattern(kind, crc)) {\n      if (!storageMounted) {\n        sendJson(503, String("{\\\"ok\\\":false,\\\"error\\\":\\\"") + jsonEscape(storageError.isEmpty() ? "LittleFS未挂载" : storageError) + "\\\"}");\n      } else {\n        sendJson(500, F("{\\\"ok\\\":false,\\\"error\\\":\\\"测试帧生成失败\\\"}"));\n      }\n      return;\n    }','diag guard')
s=rep(s,'  server.on("/frame.bin", HTTP_GET, []() {\n    File file = LittleFS.open(muti::config::kFramePath, FILE_READ);','  server.on("/frame.bin", HTTP_GET, []() {\n    if (!storageMounted) {\n      server.send(503, "text/plain; charset=utf-8", storageError.isEmpty() ? "LittleFS未挂载" : storageError);\n      return;\n    }\n    File file = LittleFS.open(muti::config::kFramePath, FILE_READ);','frame get guard')
s=rep(s,'void mountStorage() {\n  if (!LittleFS.begin(true)) {\n    Serial.println(F("[FS][ERROR] LittleFS mount failed"));\n    return;\n  }','void mountStorage() {\n  storageMounted = false;\n  storageError = "";\n  Serial.printf("[FS] mounting LittleFS label=%s base=%s\\n",\n                muti::config::kLittleFsPartitionLabel, muti::config::kLittleFsBasePath);\n  if (!LittleFS.begin(true, muti::config::kLittleFsBasePath, 10, muti::config::kLittleFsPartitionLabel)) {\n    storageError = String("LittleFS挂载失败：partition label=") + muti::config::kLittleFsPartitionLabel;\n    Serial.printf("[FS][ERROR] %s\\n", storageError.c_str());\n    return;\n  }\n  storageMounted = true;','explicit mount')
p.write_text(s,encoding='utf-8')

# web
p=ROOT/'web/index.html'; s=p.read_text(encoding='utf-8').replace('Muti-SSD2677-LocalWeb-C3 v1.2.0','Muti-SSD2677-LocalWeb-C3 v1.2.1')
s=rep(s,"['LittleFS',`${formatBytes(s.storage.usedBytes)} / ${formatBytes(s.storage.totalBytes)}`]","['LittleFS',s.storage.mounted?`已挂载 · ${formatBytes(s.storage.usedBytes)} / ${formatBytes(s.storage.totalBytes)}`:`未挂载 · ${s.storage.error||'未知错误'}`]",'web storage')
s=rep(s,"$$('.diag').forEach(b=>b.disabled=s.display.state==='refreshing'||s.display.fault);$('#uploadBtn').disabled=!imageFrame||s.display.state==='refreshing'||s.display.fault;$('#calendarUploadBtn').disabled=!calendarFrame||s.display.state==='refreshing'||s.display.fault;","const fsOk=!!s.storage?.mounted;$$('.diag').forEach(b=>b.disabled=!fsOk||s.display.state==='refreshing'||s.display.fault);$('#uploadBtn').disabled=!imageFrame||!fsOk||s.display.state==='refreshing'||s.display.fault;$('#calendarUploadBtn').disabled=!calendarFrame||!fsOk||s.display.state==='refreshing'||s.display.fault;",'web buttons')
p.write_text(s,encoding='utf-8')

# release + validation
rw('tools/make_release.py',lambda s:s.replace('Muti-SSD2677-LocalWeb-C3 v1.2.0','Muti-SSD2677-LocalWeb-C3 v1.2.1'))
def val(s):
    s=s.replace('v1.2.0 source package','v1.2.1 source package').replace('PASS: v1.2.0 structural validation','PASS: v1.2.1 structural validation')
    needle='    require("packed[p>>2]|=codes[p]<<(6-((p&3)*2))" in html, "2bpp packing expression changed")\n'
    extra=needle+'\n    main_cpp = (ROOT / "src/main.cpp").read_text(encoding="utf-8")\n    app_config = (ROOT / "include/app_config.h").read_text(encoding="utf-8")\n    require(\'LittleFS.begin(true, muti::config::kLittleFsBasePath, 10, muti::config::kLittleFsPartitionLabel)\' in main_cpp, "LittleFS must mount the explicit custom partition label")\n    require(\'kLittleFsPartitionLabel[] = "littlefs"\' in app_config, "LittleFS partition label regression")\n    require(\'kFirmwareVersion[] = "1.2.1"\' in app_config, "firmware version is not 1.2.1")\n'
    return rep(s,needle,extra,'validator')
rw('tools/validate_project.py',val)

# docs
p=ROOT/'CHANGELOG.md'; s=p.read_text(encoding='utf-8'); entry='## 1.2.1 — 2026-08-21\n\n- 修复 v1.2.0 LittleFS 分区标签不匹配导致 `/upload.tmp` 无法创建。\n- 显式挂载 `littlefs` 分区，并增加挂载状态自检。\n- 显示驱动、LUT、GPIO、2bpp 帧格式不变。\n\n'; s=s.replace('# CHANGELOG\n\n','# CHANGELOG\n\n'+entry); p.write_text(s,encoding='utf-8')
for rel in ['README_烧录说明.md','docs/BUILD_STATUS.md','docs/TEST_PLAN.md']:
    rw(rel,lambda s:s.replace('v1.2.0','v1.2.1').replace(' 1.2.0',' 1.2.1'))
p=ROOT/'README_烧录说明.md'; s=p.read_text(encoding='utf-8'); note='> **v1.2.1 修复：** v1.2.0 的分区标签为 `littlefs`，Arduino-ESP32 2.0.17 默认查找 `spiffs`，导致网页可打开但 `/upload.tmp` 无法创建。若已完整烧录 v1.2.0，只需把 v1.2.1 `firmware.bin` 写到 `0x10000`，无需擦除 NVS/分区表。\n\n'; pos=s.find('\n')+1; s=s[:pos]+'\n'+note+s[pos:]; p.write_text(s,encoding='utf-8')
print('v1.2.1 patch applied')
