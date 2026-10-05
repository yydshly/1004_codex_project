"""Build the same research map as editable SVG and a high resolution PNG.

This is native diagram drawing with exact text, not image-model generation.
Requires Pillow only; fonts default to Microsoft YaHei on Windows.
"""
from pathlib import Path
import json
import html
import math
import shutil
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
STEM = "water-duck-series-map-v1"
DATA = json.loads((ASSETS / f"{STEM}.content.json").read_text(encoding="utf-8"))
W = 4800
M = 140
GAP = 60
CW = (W - 2*M - 2*GAP) / 3
BODY_SIZE, LABEL_SIZE, TITLE_SIZE = 39, 39, 55
LINE = 54
FONT_FILE = Path("C:/Windows/Fonts/msyh.ttc")
BOLD_FILE = Path("C:/Windows/Fonts/msyhbd.ttc")
fonts = {}
def font(size, bold=False):
    key = (size, bold)
    if key not in fonts:
        fonts[key] = ImageFont.truetype(str(BOLD_FILE if bold else FONT_FILE), size)
    return fonts[key]

def wrap(value, size, width, bold=False):
    """Keep literal Chinese text and prevent closing punctuation at line starts."""
    f = font(size, bold)
    lines, current = [], ""
    for char in value:
        if char == "\n":
            lines.append(current)
            current = ""
        elif current and f.getlength(current + char) > width:
            if char in "，。；：！？）】、" and len(current) > 1:
                lines.append(current[:-1])
                current = current[-1] + char
            else:
                lines.append(current)
                current = char
        else:
            current += char
    if current:
        lines.append(current)
    return lines

def layout_card(card):
    entries = []
    height = 145
    for item in card["items"]:
        labels = wrap(item["label"], LABEL_SIZE, CW-112, True)
        body = wrap(item["text"], BODY_SIZE, CW-112)
        entries.append((labels, body))
        height += len(labels)*LINE + len(body)*LINE + 26
    return entries, height+22

assert len(DATA["cards"]) == 9, "The overview contains nine modules."
layouts = [layout_card(card) for card in DATA["cards"]]
row_heights = [max(layouts[i][1] for i in range(row*3, row*3+3)) for row in range(3)]
Y_CARDS = 716
H = math.ceil(Y_CARDS + sum(row_heights) + 2*GAP + 320)
INK = "#16384b"
MUTED = "#536c79"
PAPER = "#f4f7f6"
TEAL = "#087f91"
BLUE = "#377caf"
GREEN = "#238464"
AMBER = "#b47924"
GRAY = "#7d8793"
ACCENTS = [BLUE, TEAL, TEAL, GREEN, TEAL, AMBER, GREEN, AMBER, BLUE]
image = Image.new("RGB", (W, H), PAPER)
draw = ImageDraw.Draw(image)
svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-labelledby="map-title map-desc">',
       f'<title id="map-title">{html.escape(DATA["title"])}</title>',
       '<desc id="map-desc">源网页能力、互动原理、原型演进、系列扩展、复用价值、证据边界、风险与后续路线的完整研究总览。</desc>',
       '<metadata>Native diagram drawing. Exact UTF-8 content, original pixel-duck decoration. No generated model image or reference screenshot.</metadata>']

def rect(x, y, w, h, fill, radius=0, stroke=None, width=2):
    box = [round(x), round(y), round(x+w), round(y+h)]
    if radius:
        draw.rounded_rectangle(box, radius, fill=fill, outline=stroke, width=width)
    else:
        draw.rectangle(box, fill=fill, outline=stroke, width=width)
    svg.append(f'<rect x="{x:g}" y="{y:g}" width="{w:g}" height="{h:g}" rx="{radius}" fill="{fill}"'+(f' stroke="{stroke}" stroke-width="{width}"' if stroke else '')+'/>')

def text(value, x, y, size=BODY_SIZE, color=INK, bold=False):
    draw.text((round(x), round(y)), value, font=font(size, bold), fill=color, anchor="lt")
    svg.append(f'<text x="{x:g}" y="{y+size*.87:g}" fill="{color}" font-size="{size}" font-weight="{700 if bold else 400}" font-family="Microsoft YaHei,PingFang SC,Noto Sans CJK SC,sans-serif">{html.escape(value)}</text>')

def centered(value, x, y, width, size, color=INK, bold=False):
    measured = font(size, bold).getlength(value)
    assert measured <= width+1, f"Line does not fit: {value}"
    text(value, x+(width-measured)/2, y, size, color, bold)

def line(points, color, width=4):
    draw.line([(round(x), round(y)) for x,y in points], fill=color, width=width, joint="curve")
    svg.append('<polyline points="'+' '.join(f'{x:g},{y:g}' for x,y in points)+f'" fill="none" stroke="{color}" stroke-width="{width}" stroke-linecap="round" stroke-linejoin="round"/>')

def arrow(x, y, direction=0, color=TEAL, length=25):
    # direction 0=right, -1=up.
    if direction == -1:
        line([(x-length*.5,y+length*.7),(x,y),(x+length*.5,y+length*.7)],color,6)
    else:
        line([(x-length*.7,y-length*.5),(x,y),(x-length*.7,y+length*.5)],color,6)

def badge(value, x, y, color, size=30):
    width = font(size, True).getlength(value)+38
    rect(x,y,width,48,"#ffffff",24,stroke=color,width=2)
    text(value,x+19,y+8,size,color,True)
    return width

def duck(x,y,s=10,white=False):
    # Original simple pixel motif; no source image imported.
    blocks=[(-11,-1,22,10,"#65513e"),(-9,-4,18,11,"#fff5d2" if white else "#ffd254"),
            (3,-12,11,12,"#65513e"),(5,-10,9,11,"#fff5d2" if white else "#ffe16c"),
            (12,-5,7,4,"#e78a30"),(10,-8,2,2,INK),(-9,0,9,4,"#e7dab7" if white else "#edb83f")]
    for dx,dy,w,h,c in blocks:
        rect(x+dx*s,y+dy*s,w*s,h*s,c)

rect(0,0,W,H,PAPER)
rect(0,0,W,336,"#e6f2f5")
text("研究图谱 / 项目 005",M,58,32,TEAL,True)
text(DATA["title"],M,122,101,INK,True)
text(DATA["subtitle"],M,266,44,MUTED)
text(DATA["date"],W-M-320,58,32,MUTED)
duck(W-520,207,8)
duck(W-280,196,6,True)
line([(W-710,287),(W-170,287)],"#77bdcf",8)
legend_x=M
for value,color in [("已观察",BLUE),("已实现 / 已检查",GREEN),("设计推断 / 待验证",AMBER),("未确认",GRAY)]:
    legend_x += badge(value,legend_x,358,color,30)+25
text("状态标注用于区分事实、运行证据和未来机会",W-M-1440,370,30,MUTED)

# The central causal loop remains readable before inspecting individual cards.
steps=[("玩家操作","选路 / 点水 / 蓄水 / 放水"),
       ("水的变化","方向 / 水量 / 水位 / 推力"),
       ("鸭子响应","轨迹 / 停留 / 抵达 / 回游"),
       ("目标与反馈","成功 / 补救 / 奖励 / 失误"),
       ("可见回程","水回池 / 鸭回安全区"),
       ("下一次决策","读水 / 换策略 / 再尝试")]
step_gap=34
sw=(W-2*M-5*step_gap)/6
sy=458
for i,(title,description) in enumerate(steps):
    sx=M+i*(sw+step_gap)
    rect(sx,sy,sw,122,"#ffffff",22,stroke="#b5d2dc",width=3)
    centered(title,sx,sy+20,sw,45,TEAL,True)
    centered(description,sx,sy+79,sw,31,MUTED)
    if i<5:
        arrow(sx+sw+step_gap-8,sy+61,color=TEAL,length=22)
left=M+sw/2
right=M+5*(sw+step_gap)+sw/2
line([(right,587),(right,640),(left,640),(left,587)],"#60a9b7",5)
arrow(left,587,-1,"#60a9b7",24)
rect(W/2-790,617,1580,50,PAPER,10)
centered("回程让循环可见；每一轮仍需要新的判断",W/2-770,624,1540,34,TEAL,True)

row_y=Y_CARDS
for row in range(3):
    for col in range(3):
        idx=row*3+col
        card=DATA["cards"][idx]
        x=M+col*(CW+GAP)
        color=ACCENTS[idx]
        height=row_heights[row]
        rect(x,row_y+10,CW,height,"#e0e7e8",28)
        rect(x,row_y,CW,height,"#ffffff",28,stroke="#cedde2",width=2)
        rect(x+1,row_y+27,9,height-54,color,4)
        rect(x+44,row_y+38,75,70,color,18)
        centered(str(card["number"]).zfill(2),x+44,row_y+54,75,39,"#ffffff",True)
        text(card["title"],x+145,row_y+43,TITLE_SIZE,INK,True)
        text(card["status"],x+145,row_y+107,29,color,True)
        entry_y=row_y+165
        for labels,body in layouts[idx][0]:
            for value in labels:
                text(value,x+54,entry_y,LABEL_SIZE,color,True)
                entry_y+=LINE
            for value in body:
                text(value,x+54,entry_y,BODY_SIZE,INK)
                entry_y+=LINE
            entry_y+=26
        assert entry_y<=row_y+height+2, f"Card {idx+1} overflows by {entry_y-row_y-height:g}"
    row_y+=row_heights[row]+GAP

footer_y=row_y-10
rect(M,footer_y,W-2*M,117,"#dfeef1",24)
centered("共同核心：水是操作媒介与规则，鸭子是反馈角色，循环组织体验。",M+20,footer_y+27,W-2*M-40,49,INK,True)
text("原视频仅作启发；当前原型为原创实验。程序通过不等于玩法、留存或商业价值已经验证。",M,footer_y+151,31,MUTED)
source_x=M
for idx,source in enumerate(DATA["sources"],1):
    label=f"[{idx}] {source['label']}"
    width=font(29,False).getlength(label)
    svg.append(f'<a href="{html.escape(source["url"],quote=True)}" target="_blank">')
    text(label,source_x,footer_y+205,29,TEAL)
    svg.append('</a>')
    source_x+=width+70
svg.append('</svg>')
ASSETS.mkdir(exist_ok=True)
svg_path=ASSETS/f"{STEM}.svg"
png_path=ASSETS/f"{STEM}.png"
svg_path.write_text("\n".join(svg),encoding="utf-8",newline="\n")
image.save(png_path,optimize=True,dpi=(300,300))
demo_assets=ROOT/"demo"/"assets"
demo_assets.mkdir(parents=True,exist_ok=True)
for p in (png_path,svg_path):
    shutil.copyfile(p,demo_assets/p.name)
print(json.dumps({"png":str(png_path),"svg":str(svg_path),"width":W,"height":H,"modules":9,"drawing":"native SVG and Pillow"},ensure_ascii=False))
