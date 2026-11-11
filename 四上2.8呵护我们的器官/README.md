# 四上 2.8 呵护我们的器官

## 无配音 · Three.js机制示意版（2026-11-11）

入口仍为“四年级上册 → 第二单元 呼吸与消化 → 第8课”。延续2.6深蓝灰、暖珊瑚配色，16:9居中舞台、左右必要操作、右上设置/全屏。单个HTML内嵌Three.js r160（MIT），无需联网资源，无学校、真实姓名、文本输入、个人健康数据收集。**已移除配音、Speech Synthesis、试听与语音设置。** 保留文字解释。

### 互动与教材

核对2026版教科版学生教材印刷51–53页（PDF55–57）及教师教学用书第8课。保留虚构8人一周资料比较、鼻腔结构与功能、六种生活习惯选择、三种科普主题。

- 鼻腔：原创挤出剖切几何、凸起鼻甲/黏膜、入口鼻毛及黏膜血管。点选拦尘、调温、湿润，显示相关结构；蓝点沿吸气路径运动，金点为放大尘埃，部分停留、部分通过。可暂停/继续/重播、重置，拖动或侧面/斜面按钮换角度。
- 拦尘：两个三维敞开通道同样输入8粒；有模拟鼻毛/黏液的通道部分截留，仍有通过。粒子数、位置、速度是教学设定，不是真实过滤效率，不模拟病原体被杀灭。
- 调温以蓝到暖色的趋势提示，湿润以路径光点变化提示。不是氧浓度、温度或湿度读数，也不是流体力学求解。结构经过简化，已剖切的观察窗口不是真实开口。
- 静态统计、生活情境和科普卡不强行三维化。各类虚构不适可重复计入同一人，不能求和为总人数、诊断或证明病因。禁止吸灰、探鼻腔、憋气挑战。

### 渲染与可用性

使用本地内嵌程序库，没有CDN、外部模型或图片。WebGL不可用、上下文丢失或渲染异常时转二维兼容；设置可主动切换。二维保留结构选择、动态空气路径/拦尘比较与其他全部活动。三维失败后需刷新页面才重新尝试初始化。选择只在内存，不写持久存储、不上传。

正常图形设备使用Three.js WebGLRenderer。几何、材质在切换时释放，动画仅由用户启动，暂停/切页/弹窗/隐藏页面停止，不重复叠加循环。设备像素比封顶1.5。舞台按可用视口缩放。

### 科学依据

2026-11-11重新核对：
- NIH/NCI 鼻与鼻腔（入口鼻毛拦截较大颗粒）：https://training.seer.cancer.gov/anatomy/respiratory/passages/nose.html
- Healthdirect 鼻和咽喉（黏膜、血管、鼻甲与调温湿润）：https://www.healthdirect.gov.au/anatomy/nose-and-throat

生活习惯沿用前版已核对的公开来源：
- NIH/NHLBI 呼吸系统：https://www.nhlbi.nih.gov/health/lungs/respiratory-system
- CDC 洗手：https://www.cdc.gov/clean-hands/about/index.html
- CDC 二手烟：https://www.cdc.gov/tobacco/secondhand-smoke/health.html
- CDC 儿童口腔健康：https://www.cdc.gov/oral-health/prevention/oral-health-tips-for-children.html
- WHO 健康饮食：https://www.who.int/news-room/fact-sheets/detail/healthy-diet
- CDC 儿童身体活动：https://www.cdc.gov/physical-activity-basics/health-benefits/children.html
- CDC 呼吸道预防：https://www.cdc.gov/respiratory-viruses/prevention/index.html
- WHO 食品安全五要点：https://www.who.int/activities/promoting-safe-food-handling/five-key-to-safer-food
- UNICEF 预防噎食：https://www.unicef.org/parenting/safety/how-to-prevent-choking

健康习惯只降低部分风险，不保证不生病。明显不适停止活动、求助成人；紧急情况立即求助成人和当地急救服务。不进行个人诊断或给药指导。

### 本轮验证与边界

- JS语法通过；HTML约0.72MB；无语音API/控件、外部运行资源、文本输入、应用网络/持久存储接口；MIT声明内嵌。
- 28项真实Three.js几何与静态断言：鼻腔三种模式全部坐标有限、粒子路径、相同输入、末帧部分拦截/部分通过、末帧不重叠、几何释放等。
- 37项真实Three.js几何配合模拟DOM/渲染器的状态断言：暂停继续重播、切页取消、弹窗、手动二维/三维、上下文丢失、创建/渲染失败降级、答案修正及重置等。**这是模拟渲染器测试，不是GPU实测。**
- 云Chromium实际进入WebGL初始化失败分支（日志明确GL_VENDOR/GL_RENDERER为Disabled），成功显示自动二维兼容。实际复查10阶段、4种统计答案、6种生活选择的双选项、3种科普卡、暂停继续/重置/切页、设置兼容切换、来源与Escape焦点返回。
- 浏览器iframe分别检验1280×720和1536×864 CSS视口10阶段中央区域与右栏无内部溢出。这是1920×1080屏幕125%/150%的布局等效测试，**不是Windows系统DPI实机测试**。
- 对实际Three.js三角形做CPU投影复核几何结构；该图不是WebGL截图，不用于宣称GPU验收。

**尚未实测**：真实GPU光照/透明度/拖动观感、真实WebGL上下文丢失、Windows系统125%/150%缩放、原生file://断网、触屏和Safari。未尝试绕过浏览器的图形禁用。上线并不代表这些设备已通过验收。

### 维护、历史与许可

入口HTML为唯一运行文件。维护源码位于 `source/organ-care-three/`；运行 `python source/organ-care-three/build.py` 重新生成本课index.html，Node检查脚本在同目录。运行 `node source/organ-care-three/check_model.cjs` 和 `node source/organ-care-three/check_state.cjs`。

此前统一配色含配音版本的HTML、README及语音测试原样保存于 `archive/2026-11-11-before-three/`。更早归档、根目录未被加载的旧app.js及其他并列版本保留不动。教材、教参原文件及扫描页不上传。

Three.js r160来自同仓库已使用的库，版权与完整MIT许可见 `LICENSE-THREE.txt` 及HTML内嵌声明。鼻腔几何和教学界面为原创。其他课时及根目录许可未改动。
