# 测量肺活量 人体模型模块的来源与修改

## 直接复用的附件

本模块改编自用户提供的 `20261025认识呼吸器官_界面优化（去除四年级）.html`。附件内已包含从 Z-Anatomy 提取的真实解剖网格、顶点法线、三角形索引、呼吸形变位移和自制 WebGL 渲染器。

源文件 SHA-256：`9c14e1cf1f47a1402497ce5a5b4c9b8fd10fb27273385d0eb10e181bfd20ee21`。

该附件的模型来源说明注明：源网格来自用户上传的 Z-Anatomy `Startup.blend`，呼吸运动为后来添加的教学示意。附件第553行明确保留以下许可与署名。

## 模型作者与许可

- **Z-Anatomy — The libre 3D atlas of anatomy — CC BY-SA 4.0**。
- **BodyParts3D — The Database Center for Life Science — CC BY-SA 2.1 Japan**。沿用本次复用素材附带的原始归因，未用其他发布版本替换其许可声明。
- 原作者：**Kousaku OKUBO、Gauthier KERVYN、Marcin ZIELINSKI**。官方说明中，Kousaku Okubo 对应 BodyParts3D，Gauthier Kervyn 负责设计、三维与解剖，Marcin Zielinski 负责 Blender 插件。
- 本次派生解剖网格、其二维投影以及本模块的改编教学实现继续按 **CC BY-SA 4.0** 分享。第三方 pako 代码保留自身 MIT 许可。
- 本次没有引入原项目许可文件另行列出的内耳、肾脏、脑等第三方模型。

来源入口：

- [Z-Anatomy 模型项目](https://github.com/Z-Anatomy/Models-of-human-anatomy)
- [官方项目的作者和许可说明](https://github.com/Z-Anatomy/Models-of-human-anatomy/blob/master/Readme.md)
- [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
- [CC BY-SA 2.1 Japan](https://creativecommons.org/licenses/by-sa/2.1/jp/)

## 本次实际修改

保留14个真实网格，共161,413个顶点、321,054个三角形：五个肺叶、气管、支气管、膈肌、胸廓、脊柱，以及四段裁切后的胸部体表。没有使用程序生成的球体或示意肺替代解剖模型。

肺叶、气管、支气管、膈肌、胸廓和脊柱保留原三角拓扑。仅体表按源坐标裁去胸部以外的三角形，避免加载头面和身体下段。未闭合这些观察裁切边界；浅透明体表用于交代胸部空间位置。

顶点位置、法线、形变位移和形变法线分别采用每网格、每轴16位量化后gzip压缩。保留的坐标与原数组相比，最大量化绝对误差约为 `0.000043` 个源模型坐标单位，不能将此值误称为现实人体测量精度。加载时还原为Float32数组，索引采用Uint16，兼容WebGL 1。

复用附件渲染器中的矩阵、相机、网格缓存、光照、透明排序和呼吸位移着色逻辑；删除原来器官导航、气球模型、局部放大、复杂器官标签等不属于本课第二页的交互。对网格颜色、透明度、观察镜头和呼吸动画节奏作了课堂展示调整。

“较少—较多”滑杆保持人体基础模型和镜头不变，只改变最大吸呼演示的位移幅度和可呼出量示意带。安静/运动后情境只改变日常呼吸的深度与频率，不改变滑杆设定的肺活量边界。最大呼气末仍显示原有肺形，不将肺变空；不生成健康等级、血氧、寿命或恢复秒数。

当WebGL不可用时，使用从这些真实网格生成的二维投影，明确标注二维状态并禁用旋转。模块内嵌六个呼吸位置、胸廓显示/隐藏共12张WebP投影；另保留四张PNG端点投影，供不支持WebP的旧浏览器降级。两种降级路径都使用真实网格，没有另画示意人体。

`anatomy-data.js` 共7,463,692字节，包含上述模型、投影及解压备用代码。模型压缩负载为4,446,586字节，解压后量化数据为5,800,236字节。全部资源内置，浏览器直接打开完整HTML即可使用，不依赖CDN、后台服务或在线模型下载。

## 科学表述的依据

以下是教学概括，不用于个体诊断或由动画比例反推学生的真实肺容积。

| 教学表述 | 一手资料 |
|---|---|
| 肺活量指最大吸气至最大呼气间的气体体积变化；普通一口气的进出量与之不同 | [NHLBI 肺功能实验室的肺容积定义](https://www.nhlbi.nih.gov/science/pulmonary-function-lab/tests)；[ARTP 2020肺功能声明](https://doi.org/10.1136/bmjresp-2020-000575) |
| 尽力呼气后肺内仍留有气体 | [ATS 患者教育 肺功能检查](https://site.thoracic.org/advocacy-patients/patient-resources/pulmonary-function-tests) |
| 肺功能有气量、气流和气体交换等多个方面，不能只凭一个数值判断健康 | [MedlinePlus 肺功能检查](https://medlineplus.gov/lab-tests/lung-function-tests/) |
| 结果需要结合身高、年龄等因素；规范测量、配合程度和重复性影响结果 | [ATS 肺功能检查](https://site.thoracic.org/advocacy-patients/patient-resources/pulmonary-function-tests)；[ATS/ERS 2019标准化声明](https://pmc.ncbi.nlm.nih.gov/articles/PMC6794117/) |
| 身体活动增加耗氧与通气需求，呼吸通常更深、更快；活动表现还涉及心脏、训练和强度等因素 | [欧洲肺脏基金会 运动与肺](https://europeanlung.org/en/information-hub/keeping-lungs-healthy/your-lungs-and-exercise/)；[欧洲肺脏基金会 运动与空气质量](https://europeanlung.org/en/information-hub/keeping-lungs-healthy/exercise-and-air-quality-10-top-tips/) |

动画频率和形变均为便于观察的教学示意，不要求学生跟随演示节奏呼吸。

## pako 0.2.9 的完整许可

本模块直接保留附件内的 pako 0.2.9 解压实现，作为浏览器没有原生 DecompressionStream 时的离线备用。该版本官方 LICENSE 为 MIT；版本README另列作者 Andrey Tupitsin、Vitaly Puzrin。

- [pako 0.2.9 LICENSE](https://github.com/nodeca/pako/blob/0.2.9/LICENSE)
- [同一版本的官方API入口](https://api.github.com/repos/nodeca/pako/contents/LICENSE?ref=0.2.9)
- [pako 0.2.9 README](https://github.com/nodeca/pako/blob/0.2.9/README.md)

```text
Copyright (C) 2014-2016 by Vitaly Puzrin

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

本许可全文也已放入 `anatomy-data.js` 注释，随最终单体HTML一起保留。
