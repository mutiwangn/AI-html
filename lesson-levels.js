/* AI-html 课件技术需求：T1 基础交互 / T2 Canvas 二维 / T3 WebGL1 / T4 WebGL2。 */
(function (root) {
  'use strict';
  root.AIHTML_LEVELS = {
    '五上4.4地球表面的岩石': { level: 2, note: 'Canvas 岩石颗粒同步放大、局部刻画和擦拭、实物照片与证据对照；单文件离线，无3D' },
    '五上4.2火山喷发对地表的作用': { level: 1, note: 'SVG 地下透视、同坐标地形比较与触控测高；单文件离线，SVG 证据图' },
    '五上3.7评价月球小车': { level: 1, note: 'SVG 同步模型与触控，实测数据图；本地视频需浏览器支持，证据图导出使用可选 Canvas' },
    '五上3.6制作月球小车': { level: 1, note: 'SVG 三视图与触控设计、预算质量对照、齿轮传动透视；单文件离线' },
    "五上3.5摩擦力的比较": { level: 1, note: "SVG 测力计与触控拖拽、控制变量、实测数据图；PNG 导出使用可选 Canvas" },
    '五上3.3用弹力驱动小车': { level: 1, note: 'SVG 透视与触控、圈数对比、实测圆点记录' },
    '五上3.4测量力的大小': { level: 3, note: 'WebGL1 轻量三维结构与 SVG 二维后备，切换量程、调零及触控读数' },
    '一上2.6观察与比较': { level: 1, note: 'SVG 比较与图画记录；图片导出可选 Canvas' },
    '一上2.1我们的身体': { level: 1, note: 'SVG 与触控' },
    '一上2.2发现生长': { level: 2, note: 'Canvas 与音效' },
    '一上2.3游戏中的观察': { level: 1, note: '互动记录与音效' },
    '一上2.4气味告诉我们': { level: 1, note: '互动记录与音效' },
    '一上2.5通过感官来发现': { level: 1, note: 'SVG 触控与可选音效' },
    '三上1.3测量气温【王宁】': { level: 1, note: 'SVG 互动' },
    '三上1.4测量降水量【王宁】': { level: 2, note: 'Canvas 与音效' },
    '三上1.5观测风【王宁】': { level: 1, note: 'SVG 与音效' },
    '三上1.6观察云【王宁】': { level: 2, note: 'Canvas 与音效' },
    '三上1.8天气的影响【徐敏】': { level: 1, note: '基础交互' },
    '三上2.1水到哪里去了【许易】': { level: 1, note: 'SVG 互动' },
    '三上2.3水沸腾了【林雅】': { level: 1, note: 'SVG 互动' },
    '三上2.5冰熔化了': { level: 2, note: 'Canvas 与音效' },
    '三上2.6水能溶解多少物质': { level: 2, note: 'Canvas 动画' },
    '三上2.7加快溶解': { level: 1, note: 'SVG 模拟与记录' },
    '三上2.7加快溶解【凌瀚】': { level: 1, note: '基础交互' },
    '三上2.8用水分离': { level: 1, note: 'SVG 互动' },
    '三上3.1运动和位置': { level: 1, note: 'SVG、触控、位置比较、测距与找朋友' },
    '三上3.2各种各样的运动': { level: 2, note: '相机、视频处理', camera: true, highLoad: true },
    '三上3.3直线运动和曲线运动': { level: 2, note: 'Canvas 轨迹、击球与桌沿运动模拟' },
    '三上3.4相同距离比快慢': { level: 1, note: 'SVG赛道、手动秒表与实验记录' },
    '三上3.5相同时间比快慢': { level: 1, note: 'SVG、触控、共同计时与测距' },
    '三上3.6运动和能量': { level: 1, note: 'SVG、触控、斜面碰撞与测距' },
    '三上3.7设计和制作过山车': { level: 1, note: 'SVG、触控、轨道设计、测长与试跑' },
    '三上3.8测试过山车': { level: 1, note: 'SVG、触控、轨道观察、测长与计时' },
    '三下2.1不同种类的动物': { level: 1, note: '基础交互' },
    '四上2.2认识呼吸器官': { level: 4, note: '大型人体三维模型', highLoad: true },
    '四上2.4测量肺活量': { level: 2, note: 'Canvas 与数据记录', highLoad: true },
    '四上2.5口腔里的消化': { level: 2, note: 'Canvas 与较大素材', highLoad: true },
    '四上2.6胃和小肠里的消化': { level: 1, note: 'SVG 与触控' },
    '四上2.7食物在身体里的旅行': { level: 2, note: 'SVG 透视、触控绘图与 Canvas 记录导出' },
    '四上2.8呵护我们的器官': { level: 1, note: 'SVG 鼻腔模型、课堂调查与生活实践' },
    '四上3.1声音是怎样产生的': { level: 1, note: 'SVG 与 Web Audio，无 3D' },
    '四上3.2声音的强弱': { level: 1, note: 'SVG、振动对照与Web Audio；录音另需麦克风授权' },
    '四上3.3声音的高低': { level: 1, note: 'SVG、钢尺慢放、振动对照与 Web Audio' },
    '四上3.4乐器的声音变化': { level: 1, note: 'SVG、琴弦与空气柱慢放、Web Audio、同刻度对照；无3D' },
    '四上3.5设计我们的乐器': { level: 1, note: 'SVG、结构设计、连续调音、Web Audio、方案对照与制作单；无3D' },
    '四上3.6改进我们的乐器': { level: 1, note: 'SVG、连续调音、结构改进与前后对照；Web Audio，实物录音另需麦克风授权' },
    '四上3.7声音的传播': { level: 1, note: 'SVG、微粒慢放、传播路径、钟罩与土电话对照；声音需 Web Audio' },
    '四上3.8保护听力': { level: 1, note: 'SVG 耳剖面、鼓膜慢放、保护方案比较、场景分贝与实测记录；无3D' },
    '五上3.2用重力驱动小车': { level: 1, note: 'SVG、重力小车、慢放与等时位置、三次测量与实测记录；单文件离线' },
    '五上2.2独轮车省力的秘密': { level: 2, note: 'Canvas 模拟三维视效' },
    '五上2.3制作独轮车': { level: 2, note: 'SVG 设计与 Canvas 立体投影' },
    '五上2.4巧用斜面': { level: 2, note: 'Canvas 运输游戏与变形斜面' },
    '五上2.4巧用斜面【王剑青】': { level: 2, note: 'Canvas 互动' },
    '五下4.5船的最大装载量【王宁】': { level: 2, note: 'Canvas 与实验记录' }
  };
  root.AIHTML_LEVEL_NAMES = {
    1: '基础交互',
    2: '二维绘图',
    3: '轻量三维',
    4: '进阶三维'
  };
}(window));









