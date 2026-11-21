#!/usr/bin/env python3
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
req('https://' not in html,'external HTTPS URL in UI')
for token in ['src=\"http','href=\"http','fetch(\"http',"fetch('http"]:
    req(token not in html,f'external runtime URL in UI: {token}')
req('FRAME_BYTES=153600' in html,'frame constant missing')
req('packed[p>>2]|=codes[p]<<(6-((p&3)*2))' in html,'2bpp expression changed')
req('kFirmwareVersion[] = "1.2.3"' in cfg,'wrong version')
req('kSettingsVersion = 3' in cfg,'wrong settings schema')
req('kMdnsHostname[] = \"muti\"' in cfg,'friendly mDNS hostname missing')
req('server.on(\"/api/network/sta\"' in main and 'server.on(\"/api/network/ap\"' in main,'network switch APIs missing')
req('WiFi.softAPConfig(apIp, apIp, subnet)' in main,'explicit AP IP missing')
req('for (uint8_t attempt = 1; attempt <= 3' in main,'AP retry loop missing')
req('http://muti.local/' in html,'friendly mDNS address missing from UI')
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
print('PASS: v1.2.3 structural validation')
