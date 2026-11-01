# 肺活量局域网课堂接口

Python 3.8+ 标准库服务，默认 `http://教师电脑局域网IP:8787/`。教师和学生均由这个地址打开同一份 HTML；GitHub Pages 页面和直接双击 HTML 的离线模式不能直接跨源访问本服务。数据仅存在服务器进程内存；退出服务前由教师导出。

所有接口为同源 JSON。修改请求必须 `Content-Type: application/json`。创建/加入之外的请求都使用 `Authorization: Bearer <teacherToken 或 studentToken>`，令牌不得放 URL。失败统一为 `{"error":{"code":"...","message":"中文提示"}}`，非 2xx 状态码。

## 前端必需接口

| 请求 | 请求正文 | 响应 |
|---|---|---|
| `GET /api/health` | 无 | `{ok:true,service:"lung-classroom",version:"1.0",limits:{groups:12,membersPerGroup:8,photoBytes:1258291}}` |
| `POST /api/rooms` | `{groups:6}`，可省略默认6 | `{code:"123456",teacherToken:"…",state:{…}}`，201 |
| `POST /api/rooms/{code}/join` | `{group:1,member:"A"}`，A–H | `{studentToken:"…",state:{…}}`，201 |
| `GET /api/rooms/{code}` | 无，必须携带令牌 | `{state:{…}}` |
| `PATCH /api/rooms/{code}` | 教师专用，`{groups:8}` 或 `{status:"archived"}` / `{status:"active"}` / `{status:"closed"}` | `{state:{…}}` |
| `PATCH /api/rooms/{code}/records/{group}/{member}` | `{values:[1200,1300,null],valid:[true,true,true],activity:"经常"}`，字段可分别省略；教师还可传 `{comment:"密封规范",highlight:true}` | `{state:{…}}` |
| `POST /api/rooms/{code}/photos/{group}/{member}` | `{dataUrl:"data:image/jpeg;base64,…"}`；支持JPEG/PNG/WebP | `{state:{…}}` |
| `GET /api/rooms/{code}/photos/{group}/{member}` | 无，必须携带令牌 | 图片字节及正确 Content-Type；前端 `fetch` 带令牌后 `blob()` / `URL.createObjectURL()` |

修改自己的记录、照片：学生令牌仅允许其加入的那个组和成员；教师可修改任意记录，点评和 highlight 仅教师可改。`GET state` 对所有已加入者返回课堂匿名实测记录和教师点评；不返回任何令牌、IP、真实姓名或照片base64。照片按 `photoVersion` 变化再取，避免每轮同步重复传图。

## state 结构

```json
{
  "code": "123456",
  "groups": 6,
  "status": "active",
  "revision": 3,
  "createdAt": "2026-11-01T01:23:45Z",
  "updatedAt": "2026-11-01T01:24:45Z",
  "members": [
    {
      "group": 1,
      "member": "A",
      "values": [1200, 1300, 1250],
      "valid": [true, true, true],
      "validCount": 3,
      "completed": true,
      "best": 1300,
      "activity": "经常",
      "comment": "密封规范",
      "highlight": false,
      "photoVersion": 0,
      "joined": true,
      "updatedAt": "2026-11-01T01:24:45Z"
    }
  ]
}
```

`members` 仅含已加入或被教师录入的成员，不含96条空白行。排序固定为组号、字母。`values` 长度必须为3；每项是整数100–8000或null。这是录入核对范围，不是健康判定标准。`valid` 为长度3的布尔值数组；无效的一次不参与最佳值。`best` 为所有有效已录入值最大值，无有效值为null；`validCount` 为有效已录入次数；`completed` 仅在3个有效测量都存在时为true。未完成者前端可以显示“暂最大”，不能当作完整三次结果进入全班统计图。

`activity` 仅允许 `经常`、`有时`、`较少`、`不填写`，默认不填写；只支持课堂讨论，不作因果或诊断判断。`comment` 限200字，`highlight` 为布尔值。`photoVersion` 为0代表未上传，每次更换照片递增。

## 生命周期与控制

- `active`：允许加入和测量上传；老师可点评和改组数。
- `archived`：暂停新加入、测量和照片上传；教师仍可点评、改组数，也可以改回active。
- `closed`：只读且不可重开；已有教师/学生令牌仍可读取和导出。结束不会立即抹去证据。
- 减少组数时，被移除组只要有成员记录、照片或已经加入的学生就返回409 `GROUP_NOT_EMPTY`，不会默默删除。
- 同一成员已经被另一浏览器加入时，返回409 `MEMBER_IN_USE`。保留令牌即可通过GET继续使用；仅凭课堂码不能冒用他人。
- 如确需清空，教师可 `DELETE /api/rooms/{code}/records/{group}/{member}`；此操作会删除该成员的照片与记录并让旧学生令牌失效，前端必须显示明确的删除确认。
- 教师可 `DELETE /api/rooms/{code}/photos/{group}/{member}` 删除单张照片；学生可删除自己的照片。都仅允许active课堂。

## 照片与资源限制

每张解码后照片不超过1,258,291字节（1.2MiB）。客户端建议用Canvas缩至最长边1280px、JPEG质量0.75，上传前预览。每课堂照片合计48MiB、全服务合计128MiB、最多12间课堂。只接受图片数据URI和相符的文件头，拒绝SVG/HTML/任意文件路径。照片读取须课堂令牌并返回nosniff。

不提供CORS。服务核对Host、Origin和Sec-Fetch-Site；浏览器须从服务自己的http地址打开页面。教师可以每1.5–2秒GET state同步；如401说明令牌失效，403/409应展示服务器中文message。

## 反向代理预览验证

默认只允许本机与局域网同源地址。若开发预览代理提供一个确切的HTTPS来源，可以使用 `--trusted-origin https://exact-preview.example` 显式允许它。该参数允许代理保留外部Host或转发为内部Host，但外部Origin必须与显式配置精确匹配；不接受通配符、路径、凭据，不开启CORS。正常教室局域网启动无需这个参数。
