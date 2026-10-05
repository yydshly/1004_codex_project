"""Build an original, source-linked SVG reference poster from module-map.json."""
from pathlib import Path
from html import escape
import json
import re
import unicodedata

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / 'assets/module-map.json').read_text(encoding='utf-8'))
DEST = ROOT / 'demo/assets'
DEST.mkdir(parents=True, exist_ok=True)
W, H = 4400, 3800
MARGIN, GAP = 72, 30
PANEL_W = (W - 2 * MARGIN - 3 * GAP) / 4
PANEL_H = 1360
INK, MUTED, PAPER = '#24352f', '#52635d', '#f4f3eb'
FONT = 'Microsoft YaHei, Noto Sans CJK SC, sans-serif'
KINDS = {
    'native': ('官方', '#e4f0f6', '#246782'),
    'sample': ('本库', '#e5f1e4', '#3d7750'),
    'external': ('外部', '#eeebf5', '#695880'),
    'reference': ('资料', '#f5eddc', '#8b7040'),
}
out = []
def add(value):
    out.append(value)
def rect(x, y, width, height, fill, stroke='none', radius=12):
    add(f'<rect x="{x:g}" y="{y:g}" width="{width:g}" height="{height:g}" rx="{radius:g}" fill="{fill}" stroke="{stroke}"/>')
def text(x, y, value, size=26, fill=INK, weight=400, **attrs):
    extra = ' '.join(f'{key.rstrip("_").replace("_", "-")}="{escape(str(value), quote=True)}"' for key, value in attrs.items())
    add(f'<text x="{x:g}" y="{y:g}" font-size="{size:g}" fill="{fill}" font-weight="{weight}" {extra}>{escape(value)}</text>')
def unit(char):
    if unicodedata.east_asian_width(char) in ('W', 'F'):
        return 1.0
    if char in 'MW@%':
        return 0.82
    if char in 'ilI.,:;! |':
        return 0.3
    return 0.61
def wrap(value, width, size):
    lines, line, used = [], '', 0
    tokens = re.findall(r'[A-Za-z0-9_./<>:=@%#-]+[、，。；：]?|.', value)
    for token in tokens:
        cost = sum(unit(char) for char in token) * size
        if line and used + cost > width:
            lines.append(line.rstrip())
            line, used = '', 0
        if not line and token.isspace():
            continue
        line += token
        used += cost
    if line:
        lines.append(line)
    return lines
def paragraph(x, y, value, width, size=26, fill=MUTED, line_height=36):
    lines = wrap(value, width, size)
    for i, line in enumerate(lines):
        text(x, y + i * line_height, line, size, fill)
    return len(lines) * line_height
def source_url(value):
    if value.startswith('https://'):
        return value
    route = 'tree' if value.split('#', 1)[0].endswith('/') else 'blob'
    return f'https://github.com/shanraisshan/claude-code-best-practice/{route}/{DATA["sha"]}/{value}'

add(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-labelledby="map-title map-desc">')
add(f'<title id="map-title">{escape(DATA["title"])}</title>')
add('<desc id="map-desc">覆盖固定版本 README 的全部 47 项功能、7 类实际工作流示例，以及资料与生态目录。每项说明技术机制、如何使用与来源。图中模块可点击查看来源。</desc>')
add(f'<style>text{{font-family:{FONT};}}a:hover text{{fill:#a04e32;}}.row-title{{letter-spacing:-0.3px;}}</style>')
rect(0, 0, W, H, PAPER, radius=0)
text(MARGIN, 65, '开源项目研究集 / 006     ·     模块、机制与用法速查', 28, '#8b5d3b', 600)
text(MARGIN, 139, 'Claude Code Best Practice', 70, INK, 700)
text(1170, 139, '完整模块总图', 60, INK, 700)
text(MARGIN, 190, '社区课程 + 配置参考实现 + 生态导航。图中列出功能，不等于仓库已经实现、安装或验证了这些功能。', 31, MUTED)
text(W-MARGIN, 62, f'{DATA["date"]} · {DATA["sha"][:12]}', 26, MUTED, text_anchor='end')

# Three capability sources explain how the whole map should be read.
layer_y, layer_h, layer_w = 228, 145, 1310
layers = [
    (MARGIN, '01  仓库提供方法与模板', 'Markdown / YAML / JSON / Python / 参考资料', '告诉模型任务是什么、按什么约定完成。', '#e8eddf'),
    (1545, '02  Claude Code 提供执行框架', '模型 + 上下文 + 权限 + 委派 + 事件调度', '模型选择行动，运行时执行并接收反馈。', '#e5eef0'),
    (3018, '03  工具与服务提供实际操作', '文件 / Shell / Browser / MCP / API / CI', '读取证据、取得外部数据、生成和检查产物。', '#f2e7dc'),
]
for x, title, tech, purpose, fill in layers:
    rect(x, layer_y, layer_w, layer_h, fill, '#d6ddce')
    text(x+26, layer_y+43, title, 33, INK, 650)
    text(x+26, layer_y+86, tech, 27, MUTED)
    text(x+26, layer_y+122, purpose, 26, MUTED)
for x in [1420, 2893]:
    text(x, layer_y+88, '→', 59, '#7b8d7d', text_anchor='middle')
text(MARGIN, 424, '阅读：先看分组 → 找模块 → 看“技术 / 使用” → 点击矢量图中的模块查看来源。', 28, MUTED)
lx = 2690
for key, label in [('native','官方运行时能力'),('sample','本库文件与样例'),('external','外部项目与生态'),('reference','资料与研究建议')]:
    _, bg, fg = KINDS[key]
    rect(lx, 395, 24, 24, bg, fg, 5)
    text(lx+36, 417, label, 25, fg)
    lx += 401

notes = {
    'A': '选用：事实和规则写 Memory；重复做法写 Skill。普通报告需要按任务读取，整库不会自动进入上下文。',
    'B': '选用：独立上下文适合可交接任务；并行写代码需处理文件冲突。团队、子代理、看板和 Worktree 分别解决不同问题。',
    'C': '选用：先核对当前生效配置，再接工具。本库的宽泛权限与个人偏好，需要按你的项目重新判断。',
    'D': '选用：相关任务恢复会话；新任务重新整理输入。显示、语音与速度模式改善交互体验，结果仍要验收。',
    'E': '选用：验收代码看证据；Goal 按条件继续，Loop 按时间触发；持久调度选择相应云端或本机方案。',
    'F': '选用：浏览器、电脑、远程界面和云环境有各自依赖。先确定数据与执行发生在哪里，再选入口。',
    'G': '这些是可读、可改的文件或教程。本研究核查源码与文档，未执行上游天气、RPI、团队或跨模型工作流。',
    'H': '索引中的第三方项目需要另行研究与安装；Stars、素材数量与外链展示不构成本库实测能力或收益。',
}
covered = []
rows = []
for index, group in enumerate(DATA['groups']):
    x = MARGIN + (index % 4) * (PANEL_W + GAP)
    y = 463 + (index // 4) * (PANEL_H + GAP)
    color = group['color']
    add(f'<g id="group-{group["id"]}" data-x="{x:g}" data-width="{PANEL_W:g}">')
    rect(x, y, PANEL_W, PANEL_H, '#fffdf8', '#d7dece', 16)
    rect(x, y, PANEL_W, 112, '#e9ede3', radius=16)
    rect(x, y+70, PANEL_W, 42, '#e9ede3', radius=0)
    text(x+25, y+48, f'{group["id"]}  {group["title"]}', 39, color, 700)
    text(x+25, y+89, group['question'], 27, MUTED)
    cy = y + 151
    for number, item in enumerate(group['items'], 1):
        covered.extend(item['names'])
        top = cy-30
        url = source_url(item['url'])
        add(f'<a href="{escape(url, quote=True)}" target="_blank" rel="noopener noreferrer" aria-label="{escape(item["title"], quote=True)}，查看来源">')
        text(x+26, cy, item['title'], 29, INK, 650, class_='row-title')
        label, bg, fg = KINDS[item['kind']]
        rect(x+PANEL_W-105, cy-29, 78, 35, bg, radius=5)
        text(x+PANEL_W-66, cy-4, label, 23, fg, 550, text_anchor='middle')
        cy += 36
        tech_lines = wrap(item['tech'], PANEL_W-139, 25)
        text(x+26, cy, '技术', 23, color, 550)
        for line in tech_lines:
            text(x+92, cy, line, 25, MUTED)
            cy += 31
        use_lines = wrap(item['use'], PANEL_W-139, 25)
        text(x+26, cy, '使用', 23, color, 550)
        for line in use_lines:
            text(x+92, cy, line, 25, INK)
            cy += 31
        add('</a>')
        cy += 11
        if number != len(group['items']):
            add(f'<path d="M{x+26:g},{cy-5:g} H{x+PANEL_W-26:g}" stroke="#e4e8df"/>')
        rows.append({'group': group['id'], 'title': item['title'], 'bottom': cy-y, 'url': url})
        cy += 2 if group['id'] == 'H' else 7
    note_y = y + PANEL_H - 110
    if cy > note_y - 8:
        raise RuntimeError(f'Panel {group["id"]} overflows: rows bottom {cy-y:g}, note {note_y-y:g}')
    rect(x+20, note_y-20, PANEL_W-40, 107, '#f0f2e9', radius=6)
    paragraph(x+35, note_y+8, notes[group['id']], PANEL_W-70, 25, MUTED, 33)
    add('</g>')

# A practical use sequence, explicitly marked as our adaptation advice.
bottom = 3270
text(MARGIN, bottom, '我们的落地路线', 37, INK, 700)
text(420, bottom, '原创研究建议：先用必要模块，再观察返工、证据完整度和总成本。', 28, MUTED)
route = [
    ('01 明确范围', '研究什么库、哪个版本、要回答什么', '直接提示 / A'),
    ('02 取得证据', '源码、文档、接口、实际输入输出', 'Subagent + MCP / B·C'),
    ('03 沉淀研究方法', '模块、原理、边界与来源结构', 'Memory + Skill / A·G'),
    ('04 生成网页', '沿用项目结构、输出可查看成果', '文件 / Shell / Browser'),
    ('05 检查与验收', '运行检查；标明没有验证的部分', 'Review + 证据 / E'),
    ('06 保存并复用', '版本、结果、规则与更新记录', '项目知识 / G·H'),
]
rw = (W-2*MARGIN-5*25)/6
for i, (title, explanation, mechanisms) in enumerate(route):
    x = MARGIN + i*(rw+25)
    rect(x, bottom+25, rw, 147, '#e6ebdf', '#d7dece', 9)
    text(x+22, bottom+64, title, 29, INK, 650)
    paragraph(x+22, bottom+102, explanation, rw-44, 25, MUTED, 31)
    text(x+22, bottom+150, mechanisms, 24, '#607158')

by = bottom+208
text(MARGIN, by, '读图时保持四个边界', 32, '#8b5d3b', 650)
boundaries = [
    ('知识与模型', 'Markdown 进入推理上下文；角色与 Skill 都不会训练一个新模型。'),
    ('权限与文字', 'allowed-tools 是免确认授权；Agent 的工具限制按 tools / disallowedTools 核对。'),
    ('隔离与阻断', '独立上下文不等于文件隔离；async Hook 做通知，无法充当同步阻断。'),
    ('可用性与证据', '入口、Beta 与账号条件按当前 /help 和官方文档核对；模板与演示不代表已实测。'),
]
for i, (title, body) in enumerate(boundaries):
    x = MARGIN + i*(PANEL_W+GAP)
    text(x, by+45, title, 28, INK, 650)
    paragraph(x, by+82, body, PANEL_W-22, 25, MUTED, 34)
text(MARGIN, H-86, '范围：README Concepts + Hot 全部 47 项；仓库实际示例；课程、报告、集合与其他导航。覆盖按上述固定提交核对。', 26, MUTED)
text(MARGIN, H-45, '依据：shanraisshan/claude-code-best-practice + Claude Code 官方文档。上游 MIT © 2025–2026 Shayan Rais；本图为原创研究整理。', 25, MUTED)
text(W-MARGIN, H-45, '查看细节请放大 · 矢量图中模块可点击', 25, '#8b5d3b', text_anchor='end')
add('</svg>')

expected = {
    'Subagents','Commands','Skills','Workflows','Hooks','MCP Servers','Plugins','Settings','Status Line','Memory',
    'Checkpointing','Sessions','Context Window','CLI Startup Flags','AI Terms','Best Practices','Prompt Library',
    'Ultrareview','Devcontainers','Channels','No Flicker Mode','Auto Mode','Power-ups','Fast Mode','Advisor',
    'Computer Use','Agent SDK','Ralph Wiggum Loop','Chrome','Claude Code Web','Artifacts','Slack','Code Review',
    'GitHub Actions','Remote Control','Deep Links','Dynamic Workflows','Agent Teams','Agent View',
    'Cross-Session Messaging','Scheduled Tasks','Routines','Tasks','Goal','Voice Dictation','Bundled Skills','Git Worktrees',
}
assert len(covered) == len(set(covered)) == 47
assert set(covered) == expected, (expected-set(covered), set(covered)-expected)
result = '\n'.join(out)
(DEST / 'module-map.svg').write_text(result, encoding='utf-8')
(ROOT / 'assets/module-map.svg').write_text(result, encoding='utf-8')
report = {'sha':DATA['sha'], 'featureCount':len(covered), 'groupCount':len(DATA['groups']), 'rowCount':len(rows), 'dimensions':[W,H], 'features':covered, 'rows':rows}
(ROOT / 'assets/module-map-coverage.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n', encoding='utf-8')
print(f'PASS: {len(covered)} README features, {len(rows)} entries, 8 groups; SVG {W} x {H}')
