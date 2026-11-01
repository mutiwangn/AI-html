#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""四上2.4测量肺活量：仅用Python标准库的同局域网课堂服务。"""

import argparse
import base64
import binascii
import copy
import datetime
import http.server
import ipaddress
import json
import pathlib
import re
import secrets
import socket
import threading
import urllib.parse

VERSION = "1.0"
MAX_PHOTO = 1258291
MAX_BODY = 1800000
MAX_ROOM_PHOTOS = 48 * 1024 * 1024
MAX_ALL_PHOTOS = 128 * 1024 * 1024
ACTIVITIES = ("经常", "有时", "较少", "不填写")


def timestamp():
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class APIError(Exception):
    def __init__(self, status, code, message):
        super().__init__(message)
        self.status, self.code, self.message = status, code, message


def fail(status, code, message):
    raise APIError(status, code, message)


def whole_number(value):
    return isinstance(value, int) and not isinstance(value, bool)


def blank_record(group, member):
    return dict(group=group, member=member, values=[None, None, None],
                valid=[True, True, True], activity="不填写", comment="",
                highlight=False, photoVersion=0, joined=False, updatedAt=timestamp())


def public_record(record):
    result = copy.deepcopy(record)
    values = [v for v, valid in zip(result["values"], result["valid"])
              if valid and v is not None]
    result.update(validCount=len(values), completed=len(values) == 3,
                  best=max(values) if values else None)
    return result


def public_state(room):
    return {"code": room["code"], "groups": room["groups"],
            "status": room["status"], "revision": room["revision"],
            "createdAt": room["createdAt"], "updatedAt": room["updatedAt"],
            "members": [public_record(room["records"][key])
                        for key in sorted(room["records"])]}


def touch(room):
    room["revision"] += 1
    room["updatedAt"] = timestamp()


class ClassroomState:
    def __init__(self):
        self.rooms = {}
        self.lock = threading.RLock()

    def photo_bytes(self):
        return sum(len(p["bytes"]) for room in self.rooms.values()
                   for p in room["photos"].values())

    def room(self, code):
        room = self.rooms.get(code)
        if room is None:
            fail(404, "ROOM_NOT_FOUND", "找不到这个课堂码，请检查输入或联系老师。")
        return room

    def identity(self, room, token):
        if token and secrets.compare_digest(token, room["teacherToken"]):
            return "teacher", None
        key = room["students"].get(token)
        if key:
            return "student", key
        fail(401, "AUTH_REQUIRED", "课堂身份已失效，请重新加入课堂。")

    def writable(self, room):
        if room["status"] != "active":
            fail(409, "ROOM_READ_ONLY", "课堂已封存或结束，目前只能查看与导出。")

    def teacher(self, role):
        if role != "teacher":
            fail(403, "TEACHER_ONLY", "只有教师可以执行此操作。")

    def owns(self, role, owner, key):
        if role != "teacher" and owner != key:
            fail(403, "OTHER_MEMBER", "只能修改自己组内所选成员的记录。")

    def key(self, room, group, member):
        if not whole_number(group) or not 1 <= group <= room["groups"]:
            fail(400, "BAD_GROUP", "请选择课堂内有效的小组。")
        if member not in tuple("ABCDEFGH"):
            fail(400, "BAD_MEMBER", "成员代号应为A至H。")
        return group, member

    def dispatch(self, method, path, body, token):
        if path == "/api/health" and method == "GET":
            return 200, dict(ok=True, service="lung-classroom", version=VERSION,
                            limits=dict(groups=12, membersPerGroup=8, photoBytes=MAX_PHOTO)), None
        if path == "/api/rooms" and method == "POST":
            if set(body) - {"groups"}:
                fail(400, "UNKNOWN_FIELD", "创建课堂仅接受groups字段。")
            groups = body.get("groups", 6)
            if not whole_number(groups) or not 1 <= groups <= 12:
                fail(400, "BAD_GROUPS", "小组数量应为1至12。")
            if len(self.rooms) >= 12:
                fail(409, "ROOM_LIMIT", "当前已创建12间课堂，请导出需要的数据后重新启动服务。")
            code = str(secrets.randbelow(900000) + 100000)
            while code in self.rooms:
                code = str(secrets.randbelow(900000) + 100000)
            now = timestamp()
            room = dict(code=code, groups=groups, status="active", revision=1,
                        createdAt=now, updatedAt=now, teacherToken=secrets.token_urlsafe(32),
                        students={}, claims={}, records={}, photos={}, photoSequence=0)
            self.rooms[code] = room
            return 201, dict(code=code, teacherToken=room["teacherToken"], state=public_state(room)), None

        match = re.fullmatch(r"/api/rooms/([0-9]{6})(?:/(.*))?", path)
        if not match:
            fail(404, "NOT_FOUND", "没有这个接口。")
        code, suffix = match.group(1), match.group(2)
        room = self.room(code)
        if suffix == "join" and method == "POST":
            self.writable(room)
            if set(body) - {"group", "member"}:
                fail(400, "UNKNOWN_FIELD", "加入课堂仅接受group、member字段。")
            key = self.key(room, body.get("group"), body.get("member"))
            if key in room["claims"]:
                fail(409, "MEMBER_IN_USE", "该成员已经加入，请选择空闲的成员代号。")
            new_token = secrets.token_urlsafe(32)
            room["students"][new_token] = key
            room["claims"][key] = new_token
            record = room["records"].setdefault(key, blank_record(*key))
            record["joined"] = True
            record["updatedAt"] = timestamp()
            touch(room)
            return 201, dict(studentToken=new_token, state=public_state(room)), None

        role, owner = self.identity(room, token)
        if suffix is None:
            if method == "GET":
                return 200, {"state": public_state(room)}, None
            if method == "PATCH":
                self.teacher(role)
                if room["status"] == "closed":
                    fail(409, "ROOM_CLOSED", "课堂已经结束，只能查看与导出。")
                if set(body) - {"groups", "status"} or not body:
                    fail(400, "UNKNOWN_FIELD", "请提供groups或status。")
                new_groups = body.get("groups", room["groups"])
                new_status = body.get("status", room["status"])
                if not whole_number(new_groups) or not 1 <= new_groups <= 12:
                    fail(400, "BAD_GROUPS", "小组数量应为1至12。")
                if new_status not in ("active", "archived", "closed"):
                    fail(400, "BAD_STATUS", "课堂状态应为active、archived或closed。")
                if any(k[0] > new_groups for k in room["records"]):
                    fail(409, "GROUP_NOT_EMPTY", "被减少的小组已有成员或记录；请先导出并明确清空这些成员。")
                room["groups"], room["status"] = new_groups, new_status
                touch(room)
                return 200, {"state": public_state(room)}, None
            fail(405, "METHOD_NOT_ALLOWED", "此接口不支持该请求方法。")

        item = re.fullmatch(r"(records|photos)/([0-9]{1,2})/([A-H])", suffix or "")
        if not item:
            fail(404, "NOT_FOUND", "没有这个接口。")
        kind = item.group(1)
        key = self.key(room, int(item.group(2)), item.group(3))
        record = room["records"].get(key)
        if kind == "photos" and method == "GET":
            photo = room["photos"].get(key)
            if not photo:
                fail(404, "PHOTO_NOT_FOUND", "该成员还没有上传照片。")
            return 200, photo["bytes"], photo["mime"]

        self.owns(role, owner, key)
        if kind == "records" and method == "PATCH":
            allowed = {"values", "valid", "activity", "comment", "highlight"}
            if set(body) - allowed or not body:
                fail(400, "UNKNOWN_FIELD", "记录字段不正确。")
            if "comment" in body or "highlight" in body:
                self.teacher(role)
            measurement_edit = any(k in body for k in ("values", "valid", "activity"))
            if measurement_edit:
                self.writable(room)
            elif room["status"] == "closed":
                fail(409, "ROOM_CLOSED", "课堂已经结束，只能查看与导出。")
            candidate = copy.deepcopy(record) if record else blank_record(*key)
            if "values" in body:
                values = body["values"]
                if not isinstance(values, list) or len(values) != 3:
                    fail(400, "BAD_VALUES", "请录入三次测量；尚未测量的位置保留空白。")
                if any(v is not None and (not whole_number(v) or not 100 <= v <= 8000) for v in values):
                    fail(400, "BAD_VALUE_RANGE", "请核对读数，输入100至8000之间的整数毫升；这不是健康评价范围。")
                candidate["values"] = values
            if "valid" in body:
                valid = body["valid"]
                if not isinstance(valid, list) or len(valid) != 3 or any(type(v) is not bool for v in valid):
                    fail(400, "BAD_VALID", "三次测量的有效标记应为true或false。")
                candidate["valid"] = valid
            if "activity" in body:
                if body["activity"] not in ACTIVITIES:
                    fail(400, "BAD_ACTIVITY", "活动频率应选择经常、有时、较少或不填写。")
                candidate["activity"] = body["activity"]
            if "comment" in body:
                if not isinstance(body["comment"], str) or len(body["comment"]) > 200:
                    fail(400, "BAD_COMMENT", "点评请控制在200字以内。")
                candidate["comment"] = body["comment"]
            if "highlight" in body:
                if type(body["highlight"]) is not bool:
                    fail(400, "BAD_HIGHLIGHT", "展示标记应为true或false。")
                candidate["highlight"] = body["highlight"]
            candidate["updatedAt"] = timestamp()
            room["records"][key] = candidate
            touch(room)
            return 200, {"state": public_state(room)}, None

        if kind == "records" and method == "DELETE":
            self.teacher(role)
            self.writable(room)
            if not record:
                fail(404, "MEMBER_NOT_FOUND", "此成员没有记录。")
            revoked = room["claims"].pop(key, None)
            if revoked:
                room["students"].pop(revoked, None)
            room["records"].pop(key, None)
            room["photos"].pop(key, None)
            touch(room)
            return 200, {"state": public_state(room)}, None

        if kind == "photos" and method in ("POST", "DELETE"):
            self.writable(room)
            if not record:
                fail(404, "MEMBER_NOT_FOUND", "请先加入课堂或建立测量记录。")
            if method == "DELETE":
                room["photos"].pop(key, None)
                record["photoVersion"] = 0
            else:
                if set(body) != {"dataUrl"} or not isinstance(body.get("dataUrl"), str):
                    fail(400, "BAD_PHOTO", "请提供图片dataUrl。")
                image = re.fullmatch(r"data:(image/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\r\n]+)", body["dataUrl"])
                if not image:
                    fail(400, "BAD_PHOTO", "仅支持JPEG、PNG、WebP照片。")
                try:
                    raw = base64.b64decode(image.group(2).replace("\r", "").replace("\n", ""), validate=True)
                except (ValueError, binascii.Error):
                    fail(400, "BAD_PHOTO", "照片数据不完整，请重新选择。")
                mime = image.group(1)
                signature_ok = ((mime == "image/jpeg" and raw.startswith(b"\xff\xd8\xff"))
                                or (mime == "image/png" and raw.startswith(b"\x89PNG\r\n\x1a\n"))
                                or (mime == "image/webp" and len(raw) >= 12 and raw[:4] == b"RIFF" and raw[8:12] == b"WEBP"))
                if not signature_ok:
                    fail(400, "BAD_PHOTO", "图片格式与文件内容不一致。")
                if len(raw) > MAX_PHOTO:
                    fail(413, "PHOTO_TOO_LARGE", "照片过大，请缩小到1.2MiB以内后上传。")
                old_size = len(room["photos"].get(key, {}).get("bytes", b""))
                room_bytes = sum(len(p["bytes"]) for p in room["photos"].values())
                if room_bytes - old_size + len(raw) > MAX_ROOM_PHOTOS or self.photo_bytes() - old_size + len(raw) > MAX_ALL_PHOTOS:
                    fail(413, "PHOTO_STORAGE_FULL", "照片容量已满，请教师导出后删除不需要的照片。")
                room["photos"][key] = dict(mime=mime, bytes=raw)
                room["photoSequence"] += 1
                record["photoVersion"] = room["photoSequence"]
            record["updatedAt"] = timestamp()
            touch(room)
            return 200, {"state": public_state(room)}, None
        fail(405, "METHOD_NOT_ALLOWED", "此接口不支持该请求方法。")


def local_hosts(bind_host):
    hosts = {"localhost", "127.0.0.1", "::1"}
    for name in (socket.gethostname(), socket.getfqdn()):
        if name:
            hosts.add(name.lower())
            try:
                hosts.update(socket.gethostbyname_ex(name)[2])
            except socket.error:
                pass
    try:
        probe = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            probe.connect(("192.0.2.1", 9))
            hosts.add(probe.getsockname()[0])
        finally:
            probe.close()
    except socket.error:
        pass
    if bind_host not in ("0.0.0.0", "::", ""):
        hosts.add(bind_host.lower())
    return hosts


class ClassroomHTTPServer(http.server.ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def __init__(self, address, html_path, state=None, extra_hosts=None, trusted_origins=None):
        self.html_path = pathlib.Path(html_path)
        self.state = state or ClassroomState()
        self.allowed_hosts = local_hosts(address[0]) | set(extra_hosts or [])
        self.trusted_origins = set()
        for origin in trusted_origins or []:
            try:
                parsed = urllib.parse.urlsplit(origin)
                if (parsed.scheme not in ("http", "https") or not parsed.hostname
                        or "*" in parsed.hostname or parsed.username or parsed.password
                        or parsed.path not in ("", "/") or parsed.query or parsed.fragment
                        or any(c.isspace() for c in origin)):
                    raise ValueError("invalid origin")
                self.trusted_origins.add((parsed.scheme, parsed.hostname.lower(),
                                          parsed.port or (443 if parsed.scheme == "https" else 80)))
            except ValueError:
                raise ValueError("trusted-origin必须是完整、确切的http(s)来源，不得带通配符、路径或凭据。")
        super().__init__(address, ClassroomHandler)


class ClassroomHandler(http.server.BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "LungClassroom/" + VERSION
    sys_version = ""

    def setup(self):
        super().setup()
        self.connection.settimeout(15)

    def log_message(self, fmt, *args):
        # 不输出请求头、请求正文、课堂码或身份令牌。
        return

    def _origin(self, value):
        try:
            parsed = urllib.parse.urlsplit(value)
            port = parsed.port or (80 if parsed.scheme == "http" else 443)
            return (parsed.scheme, (parsed.hostname or "").lower(), port, parsed)
        except ValueError:
            fail(403, "BAD_ORIGIN", "请从教师电脑显示的课堂网址打开本页。")

    def _check_request(self):
        host = self.headers.get("Host", "")
        scheme, hostname, port, parsed = self._origin("http://" + host)
        local_authority = hostname in self.server.allowed_hosts and port == self.server.server_port
        proxy_authority = any(hostname == trusted_host and
                              ((parsed.port is None and trusted_port == (443 if trusted_scheme == "https" else 80))
                               or parsed.port == trusted_port)
                              for trusted_scheme, trusted_host, trusted_port in self.server.trusted_origins)
        if (not host or not (local_authority or proxy_authority)
                or parsed.username or parsed.password or parsed.path or parsed.query or parsed.fragment
                or any(c.isspace() for c in host)):
            fail(403, "BAD_HOST", "请使用教师电脑显示的本机或局域网课堂网址。")
        origin = self.headers.get("Origin")
        if origin:
            oscheme, ohost, oport, op = self._origin(origin)
            local_origin = local_authority and (oscheme, ohost, oport) == ("http", hostname, port)
            trusted_origin = (oscheme, ohost, oport) in self.server.trusted_origins
            if not (local_origin or trusted_origin) or op.path or op.query or op.fragment or op.username or op.password:
                fail(403, "CROSS_ORIGIN", "请先从局域网课堂网址打开页面，再进行课堂操作。")
        fetch_site = self.headers.get("Sec-Fetch-Site", "")
        if fetch_site not in ("", "same-origin", "none"):
            fail(403, "CROSS_ORIGIN", "课堂仅允许同源页面访问。")
        if self.headers.get("Transfer-Encoding"):
            fail(400, "BAD_ENCODING", "此服务不支持分块上传。")

    def _body(self):
        if self.command not in ("POST", "PATCH", "DELETE"):
            return {}
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            fail(400, "BAD_LENGTH", "请求长度不正确。")
        if not 0 <= length <= MAX_BODY:
            fail(413, "BODY_TOO_LARGE", "上传内容过大，请缩小照片后重试。")
        if self.command == "DELETE" and length == 0:
            return {}
        if self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower() != "application/json":
            fail(415, "JSON_REQUIRED", "请使用JSON格式提交课堂数据。")
        try:
            raw = self.rfile.read(length)
            if len(raw) != length:
                fail(400, "INCOMPLETE_BODY", "上传未完成，请重试。")
            value = json.loads(raw.decode("utf-8"))
        except (UnicodeError, ValueError):
            fail(400, "BAD_JSON", "课堂数据格式不正确。")
        if not isinstance(value, dict):
            fail(400, "BAD_JSON", "课堂数据应为JSON对象。")
        return value

    def _respond(self, status, payload, mime=None):
        if isinstance(payload, bytes):
            data = payload
        else:
            data = json.dumps(payload, ensure_ascii=False, allow_nan=False, separators=(",", ":")).encode("utf-8")
            mime = "application/json; charset=utf-8"
        self.send_response(status)
        self.send_header("Content-Type", mime or "application/octet-stream")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "SAMEORIGIN")
        self.send_header("Referrer-Policy", "no-referrer")
        if status >= 400:
            self.send_header("Connection", "close")
            self.close_connection = True
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(data)

    def _handle(self):
        try:
            self._check_request()
            parsed = urllib.parse.urlsplit(self.path)
            if parsed.scheme or parsed.netloc or parsed.fragment:
                fail(400, "BAD_PATH", "请求地址不正确。")
            path = parsed.path
            if path in ("/", "/index.html") and self.command in ("GET", "HEAD"):
                try:
                    html = self.server.html_path.read_bytes()
                except OSError:
                    fail(503, "HTML_NOT_FOUND", "请将本课index.html放到server.py同一文件夹后重试。")
                self._respond(200, html, "text/html; charset=utf-8")
                return
            if not path.startswith("/api/"):
                fail(404, "NOT_FOUND", "没有这个页面。")
            body = self._body()
            auth = self.headers.get("Authorization", "")
            token = auth[7:] if auth.startswith("Bearer ") else ""
            with self.server.state.lock:
                result = self.server.state.dispatch(self.command, path, body, token)
            self._respond(*result)
        except APIError as error:
            self._respond(error.status, {"error": {"code": error.code, "message": error.message}})
        except (BrokenPipeError, ConnectionResetError, socket.timeout):
            self.close_connection = True
        except Exception:
            # 不泄露内部对象、路径、学生照片或身份令牌。
            self._respond(500, {"error": {"code": "SERVER_ERROR", "message": "服务暂时未完成此操作，请重试。"}})

    do_GET = _handle
    do_HEAD = _handle
    do_POST = _handle
    do_PATCH = _handle
    do_DELETE = _handle
    do_PUT = _handle
    do_OPTIONS = _handle


def find_html(explicit=None):
    if explicit:
        return pathlib.Path(explicit).resolve()
    directory = pathlib.Path(__file__).resolve().parent
    for candidate in (directory / "index.html", directory.parent / "dist" / "index.html"):
        if candidate.is_file():
            return candidate
    return directory / "index.html"


def main():
    parser = argparse.ArgumentParser(description="测量肺活量同局域网课堂服务")
    parser.add_argument("--host", default="0.0.0.0", help="监听地址，默认允许同局域网访问")
    parser.add_argument("--port", type=int, default=8787, help="端口，默认8787")
    parser.add_argument("--html", help="本课单体HTML路径，默认同目录index.html")
    parser.add_argument("--advertise-host", action="append", default=[], help="额外允许的本机地址或主机名")
    parser.add_argument("--trusted-origin", action="append", default=[],
                        help="显式信任的反向代理来源，例如https://exact-preview.example；禁止通配符")
    args = parser.parse_args()
    html = find_html(args.html)
    if not html.is_file():
        parser.error("未找到本课HTML，请把index.html与server.py放在同一文件夹。")
    try:
        server = ClassroomHTTPServer((args.host, args.port), html, extra_hosts=args.advertise_host,
                                     trusted_origins=args.trusted_origin)
    except ValueError as error:
        parser.error(str(error))
    except OSError as error:
        parser.exit(1, "无法启动：端口可能已被占用。可添加 --port 8788 更换端口。\n" + str(error) + "\n")
    print("\n测量肺活量 · 局域网课堂已启动")
    print("教师本机：http://127.0.0.1:%s/" % server.server_port)
    addresses = []
    for candidate in server.allowed_hosts:
        try:
            address = ipaddress.ip_address(candidate)
            if address.version == 4 and not address.is_loopback and not address.is_unspecified:
                addresses.append(candidate)
        except ValueError:
            pass
    for address in sorted(addresses):
        print("学生平板：http://%s:%s/" % (address, server.server_port))
    print("教师和学生使用同一个网页，在“课堂”中创建/加入课堂码。")
    print("请保持本窗口打开；退出前请在网页中导出课堂记录。")
    print("按 Ctrl+C 结束服务，临时数据和照片随之清除。\n", flush=True)
    try:
        server.serve_forever(poll_interval=0.25)
    except KeyboardInterrupt:
        print("\n课堂服务已停止。")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
