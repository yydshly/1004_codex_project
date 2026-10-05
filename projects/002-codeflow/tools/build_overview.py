"""Render the original CodeFlow research diagram as SVG and PNG.

The diagram summarizes reviewed source; it is not an upstream app screenshot.
Requires Pillow and a Chinese font. Override --font / --bold-font on other OSes.
"""

import argparse
import html
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


W, H = 1600, 2310
PAPER = "#f6f5f1"
WHITE = "#fffefa"
INK = "#202d43"
MUTED = "#5d6d80"
BLUE = "#355bbb"
SOFT = "#ebeffa"
TEAL = "#137c77"
TEAL_SOFT = "#e7f2ee"
LINE = "#d5dce6"
AMBER = "#976328"
AMBER_SOFT = "#faf0df"


class Canvas:
    def __init__(self, font, bold_font):
        self.font_paths = (font, bold_font)
        self.fonts = {}
        self.image = Image.new("RGB", (W, H), PAPER)
        self.draw = ImageDraw.Draw(self.image)
        self.parts = [
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-labelledby="title desc">',
            '<title id="title">CodeFlow 完整能力与原理概览</title>',
            '<desc id="desc">原创研究图，包含六组能力、输入输出、混合解析链路、三层影响教学示例、Ix 对比与静态分析边界。</desc>',
            f'<rect width="{W}" height="{H}" fill="{PAPER}"/>',
        ]

    def font(self, size, bold=False):
        key = (size, bold)
        if key not in self.fonts:
            self.fonts[key] = ImageFont.truetype(str(self.font_paths[bool(bold)]), size)
        return self.fonts[key]

    def rect(self, x, y, width, height, fill=WHITE, stroke=LINE, radius=16):
        self.draw.rounded_rectangle((x, y, x + width, y + height), radius, fill, stroke, 1)
        self.parts.append(f'<rect x="{x}" y="{y}" width="{width}" height="{height}" rx="{radius}" fill="{fill}" stroke="{stroke}"/>')

    def text(self, x, y, text, size=24, color=INK, bold=False, max_width=None):
        font = self.font(size, bold)
        text_width = self.draw.textlength(text, font=font)
        if max_width is not None and text_width > max_width:
            raise ValueError(f"Text overflows by {text_width-max_width:.1f}px: {text}")
        if x + text_width > W - 35:
            raise ValueError(f"Text exceeds canvas: {text}")
        self.draw.text((x, y), text, font=font, fill=color, anchor="lt")
        weight = "700" if bold else "400"
        self.parts.append(f'<text x="{x}" y="{y}" dominant-baseline="text-before-edge" font-family="Microsoft YaHei, PingFang SC, sans-serif" font-size="{size}" font-weight="{weight}" fill="{color}">{html.escape(text)}</text>')

    def lines(self, x, y, lines, size=24, color=MUTED, line_height=38, width=None):
        for index, line in enumerate(lines):
            self.text(x, y + index * line_height, line, size, color, max_width=width)

    def arrow(self, x1, y, x2, color=BLUE, width=3):
        self.draw.line((x1, y, x2, y), color, width)
        self.draw.polygon(((x2, y), (x2 - 10, y - 6), (x2 - 10, y + 6)), color)
        self.parts.append(f'<path d="M{x1} {y}H{x2}M{x2-10} {y-6}L{x2} {y}L{x2-10} {y+6}" fill="none" stroke="{color}" stroke-width="{width}"/>')

    def section(self, number, label, y, caption=None):
        self.text(60, y, number, 22, BLUE, True)
        self.text(112, y - 3, label, 31, INK, True)
        if caption:
            self.text(112, y + 45, caption, 21, MUTED)

    def save(self, path):
        self.parts.append("</svg>")
        path.mkdir(parents=True, exist_ok=True)
        (path / "codeflow-overview.svg").write_text("\n".join(self.parts) + "\n", encoding="utf-8")
        self.image.save(path / "codeflow-overview.png", optimize=True)


def build(font, bold_font):
    c = Canvas(font, bold_font)
    c.text(60, 44, "项目研究集 / 002", 22, MUTED, True)
    c.text(60, 98, "CodeFlow", 76, INK, True)
    c.text(60, 207, "让代码结构可见，帮助确定检查范围", 43, BLUE, True)
    c.lines(60, 280, [
        "读取 GitHub 仓库或本地项目，生成交互式关系图、分析线索与报告。",
        "核心分析依靠静态解析、图遍历和规则；结果仍需回到源码、测试和运行证据核对。",
    ], 24, MUTED, 39, 1480)
    c.rect(60, 388, 1480, 100, SOFT, SOFT)
    c.text(86, 414, "浏览器内分析", 29, BLUE, True)
    c.text(480, 419, "完整下载后可离线读本地文件", 23, INK)
    c.text(1095, 419, "主图以文件为节点", 23, INK)

    c.section("01", "六组能力：从结构浏览到报告复用", 526)
    cards = [
        ("01 / 图与代码浏览", ["文件关系、目录与分层视图", "关联源码卡片、拖动与缩放"], "适合：接手陌生项目"),
        ("02 / 潜在改动影响", ["文件直接与间接使用者", "PR 变更范围与影响提示"], "适合：修改前确定检查范围"),
        ("03 / 结构与规则提示", ["循环依赖、耦合、疑似死代码", "重复、模式、安全提示与健康分"], "适合：寻找值得核查的线索"),
        ("04 / Git 历史观察", ["按提交记录显示活跃度", "文件主要贡献者与审查入口"], "前提：可获取 Git 历史"),
        ("05 / Markdown 关系", ["Markdown 相对链接与双链", "Obsidian 笔记的连接图"], "适合：浏览知识库关联"),
        ("06 / 报告与指标卡片", ["JSON、Markdown、文本与图导出", "CLI、无界面分析、Action SVG"], "适合：报表与指标展示"),
    ]
    for i, (title, lines, caption) in enumerate(cards):
        x, y = 60 + (i % 3) * 502, 594 + (i // 3) * 206
        c.rect(x, y, 476, 182)
        c.text(x + 23, y + 23, title, 26, INK, True, 431)
        c.lines(x + 23, y + 70, lines, 21, MUTED, 32, 431)
        c.text(x + 23, y + 137, caption, 19, TEAL, max_width=431)

    c.section("02", "处理链路：输入 → 混合解析 → 结果", 1023)
    cols = [
        ("输入入口", ["GitHub：API 读取文件和历史", "本地：目录、文件、ZIP", "CLI：本地服务与文件监听", "Card：CI runner 读取源码"]),
        ("浏览器核心分析", ["JS/TS：Babel → Acorn 语法树", "Python：Tree-sitter 引用识别", "解析器不可用时走回退规则", "函数归属 → 文件关系 → 指标"]),
        ("展示与输出", ["React 界面 + D3 关系图", "关联文件与潜在影响候选", "结构、安全与模式提示", "报告、图导出与 SVG 指标卡"]),
    ]
    for i, (title, lines) in enumerate(cols):
        x = 60 + i * 502
        c.rect(x, 1094, 476, 247, SOFT if i == 1 else WHITE)
        c.text(x + 23, 1120, title, 28, BLUE if i == 1 else INK, True)
        c.lines(x + 23, 1180, lines, 21, MUTED, 37, 431)
    c.text(60, 1367, "主文件图由函数引用推断；独立 Architecture 图还使用导入与代码特征规则。", 22, MUTED)
    c.text(60, 1400, "Card / 无界面入口复用分析源码，但使用解析回退规则，结果可能与浏览器不同。", 19, MUTED)

    c.section("03", "影响教学：沿已识别的关系，最多追踪三层", 1430,
              "以下为自编文件链，非真实仓库分析。箭头表示提供者 → 使用者。")
    c.rect(60, 1535, 1480, 215)
    names = ["pricing.ts", "checkout.ts", "orders.ts", "routes.ts", "app.ts"]
    labels = ["修改目标", "直接 / 第 1 层", "间接 / 第 2 层", "间接 / 第 3 层", "第 4 层 / 未纳入"]
    for i, (name, label) in enumerate(zip(names, labels)):
        x = 88 + i * 294
        c.rect(x, 1570, 248, 69, SOFT if i < 4 else PAPER, BLUE if i < 4 else LINE, 10)
        c.text(x + 20, 1588, name, 24, BLUE if i < 4 else MUTED, True)
        c.text(x + 20, 1660, label, 20, MUTED)
        if i < 4:
            c.arrow(x + 253, 1604, x + 285, BLUE if i < 3 else MUTED)
    c.text(86, 1709, "图中的可达关系只给出检查候选，不能证明修改后一定会出错。", 21, AMBER)

    c.section("04", "与 Ix 的区别：快速浏览与持久结构查询", 1798)
    comparison = [
        (60, "CodeFlow", BLUE, SOFT, ["主要交付：交互文件图、提示与报告", "运行方式：浏览器；CLI / Action 扩展", "保存方式：摘要缓存、导出与指标历史", "更适合：临时阅读、结构展示和报表"]),
        (814, "Ix", TEAL, TEAL_SOFT, ["主要交付：持久实体图、结构查询与上下文", "运行方式：CLI / MCP / Compass 共用后端", "保存方式：数据库、增量图补丁与修订", "更适合：长期查询与 Agent 上下文复用"]),
    ]
    for x, title, accent, fill, lines in comparison:
        c.rect(x, 1871, 726, 225, fill, fill)
        c.text(x + 25, 1891, title, 31, accent, True)
        c.lines(x + 25, 1944, lines, 21, MUTED, 33, 676)

    c.rect(60, 2126, 1480, 109, AMBER_SOFT, AMBER_SOFT)
    c.text(84, 2146, "采用边界", 23, AMBER, True)
    c.text(236, 2147, "两者都含启发式解析；持久化和更细粒度不等于已证明准确率更高。", 21, AMBER)
    c.text(84, 2191, "CodeFlow GitHub API 模式最多 750 文件；单文件超过 2 MB 保留信息但跳过内容解析。", 21, AMBER)
    c.text(60, 2263, "原创研究示意 · 整理 2026-10-05 · 源码核查 2026-10-04 / b0e82d127fc4 · 证据见研究文档", 19, MUTED)
    c.save(Path(__file__).resolve().parent.parent / "assets")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--font", type=Path, default=Path("C:/Windows/Fonts/msyh.ttc"))
    parser.add_argument("--bold-font", type=Path, default=Path("C:/Windows/Fonts/msyhbd.ttc"))
    args = parser.parse_args()
    build(args.font, args.bold_font)
