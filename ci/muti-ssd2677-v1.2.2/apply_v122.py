#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else '.').resolve()


def read(rel: str) -> str:
    return (ROOT / rel).read_text(encoding='utf-8')


def write(rel: str, text: str) -> None:
    (ROOT / rel).write_text(text, encoding='utf-8')


def rep(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f'missing pattern: {label}')
    return text.replace(old, new)


# app_config.h
s = read('include/app_config.h')
s = rep(s, 'kFirmwareVersion[] = "1.2.1"', 'kFirmwareVersion[] = "1.2.2"', 'firmware version')
s = rep(s, 'inline constexpr uint32_t kSettingsVersion = 2;',
        'inline constexpr uint32_t kSettingsVersion = 3;', 'settings version')
s = rep(
    s,
    'inline constexpr char kLittleFsPartitionLabel[] = "littlefs";\n'
    'inline constexpr char kLittleFsBasePath[] = "/littlefs";',
    '// v1.0.x/v1.1.x used the Arduino-default label "spiffs" while\n'
    '// v1.2.0/v1.2.1 complete images used "littlefs".  The runtime probes\n'
    '// both labels without formatting first, so app-only upgrades preserve data.\n'
    'inline constexpr char kLittleFsPreferredPartitionLabel[] = "spiffs";\n'
    'inline constexpr char kLittleFsAlternatePartitionLabel[] = "littlefs";\n'
    'inline constexpr char kLittleFsBasePath[] = "/littlefs";',
    'filesystem labels')
write('include/app_config.h', s)

# partitions: new complete image returns to the legacy/default label.
s = read('partitions_4mb.csv')
s = rep(s, 'littlefs,   data, spiffs,', 'spiffs,     data, spiffs,', 'partition label')
write('partitions_4mb.csv', s)

# main.cpp
s = read('src/main.cpp')
s = rep(s,
        'bool storageMounted = false;\nString storageError;\n',
        'bool storageMounted = false;\n'
        'bool storageFormattedOnBoot = false;\n'
        'String storagePartitionLabel;\n'
        'String storageError;\n',
        'storage globals')

old = '''  settings.staSsid = preferences.getString("staSsid", "");
  settings.staPassword = preferences.getString("staPass", "");
  if (settings.staPassword.isEmpty()) {
    settings.staPassword = preferences.getString("staPassword", "");
  }
  displayState.displayedFrameCrc = preferences.getUInt("shownCrc", 0);
  settings.version = muti::config::kSettingsVersion;
  preferences.putUInt("cfgVersion", settings.version);
  preferences.putString("staPass", settings.staPassword);
  preferences.end();
'''
new = '''  settings.staSsid = preferences.getString("staSsid", "");
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
    Serial.printf("[NVS] migrated legacy Wi-Fi keys for SSID=%s\\n", settings.staSsid.c_str());
  }
'''
s = rep(s, old, new, 'legacy NVS migration')

old = '''        uploadState.error = String("无法创建 /upload.tmp；LittleFS mounted=") + (storageMounted ? "true" : "false") +
                            " total=" + LittleFS.totalBytes() + " used=" + LittleFS.usedBytes();'''
new = '''        uploadState.error = String("无法创建 /upload.tmp；LittleFS mounted=") + (storageMounted ? "true" : "false") +
                            " label=" + storagePartitionLabel +
                            " total=" + LittleFS.totalBytes() + " used=" + LittleFS.usedBytes();'''
s = rep(s, old, new, 'upload diagnostics')

old = '''  json += F(",\\\"partitionLabel\\\":\\\"");
  json += muti::config::kLittleFsPartitionLabel;
  json += F("\\\",\\\"error\\\":\\\"");'''
new = '''  json += F(",\\\"partitionLabel\\\":\\\"");
  json += jsonEscape(storagePartitionLabel);
  json += F("\\\",\\\"formattedOnBoot\\\":");
  json += boolJson(storageFormattedOnBoot);
  json += F(",\\\"error\\\":\\\"");'''
s = rep(s, old, new, 'status storage')

start = s.index('void mountStorage() {')
end = s.index('\n}\n\n}  // namespace', start) + 2
new_mount = r'''bool tryMountStorageLabel(const char* label, bool allowFormatRecovery) {
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
}'''
s = s[:start] + new_mount + s[end:]
write('src/main.cpp', s)

# web UI
s = read('web/index.html')
s = rep(s,
        'Muti-SSD2677-LocalWeb-C3 v1.2.1 · 本地网页 · 无服务器依赖',
        'Muti-SSD2677-LocalWeb-C3 v1.2.2 · 本地网页 · 双分区标签兼容',
        'web version')
s = rep(s,
        "['LittleFS',s.storage.mounted?`已挂载 · ${formatBytes(s.storage.usedBytes)} / ${formatBytes(s.storage.totalBytes)}`:`未挂载 · ${s.storage.error||'未知错误'}`]",
        "['LittleFS',s.storage.mounted?`已挂载 (${s.storage.partitionLabel||'未知标签'}) · ${formatBytes(s.storage.usedBytes)} / ${formatBytes(s.storage.totalBytes)}${s.storage.formattedOnBoot?' · 本次启动已格式化':''}`:`未挂载 · ${s.storage.error||'未知错误'}`]",
        'web storage row')
write('web/index.html', s)

# release metadata
s = read('tools/make_release.py')
s = rep(s, 'Muti-SSD2677-LocalWeb-C3 v1.2.1', 'Muti-SSD2677-LocalWeb-C3 v1.2.2', 'release version')
write('tools/make_release.py', s)

# Replace validator with a compact v1.2.2 validator. Display-driver hashes are
# frozen so this storage-only release cannot silently alter the waveform path.
validator = r'''#!/usr/bin/env python3
from __future__ import annotations
import gzip, hashlib, re, shutil, subprocess, zlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
errors=[]
def req(x,m):
    if not x: errors.append(m)
for rel in ['platformio.ini','partitions_4mb.csv','include/app_config.h','include/lut_profiles.h','include/web_ui.h','include/epd_ssd2677_tb.h','src/main.cpp','src/epd_ssd2677_tb.cpp','web/index.html','tools/embed_web.py']:
    req((ROOT/rel).is_file(),f'missing {rel}')
req(not (ROOT/'host').exists(),'host/ must not exist')
req(not (ROOT/'trmnl').exists(),'trmnl/ must not exist')
html=(ROOT/'web/index.html').read_text(encoding='utf-8')
main=(ROOT/'src/main.cpp').read_text(encoding='utf-8')
cfg=(ROOT/'include/app_config.h').read_text(encoding='utf-8')
combined='\n'.join(p.read_text(encoding='utf-8',errors='ignore') for p in ROOT.rglob('*') if p.is_file() and p.suffix.lower() in {'.cpp','.h','.html','.js','.ini'})
for token in ['remoteUrl','HTTPClient.h','FastAPI','Playwright','current_frame.bin']:
    req(token not in combined,f'forbidden token: {token}')
req('https://' not in html and 'http://' not in html,'external URL in UI')
req('FRAME_BYTES=153600' in html,'frame constant missing')
req('packed[p>>2]|=codes[p]<<(6-((p&3)*2))' in html,'2bpp expression changed')
req('kFirmwareVersion[] = "1.2.2"' in cfg,'wrong version')
req('kSettingsVersion = 3' in cfg,'wrong settings schema')
req('kLittleFsPreferredPartitionLabel[] = "spiffs"' in cfg,'preferred label missing')
req('kLittleFsAlternatePartitionLabel[] = "littlefs"' in cfg,'alternate label missing')
req('preferences.getString("ssid", "")' in main and 'preferences.getString("pass", "")' in main,'legacy Wi-Fi migration missing')
order=['kLittleFsPreferredPartitionLabel, false','kLittleFsAlternatePartitionLabel, false','kLittleFsPreferredPartitionLabel, true','kLittleFsAlternatePartitionLabel, true']
req(all(x in main for x in order),'dual-label calls missing')
if all(x in main for x in order): req([main.index(x) for x in order]==sorted(main.index(x) for x in order),'format order unsafe')
parts=(ROOT/'partitions_4mb.csv').read_text(encoding='utf-8')
req(re.search(r'^spiffs\s*,\s*data\s*,\s*spiffs\s*,\s*0x210000\s*,\s*0x1E0000',parts,re.M) is not None,'partition table mismatch')
frozen={'src/epd_ssd2677_tb.cpp':'009aa6bae952e9b959dfa982594cecb96fcb8cbe8fe17b0a9a7d41e8f39f0d20','include/epd_ssd2677_tb.h':'e11cc9e2ce988358ac6d230eb6a6f7063716f71e06672680b23865f0fd649187','include/lut_profiles.h':'6abb95eff6e9b9715a66971e07d658f44d33f82695bf5d63c0e6ac4b4c73de8e'}
for rel,exp in frozen.items(): req(hashlib.sha256((ROOT/rel).read_bytes()).hexdigest()==exp,f'frozen display baseline changed: {rel}')
lut=(ROOT/'include/lut_profiles.h').read_text(encoding='utf-8')
for name,crc in [('kE5Wsf1',0xDEA3DF46),('kE5Wsf',0xE086FA09)]:
    m=re.search(name+r'\[535\].*?\{(.*?)\};',lut,re.S); req(m is not None,f'{name} parse')
    if m:
        data=bytes(int(x,16) for x in re.findall(r'0x([0-9A-Fa-f]{2})',m.group(1))); req(len(data)==535,f'{name} length'); req(zlib.crc32(data)&0xffffffff==crc,f'{name} crc')
h=(ROOT/'include/web_ui.h').read_text(encoding='utf-8'); dm=re.search(r'WEB_UI_GZ\[.*?\].*?\{(.*?)\};',h,re.S); sm=re.search(r'WEB_UI_SOURCE_SHA256\[\] = "([0-9a-f]{64})"',h)
req(dm is not None and sm is not None,'embedded UI parse')
if dm and sm:
    data=bytes(int(x,16) for x in re.findall(r'0x([0-9A-Fa-f]{2})',dm.group(1))); dec=gzip.decompress(data); req(dec==(ROOT/'web/index.html').read_bytes(),'embedded UI stale'); req(hashlib.sha256(dec).hexdigest()==sm.group(1),'embedded UI hash')
node=shutil.which('node')
if node:
    scripts=re.findall(r'<script>(.*?)</script>',html,re.S); req(bool(scripts),'script missing')
    if scripts:
        t=ROOT/'tests/web-inline-check.js'; t.parent.mkdir(exist_ok=True); t.write_text(scripts[-1],encoding='utf-8'); r=subprocess.run([node,'--check',str(t)],capture_output=True,text=True); req(r.returncode==0,'JavaScript: '+r.stderr.strip())
for e in errors: print('ERROR:',e)
if errors: raise SystemExit(1)
print('PASS: v1.2.2 structural validation')
'''
write('tools/validate_project.py', validator)
print('v1.2.2 patch applied')
