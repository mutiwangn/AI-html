# 四上2.2《认识呼吸器官》

本目录是呼吸互动网页的独立项目，版本为“希沃 / iPad 触控版”。

## 发布状态

`index.html` 是课程导航包装页，通过 iframe 加载同目录的 `original.html`。`original.html` 是完整的单文件课件，可直接保存后离线打开；它是运行依赖，不是可删除的备份。

2026-11-08 压缩：保留31个网格、337477个顶点和671538个三角形，坐标、法线及呼吸形变属性按各轴16位编码，使用meshoptimizer与gzip压缩。最大实测位置/形变误差为0.0001316071模型坐标单位，不减少器官、顶点或三角形。图片与教学交互保持原实现。

解码器完整内嵌，WebAssembly不可用时使用JavaScript备用解码，gzip仍保留pako备用路径，不增加CDN或外部运行依赖。新增MIT许可见 `LICENSE_meshoptimizer.txt`，许可原文也随单文件内嵌。

正确路径：四上2.2认识呼吸器官/index.html

上传并完成 GitHub Pages 部署后，访问：https://mutiwangn.github.io/AI-html/四上2.2认识呼吸器官/

原来的 breathing 目录已调整到本目录，之后统一使用本目录。

## 来源与使用说明

Z-Anatomy / BodyParts3D 解剖模型的来源、署名及修改说明随网页保留；相关许可见 LICENSE_Z-Anatomy.txt。压缩解码库 pako 的许可见 LICENSE_pako.txt。不要把所有第三方部件视为无条件公有领域素材。

网页中的呼吸形变、粒子和动作增强是定性教学示意，不是医学测量或诊断工具。
