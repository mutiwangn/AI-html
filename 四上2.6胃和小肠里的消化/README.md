# 四上 2.6 胃和小肠里的消化

## 互动科普版（2026-11-10）
沿用本课原路径与首页入口。单一 `index.html`（约 34KB），HTML、CSS、JS、SVG 全部内联；离线可运行，无第三方运行依赖、无文本输入、无学校或真人署名。

四个主题：食物路线；胃的机械混合与蛋白质初步消化；小肠内淀粉、蛋白质和脂肪的消化；葡萄糖、氨基酸、长链脂肪和水的吸收。支持分步、播放/暂停、重置、键盘焦点、全屏、三题点选辨析。

## 科学依据
- [NIH / NIDDK：Your Digestive System & How it Works](https://www.niddk.nih.gov/health-information/digestive-diseases/digestive-system-how-it-works)：连续通路、胃运动、小肠作用。
- [NCI SEER：Introduction to the Digestive System](https://training.seer.cancer.gov/anatomy/digestive/)：机械消化、化学消化与吸收的区别。
- [NCI SEER：Small & Large Intestine](https://training.seer.cancer.gov/anatomy/digestive/regions/intestine.html)：小肠上皮、绒毛、微绒毛与表面积。
- [OpenStax Anatomy and Physiology 2e，23.7](https://openstax.org/books/anatomy-and-physiology-2e/pages/23-7-chemical-digestion-and-absorption-a-closer-look)：消化酶、营养分解、血液及淋巴吸收路线。

以上于 2026-11-10 检索并阅读。课件依据资料独立编写，未复制第三方图表、代码、图片或大段文字。所有图形为原创 SVG；无新增第三方素材许可。原稿仍可在 Git 历史追溯，旧 app.js 留存但新版不引用。

## 模型边界与安全
- 食物碎块、脂肪滴与分子是不同尺度。变碎、分子分解、跨肠上皮吸收不能混同。
- 胃以蛋白质初步消化为例；不声称胃只消化蛋白质或完全没有吸收。
- 蛋白质主图突出氨基酸，补充二肽、三肽入细胞后继续分解。
- 胆汁乳化不是酶促化学分解。脂肪以常见长链脂肪为例，标出细胞内重新合成和包装、先经淋巴再入血，注明其他途径。
- 水不需要先消化。小肠吸收大部分水，大肠继续吸收剩余的部分水。
- 绒毛不是筛网。结构比例、颜色、数量与速度经过简化；不表示真实测量、分子构型或完整转运机制。
- 不要求进食、加酸或按压身体；无个人信息采集。教材正文与教参尚未对照，不冒充完整教材验收。

## 适配与验证
固定 1600×900 的 16:9 设计舞台，根据浏览器实际可用宽高等比适配；所有主题、控制条与弹层在同一屏内显示，不依赖页面滚动。

JavaScript 语法和静态依赖检查通过。本地 Chromium 自动启动受环境 socket 权限限制，提权后仍未能启动；本地 HTTP 预览未连通，不能据此宣称多视口已通过实测。发布后另行检查实际在线页面；真实 Windows 125% / 150% 系统缩放、实体 1080p / 2.5K / 4K 屏及触屏未实测。
