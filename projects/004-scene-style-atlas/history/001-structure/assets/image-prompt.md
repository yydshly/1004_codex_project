# 三联场景风格对照图

## 用途

用于「场景风格研究」网页中的核心对照图。将同一乡村中景场景并列呈现为自然写实、温暖微缩和荒凉废土三种方向，比较整体体感、色彩、材质与空气感。此图为原创概念效果，不是 Defilade 原画或游戏实机截图。

## 生成方式

- 模式：内置 `image_gen.imagegen`，全新生成。
- 技能：`imagegen`。
- 输入：无参考图、无截图、无本地参考路径。
- 透明背景：否。
- 原始输出：`D:/codex/home/generated_images/01a10a24-2556-73d3-a2b8-74f198c8508f/exec-c8d7ace5-fc0a-417a-92a3-dc194a2c68de.png`。
- 网页资源：`demo/assets/style-triptych.png`。
- 尺寸：2172 × 724 px，3:1。
- 保存方式：直接复制原始 PNG，未裁切、拼接、重绘或编辑。
- 检查结果：三个等宽面板共用高位斜俯视镜头和主要场景布局，红瓦石屋、道路、低墙、载具与人物清楚可辨；三种风格有明显的冷暖、材质及植被差异，无文字、商标、水印、外边框或留白边缝。

## 最终提示词

```text
Use case: stylized-concept
Asset type: a single wide image asset for a Chinese game art-direction research webpage, comparing three overall scene aesthetics side by side.
Primary request: Generate a horizontal triptych with THREE equally sized square panels, total aspect ratio exactly 3:1. Panels meet directly edge-to-edge without borders, gaps, labels, or text. Each panel repeats the SAME village scene, same camera, same middle-distance framing, same object positions and relative scale, changing ONLY the art direction and environment finish.
Scene/backdrop: A clear, legible small rural roadside scene seen from an elevated oblique three-quarter camera. A country road curves through the foreground towards the upper middle. Two modest brick-and-stone village houses with red terracotta tiled roofs sit near the road, a low stone wall runs beside the road, a cluster of trees fills the rear, a small military utility vehicle sits on the road, and a few small human figures stand nearby. All subjects are visible at mid-distance. The scene has tactile and believable physical surface details.
LEFT panel: restrained naturalistic game rendering, grassy muted green earth, rough gray stone walls, reddish aged roof tiles, clear directional shadows, natural earthy palette, only thin traces of atmospheric dust or smoke. Quiet realistic physical weight.
CENTER panel: a warm miniature world aesthetic using the same layout, gently rounded but carefully modeled forms, rich golden sunlight, tidier and cleaner surfaces, inviting greens, warm terracotta, appealing small-world proportions while retaining scene detail and substance.
RIGHT panel: desolate wasteland aesthetic using the same layout, ashen dry soil, dead and sparse vegetation, weathered damaged low walls, subdued cold gray environmental light with a few tiny warm orange ember accents, dusty smoky air. Keep the village forms and road easy to read.
Style/medium: premium 3D game middle-distance concept render, substantive models and scenery with real tactile material response. Artistic rendered image rather than live-action photography. Three art directions coherent and clearly distinguishable.
Composition/framing: Each square panel uses an identical elevated three-quarter camera and identical scene composition; all three panels must contain the road, both houses, low wall, tree cluster, small vehicle, and small people in matching positions. Keep sufficient scene context in all panels, moderate perspective, consistent horizon and scale, sharp subjects throughout, no exaggerated tilt-shift. Left-to-right art direction order strictly naturalistic, warm miniature, wasteland.
Text: none.
Constraints: entirely original fictional concept art; no existing game's screenshots or copied key art; no reference images. One complete raster asset, 3:1 wide triptych.
Avoid: any words, captions, UI, logos, watermarks, decorative frame, white border, gutters, panel dividing lines, oversimplified low-poly geometry, extreme depth-of-field blur, unreadable murk, photorealistic camera grain, close-up framing, extra panels.
```

