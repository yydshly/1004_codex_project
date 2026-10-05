# 008 · Forge3D · 研究笔记与证据

[项目摘要与引导图](README.md) · [上游仓库](https://github.com/milos-agathon/forge3d) · [固定研究快照](https://github.com/milos-agathon/forge3d/tree/ac6bc40a5d6395c407056bb6e63cb932352f961d)

| 项目 | 记录 |
| --- | --- |
| 研究日期 | 2026-10-05，Asia/Shanghai |
| 归档日期 | 2026-10-06，Asia/Shanghai |
| 固定源码提交 | ac6bc40a5d6395c407056bb6e63cb932352f961d |
| 版本证据 | CHANGELOG 中 `[1.41.0] - 2026-10-04`；不据此断言 PyPI 对应 wheel 已发布或任意平台可安装 |
| 验证状态 | **资料与源码研究完成，原版运行待验证** |
| 本轮已做 | 官方文档/源码/公共元数据阅读，数据入口与演示公开性核查，中文研究与概念信息图整理 |
| 本轮未做 | 未安装/运行 Forge3D，未本机渲染/训练/摄影测量/性能测量，未复现作者视频 |
| 证据分层 | 官方披露＝上游资料主张；直接观察＝公开源码/元数据/HTTP 状态；解释与应用＝据机制形成的研究判断；待验证＝尚需原版运行或数据核验 |

## 1. 起点、目的与结论范围

研究起点是用户提供的作者帖子与后续截图，主题为 Forge3D 1.41.0、terrain + LiDAR + 3D Gaussian Splatting、共享阴影、高度雾、高分辨率、流式加载及飞行视角。帖子链接用于保留研究起点：[作者原帖](https://x.com/milos_gis/status/2106764377735016932)。本档案的技术判断以官方仓库、文档和产品资料为依据，不把对帖子媒体的未知细节补写成事实。

要回答的实际问题是：DEM/点云/影像/高斯各负责什么；能否获得作者同一套数据；如何从开放资料或无人机实拍准备自己的场景；不同精度与覆盖条件下可以得到什么；原版功能与扩展业务如何分工。

**核心判断：**Forge3D 在此路线中承担地理数据与现成三维资产的渲染层。数据准备、外部实拍重建、配准、几何验收与业务分析仍有独立工作。融合可见性比简单叠放图层更有价值，但不能以好看的渲染代替测量或性能证据。

## 2. 固定版本与动态文档

[固定 CHANGELOG](https://github.com/milos-agathon/forge3d/blob/ac6bc40a5d6395c407056bb6e63cb932352f961d/CHANGELOG.md) 记录 1.41.0 的日期为 2026-10-04，并包含 SPLAT-FUSED 与版本更新资料。研究期间直接访问 `v1.41.0` GitHub release 页面未得到对应页面，PyPI 精确版本页面/JSON 查询也未得到可用独立确认；部分网络尝试因访问或缓存问题失败。这些失败不能证明版本不存在，也不能证明 wheel 已完成分发。

因此保留三个层次：**CHANGELOG 版本记录已见；研究提交源码可读；精确发行包与本机可运行性未核实。** 后续安装要记录实际取得的版本、wheel 文件、平台、特性和 GPU，而不能只写 `pip install` 后假设与截图完全相同。

官方在线 [Feature Map](https://milos-agathon.github.io/forge3d/guides/feature_map.html) 与 [Quickstart](https://milos-agathon.github.io/forge3d/start/quickstart.html) 是当前工作流参考，会跟随上游更新；固定研究证据优先使用提交链接。研究时曾遇到标签列表与 `pyproject.toml` 网页缓存落后于 `main` 的情况，不能把旧缓存当作新版本的反证，也不能把 latest 所有内容当作 1.41.0 固定行为。

## 3. 数据定义、几何与外观分工

### 高程栅格

DEM 用规则网格保存高度，决定地形形状。DTM 描述移除地物后的地面，DSM 描述包含植被/建筑的表面。Copernicus DEM 实际是 DSM；如果再叠加建筑和树点云，要检查地物是否重复表达。[Copernicus 官方定义](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM)

“30 m 网格”“0.5 m 网格”“6 m 重采样结果”描述采样间距，不直接描述垂直误差，也不保证同样大小的物体可完整恢复。把低分辨率高程上采样，只会生成更密的数组，不会补出未测得的细节。swissALTI3D 产品页明确说明部分地区原始密度不足以支持最小 0.5 m 网格，此时进行了过采样。[swissALTI3D](https://www.swisstopo.admin.ch/en/height-model-swissalti3d)

### 点云与 LiDAR

点云是空间样本，可以来自激光扫描或多视图摄影测量。LiDAR 是主动激光测量方式，RGB 相机是拍摄影像；普通 RGB 无人机经过摄影测量可得到点云，不能因此把传感器或输出称为 LiDAR。颜色、分类、强度、回波和密度是不同属性，数据不一定全部具备。分类后的裸地点、树木点、屋顶点适合不同用途。[swissSURFACE3D 官方说明](https://www.swisstopo.admin.ch/en/height-model-swisssurface3d) · [ODM 输出](https://docs.opendronemap.org/outputs/)

COPC 在 LAZ 基础上提供空间组织，适合层级访问。Forge3D 融合接口使用 COPC；将普通 LAS/LAZ 整理成兼容数据要使用实际转换工具并检查结果，不能改扩展名。[PDAL writers.copc](https://pdal.io/en/stable/stages/writers.copc.html)

### 影像与正射图

原始照片带透视、拍摄姿态和地形起伏引起的位移。正射影像经过处理，可按地理坐标映射到地面。卫星、航空、无人机都能提供影像，但覆盖、分辨率、云、季节、拍摄时间和相机质量不同。

地形颜色图影响外观，DEM/点云/重建影响几何。给原 DEM 换一张更清晰的图不会自动提高山脊、屋顶、桥下或悬崖的形状精度；没有几何覆盖的地方可能仍是平面或缺口。[ODM 输出流程](https://docs.opendronemap.org/outputs/) · [Forge3D albedo map](https://github.com/milos-agathon/forge3d/blob/ac6bc40a5d6395c407056bb6e63cb932352f961d/docs/splat-fused.md)

### 三维高斯

3DGS 使用带中心、各向异性尺度/旋转、透明度和颜色参数的高斯集合表达局部外观。它可以来自外部实拍重建/训练，但该融合文档描述的是加载现成 3DGS `.ply`，不是从照片求相机或训练高斯。高斯 PLY、普通点云 PLY 与三角网格 PLY 的字段不同，不应因扩展名相同而混用。

现成高斯需要空间配准；颜色中可能已含原拍摄时的光照。它能呈现复杂局部外观，但不天然具有连续网格、可靠公制尺寸、对象语义或业务测量结果。[SPLAT-FUSED 输入与限制](https://github.com/milos-agathon/forge3d/blob/ac6bc40a5d6395c407056bb6e63cb932352f961d/docs/splat-fused.md)

## 4. 官方数据入口与全球覆盖

| 官方入口 | 研究结论 | 适用边界 |
| --- | --- | --- |
| [Copernicus DEM](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM) | GLO-30 / GLO-90 提供全球陆地 DSM，约 30 m / 90 m；一般公众可按官方注册与许可要求下载 | 不是全球厘米级地形，不含完整城市立面；产品署名义务、格式、水平/垂直基准另行记录 |
| [Sentinel-2 mission](https://sentiwiki.copernicus.eu/web/s2-mission) | RGB 波段为 10 m，系统覆盖约 56°S—82.8°N | 不宜称为无条件的全球所有地区覆盖；云、季节和时相影响可用画面，无法替代近景细纹理 |
| [USGS 3DEP products & services](https://www.usgs.gov/3d-elevation-program/about-3dep-products-services) | 提供美国区域高程与 LiDAR 点云产品入口 | 按区域项目、产品与年份查瓦片；不能扩展为全球高精度点云服务 |
| [swissALTI3D](https://www.swisstopo.admin.ch/en/height-model-swissalti3d) | 裸地高程，0.5 m / 2 m，LV95 LN02 | 地点和来源的质量不同；部分网格过采样，原生产品与 6 m demo 派生文件不能混同 |
| [swissSURFACE3D](https://www.swisstopo.admin.ch/en/height-model-swisssurface3d) | 高密度机载 LiDAR 分类点云；官方说明 2024 年起覆盖瑞士和列支敦士登 | 检查瓦片、分类、时间和坐标；此产品存在不等于作者处理过的 COPC 已公开 |
| [SWISSIMAGE](https://www.swisstopo.admin.ch/en/orthoimage-swissimage-10) | 平原与主要阿尔卑斯山谷约 10 cm、阿尔卑斯区域约 25 cm 的正射影像 | 数据年代可能与高程/点云不同；像素尺寸不等于几何误差 |

“全球基础数据较丰富”和“全球任意地点都能得到同样精度的近景场景”是不同判断。高密度点云、厘米级正射影像和可用 3DGS 依赖当地采集项目。自己的无人机素材可补局部，但也需要合法采集、重建、坐标控制和质量验收。

**数据许可：**Copernicus 公开产品有各自许可与来源标注要求；swisstopo 正式开放 Download 可按免费地理数据条款用于相应目的，保留 `©swisstopo` 等要求。产品页中另列的 sample data 有时仅供测试，不能纳入产品。不要把“免费”解释为取消所有署名或再分发条件。[swisstopo 条款](https://www.swisstopo.admin.ch/en/terms-of-use-free-geodata-and-geoservices)

本轮归档只保存研究文字和引导图，没有镜像或再分发上述原始地理数据。

## 5. SPLAT-FUSED 的融合机制

**官方披露：**`render_fused` 在一次 ReSTIR 路径追踪通道中同时渲染 3DGS、COPC LiDAR 和 DEM。三者处在统一加速结构，访问同一遮挡函数；高斯树木可在地形投影，山脊可遮挡高斯与 LiDAR。融合不是分别渲染后简单合成三张图，也不在这里另加一个 rasterizer。[固定融合文档](https://github.com/milos-agathon/forge3d/blob/ac6bc40a5d6395c407056bb6e63cb932352f961d/docs/splat-fused.md)

文档的遮挡模型是 `T_total = T_splat × T_lidar × T_terrain`：

- 高斯按射线经过局部高斯分布的量计算透射率，并限制在 3σ 椭球代理范围内。
- LiDAR return 用小球式 sphelet 或满足局部平面条件的 surfel 参与覆盖与透射率计算。
- 地形通过高度场相交判断遮挡；阴影 any-hit 的地形透射率是 0 或 1。

光照使用太阳/天空与 BRDF；高度雾参与衰减。ReSTIR 对太阳圆盘方向的候选样本按融合可见性进行重采样。主射线/反弹射线与用于 AOV 的 G-buffer 查询存在随机/确定性阈值区别，不能把这一实现简化成“把所有点直接连成实体网格”。

相机、原点、单位和轴向需要先统一。`GaussianSplatCloud.transformed(scale, (w,x,y,z), (tx,ty,tz))` 对高斯做 similarity transform：统一缩放、四元数旋转和位移。它提供放置能力，不自动求解未知相机、坐标系统或高程基准。公开 fixture 的 `FusedPointCloud` 还显式记录 `origin` 与 `z_up`，展示了局部原点与轴向处理。[fixture helper](https://github.com/milos-agathon/forge3d/blob/ac6bc40a5d6395c407056bb6e63cb932352f961d/tests/_splat_fusion.py)

地形 `albedo_map` 是 DEM 网格上的 uint8 sRGB 颜色图，可选择 nearest/bilinear。加入它改变颜色，不增加高度；smooth normals 改善表面着色连续性，不把 2.5D 高度场变成可表达悬挑的三维结构。

## 6. 分页、分块、相机序列与硬件

点云/高斯默认按页组织，顶层加速结构保留页级叶节点；页 payload 在固定 GPU 池中驻留。射线访问缺页时提出请求，host 异步加载并按 LRU 淘汰。

| 机制 | 官方行为 | 需要注意 |
| --- | --- | --- |
| `policy=exact` | 有缺页的帧丢弃；页驻留后重新累积，避免缺失遮挡物 | 单视角需要的页多于池容量会报预算错误，不代表任意规模都能成功 |
| `policy=progressive` | 流入期间保留帧；阴影缺页时可能沿用已知 visibility | `stale_frames` 记录受影响帧；成品应验收最终遮挡 |
| 无缝 tiling | 全局像素相机射线/种子保证分块连续；文档称对应配置与单 tile bit-identical | 控制像素相关 GPU 工作集，不等于提高原始几何精度或承诺实时 |
| AOV opt-out | 不返回 AOV 时不分配相应大目标，减少每像素存储 | 内存优化取决于实际版本/选项；必要诊断与 beauty 输出分开 |
| `render_fused_sequence` | 多视角共用 kernel、驻留池和地形上传；各视角更新环境 | 多视角序列不是外部视频编码器，也不是原生照片训练流程 |

官方称 tracked render peak 受 512 MiB 预算控制。这是该路径追踪的内存统计/预算，不能推导为原始数据、预处理、应用全部 RAM/VRAM 永远少于 512 MiB。[分页与测量](https://github.com/milos-agathon/forge3d/blob/ac6bc40a5d6395c407056bb6e63cb932352f961d/docs/splat-fused.md)

融合 GPU 路径要求 `max_storage_buffers_per_shader_stage >= 13`。官方 GPU 断言在物理 NVIDIA Vulkan lane 执行，软件和虚拟化适配器跳过；能力不足时给诊断。Rust/wgpu 的跨平台基础不等于该融合功能在任意 GPU、驱动、虚拟机或浏览器都能工作。后续必须测试目标机器，不把“WebGPU”标签直接等同浏览器即开即用的融合服务。

## 7. 官方 benchmark 与画面边界

以下是维护者记录，**本研究未独立复现**。[固定测量文档](https://github.com/milos-agathon/forge3d/blob/ac6bc40a5d6395c407056bb6e63cb932352f961d/docs/splat-fused.md) · [详细 evidence](https://github.com/milos-agathon/forge3d/blob/ac6bc40a5d6395c407056bb6e63cb932352f961d/docs/superpowers/plans/2026-10-03-splat-fused-limits-evidence.md)

| 场景 / 条件 | 官方记录 |
| --- | --- |
| RTX 3070、Vulkan；1080p fixture，默认 tile | 4 tiles，tracked peak 471.0 MiB |
| 1080p/4K fixture，960×540 tiles | peak 等于单个 960×540 渲染：272.5 MiB，关闭 AOV 为 248.8 MiB |
| Mount St. Helens，1920×1080，64 spp | 9.7 s，peak 473.3 MiB |
| Lauterbrunnen，1920×1080，64 spp，6 m DEM 与颜色图 | 39.6 s，peak 467.1 MiB，terrain 67.0 MiB |

Lauterbrunnen evidence 明确写到 `terrain_6m.npy` 与**程序性色图**：坡度小于 30° 的草甸、较陡岩石、高于 2600 m 的雪；caption 标明程序生成而非影像。不能用这条 benchmark 去证明原帖全部视频的贴图来源、光照条件、素材组成或相同运行耗时。

官方“十亿逻辑 primitives”验收使用小型已提交 fixture 嵌入**合成的十亿点索引**。测试代码用约 246k 索引项引用有限 payload pages；它验证分页和遮挡契约，不等于公开了十亿个独立实测 LiDAR 点或同规模真实城市资产。[Python acceptance test](https://github.com/milos-agathon/forge3d/blob/ac6bc40a5d6395c407056bb6e63cb932352f961d/tests/test_splat_fusion_occlusion.py)

表示与光照限制：GPU 高斯颜色只使用 SH bands 0/1；更高阶数据可以加载/存储并在 CPU 颜色查询中使用。DEM 高度场无法表现悬挑。高斯按受太阳与天空照亮的散射表面处理，原捕获 SH 色被作为 albedo 使用；若原色已烘焙阴影，新光照并不会自动消掉旧阴影。LiDAR surfel 可改善地面/屋顶的低太阳角自遮挡，但树冠体积内相互遮挡仍可能较暗；不能承诺统一模型解决了所有树冠观感。

## 8. 作者完整场景包的公开性

**直接观察：**在研究快照通过 GitHub 递归 tree API 读取 `main`，返回 `truncated=false`，提交为 `ac6bc40a5d6395c407056bb6e63cb932352f961d`。未找到名为 Lauterbrunnen 的数据/脚本目录、`process_lidar.py` 或对应完整下载包；样本 registry 也未列入 Lauterbrunnen。这个结论针对本次查询到的公开仓库与注册表，不排除未来发布或另有未发现入口。

[实施记录](https://github.com/milos-agathon/forge3d/blob/ac6bc40a5d6395c407056bb6e63cb932352f961d/docs/superpowers/plans/2026-10-03-splat-fused-limits.md) 明确写 demo 脚本在仓库外的 `D:/forge3d_data/splat_fused_demos`；evidence 引用本地处理文件、缓存和渲染脚本。**本地路径只说明维护者实验位置，不是公共资产地址。** 公开 swisstopo 原始产品也不等于作者已裁切、重采样、筛选、配准和设参后的场景文件。

本轮能够公开定位的小型融合 fixture：

| 文件 / 代码 | 内容 |
| --- | --- |
| [dem_65x65.f32](https://github.com/milos-agathon/forge3d/blob/ac6bc40a5d6395c407056bb6e63cb932352f961d/tests/fixtures/splat_fusion/dem_65x65.f32) | 65×65 小型 DEM |
| [cloud.ply](https://github.com/milos-agathon/forge3d/blob/ac6bc40a5d6395c407056bb6e63cb932352f961d/tests/fixtures/splat_fusion/cloud.ply) | 3,500 个高斯 |
| [swath.copc.laz](https://github.com/milos-agathon/forge3d/blob/ac6bc40a5d6395c407056bb6e63cb932352f961d/tests/fixtures/splat_fusion/swath.copc.laz) | 5,500 点 COPC |
| [scene.json](https://github.com/milos-agathon/forge3d/blob/ac6bc40a5d6395c407056bb6e63cb932352f961d/tests/fixtures/splat_fusion/scene.json) | DEM 尺寸/间距、原点、相机、太阳和材质参数 |
| [tests/_splat_fusion.py](https://github.com/milos-agathon/forge3d/blob/ac6bc40a5d6395c407056bb6e63cb932352f961d/tests/_splat_fusion.py) | 文件读取和融合参数组装 |
| [test_splat_fusion_occlusion.py](https://github.com/milos-agathon/forge3d/blob/ac6bc40a5d6395c407056bb6e63cb932352f961d/tests/test_splat_fusion_occlusion.py) | 融合与参考渲染、阴影 IoU、分页与内存验证 |

fixture 是合成验证场景，不是 Lauterbrunnen 实拍素材。相机与原点已有参数，可作入门学习，但本研究未执行其测试。

## 9. 样本注册表与下载入口观察

[datasets.py](https://github.com/milos-agathon/forge3d/blob/ac6bc40a5d6395c407056bb6e63cb932352f961d/python/forge3d/datasets.py) 将 mini DEM 与 sample boundaries 作为 bundled 样本；Rainier、Fuji、Swiss、Luxembourg、land-cover、建筑与 MtStHelens 点云等作为按需数据。下载流程优先查本地 repo，否则经 `pooch` 请求注册 URL 并校验哈希。远程下载 extra 需要 `pooch`；这不是用户任意地点的自动数据检索器。

2026-10-05 只读 HEAD 观察：

| 查询入口 | 返回 / 范围 |
| --- | --- |
| [Swiss DEM media 入口](https://media.githubusercontent.com/media/milos-agathon/forge3d/main/assets/tif/switzerland_dem.tif) | 200，Content-Length 29,156,558 bytes；未下载/运行，也不是 `terrain_6m.npy` |
| [MtStHelens raw 入口](https://raw.githubusercontent.com/milos-agathon/forge3d/main/assets/lidar/MtStHelens.laz) | 200，9,493,209 bytes；GitHub contents API 也指向此 raw URL |
| registry 对 MtStHelens 使用的统一 media 入口 | 当时返回 404；普通 Git blob 的 raw 入口可用，不能保证对应 `fetch_copc` 自动下载在该快照直接成功 |

HTTP 状态只能证明当时入口可访问，不能替代格式解码、COPC 兼容、内容许可与本机渲染验证。数据服务 URL 含 `main` 时会变化；后续正式实验应保留文件哈希和实际下载日期。

## 10. 开放数据与无人机路线

建议组合是**开放地形/影像做区域环境，自己的重建做局部细节**。这是一条可验证的方案，不是本次成功案例。

1. 选择小区域，明确是视觉导览、镜头制作还是几何分析，给各指标设独立验收方法。
2. 记录开放数据的 DTM/DSM 类型、水平 CRS、垂直 datum、单位、分辨率、无数据区、时间与许可。
3. RGB 无人机按多视角与充分重叠采集静态场景，关注俯视不足的立面/桥下/悬崖；需要 LiDAR 就使用合适的扫描数据/传感器。
4. 用外部摄影测量流程产生点云、DSM 或正射图，或用外部 3DGS 工具训练现成高斯；先检查覆盖、相机/尺度与伪影。
5. 依据已知坐标/控制信息进行配准，转换 COPC、核验 PLY 字段，重投影与重采样影像；检查原点、轴向、尺度和高程基准。
6. 先在 Forge3D 低分辨率单视角检查可见性与接缝，再提高采样、分辨率和数据规模；保存最终配置和性能记录。
7. 输出静帧/序列；正式作品核验许可、遮挡完整、颜色与旧光照残留，业务测量另外核验。

[ODM 采集指南](https://docs.opendronemap.org/flying/) · [ODM 输出](https://docs.opendronemap.org/outputs/) · [PDAL COPC writer](https://pdal.io/en/stable/stages/writers.copc.html) · [Forge3D fusion](https://github.com/milos-agathon/forge3d/blob/ac6bc40a5d6395c407056bb6e63cb932352f961d/docs/splat-fused.md)

LV95 / EPSG:2056 与 LN02 是瑞士产品需要关注的水平/高程框架。经纬度、局部米制坐标、椭球高和正高不能仅凭数值相近直接叠合；增加一张图或调用 similarity transform 也不能自动解决未知基准差。真正的公制精度需要可靠控制与独立检查。

## 11. 广义能力、应用与未来扩展

[固定 README](https://github.com/milos-agathon/forge3d/blob/ac6bc40a5d6395c407056bb6e63cb932352f961d/README.md) 与 [Feature Map](https://milos-agathon.github.io/forge3d/guides/feature_map.html) 覆盖互动地形、栅格/矢量 overlay、labels、point clouds、camera automation、native/offscreen、geometry/path tracing、device/memory diagnostics，以及部分 Pro 地图排版、矢量导出、建筑和 style 工作流。当前 Feature Map 还明确提示一些 typed MapScene asset adapter 为 underdeveloped，不能据列出 API 名就假定所有组合成熟可用。

**可构建的表达：**高质量地形图、景区/山地镜头、树木建筑与远景组合、近景实拍资产展示、不同年代/专题的地理图层对比。使用这些表达帮助读者理解区域关系是当前能力的合理应用。

**可扩展的产品：**数据下载/裁切界面、来源与许可清单、坐标/质量报告、无人机覆盖提示、资产版本、相机镜头编辑、远程任务与发布页面。这些需要额外工程。地理检索、灾害预测、工程测量、语义对象与完整数字孪生业务也需要独立数据/算法/验证，不列作已内置成果。

“更清晰”“更像实拍”“几何更准”“运行更快”分别测量，不能仅凭图像观感互相替代。建议对同一区域分别比较：开放 DEM；DEM 加更清晰正射图；DEM 加摄影测量点云；DEM 加现成 3DGS。对比时保持相机、光照和输出设置一致，单独报告几何与外观变化。

## 12. 许可、引导图与下一轮记录

官方核心 [MIT](https://github.com/milos-agathon/forge3d/blob/ac6bc40a5d6395c407056bb6e63cb932352f961d/LICENSE) OR [Apache-2.0](https://github.com/milos-agathon/forge3d/blob/ac6bc40a5d6395c407056bb6e63cb932352f961d/LICENSE-APACHE) 双许可。部分 Pro 功能要求商业密钥；是否免费不能只看仓库公开或接口存在。数据、第三方资产与摄影素材的许可分别处理，本档案不改变其许可。

[引导图](assets/forge3d-overview.png) 用于解释数据、融合与应用路线，其中场景是概念示意；不是原版输出、作者真实视频帧或性能证据。不得用该图证明已在本机跑通 1.41.0、生成了 Lauterbrunnen、完成了无人机重建或达到某种测量精度。

下一轮应记录：实际发行版本/提交与 wheel、操作系统/GPU/驱动、融合能力诊断、素材来源/许可/哈希/时间/CRS/datum、预处理工具版本、相机/光照/采样/tile/池容量、耗时、tracked 与整体内存、缺页/stale 信息、独立视角误差、接缝/原光照残留和产物复载。任何成功实验都应另增真实日志与截图，不能把本次资料研究状态改写成已复现。

尚待探索：完整作者场景包的公开入口与许可；1.41.0 分发与目标机器兼容；样本下载差异；真实区域的配准与颜色质量；相同数据/硬件的多配置横评；外部摄影测量或 3DGS 成果的融合验收；高分辨率序列与最终视频制作。
