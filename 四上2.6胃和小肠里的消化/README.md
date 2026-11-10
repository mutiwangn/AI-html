# 四上 2.6 胃和小肠里的消化

## 小肠内壁层级与动画配音版 · 2026-11-10

沿用四年级上册、第二单元、第 6 课入口。单一 `index.html` 内嵌 CSS、Three.js、实际 Blender 导出网格与教学交互，2,026,983 字节，低于 10 MB。无运行时外部资源、无文本输入、无个人信息采集。原 `app.js` 保留但不加载。

### 本次改动
- 顶层只列“胃”和“小肠”。绒毛观察阶段在数据和导航上均归入小肠，以“小肠 › 内壁局部放大”展示，并可直接返回小肠整体。
- 右上直接显示“设置”和“全屏”。配音设置、试听与科学依据放在设置窗口内。
- 六段动画均配简短中文讲解与同文字幕。点击播放才尝试配音，默认开启，可随时关闭。暂停、切换阶段、打开弹窗、离开页面均停止旧朗读；恢复播放从本句重读，避免声音重叠。
- 使用设备 Speech Synthesis API，只明确选择 `localService === true` 的中文语音，优先 zh-CN。不选择默认/远程语音，也不请求外部配音接口。`localService` 是浏览器声明，不等于独立审计系统网络行为。
- 没有本机中文语音、设备不支持、合成报错或启动超时均保留字幕与动画，并明确提示；试听不可用时禁用。开关仅在本次打开期间保留。
- 动画到末帧后可等朗读结束；30 秒保护上限防止异常合成使播放卡住。

## 模型与科学边界
沿用已归档的 Blender 4.3.2 原创模型，本次未改变 Blender 网格。胃、小肠整体及局部剖面、皱襞、绒毛、毛细血管和淋巴管是教学简化，不是人体扫描。无需 Blender MCP 运行。

- 胃壁混合与食物分子分解不同，胃展示初步消化。
- 小肠继续消化并吸收大部分营养；水等不需要先消化。
- 绒毛是小肠内壁的细小突起，朝向肠腔、增大吸收表面积，不是独立器官或筛孔。
- 吸收只以葡萄糖跨过绒毛表面细胞、进入血液为例，不把所有营养画成同一路线。
- 红蓝用于区分血管支路，不表示血液是蓝色。绿色用于区分淋巴管。
- 比例、数量、颜色、运动速度与颗粒路径均为定性简化。教材版次、教材正文和教参尚待核对，不作医学用途。

来源（2026-11-10 核查）：
- NIH / NIDDK: https://www.niddk.nih.gov/health-information/digestive-diseases/digestive-system-how-it-works
- NCI SEER 胃: https://training.seer.cancer.gov/anatomy/digestive/regions/stomach.html
- NCI SEER 小肠: https://training.seer.cancer.gov/anatomy/digestive/regions/intestine.html
- 爱丁堡大学: https://pathologia.ed.ac.uk/topic/gi-duodenum-and-small-bowel-normal-histology/
- MDN 本地语音标记: https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService

## 本次验证
- JS 语法通过；十阶段全部网格的索引、顶点、法线与五个动画时点通过有限性检查。
- 29 项配音状态断言通过：仅本机中文语音、远程/未声明语音拒用、字幕一致、暂停/重播/切换/弹窗取消、旧回调隔离、播放报错、启动超时、配音关闭、全部动画有讲解。语音合成为模拟对象测试，不是实际发声验收。
- 真实云 Chromium 交互通过：两器官导航、十阶段顺序、绒毛从小肠进入与返回、播放/暂停/重播、三道判断、设置开关、无声回退、来源弹窗、Escape 与焦点返回。
- 有效 CSS 视口 1180×757，舞台 1180×663.75（16:9）；十阶段右栏均无溢出，字幕均在中央面板内。设置两栏内容无溢出。
- 单 HTML 体积通过；无外部脚本、图片、样式、媒体标签；无重复 ID。外部来源链接只在主动打开时联网。

明确限制：
- 当前云 Chromium 无可用本机中文语音，因此实际发声、音色、读音和音画节奏未听测；仅确认无声提示与回退，不能宣称每台设备都有声音。课堂设备需要本机中文语音包、浏览器支持和系统音量正常。
- 云浏览器拒绝程序式全屏；已验证点击后的失败提示，未验收全屏成功状态。
- 云浏览器无法建立 WebGL 上下文，视觉测试使用同一组 Blender 网格的 Canvas 兼容绘制，不代表硬件 WebGL 已验收。
- 原生 file://、实际断网设备、触屏双指、Safari、Windows 系统缩放、1080p/2.5K/4K 实机矩阵未实测。自包含静态检查不替代这些设备测试。

## 归档与维护
本次修改前的 Blender 版原样保存在 `archive/2026-11-10-before-villi-audio/`。更早 Three.js 参数模型仍在 `archive/2026-11-10-three/`，原 Blender 源文件仍在 `source/`。本次可维护网页源码与测试在 `source/villi-audio-v3/`，模型数据从单文件中恢复，不重复存放模型。Three.js MIT 许可保留。其他课时与目录入口未修改。

维护重建：在 `source/villi-audio-v3/` 运行 `python build_release.py`。脚本从本课 `index.html` 提取同一版本 Three.js 与 Blender 数据，再套用维护模板和脚本，不下载外部内容。随后运行 `node check_narration.cjs`、`node check_geometry.cjs`。
