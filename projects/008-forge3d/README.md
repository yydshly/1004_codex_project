# 008 · Forge3D · 真实数据融合与三维场景渲染

![Forge3D 中文总览：数据、融合原理、场景效果、应用和扩展；概念示意，非真实运行截图](assets/forge3d-overview.png)

**完整摘要：**Forge3D 是用 Python 驱动、以 Rust 与 wgpu/WebGPU 为底层的三维地理渲染工具。它消费已经准备好的高程栅格、点云、颜色图和 3D Gaussian Splats（3DGS），用于地形展示、地图制作、高分辨率图片及相机序列输出。此次重点研究的 SPLAT-FUSED 路径把 DEM、COPC LiDAR 与现成 3DGS 放入同一加速结构，用统一 ReSTIR 路径追踪计算遮挡与阴影：树可以遮住地面，山脊也可以遮住点云和高斯。数据可按需分页，画面可分块输出 1080p/4K；这些能力不等于实时 4K 漫游，也不意味着全球都有高精度点云。实用路线是开放 DEM/影像构成远景，无人机摄影测量或外部 3DGS 重建补充近景，再完成坐标、尺度、方向和高程基准对齐。换影像主要改善纹理；更准的几何需要更好的高程或三维重建。普通 RGB 无人机不自动产生 LiDAR，Forge3D 的融合路径也不是照片重建或 3DGS 训练流程。DEM 不能表达悬挑，实拍高斯可能残留采集光照。官方 Lauterbrunnen 公开基准使用程序性色，不能混同原帖视频中的实拍影像；尚未找到完整、公开、可一键复跑的作者场景包。**资料与源码研究完成，未在本机运行 Forge3D。**

[返回总索引](../../README.md) · [详细研究与证据](notes.md) · [图文导览](demo/index.html) · [在线研究网页](https://yydshly.github.io/1004_codex_project/demos/008-forge3d/) · [本次交付验证](verification.md) · [官方仓库](https://github.com/milos-agathon/forge3d) · [官方文档](https://milos-agathon.github.io/forge3d/)

上方为本次制作的研究引导图。图中的山谷、树木、建筑、数据层和应用效果是**概念示意，不是 Forge3D 实际运行截图、Lauterbrunnen 复现结果或测量精度证明**。

| 项目 | 信息 |
| --- | --- |
| 固定编号 / 目录 | 008 / 008-forge3d |
| 研究日期 | 2026-10-05，Asia/Shanghai |
| 归档日期 | 2026-10-06，Asia/Shanghai |
| 研究快照 | [ac6bc40a5d6395c407056bb6e63cb932352f961d](https://github.com/milos-agathon/forge3d/tree/ac6bc40a5d6395c407056bb6e63cb932352f961d) |
| 版本资料 | [CHANGELOG](https://github.com/milos-agathon/forge3d/blob/ac6bc40a5d6395c407056bb6e63cb932352f961d/CHANGELOG.md) 记录 1.41.0，日期 2026-10-04；未独立确认该版本的 PyPI wheel 分发状态 |
| 上游许可 | 开源核心 Apache-2.0 OR MIT；部分 Pro 功能需要商业密钥，数据与第三方素材另行核对许可 |
| 本次产物 | 完整中文摘要、详细研究与来源、原图及构图需求、静态图文导览、归档验证记录 |
| 验证状态 | 资料与源码研究完成；未安装/运行原版，未训练、渲染或进行本机性能测试 |

## 研究目的与核心结论

本次研究从作者的地理融合渲染展示出发，回答三个问题：这些视觉效果由什么数据构成；如何用开放数据或无人机实拍准备自己的场景；Forge3D 在完整工作流中实际承担什么职责。

- **价值在数据融合与表达。** 把不同表示方式的数据放到同一场景中，统一相机、光照与可见性，便于制作有空间关系的地图、近景和镜头。
- **结果质量先由输入决定。** 分辨率、采集覆盖、坐标配准、缺失区域、拍摄时间和素材许可，都要在渲染前处理。
- **画面与精度分开验收。** 图片漂亮、阴影自然、输出 4K，不自动证明坐标准确、表面完整、工程可测量或实时性能。

是否足够还原，应由目标尺度判断：山谷远景重在地形与整体外观，低空近景需要更密的几何和更清晰的纹理，工程测量还需独立误差验收。区域性高质量数据可以提供有效基础；这次研究的价值是保存可复用路线，后期按具体地点、精度与预算做小样，而非现在就追求全球统一精细重建。

[融合文档](https://github.com/milos-agathon/forge3d/blob/ac6bc40a5d6395c407056bb6e63cb932352f961d/docs/splat-fused.md) · [官方功能地图](https://milos-agathon.github.io/forge3d/guides/feature_map.html)

## 四类数据分别是什么

| 数据 | 表达什么 | 常见获取 / 准备方式 | 进入场景后的作用与边界 |
| --- | --- | --- | --- |
| DEM 高程栅格 | 规则网格上的高度，每个水平位置对应一个高度值 | 官方高程产品、从地面点云插值、摄影测量输出；常见 GeoTIFF/COG | 构成地形起伏；DTM 是移除建筑/植被的地面，DSM 含地物表面，下载时必须区分；高度场不能表达悬挑、洞穴或同一水平位置上的多层结构 |
| 点云 | 空间采样点的位置，可附颜色、分类、强度等属性 | 机载/地面 LiDAR，或多视图摄影测量；常见 LAS/LAZ | 补充树冠、屋顶、立面等三维结构；不是天然连续网格，密度、空洞与分类影响结果；融合入口使用兼容的 COPC |
| 影像 / 正射影像 | 地表颜色、纹理或专题信息 | 卫星、航空、无人机照片；照片经摄影测量与正射处理得到可地理配准的影像 | 可做地形颜色图或覆盖层；换更清晰影像不自动提高 DEM 的几何精度，原始照片也不能当作已对齐的正射图 |
| 3DGS | 带中心、尺度/方向、透明度和颜色等属性的三维高斯集合 | 使用外部重建/训练工具，把多视角照片或视频生成现成高斯资产 | 补充真实外观与局部细节；需兼容的 3DGS PLY 字段、配准和清理；不是普通点云，也不自动成为网格或精确测量模型 |

COPC 是带空间层级组织的 LAZ 点云格式，便于按区域与层级访问；给普通 LAZ 改后缀不能完成转换。普通点云 PLY、3DGS PLY 和三角网格 PLY 虽可有相同扩展名，字段与用途不同。[Forge3D 融合输入](https://github.com/milos-agathon/forge3d/blob/ac6bc40a5d6395c407056bb6e63cb932352f961d/docs/splat-fused.md) · [PDAL COPC writer](https://pdal.io/en/stable/stages/writers.copc.html) · [ODM 输出说明](https://docs.opendronemap.org/outputs/)

## 去哪里获得数据

| 入口 | 可获取什么 | 适合什么范围 / 用法 | 使用前检查 |
| --- | --- | --- | --- |
| [Forge3D 样本注册表](https://github.com/milos-agathon/forge3d/blob/ac6bc40a5d6395c407056bb6e63cb932352f961d/python/forge3d/datasets.py) | 内置 mini DEM，按需 Rainier、Fuji、Swiss 等 DEM；MtStHelens 点云等 | 先学习地形、覆盖层、点云与相机流程 | 样本并非全球数据服务；每个原始数据的来源/许可单独核对，下载入口与安装版本可能变化 |
| [Copernicus DEM](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM) | GLO-30 / GLO-90，约 30 m / 90 m 的全球陆地 DSM | 大区域底图和远景起伏 | 它是 DSM，不能默认当裸地 DTM；注册、下载方式、署名及许可按官方产品要求 |
| [Sentinel-2](https://sentiwiki.copernicus.eu/web/s2-mission) | 多光谱卫星影像，RGB 波段为 10 m | 大区域颜色、地表覆盖与时序变化底图 | 系统覆盖约 56°S 至 82.8°N；云、季节、地形阴影和采集时间影响可用性，不适合替代厘米级近景 |
| [USGS 3DEP](https://www.usgs.gov/3d-elevation-program/about-3dep-products-services) | 美国区域高程与 LiDAR 点云产品 | 查找美国特定地点的细节数据 | 覆盖与更新按项目/瓦片变化，不等于全球均匀覆盖 |
| [swissALTI3D](https://www.swisstopo.admin.ch/en/height-model-swissalti3d) | 瑞士裸地高程，0.5 m / 2 m 网格 | 瑞士局部地形；Lauterbrunnen 类场景的数据起点 | 网格间距不等于测量误差，部分 0.5 m 网格来自过采样；核对 LV95/LN02 与数据年代 |
| [swissSURFACE3D](https://www.swisstopo.admin.ch/en/height-model-swisssurface3d) | 瑞士和列支敦士登机载 LiDAR 分类点云 | 树木、建筑和地表三维细节 | 分类筛选、密度、坐标、高程基准与 COPC 转换 |
| [SWISSIMAGE](https://www.swisstopo.admin.ch/en/orthoimage-swissimage-10) | 瑞士正射影像，平原和主要阿尔卑斯山谷约 10 cm，阿尔卑斯区域约 25 cm | 更清晰的地形颜色贴图 | 影像与 DEM/点云的区域、坐标和采集年代是否相容 |
| 自己的无人机素材 | RGB 照片、视频；搭载激光扫描器时可另外采集 LiDAR | 开放数据不足的近景、指定建筑或场地 | 合法采集与素材授权、视角覆盖、重叠、模糊、动态物体；外部重建与配准后再导入 |

swisstopo 正式开放数据 Download 与产品页的 **sample data** 条款应区分：官方开放产品可按条款使用，需保留来源标注；部分 sample data 仅允许测试，不能直接纳入产品。[swisstopo 免费地理数据使用条款](https://www.swisstopo.admin.ch/en/terms-of-use-free-geodata-and-geoservices)

## Forge3D 在完整流程中做什么

1. **接收准备好的数据。** 读取高程、COPC 点云与现成高斯；影像可以用于地形颜色/覆盖层。照片求相机、摄影测量、正射拼接和 3DGS 训练属于外部准备流程。
2. **建立同一空间。** 统一坐标、单位、轴向、尺度、地理原点和高程基准。高斯的 similarity transform 提供统一缩放、旋转和平移，用于把局部捕获放入场景。
3. **统一相交与遮挡。** SPLAT-FUSED 将高斯、LiDAR 与 DEM 放入统一加速结构；同一套查询决定地形、高斯和点云之间的可见性。
4. **计算光照。** ReSTIR 路径追踪根据融合可见性重采样光照候选，生成太阳/天空照明与阴影；高度雾参与衰减。树影和山脊阴影不需要另行叠图伪造。
5. **控制驻留内存。** 点云和高斯按页存储，射线访问尚未驻留的页时请求加载；exact 模式等待完整遮挡再累积，progressive 模式可保留流入过程中的画面。
6. **分块与输出。** 高分辨率画面可拆成无缝 tile；多视角序列共享场景、驻留池与地形上传。渲染图片、AOV 和连续相机视角后，可由额外工具编码视频。

[统一模型、分页、分块与序列](https://github.com/milos-agathon/forge3d/blob/ac6bc40a5d6395c407056bb6e63cb932352f961d/docs/splat-fused.md)

## 已确认能力与应用

| 方向 | 官方资料覆盖的能力 | 可以构建的结果 / 使用边界 |
| --- | --- | --- |
| 地形与地图 | GeoTIFF / NumPy DEM、地形 viewer、栅格/矢量覆盖层、标签与相机控制 | 山地地图、地表专题展示；分析精度由源数据与外部分析方法决定 |
| 三维数据融合 | 点云、3DGS、DEM、统一遮挡与阴影 | 山谷、森林、建筑局部与远景组合；需数据配准，不能保证任何捕获都自然接合 |
| 渲染表达 | 路径追踪、PBR、太阳/天空、阴影与大气相关控制；不同入口支持不同功能 | 地形宣传图、真实感地图、镜头；广义渲染功能不能全部自动套用到每种融合入口 |
| 离线内容制作 | 高分辨率 snapshot、headless/batch 入口、相机动画与序列 | 静帧、飞越镜头、多个时间/视角的图片；视频编码可由外部流程完成 |
| 流式数据 | COG、点云层级与 SPLAT-FUSED 分页等 | 更大区域/资产的按需访问；不代表所有原始数据都只占 512 MiB |
| 地图排版与业务展示 | 比例尺、指北针、图例、地图板、部分矢量导出和建筑工作流 | 专业地图成品和业务页面；部分属于 Pro，需要密钥 |

[固定 README](https://github.com/milos-agathon/forge3d/blob/ac6bc40a5d6395c407056bb6e63cb932352f961d/README.md) · [官方功能地图](https://milos-agathon.github.io/forge3d/guides/feature_map.html) · [Quickstart](https://milos-agathon.github.io/forge3d/start/quickstart.html)

可基于这些能力制作山地导览、景区镜头、局部场地留档、森林/建筑展示和地理数据对比。进一步做灾害分析、选址、测量或数字孪生业务时，还要加入相应计算、精度验证、数据版本和业务系统；画面本身不等于已有完整分析模型。

## 开放数据加无人机的实用路线

1. **确定范围与目标。** 先决定是大区域地图、低空近景还是尺寸分析，分别设定纹理、几何和性能验收指标。
2. **准备远景。** 下载合法可用的 DEM/DSM 与影像；裁切所需区域，核对分辨率、无数据区、水平坐标与高程基准。选择裸地高程时避免把树木/建筑重复当作地形再叠加。
3. **采集局部素材。** RGB 无人机提供多视图照片/视频；要真正的 LiDAR 点云，需要相应激光传感器或使用已有 LiDAR 数据。针对建筑立面与悬崖，单纯俯拍不能保证覆盖。
4. **在外部完成重建。** 摄影测量可产出点云、DSM 与正射图；3DGS 工具可产出现成高斯。按目的选择输出，检查模糊、漂浮点、空洞、动态物体和未观测区域。
5. **统一格式与空间。** 点云按需要转成 COPC；高斯核对字段后进行 similarity transform；颜色图重投影/重采样到 DEM 网格。检查控制点、接缝和地形/建筑的重合关系。
6. **在 Forge3D 小样渲染。** 先低分辨率、单视角核对位置与遮挡，再增加采样、输出尺寸、数据规模和相机轨迹。分别检查几何误差、颜色接缝、原光照残留和显存需求。

[无人机采集建议](https://docs.opendronemap.org/flying/) · [摄影测量输出](https://docs.opendronemap.org/outputs/) · [COPC 转换入口](https://pdal.io/en/stable/stages/writers.copc.html) · [Forge3D 高斯放置与输入](https://github.com/milos-agathon/forge3d/blob/ac6bc40a5d6395c407056bb6e63cb932352f961d/docs/splat-fused.md)

这些步骤是后续验证路线，**不是本次已成功运行的操作日志或未验证的可执行代码**。

## 全球覆盖、精度与性能边界

全球陆地有较广泛的 DEM/DSM 和卫星影像基础，但高精度点云、厘米级正射图及近景 3DGS 是区域性资产。Copernicus GLO-30/90 能做区域底图，不能据此保证全球城市立面、树冠和屋顶都能精细重建。无人机可以补局部覆盖；相机、姿态、采集条件和配准仍限制最终质量。网格尺寸、像素分辨率、点密度、坐标误差与几何完整性是不同指标。[Copernicus DEM 产品](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM) · [swissALTI3D 质量说明](https://www.swisstopo.admin.ch/en/height-model-swissalti3d)

| 官方记录 / 限制 | 实际含义 |
| --- | --- |
| RTX 3070 / Vulkan，Lauterbrunnen 1920×1080、64 samples：39.6 s，tracked peak 467.1 MiB | 是特定硬件与配置的离线基准；本次未复现，不是实时帧率承诺 |
| 1080p/4K 可通过 tile 控制峰值 | 高输出分辨率不等于高采集精度，也不等于每帧实时生成 |
| 融合路径至少需要每 shader stage 13 个 storage buffers | 跨平台底层不保证所有 GPU、驱动、虚拟机或浏览器都满足该路径要求 |
| exact 模式所需页超过驻留池会报预算错误 | 按需加载仍需要合理池容量；不会通过静默丢遮挡物来假装成功 |
| progressive 可保留加载中的 stale visibility | 适合观察流入过程；正式成品应核对遮挡完整性 |
| 高度场不能表达悬挑；GPU 高斯颜色只使用 SH bands 0/1 | 悬崖、桥下和复杂局部结构需要其他三维表示；高斯外观存在表示限制 |
| 高斯原采集光照被作为 albedo 使用 | 改太阳方向时可能残留原阴影/颜色；统一新阴影不等于消除了全部烘焙光照 |

[官方测量、GPU 要求与限制](https://github.com/milos-agathon/forge3d/blob/ac6bc40a5d6395c407056bb6e63cb932352f961d/docs/splat-fused.md)

## 能否直接使用作者的 Lauterbrunnen 数据

**不能把原帖或仓库文档理解为已附完整场景下载包。** 在本次研究快照的完整 GitHub 文件树与样本注册表中，未找到 Lauterbrunnen 的原始高程/点云/高斯包、处理脚本和完整一键复跑说明。官方实施记录明确把演示脚本放在仓库外的作者本地路径；本地 `D:/...` 不构成公开下载地址。

公开 evidence 中的 Lauterbrunnen 基准使用 6 m DEM 与**按坡度/高程生成的颜色图**：低坡度草甸、较陡岩石、高海拔雪，caption 标注程序生成且非影像。它能证明该配置的渲染记录，不能据此说明原帖每个镜头使用了同一数据、影像和参数。[官方 evidence](https://github.com/milos-agathon/forge3d/blob/ac6bc40a5d6395c407056bb6e63cb932352f961d/docs/superpowers/plans/2026-10-03-splat-fused-limits-evidence.md) · [实施记录](https://github.com/milos-agathon/forge3d/blob/ac6bc40a5d6395c407056bb6e63cb932352f961d/docs/superpowers/plans/2026-10-03-splat-fused-limits.md)

可以先用公开的[融合测试 fixture](https://github.com/milos-agathon/forge3d/tree/ac6bc40a5d6395c407056bb6e63cb932352f961d/tests/fixtures/splat_fusion)学习三类数据组合：65×65 DEM、3,500 个高斯、5,500 个 COPC 点及场景参数。它是小型合成验证场景，不能当作 Lauterbrunnen 实拍原数据。另有 Swiss DEM 和 MtStHelens 点云样本，但它们也不等于该演示的完整素材。

## 后续探索与验收清单

- [ ] 固定可安装的发行版本或源码提交，核验实际 wheel、Python、GPU、驱动与 `splat-fusion` 支持。
- [ ] 先跑 mini DEM / 融合 fixture；记录命令、成功输出与失败诊断，确认本机运行能力。
- [ ] 选一个小区域，建立 DEM/点云/影像/高斯的来源、日期、许可、哈希和坐标清单。
- [ ] 对比开放数据、开放数据加无人机正射图、开放数据加局部点云/3DGS，分开评价纹理与几何收益。
- [ ] 检查高程基准、尺度、接缝、空洞、重复地物、原拍摄阴影和独立视角质量。
- [ ] 测量分辨率/采样/tile/驻留池对耗时、显存、paging 和 stale frames 的影响，再制作飞行序列。
- [ ] 向上游查找或询问完整 Lauterbrunnen 素材/脚本的公开入口和再分发许可；未获得前使用自己的合规数据。
- [ ] 若构建完整应用，再补数据检索、资产版本、质量报告、镜头编辑、任务调度与发布界面；不把这些扩展设想写成现成功能。

## 许可与资料边界

开源核心采用 Apache-2.0 OR MIT；官方 README 和功能地图说明部分地图排版、矢量导出及建筑等工作流属于 Pro，需商业密钥。具体接口以选定发行版本与官方条款为准。上游代码许可不自动覆盖所有原始地理数据、摄影素材、模型权重或第三方内容；重分发数据、生成作品与产品发布前保留各自来源和署名要求。[固定 README](https://github.com/milos-agathon/forge3d/blob/ac6bc40a5d6395c407056bb6e63cb932352f961d/README.md) · [MIT 许可](https://github.com/milos-agathon/forge3d/blob/ac6bc40a5d6395c407056bb6e63cb932352f961d/LICENSE) · [Apache 许可](https://github.com/milos-agathon/forge3d/blob/ac6bc40a5d6395c407056bb6e63cb932352f961d/LICENSE-APACHE)

源码证据尽量固定到研究提交；在线文档可能随 `main/latest` 变化，不能全部倒推为截图中 1.41.0 的固定行为。全部来源、观察范围、下载入口问题与待核验事项见[研究笔记](notes.md)。
