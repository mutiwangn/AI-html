/* AI-html 课件技术需求：T1 基础交互 / T2 Canvas 二维 / T3 WebGL1 / T4 WebGL2。 */
(function (root) {
  'use strict';
  root.AIHTML_LEVELS = {
    '一上2.1我们的身体': { level: 1, note: 'SVG 与触控' },
    '一上2.2发现生长': { level: 2, note: 'Canvas 与音效' },
    '一上2.3游戏中的观察': { level: 1, note: '互动记录与音效' },
    '一上2.4气味告诉我们': { level: 1, note: '互动记录与音效' },
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
    '三上3.2各种各样的运动': { level: 2, note: '相机、视频处理', camera: true, highLoad: true },
    '三上3.3直线运动和曲线运动': { level: 2, note: 'Canvas 轨迹、击球与桌沿运动模拟' },
    '三上3.4相同距离比快慢': { level: 1, note: 'SVG赛道、手动秒表与实验记录' },
    '三上3.5相同时间比快慢': { level: 1, note: 'SVG、触控、共同计时与测距' },
    '三上3.6运动和能量': { level: 1, note: 'SVG、触控、斜面碰撞与测距' },
    '三上3.7设计和制作过山车': { level: 1, note: 'SVG、触控、轨道设计、测长与试跑' },
    '三下2.1不同种类的动物': { level: 1, note: '基础交互' },
    '四上2.2认识呼吸器官': { level: 4, note: '大型人体三维模型', highLoad: true },
    '四上2.4测量肺活量': { level: 2, note: 'Canvas 与数据记录', highLoad: true },
    '四上2.5口腔里的消化': { level: 2, note: 'Canvas 与较大素材', highLoad: true },
    '四上2.6胃和小肠里的消化': { level: 1, note: 'SVG 与触控' },
    '四上2.8呵护我们的器官': { level: 1, note: 'SVG 鼻腔模型、课堂调查与生活实践' },
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

