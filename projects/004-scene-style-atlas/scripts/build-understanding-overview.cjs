// A deterministic evidence diagram. Raster screenshots are embedded unchanged;
// labels, hierarchy and arrows remain editable in the SVG source.
// Run: node scripts/build-understanding-overview.cjs [path-to-sharp]
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require(process.argv[2] || 'sharp');
const dir = path.resolve(__dirname, '../demo/understanding/assets');
const W = 3200, H = 4800;
const C = {bg:'#131c18',surface:'#1e2a23',raised:'#29372d',line:'#44594b',ink:'#f0f2e5',muted:'#b9c5b8',quiet:'#92a796',accent:'#d9e99c',official:'#eac490',own:'#a7d6ba',concept:'#c6bce4',warn:'#e2b59f'};
const parts = [], labels = [], imageRecords = [];
const esc = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function rect(x,y,w,h,fill=C.surface,r=20,stroke=C.line){parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`);}
function line(x1,y1,x2,y2,color=C.line,width=3){parts.push(`<path d="M${x1} ${y1}L${x2} ${y2}" fill="none" stroke="${color}" stroke-width="${width}"/>`);}
function text(x,y,s,size=34,color=C.ink,weight=400){parts.push(`<text x="${x}" y="${y}" fill="${color}" font-size="${size}" font-weight="${weight}">${esc(s)}</text>`);labels.push({x,y,size,text:s});}
function wrap(s,size,width){
  const out=[];let current='',used=0;
  for(const ch of [...s]){
    if(ch==='\n'){out.push(current);current='';used=0;continue;}
    const n=/[\u0000-\u007f]/.test(ch)?(ch===' '?size*.28:size*.58):size;
    if(used+n>width&&current){out.push(current);current='';used=0;}
    current+=ch;used+=n;
  }
  if(current)out.push(current);return out;
}
function para(x,y,s,width,size=34,color=C.muted,maxRows=20){
  const rows=wrap(s,size,width);if(rows.length>maxRows)throw new Error(`Text overflows (${rows.length}/${maxRows}): ${s}`);
  rows.forEach((row,i)=>text(x,y+i*size*1.5,row,size,color));return rows.length*size*1.5;
}
function tag(x,y,s,color=C.own,width=230){rect(x,y,width,48,C.bg,9,color);text(x+18,y+33,s,25,color,600);}
function section(y,n,title,note=''){
  text(80,y,n,30,C.accent,600);text(154,y,title,52,C.ink,700);
  if(note)text(154,y+51,note,29,C.muted);
}
function image(x,y,w,h,file){
  const data=fs.readFileSync(path.join(dir,file));const type=file.endsWith('.png')?'image/png':'image/jpeg';
  rect(x,y,w,h,C.bg,10,C.line);
  parts.push(`<image x="${x+2}" y="${y+2}" width="${w-4}" height="${h-4}" preserveAspectRatio="xMidYMid meet" href="data:${type};base64,${data.toString('base64')}"/>`);
  imageRecords.push({file,bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex')});
}
function arrow(x1,y,x2,color=C.accent){line(x1,y,x2-16,y,color,4);parts.push(`<path d="M${x2-22} ${y-12}L${x2} ${y}L${x2-22} ${y+12}" fill="none" stroke="${color}" stroke-width="4"/>`);}
function bullet(x,y,title,body,width=1380){text(x,y,title,36,C.ink,600);return para(x,y+46,body,width,30,C.muted);}

// 01: Motivation and real reference. No generated reconstruction is used here.
rect(0,0,W,H,C.bg,0,C.bg);
text(80,95,'004 / FIELD ATLAS / 2026.10.05',29,C.accent,600);
text(80,209,'中景里的游戏气质 · 理解总览',88,C.ink,700);
para(84,279,'从 Defilade 公开画面出发：研究场景与模型怎样形成体感，沉淀规则，再探索原创产品。',3010,38,C.muted,2);
tag(80,330,'原游戏参考',C.official,236);tag(336,330,'原创实时样板',C.own,260);tag(616,330,'AI 概念目标',C.concept,255);
text(1630,363,'研究与回顾已够用 · 人物暂停 · 产品体验尚待验证',32,C.accent,600);
section(461,'01','从原游戏展示中，我们选择研究什么？','这是我们的研究选择；原游戏的战术、补给与环境破坏也参与形成体验。');
const topXs=[80,1112,2144];
image(topXs[0],540,976,549,'defilade-official-overview.jpg');
image(topXs[1],540,976,549,'defilade-official-detail.jpg');
image(topXs[2],540,976,549,'v2-refined.png');
text(topXs[0],1143,'原游戏 · 官方广域展示',37,C.official,600);
text(topXs[1],1143,'原游戏 · 官方近处战场展示',37,C.official,600);
text(topXs[2],1143,'我们 · V2 乡村实时细化',37,C.own,600);
para(topXs[0],1190,'看道路、地形、植被、单位与建筑群怎样组织空间。',976,30,C.muted,3);
para(topXs[1],1190,'看模型轮廓、场景密度、损坏、烟尘与行动的共同作用。',976,30,C.muted,3);
para(topXs[2],1190,'以原创程序几何比较可见层次；完成度仍低于参考目标。',976,30,C.muted,3);
text(80,1310,'原游戏图片：Defilade 官方 Steam 展示截图 / RBGames；并非所引 X 视频的逐帧截取。',29,C.official);
text(80,1355,'官方页面截至 2026-10-05 显示 Coming soon；宣传描述不等于已上市实测或源码证据。',28,C.quiet);

// 02: Principles and implementation, intentionally separated.
section(1460,'02','风格是一组关系，精度要变成中景可见的差异','以下体感机制是观察与设计推断，尚未由玩家研究证明。');
const factors=[
  ['场景组织','道路连接、疏密、遮挡','路径与活动区容易被读懂'],
  ['模型语言','比例、轮廓、厚度','对象可辨，尺度更可信'],
  ['材质与光影','材料分工、粗糙度、阴影','土石木各有层次和触感'],
  ['动态与反馈','动作节奏、接触、状态变化','行动有方向，变化有结果'],
  ['镜头与尺度','中景范围、角度、细节分级','决定哪些信息真正可见']
];
for(let i=0;i<5;i++){
  const x=80+i*616;rect(x,1546,584,244,C.surface,18);
  text(x+25,1606,factors[i][0],42,C.accent,600);
  para(x+25,1664,factors[i][1],534,30,C.ink,2);
  para(x+25,1734,factors[i][2],534,28,C.muted,2);
  if(i<4)text(x+592,1684,'×',34,C.accent,600);
}
rect(80,1819,3040,108,C.raised,18);
text(112,1889,'共同影响：空间可读性  /  尺度可信  /  重量与生命感  /  温暖、紧张等情绪氛围',39,C.ink,600);
text(80,1984,'本项目实际实现',31,C.own,600);
text(370,1984,'程序几何 + Three.js 材质灯光 + 正交斜视 + 叶卡/草簇 + 程序动作与简化冲击反馈',31,C.muted);
text(80,2029,'比较原理',31,C.own,600);
text(370,2029,'固定镜头与光照，再单独改变制作阶段；用实际截图判断改进，保留原始版本。',31,C.muted);

// 03: All iterations and their actual evidence.
section(2128,'03','我们探索了什么，实际效果怎样？','V1、V2 实现与旧证据保留；V3 人物样板已按用户要求暂停。');
const cardY=2215,cardH=1130,cardXs=[80,1112,2144];
cardXs.forEach(x=>rect(x,cardY,976,cardH,C.surface,20));
text(112,2280,'V1 · 场景与风格框架',43,C.ink,600);tag(804,2242,'已留存',C.own,204);
image(112,2315,912,430,'v1-scene.png');
text(112,2797,'原创实时效果',29,C.own,600);
para(112,2841,'三场景 × 三风格；调镜头、光照和细节，比较环境与动态。建立观察框架，但体块与球状树冠仍较简化。',912,32,C.muted,4);
image(112,3070,912,200,'style-triptych.png');
text(112,3316,'AI 概念目标：自然写实 / 温暖微缩 / 荒凉废土',27,C.concept,600);

text(1144,2280,'V2 · 从体块到场景质感',43,C.ink,600);tag(1836,2242,'已留存',C.own,204);
image(1144,2315,439,282,'v2-baseline.png');image(1617,2315,439,282,'v2-refined.png');
text(1144,2646,'基础体块',30,C.own,600);text(1617,2646,'细化样板',30,C.own,600);
text(1144,2701,'同条件：自然风格 / 镜头 22 / 光向 25° / 暂停',29,C.quiet);
const v2Items=[['轮廓','独立曲瓦、砌石、门窗厚度'],['材料','表面色斑、凹凸与粗糙度差别'],['布景','叶簇、草地、车辙与细化车辆'],['光影','接触阴影、侧光与环境反射']];
v2Items.forEach((v,i)=>{text(1144,2780+i*75,v[0],33,C.accent,600);text(1260,2780+i*75,v[1],31,C.muted);});
line(1144,3052,2056,3052);
para(1144,3107,'实际能看见更多构造、表面与场景连接。轮廓仍偏规则，植被与空气感有限；不是目标图完成度，也未做正式性能或玩家验证。',912,32,C.muted,5);

text(2176,2280,'V3 · 人物的比例与动作',43,C.ink,600);tag(2868,2242,'现暂停',C.warn,204);
image(2176,2315,439,404,'v3-baseline.png');image(2649,2315,439,404,'v3-refined.png');
text(2176,2768,'基础人物',30,C.own,600);text(2649,2768,'细化人物',30,C.own,600);
para(2176,2826,'同机位、侦察兵、站立、自然风格与暂停动作；增加近景与场景聚焦，比较角色尺度、连续躯干、服饰装备和三种姿态。',912,32,C.muted,5);
line(2176,3070,3088,3070);
para(2176,3125,'军帽、背包、口袋、鞋靴与弯肘更可辨。关节、面部、布料仍简化；采用程序动作，正式蒙皮、表情与完整材质未制作。',912,32,C.muted,5);

// 04: Use cases and reusable value, grounded in the current research role.
section(3450,'04','用在哪里，能够积累什么？','当前价值首先是研究、沟通和回顾；可玩产品与正式资产需要另行验证。');
rect(80,3530,1488,465,C.surface,18);rect(1632,3530,1488,465,C.surface,18);
text(112,3594,'使用场景',43,C.accent,600);text(1664,3594,'可复用价值',43,C.accent,600);
const useRows=[['风格选型','在同场景中比较自然、微缩、废土方向。'],['团队沟通','用实际画面说明轮廓、材料、布景和光影。'],['制作与回顾','保留版本与条件，知道改了什么、差在哪里。'],['体验候选','未来用一个小场景，让行动与结果发生关系。']];
const valueRows=[['场景模块','道路、建筑、墙、植被、道具与状态组合。'],['视觉规则','比例、配色、材料分工、镜头与动效节奏。'],['方案证据','截图、参数、观察结论与当轮检查记录。'],['复用方法','固定条件比较，再跨布局和题材检验。']];
for(let i=0;i<4;i++){
  const y=3668+i*75;text(112,y,useRows[i][0],33,C.ink,600);para(365,y,useRows[i][1],1124,30,C.muted,2);
  text(1664,y,valueRows[i][0],33,C.ink,600);para(1917,y,valueRows[i][1],1124,30,C.muted,2);
}

// 05: The extension path is conditional rather than a game already built.
section(4100,'05','扩展可以走两条路；成为游戏时，再接入故事与玩法','利用我们的原创样板和视觉规则发展体验，不是改造 Defilade 的源码或模型。');
const layers=[['表现能力','布局、天气、光影、损坏与修复'],['场景叙事','地点的过去、线索与行动动机'],['玩法行动','探索、收集、建造、修复或战斗'],['游戏系统','目标、资源、规则、成长与结果']];
for(let i=0;i<4;i++){
  const x=80+i*775;rect(x,4188,715,139,C.surface,16);text(x+24,4240,layers[i][0],39,C.accent,600);para(x+24,4294,layers[i][1],665,29,C.muted,2);if(i<3)arrow(x+724,4254,x+768);
}
text(80,4401,'研究 / 工具线',34,C.own,600);text(407,4401,'风格方案库 → 有限模块组合 → 场景配置工具',34,C.muted);
text(80,4467,'可玩产品线',34,C.own,600);text(407,4467,'例如营地「荒废 → 整理 → 修复」→ 任务与资源成长；目前只是候选',34,C.muted);
rect(80,4512,3040,134,C.raised,18);
text(112,4563,'已做到',31,C.own,600);text(307,4563,'实时比较、环境与人物样板、截图与版本留存。',31,C.ink);
text(1584,4563,'仍未做到',31,C.warn,600);text(1800,4563,'正式资产、完整游戏系统、玩家与性能验证。',31,C.ink);
text(112,4614,'优先候选',31,C.accent,600);text(307,4614,'风格方案保存与恢复；再检验场景组合和状态体验。人物暂不继续。',31,C.ink);
text(80,4723,'来源：store.steampowered.com/app/5246700/  ·  x.com/nexindie/status/2106723291868373127',25,C.quiet);
text(80,4763,'原游戏画面权利归原权利人。我们截图来自实时样板；AI 图仅表达目标。完整解释、来源与检查范围见理解汇总页。',25,C.quiet);

const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title desc"><title id="title">场景与模型风格研究理解总览</title><desc id="desc">原游戏官方展示、五层体感机制、V1至V3实际证据、使用场景价值、产品扩展与完成边界。</desc><g font-family="Microsoft YaHei, Noto Sans CJK SC, sans-serif">${parts.join('\n')}</g></svg>`;
fs.writeFileSync(path.join(dir,'overview.svg'),svg,'utf8');
sharp(Buffer.from(svg)).png({compressionLevel:9}).toFile(path.join(dir,'overview.png')).then(info=>{
  const manifest={recorded:'2026-10-05',timezone:'Asia/Shanghai',width:W,height:H,method:'Deterministic SVG evidence diagram rendered with sharp; no generative reconstruction of screenshots.',referencePage:'https://store.steampowered.com/app/5246700/',labels:labels.length,images:imageRecords,outputs:{svgBytes:Buffer.byteLength(svg),pngBytes:info.size}};
  fs.writeFileSync(path.join(dir,'overview-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  process.stdout.write(JSON.stringify({width:W,height:H,pngBytes:info.size,svgBytes:Buffer.byteLength(svg),labels:labels.length})+'\n');
}).catch(error=>{process.stderr.write(error.stack+'\n');process.exitCode=1;});
