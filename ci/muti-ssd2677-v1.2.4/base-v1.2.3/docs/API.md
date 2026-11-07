# 本地 HTTP API

所有接口只由设备本地 WebServer 提供，无鉴权、无 TLS。仅应放在可信局域网中。

## 状态

```http
GET /api/status
```

返回固件、网络、屏幕、帧、LittleFS、冷却和最近一次驱动报告。

## Wi‑Fi

```http
GET  /api/wifi/scan?start=1
GET  /api/wifi/scan
POST /api/wifi/save       ssid=...&password=...
POST /api/wifi/forget
```

保存或忘记 Wi‑Fi 后设备延时重启。

## 设备名称

```http
POST /api/device/save     deviceName=...&apName=...
```

## 帧上传

```http
POST /api/upload
Content-Type: multipart/form-data
X-Frame-CRC32: 8位十六进制
```

文件字段名为 `frame`。设备要求文件长度严格为 153600 B；写入 `/upload.tmp` 后校验 CRC，再原子替换 `/frame.bin`。

## 屏幕操作

```http
POST /api/action
Content-Type: application/x-www-form-urlencoded
```

`action` 可为：

- `raw`
- `palette`
- `gray`
- `white`
- `refresh`
- `reboot`

## 下载当前帧

```http
GET /frame.bin
```


## v1.2.3 网络切换

```http
POST /api/network/sta
POST /api/network/ap
```

两个接口先返回 JSON，再延迟切换网络。
