import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Original procedural study: no Defilade meshes, textures or source code.
const $ = (id) => document.getElementById(id);
const presets = {
  natural: {
    name: '自然写实', feeling: '可信 · 克制 · 行动有分量',
    description: '土地、砖石与植被保留粗糙感；低饱和色彩和清晰阴影，让小比例单位融入一个可信的地点。',
    ground: '#707650', road: '#9a8a69', leaf: '#425937', trunk: '#65503b', wall: '#c0b59a', roof: '#885244', metal: '#667452', glass: '#35474b',
    background: '#1d2926', light: '#fff0d4', shadow: '#60757a', roughness: .93, fog: .002, sun: [12, 25, 10], exposure: 1.12,
    palette: ['#707650', '#425937', '#c0b59a', '#885244', '#667452'],
  },
  miniature: {
    name: '温暖微缩', feeling: '亲近 · 可触摸 · 愿意停留',
    description: '保留相同布局与尺度，用更明亮的模型颜色、温暖的光和柔和阴影，观察世界怎样变得像一套可以亲手布置的模型。',
    ground: '#99a36c', road: '#cbb591', leaf: '#72934f', trunk: '#8d6543', wall: '#eee0bc', roof: '#be744e', metal: '#84a7a0', glass: '#628e9c',
    background: '#242c2a', light: '#ffdeb0', shadow: '#92aebe', roughness: .72, fog: .0014, sun: [8, 20, -10], exposure: 1.24,
    palette: ['#99a36c', '#72934f', '#eee0bc', '#be744e', '#84a7a0'],
  },
  wasteland: {
    name: '荒凉废土', feeling: '疏离 · 不安 · 环境有历史',
    description: '灰土、枯树、残墙与冷色空气削弱生机；局部暖色光保留视觉焦点。破损和空隙让同一个地点带上不同的故事。',
    ground: '#817b6b', road: '#8c8374', leaf: '#605e4b', trunk: '#625345', wall: '#aaa696', roof: '#71655b', metal: '#636e68', glass: '#3f505c',
    background: '#272d30', light: '#c6d6df', shadow: '#656e7e', roughness: 1, fog: .007, sun: [-15, 18, 7], exposure: 1.01,
    palette: ['#817b6b', '#605e4b', '#aaa696', '#71655b', '#bf8056'],
  },
};
const names = { village: '乡村道路', industry: '工业院落', town: '城镇街区' };
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const state = { scene: 'village', style: 'natural', detail: 2, scale: 26, light: 1, motion: !reduced };
let renderer, scene, camera, controls, world, sun, fill, hemi, animations = [], event = null, brokenWall, debrisGroup;
let geometryCache = new Map(), materialCache = new Map(), textures = [], occupied = [], modelDetails = [], rng;
let time = 0, last = performance.now(), visible = true;
const tmp = new THREE.Object3D();

function seeded(seed) { let s = seed >>> 0; return () => { s = (1664525 * s + 1013904223) >>> 0; return s / 4294967296; }; }
function height(x, z) { return .09 + Math.sin(x * .2) * Math.cos(z * .25) * .1; }
function geom(key, factory) { if (!geometryCache.has(key)) geometryCache.set(key, factory()); return geometryCache.get(key); }
function material(key, color, options = {}) {
  if (!materialCache.has(key)) materialCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: presets[state.style].roughness, ...options }));
  return materialCache.get(key);
}
function box(parent, x, y, z, w, h, d, mat, rotation = 0) {
  const m = new THREE.Mesh(geom('box', () => new THREE.BoxGeometry(1, 1, 1)), mat);
  m.position.set(x, y, z); m.scale.set(w, h, d); m.rotation.y = rotation; m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function cylinder(parent, x, y, z, top, bottom, h, mat, segments = 10) {
  const key = `cylinder-${top}-${bottom}-${h}-${segments}`;
  const m = new THREE.Mesh(geom(key, () => new THREE.CylinderGeometry(top, bottom, h, segments)), mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function sphere(parent, x, y, z, r, mat, scale = [1, 1, 1]) {
  const m = new THREE.Mesh(geom('sphere', () => new THREE.SphereGeometry(1, 9, 7)), mat);
  m.position.set(x, y, z); m.scale.set(r * scale[0], r * scale[1], r * scale[2]); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function detail(m) { modelDetails.push(m); m.visible = state.detail > 0; return m; }
function footprint(x, z, w, d) { occupied.push({ x, z, w: w / 2 + .65, d: d / 2 + .65 }); }
function clearWorld() {
  if (!world) return;
  scene.remove(world);
  for (const g of geometryCache.values()) g.dispose();
  for (const m of materialCache.values()) m.dispose();
  for (const t of textures) t.dispose();
  geometryCache = new Map(); materialCache = new Map(); textures = []; animations = []; occupied = []; modelDetails = [];
  if (event) disposeEvent();
}
function texture(type, color, size = 256) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d'); ctx.fillStyle = color; ctx.fillRect(0, 0, size, size);
  const noise = seeded(82);
  for (let i = 0; i < size * size / 3; i++) {
    const a = noise() * (state.style === 'miniature' ? .09 : .18);
    ctx.fillStyle = noise() > .5 ? `rgba(255,247,215,${a})` : `rgba(22,27,17,${a})`;
    const x = noise() * size, y = noise() * size, s = noise() * 3 + 1;
    ctx.fillRect(x, y, s, s);
  }
  if (type === 'brick') {
    ctx.strokeStyle = state.style === 'miniature' ? 'rgba(65,48,29,.12)' : 'rgba(65,48,29,.3)'; ctx.lineWidth = 1.5;
    for (let y = 0; y < size; y += 24) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke();
      for (let x = (y / 24 % 2) * 24; x < size; x += 48) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 24); ctx.stroke(); }
    }
  }
  if (type === 'tile') {
    ctx.strokeStyle = 'rgba(45,27,22,.3)'; ctx.lineWidth = 3;
    for (let y = 0; y < size; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke(); }
    for (let x = 0; x < size; x += 16) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size); ctx.stroke(); }
  }
  if (type === 'ground') {
    for (let i = 0; i < 650; i++) {
      const x = noise() * size, y = noise() * size, r = noise() * 12 + 2;
      ctx.fillStyle = noise() > .5 ? 'rgba(89,100,57,.13)' : 'rgba(180,160,104,.1)'; ctx.beginPath(); ctx.ellipse(x, y, r, r * .5, noise(), 0, Math.PI * 2); ctx.fill();
    }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(type === 'ground' ? 6 : 2, type === 'ground' ? 5 : 2); t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy()); textures.push(t); return t;
}
function roofGeometry(w, d, h) {
  const vertices = [-w/2,0,-d/2, w/2,0,-d/2, 0,h,-d/2, -w/2,0,d/2, w/2,0,d/2, 0,h,d/2];
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0,0,1,0,.5,1,0,0,1,0,.5,1], 2));
  g.setIndex([0,2,1,3,4,5,0,3,5,0,5,2,2,5,4,2,4,1,0,1,4,0,4,3]); g.computeVertexNormals(); return g;
}
function house(x, z, w = 5, d = 5, h = 3.4, rotation = 0, ruined = false, flat = false) {
  const p = presets[state.style], g = new THREE.Group(); g.position.set(x, height(x,z), z); g.rotation.y = rotation; world.add(g); footprint(x,z,Math.max(w,d),Math.max(w,d));
  const stone = material('stone', '#ffffff', { map: textureOnce('brick', p.wall) });
  const roofMat = material('roof', '#ffffff', { map: textureOnce('tile', p.roof), side: THREE.DoubleSide });
  const trim = material('trim', state.style === 'miniature' ? '#e5c796' : '#776e57');
  const glass = material('glass', p.glass, { roughness: .38, metalness: .15 });
  if (ruined) {
    box(g, 0, .65, 0, w, 1.3, d, stone);
    box(g, -w/2+.13, h/2, -.6, .28, h, d*.72, stone);
    box(g, w*.1, h*.4, -d/2+.13, w*.8, h*.8, .28, stone);
    rubble(x,z,35,w*.65); box(g,w*.3,.85,d*.35,.15,1.7,.15,trim);
  } else {
    box(g,0,h/2,0,w,h,d,stone);
    if (flat) { box(g,0,h+.15,0,w+.3,.3,d+.3,material('concrete','#aaa99a')); }
    else {
      const roof = new THREE.Mesh(geom(`roof-${w}-${d}-${h}`, () => roofGeometry(w+.55,d+.55,w*.3)), roofMat);
      roof.position.y = h; roof.castShadow = true; roof.receiveShadow = true; g.add(roof);
      detail(box(g,w*.22,h+w*.2,-d*.22,.45,1.2,.5,stone));
    }
  }
  if (!ruined) {
    box(g,0,.7,d/2+.018,.85,1.4,.08,material('door','#574932'));
    detail(box(g,0,.1,d/2+.38,1.5,.18,.65,material('step','#bbb49d')));
    for (const side of [-1,1]) {
      for (let i = 0; i < 2; i++) {
        const a = (i-.5)*w*.54;
        detail(box(g,a,h*.6,side*(d/2+.03),.96,.98,.09,trim));
        detail(box(g,a,h*.6,side*(d/2+.085),.76,.78,.045,glass));
        detail(box(g,a,h*.6,side*(d/2+.115),.06,.78,.04,trim));
      }
      for (let i=0;i<2;i++) {
        detail(box(g,side*(w/2+.03),h*.58,(i-.5)*d*.5,.08,.9,.9,trim));
        detail(box(g,side*(w/2+.085),h*.58,(i-.5)*d*.5,.04,.71,.71,glass));
      }
    }
    if (state.detail === 2) for (let i=0;i<3;i++) detail(box(g,-w*.45+i*.2,.4,d*.53,.12,.8,.3,material('wood',p.trunk)));
  }
  return g;
}
let textureMap;
function textureOnce(kind, color) { const key=kind+color; if (!textureMap.has(key)) textureMap.set(key,texture(kind,color)); return textureMap.get(key); }
function rubble(x,z,count,radius) {
  const m = material('rubble','#9c917c');
  for(let i=0;i<count;i++) {
    const a=rng()*Math.PI*2, r=rng()*radius;
    const b=box(world,x+Math.cos(a)*r,.2+rng()*.18,z+Math.sin(a)*r,.15+rng()*.45,.14+rng()*.38,.14+rng()*.4,m,rng()*6);
    b.rotation.z=rng()*.5; if (i>12) detail(b);
  }
}
function wall(x,z,length,rotation=0,breakable=false) {
  const g=new THREE.Group(); g.position.set(x,height(x,z),z);g.rotation.y=rotation;world.add(g);
  const m=material('wall','#ffffff',{map:textureOnce('brick',presets[state.style].wall)});
  box(g,0,.65,0,length,1.3,.36,m);
  detail(box(g,0,1.32,0,length+.1,.1,.45,material('wallcap','#a89e83')));
  for(let a=-length/2;a<=length/2+.1;a+=length/3) box(g,a,.75,0,.5,1.5,.5,m);
  if(breakable) brokenWall=g;return g;
}
function fence(x,z,length,rotation=0) {
  const g=new THREE.Group();g.position.set(x,.12,z);g.rotation.y=rotation;world.add(g);const m=material('wood',presets[state.style].trunk);
  box(g,0,.45,0,length,.09,.1,m);box(g,0,.87,0,length,.09,.1,m);
  for(let a=-length/2;a<=length/2;a+=.8)box(g,a,.5,0,.13,1,.13,m);
}
function tree(x,z,s=1,variant=0) {
  const p=presets[state.style],g=new THREE.Group();g.position.set(x,height(x,z),z);g.scale.setScalar(s);world.add(g);
  const trunk=material('trunk',p.trunk), leaf=material('leaf',p.leaf), leaf2=material('leaf2',new THREE.Color(p.leaf).multiplyScalar(1.16));
  cylinder(g,0,1.65,0,.13,.24,3.3,trunk,8);
  const dead=state.style==='wasteland' && variant%3!==0;
  for(let i=0;i<3;i++) {
    const a=i*2.1+variant;
    const branch=cylinder(g,Math.cos(a)*.48,2.65+i*.35,Math.sin(a)*.48,.055,.105,1.5,trunk,6);branch.rotation.z=Math.cos(a)*.8;branch.rotation.x=Math.sin(a)*.8;
    if(!dead) sphere(g,Math.cos(a)*.65,3.25+i*.38,Math.sin(a)*.65,1.25,i%2?leaf:leaf2,[1,1.06,1]);
  }
  if(!dead) sphere(g,0,4.2,0,1.25,leaf,[1,1.05,1]);
  return g;
}
function pine(x,z,s=1) {
  const g=new THREE.Group();g.position.set(x,height(x,z),z);g.scale.setScalar(s);world.add(g);cylinder(g,0,2,0,.1,.18,4,material('trunk',presets[state.style].trunk));
  const m=material('leaf',presets[state.style].leaf);
  for(let i=0;i<3;i++){ const leaf=new THREE.Mesh(geom(`cone${i}`,()=>new THREE.ConeGeometry(1.4-i*.27,2.1,10)),m);leaf.position.y=2+i*.95;leaf.castShadow=true;g.add(leaf); }
}
function roadZ(x) { return state.scene==='village'?Math.sin(x*.12)*1.3:0; }
function road(alongX=true, width=3.7) {
  const positions=[],uvs=[],indices=[];
  const length=alongX?43:35,steps=90;
  for(let i=0;i<=steps;i++) {
    const v=-length/2+i/steps*length, offset=alongX?roadZ(v):0;
    for(const side of [-1,1]) {
      const x=alongX?v:offset+side*width/2+2.5,z=alongX?offset+side*width/2:v;
      positions.push(x,height(x,z)+.026,z);uvs.push(i/steps*8,(side+1)/2);
    }
    if(i<steps){const n=i*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeVertexNormals();
  geometryCache.set(`road-${alongX}`,geo);
  const mesh=new THREE.Mesh(geo,material('road','#ffffff',{map:textureOnce('road',presets[state.style].road),side:THREE.DoubleSide}));mesh.receiveShadow=true;world.add(mesh);
  if(state.scene==='town') {
    const m=material('mark','#c5bda5');
    for(let i=-19;i<20;i+=3)detail(box(world,i,.15,0,1.5,.014,.075,m));
  }
}
function tank(x,z,a=0) {
  const p=presets[state.style],g=new THREE.Group();g.position.set(x,.14,z);g.rotation.y=a;world.add(g);
  const metal=material('metal',p.metal,{metalness:.15}),rubber=material('rubber','#30322d'),dark=material('track','#464941');
  box(g,0,.7,0,1.75,.55,3.1,metal);
  for(const side of [-1,1]) {
    box(g,side*1,.43,0,.42,.67,3.35,rubber);
    for(let i=0;i<5;i++) {const wheel=cylinder(g,side*1.23,.44,-1.2+i*.6,.22,.22,.12,dark,10);wheel.rotation.z=Math.PI/2;detail(wheel);}
    if(state.detail===2)for(let i=0;i<12;i++)detail(box(g,side*1,.8,-1.48+i*.27,.47,.05,.07,dark));
  }
  const turret=new THREE.Group();turret.position.set(0,1.1,-.1);g.add(turret);
  box(turret,0,0,0,1.18,.55,1.35,metal);
  const barrel=cylinder(turret,0,.04,1.57,.08,.1,2.3,metal,10);barrel.rotation.x=Math.PI/2;
  detail(cylinder(turret,.24,.35,-.12,.27,.27,.1,dark,12));
  detail(box(g,0,.99,-1.04,1.45,.035,.54,dark));
  for(let i=0;i<5;i++)detail(box(g,-.63+i*.31,1.015,-1.05,.07,.04,.45,metal));
  animations.push({type:'turret',object:turret,phase:rng()*6});return g;
}
function truck(x,z,a=-Math.PI/2,moving=false) {
  const g=new THREE.Group();g.position.set(x,.14,z);g.rotation.y=a;world.add(g);
  const m=material('metal',presets[state.style].metal,{metalness:.1}),rubber=material('rubber','#30322d'),glass=material('glass',presets[state.style].glass,{roughness:.4});
  box(g,0,.65,0,1.55,.25,3.5,m);box(g,0,1.28,1.05,1.55,1.15,1.1,m);box(g,0,1.37,1.62,1.29,.5,.03,glass);
  box(g,0,1.03,-.63,1.54,.67,2.07,material('canvas',new THREE.Color(presets[state.style].metal).multiplyScalar(.83)));
  detail(box(g,0,1.4,-.63,1.53,.1,2.1,m));
  for(const side of [-1,1]) for(const zi of [-1.1,1]) {const w=cylinder(g,side*.84,.46,zi,.33,.33,.25,rubber,12);w.rotation.z=Math.PI/2;}
  for(const side of [-1,1])detail(box(g,side*.48,.85,1.65,.23,.17,.05,material('lamp','#ded0a2',{emissive:'#b3a270',emissiveIntensity:.2})));
  if(moving)animations.push({type:'truck',object:g,phase:x});return g;
}
function soldier(x,z,phase=0) {
  const g=new THREE.Group();g.position.set(x,.15,z);world.add(g);
  const m=material('uniform',state.style==='miniature'?'#779894':'#5d6850'),skin=material('skin','#bd9870'),boot=material('boot','#414035');
  cylinder(g,0,.75,0,.16,.18,.48,m,8); sphere(g,0,1.11,0,.14,skin);sphere(g,0,1.23,-.01,.18,material('helmet',presets[state.style].metal),[1,.6,1]);
  const left=box(g,-.095,.34,0,.12,.55,.15,m),right=box(g,.095,.34,0,.12,.55,.15,m);
  box(g,-.095,.07,.04,.15,.13,.22,boot);box(g,.095,.07,.04,.15,.13,.22,boot);
  box(g,.2,.73,.12,.11,.35,.11,m,.35);box(g,-.2,.72,.12,.11,.35,.11,m,-.35);
  detail(box(g,.03,.79,.26,.07,.07,.5,boot));detail(box(g,0,.75,-.19,.29,.34,.15,material('pack','#77765c')));
  animations.push({type:'soldier',object:g,left,right,baseX:x,baseZ:z,phase});return g;
}
function container(x,z,color,rotation=0) {
  const g=new THREE.Group();g.position.set(x,.15,z);g.rotation.y=rotation;world.add(g);footprint(x,z,4.5,2.1);
  const m=material('container-'+color,color,{metalness:.18});box(g,0,1,0,4.5,2,2.1,m);
  for(let i=0;i<14;i++)for(const side of [-1,1])detail(box(g,-2.1+i*.32,1,side*1.07,.065,1.9,.055,m));
  for(const side of [-1,1])detail(box(g,side*2.28,1,0,.06,1.9,.055,material('steel','#b7b4a2',{metalness:.35})));
}
function lamp(x,z) {
  const m=material('steel','#8b8a79',{metalness:.25});cylinder(world,x,1.9,z,.04,.07,3.6,m,8);box(world,x+.27,3.7,z,.58,.08,.08,m);
  const bulb=box(world,x+.5,3.62,z,.25,.12,.3,material('streetbulb','#dbc790',{emissive:state.style==='wasteland'?'#ea8e43':'#c8a560',emissiveIntensity:state.style==='wasteland'?1.2:.2}));detail(bulb);
}
function grass() {
  const count=state.detail===2?5500:state.detail===1?2200:0;
  if(!count)return;
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([-.03,0,0,.03,0,0,0,.29,0,0,0,-.03,0,0,.03,0,.22,0],3));geo.computeVertexNormals();geometryCache.set('grass',geo);
  const m=material('grass','#ffffff',{side:THREE.DoubleSide});const inst=new THREE.InstancedMesh(geo,m,count);let n=0;
  for(let i=0;i<count*3&&n<count;i++) {
    const x=rng()*42-21,z=rng()*34-17;
    if(Math.abs(z-roadZ(x))<2.25||(state.scene==='town'&&Math.abs(x-2.5)<2.5)||occupied.some(o=>Math.abs(o.x-x)<o.w&&Math.abs(o.z-z)<o.d))continue;
    if(state.style==='wasteland'&&rng()<.7)continue;
    tmp.position.set(x,height(x,z),z);tmp.rotation.set(0,rng()*6,0);const s=.6+rng()*1.2;tmp.scale.set(s,s,s);tmp.updateMatrix();inst.setMatrixAt(n,tmp.matrix);
    inst.setColorAt(n,new THREE.Color(presets[state.style].leaf).multiplyScalar(.65+rng()*.8));n++;
  }
  inst.count=n;inst.instanceMatrix.needsUpdate=true;world.add(inst);
}
function scatter() {
  for(let i=0;i<25;i++) {
    const x=rng()*40-20,z=rng()*32-16;
    if(Math.abs(z-roadZ(x))<3 || occupied.some(o=>Math.abs(o.x-x)<o.w&&Math.abs(o.z-z)<o.d))continue;
    const b=sphere(world,x,height(x,z)+.2,z,.3+rng()*.3,material('rock','#a59d84'),[1,.5,.85]);detail(b);
  }
  for(let i=0;i<10;i++) {
    const x=rng()*38-19,z=rng()*32-16;
    if(Math.abs(z-roadZ(x))<4||occupied.some(o=>Math.abs(o.x-x)<o.w+1&&Math.abs(o.z-z)<o.d+1))continue;
    tree(x,z,.7+rng()*.4,i);
  }
}
function makeVillage() {
  house(-10,-7,5.2,5.2,3.3);house(-2,-9,4.5,4.5,3.1);house(9,-8,5,5,3.4,0,state.style==='wasteland');house(13,7,5.3,5,3.5,Math.PI/2);
  house(-11,9,7,4.5,3.2,Math.PI/2,false);wall(-10,-3,7,0,true);wall(8,-4.4,7);wall(-14,-7,6,Math.PI/2);
  fence(-12,5,10);fence(-17,10,8,Math.PI/2);fence(13,11,9);
  for(let i=0;i<5;i++){tree(-18+i*3.3,-13,1+i%2*.15,i);tree(-19+i*1.6,12,.8,i+5);}pine(18,-11,1.05);pine(17,-14,.8);
  tank(-3,roadZ(-3),-Math.PI/2);truck(11,roadZ(11),-Math.PI/2,true);truck(-15,7,.3);
  for(let i=0;i<5;i++)soldier(-8+i*.9,3.2+(i%2)*.8,i);
  detail(box(world,-7,.46,-5,.9,.7,.7,material('crate','#8a7551')));detail(box(world,-6,.4,-5,.65,.6,.65,material('crate','#8a7551')));
  lamp(4,3);
}
function makeIndustry() {
  house(-10,-9,10,7,4.2,0,false,true);house(12,-10,5,5,3.2,0,false,true);wall(-10,-4.5,9,0,true);wall(13,-5.5,6);
  for(let i=0;i<4;i++)container(6+(i%2)*5.1,5+Math.floor(i/2)*3.2,[presets[state.style].metal,'#927151','#7a8989','#7e725f'][i]);
  const iron=material('steel','#8e9491',{metalness:.25});
  for(let i=0;i<2;i++) {
    const x=-15+i*5;cylinder(world,x,3.3,9,1.9,1.9,5.6,material('silo','#b6b9ac',{metalness:.2}),20);sphere(world,x,6.1,9,1.9,material('silo','#b6b9ac'),[1,.25,1]);
    for(let j=0;j<4;j++)detail(box(world,x+.2,1.1+j*1.2,10.93,2,.045,.07,iron));
    const pipe=cylinder(world,x,1.2,5.4,.2,.2,4,iron,12);pipe.rotation.x=Math.PI/2;
  }
  for(const x of [-2,3])box(world,x,4.9,-10,.3,9.4,.3,material('crane','#bc9b53'));
  box(world,.5,9.6,-10,5.5,.3,.35,material('crane','#bc9b53'));cylinder(world,.5,7.8,-10,.025,.025,3.6,iron,6);
  for(let i=0;i<3;i++)detail(box(world,-2.3+i*.55,6+i*.45,-10,.12,.12,.4,iron));
  for(let i=0;i<5;i++)detail(box(world,-4+(i%2)*1.1,.5,7+Math.floor(i/2)*1.2,1,.8,.9,material('crate','#8a7551')));
  tree(-20,-12,.95);tree(19,12,1);pine(-19,3,.8);tank(-4,0,-Math.PI/2);truck(12,0,-Math.PI/2,true);
  for(let i=0;i<4;i++)soldier(-9+i*.85,2.8,i);lamp(0,3);lamp(16,3);
}
function makeTown() {
  house(-12,-8,6,6,5,0,false);house(-4.5,-9,5,6,5.6,0,false,true);house(10,-8,6.2,5.4,4.8,0,state.style==='wasteland');
  house(-12,7,5.5,5.3,4,Math.PI);house(-4.7,8,5,6,4.7,Math.PI,false,true);house(11,8,6,5.5,4.6,0,true);
  wall(-10,-3.8,6,0,true);wall(-13,11,7);wall(9,-4.6,6);
  for(const x of [-16,-1,7,16]){lamp(x,3);tree(x,12,.7,x+16);}
  for(let i=0;i<3;i++)detail(box(world,-14+i*.55,.43,3.9,.46,.7,.46,material('barrier','#aba18b')));
  tank(-3,0,-Math.PI/2);truck(13,0,-Math.PI/2,true);truck(4,11,Math.PI);
  for(let i=0;i<5;i++)soldier(-10+i*.8,2.6,i);
}
function buildWorld(resetCamera=false) {
  clearWorld();const p=presets[state.style];rng=seeded(4207);textureMap=new Map();world=new THREE.Group();scene.add(world);brokenWall=null;debrisGroup=null;
  scene.background=new THREE.Color(p.background);scene.fog=new THREE.FogExp2(p.background,p.fog);
  renderer.toneMappingExposure=p.exposure;sun.color.set(p.light);sun.position.set(...p.sun);sun.intensity=2.7*state.light;
  hemi.color.set(p.light);hemi.groundColor.set(p.shadow);hemi.intensity=1.65;fill.color.set(p.shadow);fill.intensity=.8;
  box(world,0,-.65,0,44,1.35,36,material('base',state.style==='miniature'?'#847456':'#554b38'));
  const ground=new THREE.PlaneGeometry(44,36,96,80);ground.rotateX(-Math.PI/2);const pos=ground.getAttribute('position');
  for(let i=0;i<pos.count;i++)pos.setY(i,height(pos.getX(i),pos.getZ(i)));ground.computeVertexNormals();geometryCache.set('ground',ground);
  const top=new THREE.Mesh(ground,material('ground','#ffffff',{map:textureOnce('ground',p.ground)}));top.receiveShadow=true;world.add(top);
  road();if(state.scene==='town')road(false,4);
  if(state.scene==='village')makeVillage();else if(state.scene==='industry')makeIndustry();else makeTown();
  scatter();grass();
  const boundary=material('cutlayer',state.style==='miniature'?'#b0a17c':'#77654b');
  for(let i=0;i<4;i++)detail(box(world,0,-.32-i*.14,18.01,44,.023,.025,boundary));
  if(resetCamera)resetView();updateUI();
}
function resetView() {
  controls.target.set(0,1,0);camera.position.set(31,34,36);camera.zoom=1;state.scale=26;$('camera-scale').value=26;updateProjection();controls.update();
}
function updateProjection() {
  const rect=$('viewport').getBoundingClientRect(),aspect=rect.width/Math.max(1,rect.height);
  camera.left=-state.scale*aspect/2;camera.right=state.scale*aspect/2;camera.top=state.scale/2;camera.bottom=-state.scale/2;camera.updateProjectionMatrix();
  $('camera-value').textContent=`${state.scale<=20?'近景':state.scale>=34?'远景':'中景'} · ${state.scale}`;
}
function updateUI() {
  const p=presets[state.style];$('style-name').textContent=p.name;$('style-feeling').textContent=p.feeling;$('style-description').textContent=p.description;$('scene-name').textContent=names[state.scene];
  $('style-palette').replaceChildren(...p.palette.map(c=>{const s=document.createElement('span');s.style.background=c;s.title=c;s.setAttribute('aria-label',c);return s;}));
  document.querySelectorAll('button[data-scene]').forEach(b=>{const on=b.dataset.scene===state.scene;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
  document.querySelectorAll('button[data-style]').forEach(b=>{const on=b.dataset.style===state.style;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
  $('detail-value').textContent=['轮廓','标准','细节'][state.detail];$('light-value').textContent=state.light.toFixed(1)+'×';
  $('motion-toggle').textContent=state.motion?'暂停动态':'播放动态';$('motion-toggle').setAttribute('aria-pressed',String(state.motion));
  $('scene-status').textContent=`${names[state.scene]} / ${p.name} · ${state.motion?'动态观察中':'动态已暂停'}`;
  document.documentElement.dataset.style=state.style;
}
function smokeTexture() {
  const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d');const grad=ctx.createRadialGradient(32,32,0,32,32,32);grad.addColorStop(0,'rgba(255,255,255,.9)');grad.addColorStop(.38,'rgba(255,255,255,.6)');grad.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=grad;ctx.fillRect(0,0,64,64);return new THREE.CanvasTexture(c);
}
function triggerEvent() {
  if(event)return;
  const p=presets[state.style],texture=smokeTexture(),group=new THREE.Group();world.add(group);
  const target=new THREE.Vector3(-10,1.05,state.scene==='industry'?-4.5:state.scene==='town'?-3.8:-3);
  const start=new THREE.Vector3(-3,1.4,0);
  const projectile=new THREE.Mesh(new THREE.SphereGeometry(.12,8,6),new THREE.MeshBasicMaterial({color:'#ffe5a3'}));group.add(projectile);
  const flash=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),new THREE.MeshBasicMaterial({color:'#ffe3a2',transparent:true,opacity:0}));flash.position.copy(target);group.add(flash);
  const smoke=[];
  for(let i=0;i<36;i++){const m=new THREE.SpriteMaterial({map:texture,color:i%3===0?'#b7a17c':'#847d6d',transparent:true,opacity:0,depthWrite:false});const s=new THREE.Sprite(m);s.position.copy(target);group.add(s);smoke.push({object:s,dx:(rng()-.5)*4,dz:(rng()-.5)*3,up:.6+rng()*2,size:.8+rng()*1.1});}
  const fragments=[];
  for(let i=0;i<28;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(.12+rng()*.24,.1+rng()*.18,.12+rng()*.24),new THREE.MeshStandardMaterial({color:p.wall,roughness:1}));group.add(m);fragments.push({object:m,v:new THREE.Vector3((rng()-.5)*4,2+rng()*3,(rng()-.5)*4)});}
  event={age:0,target,start,group,projectile,flash,smoke,fragments,texture,hit:false};$('event-trigger').disabled=true;$('scene-status').textContent='观察一次冲击：飞行、闪光、扬尘与残骸。';
}
function disposeEvent() {
  if(!event)return;
  event.group.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});event.texture.dispose();event.group.removeFromParent();event=null;$('event-trigger').disabled=false;
}
function updateEvent(dt) {
  if(!event)return;event.age+=dt;const e=event,t=e.age;
  e.projectile.position.lerpVectors(e.start,e.target,Math.min(1,t/.6));e.projectile.visible=t<.6;
  if(t<.6)return;const a=t-.6;
  if(!e.hit){e.hit=true;if(brokenWall)brokenWall.visible=false;if(!debrisGroup){debrisGroup=new THREE.Group();world.add(debrisGroup);for(let i=0;i<30;i++)box(debrisGroup,e.target.x+(rng()-.5)*4,.15+rng()*.2,e.target.z+(rng()-.5)*1.5,.15+rng()*.35,.15+rng()*.28,.18+rng()*.35,material('rubble','#9c917c'),rng()*6);} }
  e.flash.scale.setScalar(.6+a*5);e.flash.material.opacity=Math.max(0,.8-a*3);
  for(const s of e.smoke){s.object.position.set(e.target.x+s.dx*Math.min(a,2)*.5,e.target.y+s.up*a,e.target.z+s.dz*Math.min(a,2)*.5);s.object.scale.setScalar(s.size*(.4+a*.9));s.object.material.opacity=Math.max(0,Math.min(.45,a*2)*(1-a/5));}
  for(const f of e.fragments){f.object.visible=a<2;f.object.position.set(e.target.x+f.v.x*a,Math.max(.16,e.target.y+f.v.y*a-4.9*a*a),e.target.z+f.v.z*a);f.object.rotation.set(a*2,a*3,a);}
  if(a>5){disposeEvent();$('scene-status').textContent='低墙留下残骸。切换场景或风格可恢复完整样板。';}
}
function frame(now) {
  requestAnimationFrame(frame);const dt=Math.min(.05,(now-last)/1000);last=now;if(!visible)return;
  if(state.motion){time+=dt;
    for(const a of animations){
      if(a.type==='truck'){const x=((time*.7+a.phase+20)%40+40)%40-20;a.object.position.x=x;a.object.position.z=roadZ(x);a.object.position.y=height(x,roadZ(x))+.1;a.object.rotation.y=-Math.PI/2-Math.atan(Math.cos(x*.12)*.156)*(state.scene==='village'?1:0);}
      else if(a.type==='turret')a.object.rotation.y=Math.sin(time*.23+a.phase)*.16;
      else if(a.type==='soldier'){a.object.position.x=a.baseX+Math.sin(time*.2+a.phase*.2)*1.05;a.object.position.z=a.baseZ+Math.cos(time*.2+a.phase*.2)*.3;a.object.rotation.y=Math.cos(time*.2+a.phase*.2)>0?Math.PI/2:-Math.PI/2;a.left.rotation.x=Math.sin(time*3+a.phase)*.3;a.right.rotation.x=-a.left.rotation.x;}
    }
  }
  updateEvent(reduced?dt*3:dt);controls.update();renderer.render(scene,camera);
}
function bind() {
  document.querySelectorAll('button[data-scene]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.scene===state.scene)return;state.scene=b.dataset.scene;buildWorld(true);}));
  document.querySelectorAll('button[data-style]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.style===state.style)return;state.style=b.dataset.style;buildWorld();}));
  $('camera-scale').addEventListener('input',e=>{state.scale=Number(e.target.value);camera.zoom=1;updateProjection();});
  $('detail-level').addEventListener('input',e=>{state.detail=Number(e.target.value);buildWorld();});
  $('light-strength').addEventListener('input',e=>{state.light=Number(e.target.value);sun.intensity=2.7*state.light;$('light-value').textContent=state.light.toFixed(1)+'×';});
  $('motion-toggle').addEventListener('click',()=>{state.motion=!state.motion;updateUI();});
  $('event-trigger').addEventListener('click',triggerEvent);$('reset-view').addEventListener('click',()=>{resetView();$('scene-status').textContent='已恢复中景镜头。';});
  $('snapshot').addEventListener('click',()=>{
    renderer.render(scene,camera);
    const png=renderer.domElement.toDataURL('image/png');
    $('snapshot-image').src=png;
    $('snapshot-download').href=png;
    $('snapshot-download').download=`scene-atlas-${state.scene}-${state.style}.png`;
    $('snapshot-dialog').showModal();
    $('scene-status').textContent='画面已生成，可预览并下载 PNG。';
  });
  $('snapshot-close').addEventListener('click',()=>$('snapshot-dialog').close());
  $('scene-canvas').addEventListener('keydown',e=>{
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-'].includes(e.key)){e.preventDefault();
      if(e.key==='+'||e.key==='-'){camera.zoom=THREE.MathUtils.clamp(camera.zoom*(e.key==='+'?1.1:.9),.65,2);camera.updateProjectionMatrix();}
      else{const o=camera.position.clone().sub(controls.target);if(e.key==='ArrowLeft'||e.key==='ArrowRight')o.applyAxisAngle(new THREE.Vector3(0,1,0),e.key==='ArrowLeft'?.08:-.08);else{o.y=THREE.MathUtils.clamp(o.y+(e.key==='ArrowUp'?2:-2),12,65);}camera.position.copy(controls.target).add(o);controls.update();}
    }
  });
  document.addEventListener('visibilitychange',()=>{visible=!document.hidden;last=performance.now();});
}
try {
  renderer=new THREE.WebGLRenderer({canvas:$('scene-canvas'),antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-24,24,14,-14,.1,180);camera.position.set(31,34,36);
  sun=new THREE.DirectionalLight('#fff0d4',2.7);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-31;sun.shadow.camera.right=31;sun.shadow.camera.top=31;sun.shadow.camera.bottom=-31;sun.shadow.camera.near=.1;sun.shadow.camera.far=100;sun.shadow.normalBias=.04;sun.shadow.bias=-.0001;scene.add(sun);scene.add(sun.target);
  hemi=new THREE.HemisphereLight('#fff0d4','#60757a',1.65);scene.add(hemi);fill=new THREE.DirectionalLight('#92aebe',.8);fill.position.set(-15,10,-15);scene.add(fill);
  controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1,0);controls.enableDamping=true;controls.dampingFactor=.08;controls.minPolarAngle=Math.PI*.13;controls.maxPolarAngle=Math.PI*.44;controls.minZoom=.65;controls.maxZoom=2;controls.enablePan=true;
  const resize=()=>{const r=$('viewport').getBoundingClientRect();if(r.width<1||r.height<1)return;renderer.setSize(r.width,r.height,false);updateProjection();};
  new ResizeObserver(resize).observe($('viewport'));resize();buildWorld(true);bind();$('scene-loading').hidden=true;requestAnimationFrame(frame);
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();$('scene-error').hidden=false;$('scene-error').textContent='三维绘图连接暂时中断，请刷新页面恢复；下方概念图与研究内容仍可阅读。';});
} catch(error) {
  console.error('Scene atlas could not start:',error);$('scene-loading').hidden=true;$('scene-error').hidden=false;$('scene-error').textContent='当前环境无法打开三维演示。下方仍可查看概念图、风格规则和研究总结。';
}
