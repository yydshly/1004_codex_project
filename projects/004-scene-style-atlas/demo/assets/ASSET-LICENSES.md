# 素材与演示来源

- 场景、建筑、车辆、人物、植被与程序纹理：本子项目原创程序几何，代码见 `app.js`；未导入 Defilade 模型、贴图或源代码。
- V2 的细化几何、曲瓦、砌石、树叶剪裁纹理、地表色斑与凹凸图：原创程序制作，见 `../detail-study/scene-builder.js`；环境反射图与交互见 `../detail-study/app.js`。
- V2 对照图 `../detail-study/assets/blockout-natural.png` 和 `refined-natural.png`：直接保存自本项目实时场景，同一自然风格、默认机位、镜头 22、光向 25°，未重绘或拼接。
- V3 人物的身体截面、面部、服装装备、关节层级、程序步态与布纹：原创程序制作，见 `../detail-study/character-builder.js`。未使用原游戏模型或第三方人物资产；关节层级与程序动作不等于正式蒙皮绑定。
- V3 人物对照图 `../detail-study/assets/character-baseline.png` 和 `character-refined.png`：直接保存自同一人物近景，同机位、侦察兵、站立、自然风格与暂停动作，未重绘或拼接。两图分别为 718 × 660 像素。
- 三联概念图 `style-triptych.png`：内置 imagegen 生成的原创风格提案，提示词见项目 `assets/image-prompt.md`。它不代表游戏实机截图，也不等于本页实时渲染。
- Three.js 0.186.1 与 OrbitControls：复用本仓库已保存的官方 npm 包文件，MIT 许可保存在 `../vendor/three/LICENSE`，版本记录在 `../vendor/three/VERSION.txt`。
- 参考来源：[Next Indie 原帖](https://x.com/nexindie/status/2106723291868373127) 与 [Defilade 官方 Steam 商店](https://store.steampowered.com/app/5246700/)。原产品资料的权利归其权利人。
- 理解总览所用 `../understanding/assets/defilade-official-overview.jpg` 与 `defilade-official-detail.jpg`：从上述官方 Steam 页面对应的公开截图接口取得，2026-10-05 检查；来源 URL 记录在同目录 `reference-source.json`。为研究说明直接引用的官方展示截图，权利归原权利人，并非 X 视频逐帧截取。
- 理解总览 `../understanding/assets/overview.png` 与 `overview.svg`：本项目原创信息图，使用确定 SVG 排版和直接嵌入的证据图，没有对原游戏或实时样板截图进行生成式重绘。可复建脚本见项目 `scripts/build-understanding-overview.cjs`，素材哈希与输出尺寸见 `overview-manifest.json`。
- 项目目录封面与 README 引导图 `../../assets/scene-style-understanding.png`：上述 `overview.png` 的原样副本，内容和来源一致。

本页记录的是美术观察、设计假设和简化效果样板，不对原游戏的实现算法、操作手感、真实性能或已上市体验作验证结论。
