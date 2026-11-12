# 三、四年级上册课件更新说明

## 本批范围与源码

本批更新 **51 个 HTML 入口**，涉及三年级上册与四年级上册六个单元。按本批改动分类，**26 个入口有实质教学改进，47 个入口有教学或单屏布局改进**；两项统计相互包含，不相加。其余入口主要统一单元视觉样式。多版本、学生端及教师端入口保留；51 个文件对应50个既有目录资源卡片。

HTML 文件本身包含可阅读的页面源码、样式与交互逻辑；其中内嵌图片、模型数据或第三方库仍按各自许可使用。无需把制作过程的内部笔记、临时测试数据或生成工作目录视为发布源码。本说明**不为整个仓库另行授予统一的开源许可**，也不改变原有许可、署名或第三方权利。

更新以各单元自己的画面体系保持一致，不把所有学科内容强行变成一种色调。新增或改进的重点包括：公开二维解剖定位；模型与实测分离；同条件实验对照；多次真实证据序列/图表；固定16:9课堂主画面与独立辅助记录/说明层。原始学习记录、导出和历史入口尽量保留。

**回退基线：`f464a5a06ee739ecae3d3412c20ce7fe12e4cae9`。** 如需回退，恢复本批涉及的HTML和目录更新时间文件至该提交的对应版本；不要无差别覆盖该基线之后的无关更新。本说明不虚构尚未生成的发布提交号。

## 公开图像的署名、来源与许可

以下转录并汇总最终课件内的来源说明。图片的使用不表示作者或机构认可、推荐或为本课件背书。原始文件页、许可链接和改动说明应随课件继续保留。

### OpenStax College，2013，CC BY 3.0

许可：[Creative Commons Attribution 3.0](https://creativecommons.org/licenses/by/3.0/)。

- [2301 Major Respiratory Organs](https://commons.wikimedia.org/wiki/File:2301_Major_Respiratory_Organs.jpg)：四上2.1、2.2、2.3。原图内嵌；按各课需要缩放、叠加中文定位或说明。
- [2316 Inspiration and Expiration](https://commons.wikimedia.org/wiki/File:2316_Inspiration_and_Expiration.jpg)：四上2.2。完整原图内嵌，叠加中文状态标题与选中框，保留英文说明。
- [2303 Anatomy of Nose-Pharynx-Mouth-Larynx](https://commons.wikimedia.org/wiki/File:2303_Anatomy_of_Nose-Pharynx-Mouth-Larynx.jpg)：四上2.5、2.7。缩放、截取教学区域、叠加中文引线，不模拟精确吞咽动作。
- [2408 Salivary Glands](https://commons.wikimedia.org/wiki/File:2408_Salivary_Glands.jpg)：四上2.5。缩放与中文标记。
- [2410 Permanent and Deciduous TeethN](https://commons.wikimedia.org/wiki/File:2410_Permanent_and_Deciduous_TeethN.jpg)：四上2.5。从原图截取成人上、下恒牙列及牙齿局部；没有复制乳牙列和萌出年龄。32颗示意包括4颗智齿，不表示人人都有32颗。

- [2310 Structures of the Respiratory Zone](https://commons.wikimedia.org/wiki/File:2310_Structures_of_the_Respiratory_Zone.jpg)：OpenStax College（2013），CC BY 3.0，用于四上2.3，原图内嵌与局部放大，另附独立净移动方向图解。
- [2101 Blood Flow Through the Heart](https://commons.wikimedia.org/wiki/File:2101_Blood_Flow_Through_the_Heart.jpg)：OpenStax College（2013），CC BY 3.0，用于四上2.3，原图内嵌、中文定位与说明。

### OpenStax，2016，CC BY 4.0

[1404 The Structures of the Ear](https://commons.wikimedia.org/wiki/File:1404_The_Structures_of_the_Ear.jpg)，*Anatomy and Physiology*；许可：[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。用于四上3.8，原图内嵌，叠加中文标签与定位圈，未重画或变形解剖轮廓；大脑使用图外文字说明。膜振动小窗属于另外的定性机制示意。

### NIH / NIDDK 消化系统图

用于四上2.1、2.6、2.7。来源：[Your Digestive System & How It Works](https://www.niddk.nih.gov/health-information/digestive-diseases/digestive-system-how-it-works)。课件来源说明记录：完整原图内嵌、原像素未修改；[NIDDK 版权与复用说明](https://www.niddk.nih.gov/copyright)允许无另行版权声明的内容复用并要求署名，使用图未见另行版权标记。**不把这项复用说明改写成 CC 许可，也不推定所有 NIH/NIDDK 内容都无版权。**

### 三上1.6真实云照片

- [Cumulus1 - NOAA.jpg](https://commons.wikimedia.org/wiki/File:Cumulus1_-_NOAA.jpg)：NOAA / Ralph F. Kresge #0655，文件页标记 PD-USGov-NOAA；原图1804×1200，裁切区域 x440/y0/w1300/h780。
- [Cirrus2 - NOAA.jpg](https://commons.wikimedia.org/wiki/File:Cirrus2_-_NOAA.jpg)：NOAA / Ralph F. Kresge #1208-c，文件页标记 PD-USGov-NOAA；原图1732×1224，裁切区域 x240/y0/w1250/h750。
- [Stratus Cloud.jpg](https://commons.wikimedia.org/wiki/File:Stratus_Cloud.jpg)：Natasha2006，文件页标记作者释入全球公有领域 PD-self；原图1600×1200，裁切区域 x0/y0/w1000/h600。教学仅称“铺展成层”，不凭非气象机构自标文件名认定云属或云高。

照片统一缩放为1200×720并作JPEG压缩；未变色、合成或生成新云。缩略图与局部放大只显示同一照片的不同范围，不能代替全天空观测。

### 软件库和既有资产

使用 Three.js 的页面保留原有 MIT 许可文本和作者声明（页面标注 r160，© 2010–2023 Three.js Authors）。MIT 不自动覆盖课件内图片或模型资产。

四上2.3此次补充更新已完全移除来源不明的瓶式GLB、旧人体模型及其遗留署名，同时移除不再使用的Three.js与旧模型解析器。双瓶装置改为本课源码直接绘制的原创二维SVG机制示意，不复用该三维资产。固定瓶壁不模拟胸廓运动；底膜人为牵拉只有限类比人体膈肌收缩；混合空气经导管进出，不是底膜直接拉入空气。左右按各自设定频率在共同60秒中比较，幅度不用于计算肺活量。公共解剖图的署名及许可独立保留。

## 验证范围与使用边界

本批完成源码语法、原字段/关键流程保留、证据映射及模型边界检查；真实云 Chrome 私有预览以 **1180×757 视口**进行了重点页面与交互检查。固定画幅按16:9等比缩放，不把该视口检查等同于所有设备均已验收。

主要实际浏览器覆盖：

- 呼吸器官两页及呼气同步；口腔三页、咀嚼面切换与刷牙计时启动/暂停/复位；胃肠吸收兼容绘制；肺活量并排误差；消化旅程合并步骤与辅助记录。
- 空气1.4按压页、1.6微粒解释及记录分页、1.5/1.7主要视图；打气筒自由组装放置/拖动/撤回及主课挤压状态。
- 声音3.1同位置帧对照、3.8耳结构/保护时间比较/参考与实测分开。
- 三上观察云真实图、网格、局部选框、记录与下载；蒸发双杯三次定性节点映射、收起再打开留存；运动能量六次实测位移条及空值/零值区别；其他主要运动和天气单屏页面。

四上2.3补充实测：新版原创双瓶完整运行至60模拟秒，18/30次示例与相差12次结果正确，加深及4×不改变次数；另在真实浏览器完整等待一轮连续60秒，测试点按3次，到时显示00:00、计数锁定并写入3次。主动停止及切页中断均未写入完整记录，已有完成记录保留；未完成第二项时实测比较入口禁用。肺泡净方向动画、混合气体资料、循环公开图及来源弹层可正常切换。测试值已刷新清除。此为一轮计数及指定边界实测，不代表所有状态/设备/输入均已覆盖。

复验中修正了若干面板挤压、文字遮挡与主画面滚动问题。测试输入仅用于私有验证，完成后已清除，不作为真实课堂数据发布。

**尚未全面验证**：每个入口的全部分支、所有手机/平板/触屏/投影设备、所有系统字体与缩放、全部浏览器的WebGL路径、每项CSV/PNG导出及各办公软件打开效果、60秒计数的全部工况与2分钟刷牙计时结束边界、所有自由组装组合、完整无障碍键盘焦点流程。部分页面的教材版次与教参仍待进一步核对，页面已有“辅助稿/非整课验收”说明，不因本次公开发布而自动获得整课教材认证。

课件中的模型运动、粒子、气流、位移或气量示例不等于人体测量或实验预测。未观察、不确定、真实0值须分别处理；不得用示例替代学生真实记录。真实实验遵守教师组织、器材与安全规范。

## 本批51个HTML入口

- `三上1.1我们关心天气/index.html`
- `三上1.2认识气温计/index.html`
- `三上1.3测量气温/index.html`
- `三上1.4测量降水量/index.html`
- `三上1.5观测风/index.html`
- `三上1.6观察云/index.html`
- `三上1.7天气预报/index.html`
- `三上1.8天气的影响/index.html`
- `三上2.1水到哪里去了/index.html`
- `三上2.2水珠从哪里来二维版/index.html`
- `三上2.3水沸腾了/index.html`
- `三上2.4水结冰了/index.html`
- `三上2.5冰熔化了/index.html`
- `三上2.6水能溶解多少物质/index.html`
- `三上2.7加快溶解/index.html`
- `三上2.8用水分离/index.html`
- `三上3.1运动和位置/index.html`
- `三上3.2各种各样的运动/index.html`
- `三上3.3直线运动和曲线运动/index.html`
- `三上3.4相同距离比快慢/index.html`
- `三上3.5相同时间比快慢/index.html`
- `三上3.6运动和能量/index.html`
- `三上3.7设计和制作过山车/index.html`
- `三上3.8测试过山车/index.html`
- `四上1.1感受空气/index.html`
- `四上1.2空气能占据空间吗/index.html`
- `四上1.3空气占据的空间会改变吗/index.html`
- `四上1.4空气有质量吗/index.html`
- `四上1.5空气有力量/index.html`
- `四上1.6我们来做热气球/index.html`
- `四上1.7风的成因/index.html`
- `四上1.8自制打气筒/index.html`
- `四上1.8自制打气筒/自由组装实验台/index.html`
- `四上2.1我们的呼吸与消化/index.html`
- `四上2.2认识呼吸器官/index.html`
- `四上2.4测量肺活量/index.html`
- `四上2.5口腔里的消化/index.html`
- `四上2.6胃和小肠里的消化/index.html`
- `四上2.7食物在身体里的旅行/index.html`
- `四上2.8呵护我们的器官/index.html`
- `四上3.1声音是怎样产生的/index.html`
- `四上3.2声音的强弱/index.html`
- `四上3.3声音的高低/index.html`
- `四上3.3声音的高低_学生端/index.html`
- `四上3.3声音的高低_学生端/teacher.html`
- `四上3.4乐器的声音变化/index.html`
- `四上3.5设计我们的乐器/index.html`
- `四上3.6改进我们的乐器/index.html`
- `四上3.7声音的传播/index.html`
- `四上3.8保护听力/index.html`
- `四上2.3呼吸的变化/index.html`
