# 原型 3D 素材来源与许可

核实与下载日期：2026-10-05（Asia/Shanghai）。素材作者：Kenney。

本原型的树、草、花与岩石来自 [Kenney Nature Kit 官方页面](https://kenney.nl/assets/nature-kit)。官方页面明确标注 **Creative Commons CC0**，下载包内原始许可也确认可用于个人、教育和商业项目，署名属于作者的自愿请求。许可链接：[CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/)。

- 官方 ZIP：[kenney_nature-kit.zip](https://kenney.nl/media/pages/assets/nature-kit/37ac38a37b-1677698939/kenney_nature-kit.zip)。
- ZIP 大小：10,537,521 bytes。
- ZIP SHA256：`fa7974a0d342bfe63c38664ba9f8ec1a4aab8ea25f099bdc56870e33588c4d9d`。
- 包内原始许可：`License.txt`，完整保存在 [models/KENNEY-LICENSE.txt](models/KENNEY-LICENSE.txt)，未修改内容。
- 原始许可中的包名 / 版本：`Nature Kit (2.1)`；创建时间：`29-04-2020 01:02`。以本次 ZIP 哈希作为实际导入版本的凭据。
- 自愿署名：Nature assets by [Kenney](https://kenney.nl/) (CC0)。

## 已导入模型

只从官方 ZIP 的 `Models/GLTF format/` 目录提取以下文件。GLB 二进制保持原样，没有使用 Cozy Country、Wilderless 或其他商业游戏的模型。模型带几何和材质颜色，可直接由 Three.js GLTFLoader 加载，不依赖外部图片、纹理、网格压缩解码器或在线模型服务。

| 文件 | 用途 | 大小（bytes） | 三角形 | SHA256 |
| --- | --- | ---: | ---: | --- |
| [tree_oak.glb](models/tree_oak.glb) | 阔叶树 | 14,644 | 196 | `d7fd8773674928c50c11b66d12c636d49bdcc15a8b1c7fbb98e6f63a3439a3f3` |
| [tree_pineRoundA.glb](models/tree_pineRoundA.glb) | 松树 | 14,488 | 204 | `7dc9711f31585eafdcb965d0649c30af5e19f2def1955f7a915081d30759ef8e` |
| [grass.glb](models/grass.glb) | 草丛 | 11,496 | 132 | `260e41d3e5f2472492ed7b475c5b92a30b13ce2bad408535b5ff50574d4575e7` |
| [flower_purpleA.glb](models/flower_purpleA.glb) | 紫花 | 7,112 | 76 | `f6fc34c96a03420a74fe36d4c2d0ec88f15204fcad99cd1416c3c4ecb22e48c4` |
| [flower_yellowA.glb](models/flower_yellowA.glb) | 黄花 | 7,120 | 76 | `8a3b08cd2ca411c21f9c581d5bda651d78b13c50cba45ad8fa0389398ead6d1d` |
| [rock_largeA.glb](models/rock_largeA.glb) | 大型覆草岩石 | 7,552 | 80 | `6dd15390fd96501dcd1454765a17ba61dbbd8d47705dfe5149c8dd92b353ce25` |
| [rock_smallA.glb](models/rock_smallA.glb) | 小型覆草岩石 | 3,044 | 16 | `df9fff9d711e61370e8df0caa2514c89b8f8a8dc6c6fafaf4eb2ec79c5ae07c1` |

模型总大小：65,456 bytes。各文件在 ZIP 中的完整来源路径都是 `Models/GLTF format/<文件名>`。

## 加载与风格调整说明

模型采用 glTF 2.0、Y 轴朝上。所有模型的内部 mesh 节点有 `translation: [0, -0.05, 0]`，落地时应从加载后的实际包围盒计算最低点。阔叶树原始几何高度约 1.23，松树约 1.37；草约 0.25，花约 0.19–0.24，岩石约 0.19–0.26。按场景尺度调整模型后再放置。

这些旧版导出材质的 `metallicFactor` 是 1。自然材质在原型中可将 `metalness` 改为 0，并维持较高粗糙度；可在运行时按材质名称调整树叶、树干、花瓣和岩石配色。此类实例化、缩放或材质调整不改变已导入原始 GLB 文件，实际运行时处理以原型代码为准。

CC0 许可用于此处 Kenney 素材。原型代码和其他第三方库的许可分别记录，不因使用 CC0 模型自动变为 CC0。
