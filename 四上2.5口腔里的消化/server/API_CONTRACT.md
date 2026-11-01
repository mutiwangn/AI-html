# 《口腔里的消化》局域网课堂接口

Python 3.8+ 标准库服务，默认 `http://教师电脑局域网IP:8787/`。教师和学生从这个地址打开同一份 HTML，再输入同一个六位课堂码。GitHub Pages 在线页、直接双击 HTML 的离线页可以独立使用教学功能；跨设备互联须从本地服务提供的地址进入。服务不开放 CORS。

接口沿用《测量肺活量》的身份、课堂、记录、照片协议；本课的观察数据使用 `observations`，不能填写到肺活量的 `values` 字段。

## 请求与身份

所有修改请求使用 `Content-Type: application/json`。创建与加入之外的请求均须带 `Authorization: Bearer <teacherToken 或 studentToken>`。令牌不得放 URL。失败返回非 2xx 状态和 `{"error":{"code":"...","message":"中文提示"}}`。

| 请求 | 正文 | 返回 |
|---|---|---|
| `GET /api/health` | 无 | `{ok:true,service:"oral-classroom",version:"1.0",lesson:"四上2.5口腔里的消化",lanUrls:["http://192.168.1.20:8787/"],limits:{groups:12,membersPerGroup:8,photoBytes:1258291,photosPerMember:1}}` |
| `POST /api/rooms` | `{groups:6}`，默认6组 | `{code:"123456",teacherToken:"…",state:{…}}`，201 |
| `POST /api/rooms/{code}/join` | `{group:1,member:"A"}` | `{studentToken:"…",state:{…}}`，201 |
| `GET /api/rooms/{code}` | 无，须身份令牌 | `{state:{…}}` |
| `PATCH /api/rooms/{code}` | 教师专用：`{groups:8}` 或 `{status:"archived"}` / `{status:"active"}` / `{status:"closed"}` | `{state:{…}}` |
| `PATCH /api/rooms/{code}/records/{group}/{member}` | `{observations:{"1":{size:"小块",texture:"较硬",moisture:"较干"}},note:"观察说明"}`；教师另可传 `{comment:"证据清楚",highlight:true}` | `{state:{…}}` |
| `POST /api/rooms/{code}/photos/{group}/{member}` | `{dataUrl:"data:image/jpeg;base64,…"}` | `{state:{…}}` |
| `GET /api/rooms/{code}/photos/{group}/{member}` | 无，须身份令牌 | 图片字节；前端 `fetch` 带令牌后用 `blob()` 与 `URL.createObjectURL()` |
| `DELETE /api/rooms/{code}/photos/{group}/{member}` | 无 | `{state:{…}}` |
| `DELETE /api/rooms/{code}/records/{group}/{member}` | 教师专用，无 | 删除记录与照片、撤销该成员身份；`{state:{…}}` |
| `POST /api/rooms/{code}/leave` | 学生专用，`{}` | 撤销当前令牌，保留观察记录；`{ok:true,state:{…}}` |

保留 A–H 成员代码以兼容既有课堂协议。以小组为单位共用一台平板时，前端固定 `member:"A"`，学生只需选择第几小组。同一组同一成员同时只能被一台浏览器占用。

`lanUrls` 由 HTTP 服务启动时确认的 `allowed_hosts` 中非回环、非未指定的 IPv4 地址与实际监听端口生成，不使用浏览器提供的 Host。排序依次优先192.168网段、10网段、172.16–172.31网段，随后为其他地址；未发现地址时返回空数组。教师从 localhost/127.0.0.1 打开页面时，前端“复制课堂网址”应优先使用此数组中的局域网地址，不能把回环地址发给学生；本来就从局域网地址进入时可保留当前来源。

## 观察数据

`observations` 固定包含字符串键 `"1"`、`"5"`、`"10"`，对应教学活动的三个观察节点。每个节点的三个字段为：

| 字段 | 中文 | 允许值 |
|---|---|---|
| `size` | 大小 | `""`、`"大块"`、`"小块"`、`"细碎"` |
| `texture` | 软硬 | `""`、`"较硬"`、`"较软"` |
| `moisture` | 干湿 | `""`、`"较干"`、`"湿润"` |

空字符串表示尚未记录。PATCH 可以只提交某个节点或某个字段；服务合并更新并保留其他观察。拒绝未知节点、未知字段、数组和其他值。`note` 与教师 `comment` 均为不超过200字的字符串；`highlight` 为布尔值。前端渲染文字必须使用 `textContent` 或等价转义。

这些是实际观察选项，服务不会根据咀嚼次数填入“标准答案”，不会以10次作为吞咽标准，也不会对真实观察判对错。

## state 结构

```json
{
  "code": "123456",
  "groups": 6,
  "status": "active",
  "revision": 3,
  "createdAt": "2026-11-01T05:00:00Z",
  "updatedAt": "2026-11-01T05:01:00Z",
  "members": [
    {
      "group": 1,
      "member": "A",
      "observations": {
        "1": {"size":"小块","texture":"较硬","moisture":"较干"},
        "5": {"size":"","texture":"","moisture":""},
        "10": {"size":"","texture":"","moisture":""}
      },
      "note": "我们观察到馒头出现碎块。",
      "comment": "能用实际观察作依据。",
      "highlight": true,
      "observationCount": 1,
      "completed": false,
      "photoVersion": 0,
      "joined": true,
      "updatedAt": "2026-11-01T05:01:00Z"
    }
  ]
}
```

`members` 只含已加入或由教师建立记录的成员，按组号、字母排序。所有已加入者可读取匿名课堂记录、点评及照片，用于大屏交流；状态中没有身份令牌、IP或照片 base64。学生只能修改自身身份对应的记录与照片，不能修改点评或其他组数据。

`observationCount` 是三个字段都已填写的节点个数；`completed` 表示三个节点都已记录，与结果是否符合动画无关。`photoVersion=0` 表示无照片；更换照片后递增，前端仅在版本变更时重新下载。

## 生命周期

- `active`：允许加入、观察与照片上传；教师可点评及调整组数。
- `archived`：暂停新加入和观察、照片更新；教师仍可点评，可恢复 `active`。
- `closed`：只读且不可重开；原有令牌仍可查看和导出。
- 学生主动 `leave` 在上述三个状态均可使用；令牌立即失效，记录保留，`joined` 变为 `false`。其他设备随后可按原组号和成员代号重新加入 active 课堂并继续使用该小组记录。
- 教师删除成员会同步删除记录与照片并撤销令牌；前端应显示明确的删除确认。
- 减少组数时，如果被减少的组仍有任何记录，返回409 `GROUP_NOT_EMPTY`，不隐式删除。应先导出、明确删除该组成员，再调整组数。
- 同一组成员已加入时返回409 `MEMBER_IN_USE`。保留原令牌可继续读取；仅凭课堂码不能顶替在线成员。

## 照片与资源

每个组内成员至多一张照片，再次上传替换原照片。照片允许为空。支持 JPEG/PNG/WebP，校验 MIME 与文件头，拒绝 SVG/HTML 和文件路径。每张解码后最大1,258,291字节（1.2MiB）；每课堂照片合计48MiB，全服务合计128MiB；最多12间课堂、每课堂12组、每组A–H八个成员。

建议前端在用户确认上传后以 Canvas 将照片长边缩至1280px、JPEG质量0.75；上传前预览。读取照片须课堂令牌，响应带 `nosniff`。数据仅在服务进程内存中，停止服务即清除，教师须提前导出。

## 同源与静态文件边界

静态服务只提供 `/` 与 `/index.html` 指向的本课 HTML；不会列目录或提供任意文件，不公开 Python 源码、启动文件或身份对象。API 检查 Host、Origin 与 Sec-Fetch-Site。正常教学不需要 `--trusted-origin`。

开发反向代理可用 `--trusted-origin https://exact-preview.example` 显式允许一个确切来源。禁止通配符、路径和凭据，不开启跨源访问。教师轮询推荐1.5–2秒一次；401时停止轮询并要求重新加入，其他错误直接展示服务器中文提示。
