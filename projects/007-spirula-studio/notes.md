# 007 · Spirula Studio · 研究笔记与证据

[项目摘要与汇总图](README.md) · [图文导览](demo/index.html) · [上游仓库](https://github.com/harry7557558/spirula-studio)

| 项目 | 记录 |
| --- | --- |
| 研究日期 | 2026-10-05，Asia/Shanghai |
| 上游固定提交 | 7801c3ca78ccddc6a448e540be94d6141fab90eb，本轮查询 master |
| 提交时间 / 内容 | 2026-10-05 05:52:55（Asia/Shanghai）；render: fix tilted trajectory when click orbit button |
| 状态 | **资料与源码研究完成，原版运行待验证** |
| 本机研究工作 | 读取官方README、架构/后端文档与核心源码，检索既有研究，制作中文研究与静态导览 |
| 未执行的原版工作 | 未安装/运行Spirula，未完成相机求解、训练、mesh、编辑或性能测量 |
| 证据标记 | 官方披露＝维护者文档主张；源码证据＝可读实现/配置；历史实测＝明确标注工具的既有实验；推断＝机制衍生的应用/限制判断 |

## 1. 定位与输入输出

**官方披露：**照片/视频 → splat → textured mesh 集成在独立程序，GUI/CLI核心无需Python/PyTorch或单独安装COLMAP。Vulkan还集成原生SfM、抽帧和AI masking。可选模型权重、GPU驱动、视频解码支持仍是运行条件。[README](https://github.com/harry7557558/spirula-studio/blob/7801c3ca78ccddc6a448e540be94d6141fab90eb/README.md)

**源码证据：**数据解析覆盖COLMAP、Nerfstudio、Metashape；训练配置含照片、掩膜、深度、法线、相机、点云和已有高斯初始化。mesh格式表含PLY/OBJ/glTF/GLB/STL，颜色模式为无色、顶点色、纹理，实际组合按格式选择，不能假定所有格式保存完整颜色/纹理/PBR。原版还能保存3DGS PLY与训练数据、渲染图片和视频。[datasets.md](https://github.com/harry7557558/spirula-studio/blob/7801c3ca78ccddc6a448e540be94d6141fab90eb/docs/datasets.md)、[TrainConfig.h](https://github.com/harry7557558/spirula-studio/blob/7801c3ca78ccddc6a448e540be94d6141fab90eb/src/config/TrainConfig.h)、[MeshExport.h](https://github.com/harry7557558/spirula-studio/blob/7801c3ca78ccddc6a448e540be94d6141fab90eb/src/mesh/MeshExport.h)

**PLY格式边界：**3DGS PLY通常需要位置、尺度、旋转、透明度与SH等高斯字段；普通点云PLY主要保存点属性；三角mesh PLY还要保存面连接等信息。同一个扩展名不是同一种资产，不能仅改后缀就把高斯转成点云或网格，也不能保证接收软件互相直接导入。

**解释与判断：**标准流程要求同一静态对象/场景的有效多视图，视频要抽取清晰且有视角变化的帧。单图缺少背面/内部观测，基于预训练先验的单图生成是另一条路线。输入覆盖、纹理、遮挡和运动决定重建的可辨识程度；软件能力不替代拍摄条件。

## 2. 高斯、相机与可微训练

### 高斯是什么

每个Gaussian保存中心μ、尺度、旋转、透明度、SH颜色。局部软影响可解释为 G(x)=exp[−½(x−μ)ᵀΣ⁻¹(x−μ)]，Σ=R·diag(s²)·Rᵀ。“软椭球”是数学权重/密度函数的影响范围，颜色和透明度是另行存储的渲染参数，雾团只是类比，不是实体烟雾或生成神经模型。尺度和旋转决定椭球大小与方向，距离中心越远影响越弱；实际渲染还有投影、激活和裁剪。SH球谐函数以有限系数表达方向相关颜色。它不是仅有中心颜色的普通点云，椭球之间也没有天然三角面连接。[primitive与参数架构](https://github.com/harry7557558/spirula-studio/blob/7801c3ca78ccddc6a448e540be94d6141fab90eb/docs/architecture.md)

### SfM解决观察关系

特征检测/匹配找到跨图像共同点，三角化恢复空间点与相机，bundle adjustment联合减少重投影误差。恢复出的姿态与内参告诉训练器“从哪里、如何看”。Spirula有原生SfM，也接受其他工具的数据集；“无需单独安装COLMAP”不等于没有SfM，更不能把自研SfM直接称为COLMAP。典型初始化来自稀疏点云；poses-only数据也可通过随机高斯初始化开始，点云不是所有合法路径的强制条件。[SfM目录](https://github.com/harry7557558/spirula-studio/tree/7801c3ca78ccddc6a448e540be94d6141fab90eb/src/sfm)、[TrainerCore.cpp](https://github.com/harry7557558/spirula-studio/blob/7801c3ca78ccddc6a448e540be94d6141fab90eb/src/app/TrainerCore.cpp)

### 渲染—误差—梯度—更新

高斯投到相机，计算tile覆盖，按深度排列并透明度混合。前向颜色可理解为 C=ΣᵢTᵢαᵢcᵢ，其中Tᵢ=∏ⱼ<ᵢ(1−αⱼ)是此前高斯留下的透射率。训练图和照片比较，配置有L1/SSIM、几何约束、透明度/尺度/SH等正则。反向传播计算误差对参数的梯度，优化器更新中心、尺度、旋转、透明度和颜色。

这里训练的是当前场景；核心3DGS逐场景优化不需要先加载一个通用3D生成模型。SAM用于分割、LoMa用于困难特征匹配、深度/法线模型用于几何辅助，它们是可选预训练辅助，与本次场景优化不同。[EngineForward.cpp](https://github.com/harry7557558/spirula-studio/blob/7801c3ca78ccddc6a448e540be94d6141fab90eb/src/engine/EngineForward.cpp)、[EngineLoss.cpp](https://github.com/harry7557558/spirula-studio/blob/7801c3ca78ccddc6a448e540be94d6141fab90eb/src/engine/EngineLoss.cpp)、[训练配置](https://github.com/harry7557558/spirula-studio/blob/7801c3ca78ccddc6a448e540be94d6141fab90eb/src/config/TrainConfig.h)

bilateral grid/PPISP校正逐图像曝光、白平衡/响应，减少拍摄差异对外观拟合的干扰。可选深度/法线监督、normal regularization与distortion约束帮助几何稳定；DepthGeometry有深度反投影与邻点法线的可微计算。效果提升需要数据验证，不能据“有几何损失”保证测量精度。[校正顺序](https://github.com/harry7557558/spirula-studio/blob/7801c3ca78ccddc6a448e540be94d6141fab90eb/docs/architecture.md)、[DepthGeometry.cu](https://github.com/harry7557558/spirula-studio/blob/7801c3ca78ccddc6a448e540be94d6141fab90eb/src/kernels/pixelwise/DepthGeometry.cu)

### 数量与分布控制

**官方披露：**一套策略融合MCMC/IGS+/MRNF的优点，以更锐利、减少floaters、适应物体与大场景为目标。

**源码证据：**EngineDensify默认revised路径：用逐像素误差图、可配置SSIM/边缘模式与可选世界梯度贡献积累评分，重定位低透明度/长期无贡献高斯，按评分增加高斯并沿长轴拆分；数量受cap、增长和拆分预算控制。densify.slang的长轴拆分链接[Improving Densification](https://arxiv.org/abs/2508.12313)，调整两侧中心、尺度与透明度。修改版位置噪声按可见性、透明度和局部各向异性尺度控制；源码注释比较了MCMC/MRNF的噪声设计。

准确说法是“融合改造的密度控制”，不是原样复现三篇完整算法。density control指高斯数量、位置、分布和贡献管理，不是材料物理密度。[EngineDensify.cpp](https://github.com/harry7557558/spirula-studio/blob/7801c3ca78ccddc6a448e540be94d6141fab90eb/src/engine/EngineDensify.cpp)、[densify.slang](https://github.com/harry7557558/spirula-studio/blob/7801c3ca78ccddc6a448e540be94d6141fab90eb/src/shaders/densify.slang)、[Relocation.cu](https://github.com/harry7557558/spirula-studio/blob/7801c3ca78ccddc6a448e540be94d6141fab90eb/src/kernels/densify/Relocation.cu)

## 3. splats如何提取mesh

Gaussian有局部软密度；项目先构造可查询的空间占据场，再提取等值面。

1. 每个保留高斯采样中心和三主轴正负方向，共7点。
2. 对点云做Delaunay四面体化，得到空间连接关系。
3. 查询顶点占据值，用默认iso=0.5区分内外。
4. marching tetrahedra在内外值跨越的边上产生表面；二分细化并最终插值形成交点和三角面。
5. 保持流形的短边合并、清理漂浮分量/退化面、局部洞与可见性处理。
6. 用高斯/训练视角信息上色，或展开UV并烘焙纹理，按格式写mesh。

**占据场含义：**静态项合成点处局部密度，occ_static=1−∏(1−density_i)。有完整相机时从渲染射线信息估计点之前的遮挡1−T(z)，在有效相机中取最小或第k小值，再以1−(1−occ_static)(1−occ_front)合成。静态项保护高密度表面，相机项帮助判断可见空域与后方内部。没有完整相机时有基于LBVH的高斯密度/相机线段评估路径。

**审校要点：**主路径不是深度图TSDF融合，也不是直接把高斯中心连成面；部分源码历史说明可能保留旧占据近似，精确计算应以当前kernel为准，不沿用未核实的旧Phi公式。[Meshing.h](https://github.com/harry7557558/spirula-studio/blob/7801c3ca78ccddc6a448e540be94d6141fab90eb/src/mesh/Meshing.h)、[MeshingHost.cpp](https://github.com/harry7557558/spirula-studio/blob/7801c3ca78ccddc6a448e540be94d6141fab90eb/src/mesh/MeshingHost.cpp)、[Meshing.cu](https://github.com/harry7557558/spirula-studio/blob/7801c3ca78ccddc6a448e540be94d6141fab90eb/src/mesh/Meshing.cu)、[MeshingRaster.cu](https://github.com/harry7557558/spirula-studio/blob/7801c3ca78ccddc6a448e540be94d6141fab90eb/src/mesh/MeshingRaster.cu)、[OccupancyEvaluator.cpp](https://github.com/harry7557558/spirula-studio/blob/7801c3ca78ccddc6a448e540be94d6141fab90eb/src/mesh/OccupancyEvaluator.cpp)

mesh提供可编辑表面，但遮挡/欠采样/视角相关外观会影响提取。流形、洞和方向检查不能证明尺寸、壁厚、制造公差或碰撞稳定性；实拍颜色烘焙也不等于完整PBR材质。

## 4. GPU架构与训练显存

架构是GUI/CLI → TrainerCore → Engine → backend API → CUDA/Vulkan。Engine为C++且不直接绑定CUDA；共享Slang设备数学编译为CUDA头或SPIR-V，投影、SH、primitive、PPISP保持共同来源。Vulkan的可选float atomic/int64/int8能力有变体与fallback，不假设subgroup=32。[architecture.md](https://github.com/harry7557558/spirula-studio/blob/7801c3ca78ccddc6a448e540be94d6141fab90eb/docs/architecture.md)、[backends.md](https://github.com/harry7557558/spirula-studio/blob/7801c3ca78ccddc6a448e540be94d6141fab90eb/docs/backends.md)

**源码证据：**常规quantization_level=1映射为16-bit SH value、各8-bit SH Adam状态和各16-bit非SH Adam状态；等级0全精度。packed参数带分块min/max，consumer读取解码，更新后重新编码；SH梯度保持fp32。FPBO布局转置改善合并访存，projection-backward/optimizer融合减少中间结果；可见性bitmask、packed投影和阶段scratch复用进一步压缩训练存储。[配置映射](https://github.com/harry7557558/spirula-studio/blob/7801c3ca78ccddc6a448e540be94d6141fab90eb/src/app/TrainerCore.cpp)、[sh-quant-layout.md](https://github.com/harry7557558/spirula-studio/blob/7801c3ca78ccddc6a448e540be94d6141fab90eb/docs/notes/sh-quant-layout.md)、[vram-splat-x-img.md](https://github.com/harry7557558/spirula-studio/blob/7801c3ca78ccddc6a448e540be94d6141fab90eb/docs/notes/vram-splat-x-img.md)

**官方主张：**1000万SH3/8GB VRAM指训练规模，quantized training与最后导出文件压缩不同。本次未复现容量，也未测量量化的外观/几何误差。优化器的个别旧注释与已连通路径可能有版本残留，应结合实现，不能沿用“量化尚未接通”的旧表述。[EngineOptim.cpp](https://github.com/harry7557558/spirula-studio/blob/7801c3ca78ccddc6a448e540be94d6141fab90eb/src/engine/EngineOptim.cpp)

官方硬件范围：Vulkan覆盖NVIDIA/AMD/Intel/Apple、Windows/Linux/macOS，Apple通过MoltenVK；CUDA覆盖NVIDIA、Windows/Linux。训练/meshing同功能，Vulkan为推荐路径且原生前处理覆盖更广。实际速度和内存取决于GPU、驱动、分辨率、批次、模型规模与场景，不能作统一承诺。

## 5. 编辑、渲染与大场景

已确认选择清理、撤销、整体放置/对齐、手工掩膜、相机关键帧/轨迹与图像/视频输出；不承诺未落实的named groups或任意选中子集变换。大场景分区可分别训练再合并。360°/鱼眼、天空背景、线性色彩、曝光校正与深度/法线辅助扩大数据类型。部分照片/视频遥测元数据能恢复尺度和方向，这不代表普通视频都能自动恢复精确公制尺寸。[编辑](https://github.com/harry7557558/spirula-studio/blob/7801c3ca78ccddc6a448e540be94d6141fab90eb/docs/notes/gui-editing-plan.md)、[渲染](https://github.com/harry7557558/spirula-studio/blob/7801c3ca78ccddc6a448e540be94d6141fab90eb/docs/notes/render-video.md)、[分区](https://github.com/harry7557558/spirula-studio/blob/7801c3ca78ccddc6a448e540be94d6141fab90eb/docs/notes/scene-partition.md)

**现有本地批处理：**GUI Batch能将照片/视频建数据集、多次训练、meshing串成队列，复用三类runner。新版图里的“采集管理、跨机调度与资产版本”扩展卡指完整业务工作流；需补的是采集管理、跨机器/云调度、资产版本/验收和业务编排，不是宣称原库没有训练队列。[src/app/README.md](https://github.com/harry7557558/spirula-studio/blob/7801c3ca78ccddc6a448e540be94d6141fab90eb/src/app/README.md)

## 6. 同类工具与历史记录的边界

以下固定版本均为2026-10-05查询所得；职责比较不是统一性能横评。

| 工具与官方固定来源 | 已确认职责 | 与Spirula的关系 |
| --- | --- | --- |
| [Splat.js](https://github.com/arrival-space/splat.js/blob/88efe9aaf32279b0b9bcb781ea0deb4d60c49dff/README.md) | 浏览器照片/视频输入，SIFT SfM/BA与WebGPU 3DGS训练，PLY出口；[app的SOG压缩](https://github.com/arrival-space/splat.js/blob/88efe9aaf32279b0b9bcb781ea0deb4d60c49dff/app/js/sog.js) | 同属实拍重建；当前版本资料与2026-09-09固定版鞋子实验分开 |
| [QuerySplat](https://github.com/inspatio/querysplat/blob/9703d6f3064fe9c429a11422bb6ff1516e3da471/README.md) | 预训练几何/外观query及冻结VGGT-Omega aggregator/camera/depth；纯前馈或加use_tto测试时优化 | 预训练预测与逐场景拟合不同；Linux/NVIDIA CUDA/PyTorch路径 |
| [LichtFeld Studio](https://github.com/MrNeRF/LichtFeld-Studio/blob/49c3e83f7d0ad995c608e296c2510e9a84649d5b/README.md) | COLMAP数据训练/检查/编辑导出；C++/CUDA、Python/plugins/MCP | 训练编辑重叠，设备/集成不同；[MCP文档](https://github.com/MrNeRF/LichtFeld-Studio/blob/49c3e83f7d0ad995c608e296c2510e9a84649d5b/docs/docs/development/mcp/connecting-clients.md) |
| [SuperSplat](https://github.com/playcanvas/supersplat/blob/4d172ca0e3cfe7b493ece3b759291aa02ec98fa8/README.md) | 现成高斯编辑、压缩、发布/嵌入；[官方手册](https://github.com/playcanvas/developer-site/blob/main/docs/user-manual/supersplat/index.md) | 生成后内容加工；发布SOG压缩与Spirula训练量化不是同一过程 |
| [TRELLIS.2](https://github.com/microsoft/TRELLIS.2/blob/75fbf0183001ed9876c8dbb35de6b68552ee08bd/README.md) | 预训练图像→O-Voxel→带PBR纹理mesh/GLB，官方example单图 | 根据先验生成资产，不能当作实拍多视图测量重建 |
| [Forge3D](https://github.com/milos-agathon/forge3d/blob/ac6bc40a5d6395c407056bb6e63cb932352f961d/docs/splat-fused.md) | render_fused以统一ReSTIR路径追踪融合DEM、COPC LiDAR和现成3DGS PLY（需要对齐），互相遮挡/阴影 | 可消费现成高斯的渲染层；不是照片重建或高斯训练。高度场不支持悬挑，GPU SH仅band 0/1，原拍摄光照可能残留 |

**历史实测：**[Splat.js鞋子视频对照](https://yydshly.github.io/0908_codex_project/demos/008-splat-js/video-test.html#result)记录2026-09-09使用独立作者65.5秒静止鞋子绕拍视频，223张抽帧、223/223相机定位、10,015次训练、SOG导出311,757个高斯，并验证重载、拖动、缩放。它只证明该Splat.js实验，不能给Spirula借用成功状态、耗时或画质。

本地来源：F:\codex_project\0908_codex_project\projects\008-splat-js\README.md，以及notes\independent-video-validation.md。验证文档第3行记录日期/版本，第39—49行记录指标，第62行记录复载交互。历史官方Gaussian Splatting研究也未运行原版训练，见[2026-09-11研究](https://yydshly.github.io/0911_codex_project/014-gaussian-splatting/)。

## 7. 应用判断与扩展

现有产物可用于商品/文物实拍展示、房间/展厅漫游、场景留档、镜头制作和重建研究。价值是“采集真实对象 → 留下可重载三维资产 → 进行新视角交互与加工”，不是继续播放输入视频。

完整产品可以补采集覆盖提示、自动质量报告、素材/资产版本、细节热点、空间导航、远程任务和轻量发布。语义检索、动态人体、自动骨骼、换装、碰撞、测量或制造要求额外技术与验证，不作现成功能承诺。给模型增加业务热点，也不代表高斯本身拥有可靠对象语义。

## 8. 新手采集与下一轮验证

选静止、纹理清晰、反光少的小物体；视角充分重叠、距离/高度适当变化，补顶部和侧面，避免运动、模糊、纯白与剧烈光照变化。转动物体时要处理背景对求解的干扰；随意剪辑视频、不同对象混拍、缺失视角不能当作满足条件。

下载系统对应程序，检查GPU/驱动，先GUI小样或spirula --help。相机和稀疏结构合理后再训练；增加数量前先验收覆盖、漂浮点和独立视角。mesh另验几何，不把训练视角画质当作表面准确性。

下一轮记录：固定版本、硬件/驱动、授权素材/哈希、分辨率/数量/迭代/量化、注册相机比例、各阶段耗时、显存/内存峰值、独立测试视角、mesh洞/流形/误差、纹理兼容与复载。对比需保持输入/设备相同，并分开相机求解、训练、mesh和导出。本轮没有原版实验日志；研究图和静态网页不充作日志。

## 9. 本地新增与许可

本轮新增研究文档、[原生 HTML / 内嵌 SVG 信息图源](assets/spirula-studio-overview.html)、[浏览器导出的高清 PNG](assets/spirula-studio-overview.png)、构图需求记录和静态导览。图中文字和结构可由原生源编辑；示意用于解释机制，未冒充原版截图或性能证据。图像生成服务连续两次网络失败，没有得到可交付生成图；[原 imagegen 提示词](assets/spirula-studio-overview-prompt.txt)保留为构图需求记录，不作为“最终图由 AI 生成”的证明。

上游代码GPL-3.0，Meta/SAM等模型、第三方组件、照片/输出衍生媒体的许可与来源分别处理，本研究不改变上游许可，也不将他人样例默认为任意再分发素材。

[固定快照](https://github.com/harry7557558/spirula-studio/tree/7801c3ca78ccddc6a448e540be94d6141fab90eb) · [官方Releases](https://github.com/harry7557558/spirula-studio/releases) · [源码文档索引](https://github.com/harry7557558/spirula-studio/blob/7801c3ca78ccddc6a448e540be94d6141fab90eb/docs/README.md) · [许可证](https://github.com/harry7557558/spirula-studio/blob/7801c3ca78ccddc6a448e540be94d6141fab90eb/LICENSE)。
