# 四上 2.6 胃和小肠里的消化

## 立体观察版（2026-11-10）
沿用本课原目录及年级、单元、课时入口。独立 index.html：709,233 字节（0.709 MB），HTML、CSS、Three.js、三维网格生成代码和交互全部内嵌。无需联网运行；无文本输入、个人信息采集、学校或真人署名。第三方法律许可保留。

本次移除全消化道路线页，不再展开本课之后的结构；聚焦三个主题：
1. 胃：认识弯曲囊体，剖开观察胃壁收缩、混合、蛋白质初步消化及逐渐排空。
2. 小肠：连续长管的前后盘曲，放大局部观察肠壁运动、内侧皱襞与继续消化。
3. 绒毛：内表面局部 → 单根绒毛剖面 → 以葡萄糖为例跨过内壁进入血液。

保留必要的食物颗粒、蛋白质“分解前/后”符号，并明确它们与器官、绒毛不是同一尺度。支持旋转、缩放、正面复位、外观/切面、分步、播放/暂停、重置、全屏和三道点选判断。

## 模型来源与许可
- 胃、小肠、皱襞、绒毛和血管都是本课独立编写的参数化 Three.js 网格，不是人体扫描，不声称精确复原某个人的解剖结构。
- 胃保留囊体、内外弯曲、较窄出口，与小肠起始段连续相接。小肠是连续且前后盘曲的管；绒毛位于内表面并朝肠腔突出。
- 未采用不能完整核实许可、下载文件和用途适配的外部器官模型，也未把原创参数模型标为 CC 医学模型。
- Three.js 0.160.1（r160），MIT 许可，来自 https://unpkg.com/three@0.160.1/build/three.min.js 。完整许可同时内嵌于 HTML 的“模型与依据”，另存 LICENSE-THREE.txt。官方网站：https://threejs.org/ 。
- 在 WebGL 不可用时，兼容绘制器投影同一套 Three.js 三维网格，保留旋转、剖面和运动；不是切回 SVG 插图。兼容绘制较慢，动画帧率上限约 8 帧/秒。

## 科学依据
2026-11-10 核查以下公开资料；独立编写讲解，未复制外部图表或模型资产。
- NIH / NIDDK，Your Digestive System & How it Works：https://www.niddk.nih.gov/health-information/digestive-diseases/digestive-system-how-it-works
- NCI SEER，Stomach：https://training.seer.cancer.gov/anatomy/digestive/regions/stomach.html
- NCI SEER，Intestine：https://training.seer.cancer.gov/anatomy/digestive/regions/intestine.html
- MedlinePlus，Peristalsis：https://medlineplus.gov/ency/anatomyvideos/000097.htm
- University of Edinburgh，Duodenum and small bowel normal histology：https://pathologia.ed.ac.uk/topic/gi-duodenum-and-small-bowel-normal-histology/

## 教学边界
胃里变碎、分子被分解、营养跨过内壁被吸收是相关但不同的过程。胃只展示初步消化，不声称所有消化已经完成；小肠是主要消化和吸收场所。水等不需要先消化。吸收只用葡萄糖举例，不把所有营养物质画成相同运输路线。绒毛不是筛网，细胞转运细节省略。

形状、盘曲位置、颜色、数量、比例、粒子轨迹和速度都是定性教学简化。半剖面用于暴露内部，并非真实的器官开口。动画不提供生理测量、诊断或真实用时。不要求进食、加酸或按压身体。教材正文、教参和明确版次待核，不作为整课完整验收。

## 适配和验证
固定 1600×900 的 16:9 舞台，按浏览器实际可用宽高等比适配；主体不依赖滚动。弹窗中的长许可可单独滚动。

已通过：
- 最终 JS 语法；10 个教学阶段的网格索引范围、顶点有限性检查；每阶段 5 个动画时点没有非有限坐标。
- 真实 Chromium 浏览器中的同网格兼容绘制：三主题与切面、播放/暂停、旋转、缩放、正面复位、分步、重置、反复切页、来源弹窗、Escape 关闭与焦点返回。
- 三道题的正确选项反馈；最后一步禁用“下一步”；最后一步也可单独播放。
- 实测有效 CSS 视口 1180×757：16:9 舞台为 1180×663.75，没有页面横纵滚动；各场景已截图检查。
- DOM 无外部脚本/图片/样式资源，无文本输入；HTML 无 SVG、无超出本课范围的末端结构名称，低于 10 MB。

未验证或限制：
- 本次云浏览器禁止建立 WebGL 上下文，所以真实浏览器视觉验证覆盖兼容绘制；没有声称硬件加速 WebGL 渲染已通过。
- 直接 file:// 打开在测试浏览器受到协议限制；浏览器验证由本地静态预览提供同一份 HTML。离线自包含性经资源检查确认，没有外部运行依赖，但未做实体课堂设备断网演练。
- 未实测实体触屏、Safari、Windows 系统 125%/150% 缩放，以及 1080p/2.5K/4K 完整设备矩阵。浏览器适配实现不等于这些硬件已验收。
- 教师课堂试用与教材版次核对待完成。

## 历史
上一版 SVG 单体课件保留在 Git 历史： https://github.com/mutiwangn/AI-html/blob/af1dcf2656ab54018944bb0dd3568657770fbe93/%E5%9B%9B%E4%B8%8A2.6%E8%83%83%E5%92%8C%E5%B0%8F%E8%82%A0%E9%87%8C%E7%9A%84%E6%B6%88%E5%8C%96/index.html 。原 app.js 路径保留，新版 index.html 不加载它。其他课程与目录导航不变。
