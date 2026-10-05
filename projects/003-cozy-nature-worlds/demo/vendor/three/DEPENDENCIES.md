# 原型渲染依赖来源与许可

记录日期：2026-10-05（Asia/Shanghai）。本目录选取 **Three.js 0.186.1** 官方 npm 包的必要文件用于本地静态原型。没有运行 npm 安装，也没有重新打包这些上游文件。

- npm 包：[`three@0.186.1`](https://www.npmjs.com/package/three/v/0.186.1)。
- 固定版本官方 tarball：[three-0.186.1.tgz](https://registry.npmjs.org/three/-/three-0.186.1.tgz)。
- npm 元数据：[three/0.186.1](https://registry.npmjs.org/three/0.186.1)。
- 官方网站：[threejs.org](https://threejs.org/)。
- 官方源码仓库：[mrdoob/three.js](https://github.com/mrdoob/three.js)。
- 包内 `package.json` 核实：`name: three`、`version: 0.186.1`、`license: MIT`，仓库为上述官方仓库。
- tarball 大小：4,648,523 bytes。
- tarball SHA256：`8cd068708ea44f2c73c944b1cead2ba2f0d5c15c8fc194e5700f4e4f4a033fe7`。

## 导入文件与完整性

以下本地文件已逐字节与固定版本 tarball 对比一致；目录映射仅将 `build/` 文件放在本目录根、将 `examples/jsm/` 映射到 `addons/`。每次升级应从同一个版本复制全部所需模块并重算哈希。

| 本地文件 | npm 包内原路径 | 用途 | 大小（bytes） | SHA256 |
| --- | --- | --- | ---: | --- |
| [three.module.js](three.module.js) | `build/three.module.js` | WebGL 渲染入口 | 662,772 | `9052042d676cb0fdc1ddfefe193053f34b7ac0513a616fdac4535d49987812ea` |
| [three.core.js](three.core.js) | `build/three.core.js` | Three.js 核心类与数据结构 | 1,458,113 | `9edde002b066a9a05676a6127f67735b62baf399bdea529f2f7e31657da769e6` |
| [addons/controls/OrbitControls.js](addons/controls/OrbitControls.js) | `examples/jsm/controls/OrbitControls.js` | 相机旋转、缩放与平移 | 40,755 | `3d79d07ecb686b4e5d93232eedab255331c1beef711e13164eaa1f68655a5f2b` |
| [addons/loaders/GLTFLoader.js](addons/loaders/GLTFLoader.js) | `examples/jsm/loaders/GLTFLoader.js` | glTF 2.0 / GLB 模型加载 | 117,570 | `131c0f78c01d19368ae495caa65b3adaa10487810a36a05bb5901b769a35ac16` |
| [addons/utils/BufferGeometryUtils.js](addons/utils/BufferGeometryUtils.js) | `examples/jsm/utils/BufferGeometryUtils.js` | GLTFLoader 的几何工具依赖 | 37,712 | `9fb63427ce6641fa14fd0baff9cc4d1b5f9c3d85fd084bf2e90e803c44ec1797` |
| [addons/utils/SkeletonUtils.js](addons/utils/SkeletonUtils.js) | `examples/jsm/utils/SkeletonUtils.js` | GLTFLoader 的骨骼工具依赖 | 11,535 | `b1632a703206c3d830de9fcbe515696770d04b71a15ee6b50afa6d2c3298c86f` |
| [LICENSE](LICENSE) | `LICENSE` | 完整上游 MIT 许可 | 1,081 | `8b378ebe60e2fe500158cb0ac71cb5e8b7d92953c2abcc63a0eb90499653b5bc` |

`VERSION.txt` 是本项目编写的版本说明，不是上游源码文件。`DEPENDENCIES.md` 是本项目编写的出处记录。原型 HTML 的 import map 将 `three` 与 `three/addons/` 指向本地目录；静态服务器需要提供 JavaScript 的正确 MIME 类型。依赖内容已经复制到本地，加载时不依赖 npm、CDN 或在线模块服务。

## 许可

许可证：**MIT**。版权声明：`Copyright © 2010-2026 three.js authors`。完整原始文本已保存在 [LICENSE](LICENSE)，发布静态原型时应与这些依赖一起保留。公开官方许可参考：[three.js LICENSE](https://github.com/mrdoob/three.js/blob/dev/LICENSE)；该在线分支会变化，实际导入许可以本地固定包的原始 LICENSE 与上表哈希为准。

Three.js 是此原型的渲染依赖，不能据此判断 Cozy Country 或 Wilderless 使用 Three.js。Kenney 3D 模型的 CC0 许可单独记录在 [ASSET-LICENSES.md](../../assets/ASSET-LICENSES.md)。

## API 参考与验证状态

- [GLTFLoader 官方文档](https://threejs.org/docs/pages/GLTFLoader.html)：glTF 2.0 / GLB 加载。
- [OrbitControls 官方文档](https://threejs.org/docs/pages/OrbitControls.html)：围绕目标点的相机操作。
- 官方文档描述当前 API，不替代本地固定版本源码或本原型的验证记录。

当前原型阶段：**Stage A，核心浏览器流程已验证（2026-10-06）**。哈希与来源校验只证明依赖出处和字节一致性；实际模型加载、Shader 呈现、交互与存档结果见子项目的 verification.md。正式性能基准及下载落盘仍未完成，不从依赖检查推导这些结果。
