import { buildCharacter } from './character-builder.js';

// The V2 environment is retained; V3 adds shared articulated characters.
// no Defilade assets, downloaded models, or external texture files are used.
export function buildScene(THREE, { style = 'natural', phase = 'refined', characterQuality = 'refined', characterPose = 'walk' } = {}) {
  const palettes = {
    natural: { ground: '#798264', road: '#ac9270', stone: '#b9b09a', plaster: '#c9c0a9', roof: '#a6573c', wood: '#6c533c', leaf: '#627a48', grass: '#6b7947', vehicle: '#667667', metal: '#494c45', glass: '#687d7c', flower: '#d9cc8c' },
    miniature: { ground: '#9da772', road: '#d5b891', stone: '#d9c9ab', plaster: '#e9dbc0', roof: '#c77749', wood: '#986a43', leaf: '#86a45d', grass: '#8b9e52', vehicle: '#759a92', metal: '#666459', glass: '#92b5b8', flower: '#f2d585' },
    wasteland: { ground: '#8b826f', road: '#aa9680', stone: '#b0a794', plaster: '#bcb3a0', roof: '#80604d', wood: '#6a5847', leaf: '#80765b', grass: '#9a8b68', vehicle: '#737b70', metal: '#55534b', glass: '#667b85', flower: '#bd9c6d' },
  };
  const p = palettes[style] || palettes.natural;
  const refined = phase === 'refined';
  const barren = style === 'wasteland';
  const group = new THREE.Group();
  group.name = `v2-${phase}-${style}`;
  const geometries = new Set(), materials = new Set(), textures = new Set(), cache = new Map();
  const animated = [], leafUniforms = [], people = [];
  let peopleTime = 0;
  let seed = 294731, motionTime = 0, disposed = false;
  const rand = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
  const range = (a, b) => a + rand() * (b - a);
  const tint = (color, amount = 1) => new THREE.Color(color).multiplyScalar(amount);
  const stats = { label: refined ? '细化乡村中景' : '同坐标体块样板', houses: 1, roofTiles: 0, masonryBlocks: 0, trees: 0, leafCards: 0, grassClumps: 0, groundStones: 0, vehicles: 1, characters: 2 };
  function geo(key, factory) { if (!cache.has(key)) { const g = factory(); geometries.add(g); cache.set(key, g); } return cache.get(key); }
  function material(color, options = {}) { const m = new THREE.MeshStandardMaterial({ color, roughness: .88, ...options }); materials.add(m); return m; }
  function texture(kind, size = 256, color = '#ffffff') {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
    const c = canvas.getContext('2d'); c.fillStyle = color; c.fillRect(0, 0, size, size);
    let s = 77451;
    const noise = () => { s = (1103515245 * s + 12345) >>> 0; return s / 4294967296; };
    if (kind === 'meadow') {
      // Low-frequency color patches survive a medium view. UVs cover the whole
      // terrain once; these are earth/vegetation transitions rather than noise.
      for (let i = 0; i < 28; i++) {
        const x=noise()*size,y=noise()*size,r=size*(.10+noise()*.19);
        const gradient=c.createRadialGradient(x,y,0,x,y,r);
        const light=i%3===0;
        gradient.addColorStop(0,light?'rgba(243,208,153,.25)':'rgba(37,59,28,.17)');
        gradient.addColorStop(.55,light?'rgba(243,208,153,.11)':'rgba(37,59,28,.065)');
        gradient.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=gradient;c.fillRect(x-r,y-r,r*2,r*2);
      }
    }
    const amount = style === 'miniature' ? .055 : .09;
    for (let i = 0; i < size * size / 3; i++) {
      c.fillStyle = noise() > .5 ? `rgba(255,244,214,${noise() * amount})` : `rgba(31,24,17,${noise() * amount})`;
      c.fillRect(noise() * size, noise() * size, 1 + noise() * 3, 1 + noise() * 3);
    }
    if (kind === 'stone') {
      for (let i = 0; i < 95; i++) { c.strokeStyle = `rgba(49,40,31,${.02 + noise() * .065})`; c.lineWidth = .5 + noise(); c.beginPath(); let x = noise() * size, y = noise() * size; c.moveTo(x, y); for (let j = 0; j < 4; j++) { x += noise() * 19 - 6; y += noise() * 8 - 4; c.lineTo(x, y); } c.stroke(); }
    } else if (kind === 'wood') {
      for (let x = 0; x < size; x += 4) { c.strokeStyle = `rgba(35,22,12,${.04 + noise() * .16})`; c.lineWidth = .5 + noise(); c.beginPath(); c.moveTo(x, 0); c.bezierCurveTo(x + 4, size / 3, x - 3, size * .7, x, size); c.stroke(); }
      c.strokeStyle = 'rgba(37,23,13,.19)'; for (let x = 0; x < size; x += 64) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, size); c.stroke(); }
    } else if (kind === 'roof') {
      for (let i = 0; i < 80; i++) { c.strokeStyle = `rgba(54,23,12,${noise() * .055})`; c.beginPath(); const x = noise() * size; c.moveTo(x, 0); c.lineTo(x + noise() * 7, size); c.stroke(); }
    } else if (kind === 'soil') {
      for (let i = 0; i < 370; i++) { c.fillStyle = `rgba(38,31,23,${noise() * .1})`; c.beginPath(); c.ellipse(noise() * size, noise() * size, noise() * 2.6 + .3, noise() * 1.5 + .2, noise() * Math.PI, 0, Math.PI * 2); c.fill(); }
    }
    const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; textures.add(t); return t;
  }
  function noiseBump(size = 128) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
    const c = canvas.getContext('2d'); c.fillStyle = '#999'; c.fillRect(0, 0, size, size);
    for (let i = 0; i < 9000; i++) { const v = Math.floor(range(105, 185)); c.fillStyle = `rgb(${v},${v},${v})`; c.fillRect(range(0, size), range(0, size), range(1, 3), range(1, 3)); }
    const t = new THREE.CanvasTexture(canvas); t.wrapS = t.wrapT = THREE.RepeatWrapping; textures.add(t); return t;
  }
  const bump = refined ? noiseBump() : null;
  const stone = material(p.stone, refined ? { map: texture('stone'), bumpMap: bump, bumpScale: .036, roughness: .97 } : {});
  const plaster = material(p.plaster, refined ? { map: texture('stone'), bumpMap: bump, bumpScale: .018 } : {});
  const wood = material(p.wood, refined ? { map: texture('wood'), bumpMap: bump, bumpScale: .013 } : {});
  const roof = material(p.roof, refined ? { map: texture('roof'), bumpMap: bump, bumpScale: .009, roughness: .86 } : {});
  const soil = material(p.ground, refined ? { map: texture('meadow',512), bumpMap: bump, bumpScale: .038 } : {});
  const roadMat = material(p.road, refined ? { map: texture('soil'), bumpMap: bump, bumpScale: .016 } : {});
  roadMat.map?.repeat.set(3, 13);
  const darkWood = material(tint(p.wood, .65));
  const metal = material(p.metal, { metalness: .22, roughness: .76 });
  const carMat = material(p.vehicle, { metalness: .12, roughness: .68 });
  const glass = material(p.glass, { metalness: .28, roughness: .27 });
  const tire = material('#292a25', { roughness: 1 });
  const grassMat = material('#ffffff', { side: THREE.DoubleSide, roughness: .97 });
  const flowerMat = material(p.flower);
  const boxGeo = geo('box', () => new THREE.BoxGeometry(1, 1, 1));
  const cylinderGeo = geo('cylinder', () => new THREE.CylinderGeometry(1, 1, 1, 12));
  const branchGeo = geo('branch', () => new THREE.CylinderGeometry(.65, 1, 1, 9));
  const sphereGeo = geo('sphere', () => new THREE.SphereGeometry(1, 9, 6));
  function add(geometry, mat, parent, pos, scale = [1, 1, 1], rot = [0, 0, 0], color) {
    const m = new THREE.Mesh(geometry, mat); m.position.set(...pos); m.scale.set(...scale); m.rotation.set(...rot); m.castShadow = true; m.receiveShadow = true; if (color) m.userData.tint = color; parent.add(m); return m;
  }
  const box = (parent, x, y, z, w, h, d, mat, rot = [0, 0, 0], color) => add(boxGeo, mat, parent, [x, y, z], [w, h, d], rot, color);
  const cyl = (parent, x, y, z, r, h, mat, rot = [0, 0, 0]) => add(cylinderGeo, mat, parent, [x, y, z], [r, h, r], rot);
  function branch(parent, a, b, radius, mat = wood) { const av = new THREE.Vector3(...a), bv = new THREE.Vector3(...b), direction = bv.clone().sub(av); const m = add(branchGeo, mat, parent, av.clone().add(bv).multiplyScalar(.5).toArray(), [radius, direction.length(), radius]); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()); return m; }
  function bevelUnit() {
    return geo('bevel-stone', () => {
      const s = new THREE.Shape(); s.moveTo(-.43, -.43); s.lineTo(.43, -.43); s.lineTo(.43, .43); s.lineTo(-.43, .43); s.closePath();
      const g = new THREE.ExtrudeGeometry(s, { depth: .86, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: .07, bevelThickness: .07 }); g.center(); g.computeBoundingBox(); const size = g.boundingBox.getSize(new THREE.Vector3()); g.scale(1 / size.x, 1 / size.y, 1 / size.z); return g;
    });
  }
  function instanced(geometry, mat, records, name) {
    const mesh = new THREE.InstancedMesh(geometry, mat, records.length); mesh.name = name;
    const o = new THREE.Object3D();
    records.forEach((r, i) => { o.position.set(...r.pos); o.rotation.set(...(r.rot || [0, 0, 0])); o.scale.set(...(r.scale || [1, 1, 1])); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix); if (r.color) mesh.setColorAt(i, r.color); });
    mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; mesh.castShadow = true; mesh.receiveShadow = true; mesh.computeBoundingSphere(); group.add(mesh); return mesh;
  }
  // A small terrain slice has an irregular footprint and a layered earth edge.
  const terrainShape = new THREE.Shape();
  const outline = [[-11.8,-8.9],[-9.4,-9.7],[-5.8,-9.8],[.2,-9.4],[5.6,-9.8],[10.8,-9.1],[12,-7.1],[11.8,-3.6],[12.1,2.7],[11.2,8.4],[8.4,9.6],[3.1,9.7],[-2.8,9.4],[-8.8,9.5],[-11.6,7.7],[-12,3.1],[-11.7,-2.1]];
  outline.forEach(([x,z], i) => i ? terrainShape.lineTo(x,z) : terrainShape.moveTo(x,z)); terrainShape.closePath();
  const baseGeo = geo('terrain-base', () => new THREE.ExtrudeGeometry(terrainShape, { depth: .48, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: .1, bevelThickness: .1 }));
  add(baseGeo, material('#675645'), group, [0, -.52, 0], [1,1,1], [-Math.PI/2,0,0]);
  const topGeo = geo('terrain-top', () => {
    const g=new THREE.ShapeGeometry(terrainShape,1),positions=g.attributes.position,uv=g.attributes.uv;
    for(let i=0;i<positions.count;i++)uv.setXY(i,(positions.getX(i)+12)/24,(positions.getY(i)+10)/20);
    uv.needsUpdate=true;return g;
  });
  add(topGeo, soil, group, [0,.075,0], [1,1,1], [-Math.PI/2,0,0]);
  const path = new THREE.CatmullRomCurve3([[-11.3,0,6.7],[-8,0,6.2],[-2,0,4.6],[3.4,0,1.5],[7.6,0,-3.5],[11.3,0,-5.7]].map(v => new THREE.Vector3(...v)));
  function ribbon(offset, width, y, mat, irregular = false) {
    const positions = [], uv = [], indices = [], segments = 90;
    for (let i=0;i<=segments;i++) { const t=i/segments, point=path.getPoint(t), tangent=path.getTangent(t), n=new THREE.Vector3(-tangent.z,0,tangent.x).normalize(); const w=width*(irregular ? 1 + Math.sin(i*1.8)*.065 + Math.sin(i*.39)*.07 : 1); for (const side of [-1,1]) { const a=point.clone().addScaledVector(n,offset+side*w*.5); positions.push(a.x,y,a.z); uv.push(side===-1?0:1,t*12); } if (i<segments) {const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);} }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();geometries.add(g);const m=add(g,mat,group,[0,0,0]);m.castShadow=false;return m;
  }
  ribbon(0,2.9,.085,roadMat,true);
  if(refined) {
    const rutMat=material(tint(p.road,.86),{roughness:1});ribbon(-.68,.095,.09,rutMat,true);ribbon(.68,.095,.091,rutMat,true);
    ribbon(0,.18,.094,material(tint(p.road,1.035)),true);
  }
  // The house footprint, camera axis, road, and vehicle position stay fixed in both phases.
  const house = new THREE.Group(); house.position.set(-3.5,0,-1); group.add(house);
  box(house,0,1.45,0,6.2,2.75,4.6,refined ? plaster : stone);
  box(house,0,.17,0,6.5,.24,4.9,darkWood);
  const gableGeo=geo('gable',()=> {const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([-3.11,2.825,-2.3,-3.11,2.825,2.3,-3.11,4.24,0,3.11,2.825,2.3,3.11,2.825,-2.3,3.11,4.24,0],3));g.computeVertexNormals();return g;});
  add(gableGeo,plaster,house,[0,0,0]);
  const roofAngle=Math.atan2(1.48,2.8), roofLength=Math.hypot(1.48,2.8);
  for(const side of [-1,1]) box(house,0,3.53,side*1.4,7.05,.15,roofLength,refined ? darkWood : roof,[roofAngle*side,0,0]);
  if(refined) {
    const stones=[];
    for(const side of [-1,1]) for(let row=0;row<7;row++) for(let col=0;col<15;col++) {
      const x=-3.04+col*.428+(row%2?-.2:0);if(x< -3.04||x>3.04)continue;const y=.37+row*.352;
      if(side===1&&((Math.abs(x+.75)<.57&&y<2.22)||(Math.abs(x-1.75)<.61&&y>1.12&&y<2.33)||(Math.abs(x+2.16)<.56&&y>1.12&&y<2.33)))continue;
      stones.push({pos:[x, y + range(-.021,.021), side*2.326],scale:[range(.355,.404),range(.28,.326),range(.14,.2)],rot:[range(-.012,.012),range(-.014,.014),range(-.035,.035)],color:tint(p.stone,range(.9,1.09))});
    }
    for(const side of [-1,1]) for(let row=0;row<7;row++) for(let col=0;col<11;col++) { const z=-2.19+col*.437+(row%2?-.19:0);if(z< -2.22||z>2.22)continue;const y=.37+row*.352;if(side===1&&Math.abs(z+.55)<.58&&y>1.12&&y<2.33)continue;stones.push({pos:[side*3.126,y+range(-.019,.019),z],scale:[range(.14,.19),range(.28,.325),range(.355,.413)],rot:[range(-.02,.02),range(-.025,.025),range(-.02,.02)],color:tint(p.stone,range(.89,1.09))}); }
    const stoneMesh=instanced(bevelUnit(),stone,stones,'individual-house-stones'); stoneMesh.position.copy(house.position);stats.masonryBlocks+=stones.length;
    const tileGeo=geo('curved-roof-tile',()=> {
      const pos=[],uv=[],ix=[],cols=8;
      for(let skin=0;skin<2;skin++)for(let row=0;row<2;row++)for(let j=0;j<=cols;j++){const a=j/cols*Math.PI;pos.push(Math.cos(a)*.16,(Math.sin(a)*.095 + (skin===0?.045:.008)),row? .34:-.34);uv.push(j/cols,row);}
      const stride=cols+1,face=stride*2;
      for(let skin=0;skin<2;skin++)for(let j=0;j<cols;j++){const a=skin*face+j,b=a+stride;skin===0?ix.push(a,a+1,b,a+1,b+1,b):ix.push(a,b,a+1,a+1,b,b+1);}
      for(let j=0;j<cols;j++){ix.push(j,j+1,face+j,j+1,face+j+1,face+j);const a=stride+j;ix.push(a,face+a,a+1,a+1,face+a,face+a+1);}
      ix.push(0,face, stride, stride, face, face+stride,cols,cols+stride,face+cols,cols+stride,face+cols+stride,face+cols);
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return g;
    });
    const tiles=[];
    for(const side of [-1,1])for(let row=0;row<6;row++)for(let col=0;col<22;col++) {if(barren && ((col===20&&row>3)||(col===3&&row===4)||(col===2&&row===5)))continue;const distance=.27+row*.535;const z=side*distance*Math.cos(roofAngle);tiles.push({pos:[house.position.x-3.4+col*.325+range(-.018,.018),4.3-distance*Math.sin(roofAngle)+range(-.015,.015),house.position.z+z],rot:[side*roofAngle,0,range(-.008,.008)],scale:[range(.97,1.03),1,1],color:tint(p.roof,range(.88,1.12))});}
    instanced(tileGeo,roof,tiles,'individual-curved-clay-tiles');stats.roofTiles=tiles.length;
    for(let i=0;i<23;i++) cyl(house,-3.42+i*.303,4.345,0,.12,.32,roof,[0,0,Math.PI/2]);
    for(const side of [-1,1]) {
      box(house,0,2.98,side*2.83,7.13,.16,.18,darkWood);
      for(const end of [-1,1])branch(house,[end*3.5,4.26,0],[end*3.5,2.94,side*2.84],.07,darkWood);
      cyl(house,0,2.925,side*2.91,.055,7.1,metal,[0,0,Math.PI/2]);
    }
    // Roof, chimney, and windows carry thickness rather than painted outlines.
    box(house,-1.85,4.08,-.55,.57,1.17,.61,stone);
    box(house,-1.85,4.71,-.55,.72,.13,.76,darkWood);
    box(house,-1.85,4.8,-.55,.39,.07,.39,metal);
    const chimneyLines=material(tint(p.stone,.67));for(let i=0;i<5;i++)box(house,-1.85,3.58+i*.21,-.863,.59,.028,.014,chimneyLines);
    box(house,-.75,1.14,2.46,1.04,2.12,.12,darkWood);
    for(let i=0;i<7;i++)box(house,-1.19+i*.143,1.14,2.54,.129,1.98,.065,wood,[0,0,0],tint(p.wood,range(.92,1.08)));
    box(house,-.75,2.24,2.57,1.3,.16,.19,stone);
    box(house,-.75,.2,2.77,1.46,.22,.73,stone);
    cyl(house,-.42,1.13,2.601,.043,.06,metal,[Math.PI/2,0,0]);
    const windowAt=(x,y,z,side=false)=> {
      const window=new THREE.Group();window.position.set(x,y,z);if(side)window.rotation.y=Math.PI/2;house.add(window);
      box(window,0,0,0,1.08,1.02,.12,darkWood);
      box(window,0,0,.069,.88,.84,.035,glass);
      for(const a of [-1,1]){box(window,a*.49,0,.1,.08,1.15,.16,wood);box(window,0,a*.51,.1,1.1,.085,.15,wood);box(window,a*.715,0,.04,.33,1.12,.09,wood,[0,a*-.16,0]);for(let j=0;j<7;j++)box(window,a*.715,-.43+j*.14,.11,.33,.045,.085,darkWood,[.23,0,0]);}
      box(window,0,0,.105,.058,.94,.05,wood);box(window,0,.03,.105,.98,.05,.05,wood);box(window,0,-.59,.1,1.4,.11,.4,stone);
      box(window,-.13,.2,.111,.21,.39,.007,material(tint(p.glass,1.22),{roughness:.25,metalness:.15}));
    };
    windowAt(1.75,1.72,2.39);windowAt(-2.16,1.72,2.39);windowAt(3.17,1.72,-.55,true);
    cyl(house,3.155,3.3,0,.3,.05,darkWood,[0,0,Math.PI/2]);cyl(house,3.195,3.3,0,.235,.055,glass,[0,0,Math.PI/2]);box(house,3.23,3.3,0,.035,.47,.05,wood);box(house,3.23,3.3,0,.035,.05,.47,wood);
  } else { box(house,-.75,1.1,2.32,1,2,.04,darkWood);for(const x of [-2.16,1.75])box(house,x,1.7,2.33,1,1,.05,glass); }
  function shadow(x,z,sx,sz,opacity=.16) {
    const mat=new THREE.MeshBasicMaterial({color:'#2b281d',transparent:true,opacity,depthWrite:false});materials.add(mat);
    const m=add(geo('shadow-circle',()=>new THREE.CircleGeometry(1,30)),mat,group,[x,.078,z],[sx,sz,1],[-Math.PI/2,0,0]);m.castShadow=false;m.receiveShadow=false;
  }
  shadow(-3.5,-1,4,3.2,.12);
  // A dry-stone wall ends in separate pillars, leaving a believable opening.
  const walls=[];
  const wallSections=[[-7.5,3.42,5.1],[1.35,-4.9,4.3]];
  for(const [x,z,length]of wallSections){
    if(!refined){box(group,x,.58,z,length,1.04,.5,stone);continue;}
    box(group,x,.28,z,length,.36,.43,material(tint(p.stone,.68)));
    const n=Math.ceil(length/.43);for(let row=0;row<3;row++)for(let i=0;i<n;i++){const px=x-length/2+.22+i*.43+(row%2?.11:0);if(px>x+length/2-.1)continue;walls.push({pos:[px,.34+row*.265+range(-.022,.022),z+range(-.018,.018)],scale:[range(.35,.44),range(.2,.27),range(.4,.49)],rot:[range(-.03,.03),range(-.05,.05),range(-.05,.05)],color:tint(p.stone,range(.83,1.08))});}
    for(let i=0;i<n;i++){const px=x-length/2+.21+i*.43;if(px>x+length/2-.1)continue;walls.push({pos:[px,1.09+range(-.015,.015),z],scale:[.42,.16,.58],rot:[0,range(-.04,.04),range(-.028,.028)],color:tint(p.stone,range(.82,1.02))});}
    for(const end of [-1,1])box(group,x+length/2*end, .64,z,.57,1.17,.63,stone);shadow(x,z,length*.55,.47,.075);
  }
  if(walls.length){instanced(bevelUnit(),stone,walls,'dry-stone-wall-blocks');stats.masonryBlocks+=walls.length;}
  // The utility vehicle has wheel wells, an open rear bed, and a readable cabin.
  const vehicle=new THREE.Group();vehicle.position.set(4.6,.11,3.15);vehicle.rotation.y=-2.45;group.add(vehicle);
  box(vehicle,0,.62,0,1.6,.48,3.13,carMat);
  if(refined) {
    box(vehicle,0,.86,-.93,1.48,.25,1.05,carMat);box(vehicle,0,.45,0,1.41,.14,3.36,metal);
    box(vehicle,0,1.45,-.12,1.48,1.03,1.36,darkWood);
    box(vehicle,0,1.55,-.828,1.29,.64,.035,glass,[.17,0,0]);box(vehicle,0,1.1,-.793,1.44,.14,.12,carMat);
    for(const side of [-1,1]){box(vehicle,side*.751,1.59,-.12,.026,.58,1.1,glass);box(vehicle,side*.79,1.07,-.12,.09,.35,1.2,carMat);box(vehicle,side*.8,1.71,-.17,.09,.09,1.36,carMat);box(vehicle,side*.8,1.58,-.65,.09,.7,.08,carMat);box(vehicle,side*.8,1.6,.44,.09,.68,.09,carMat);box(vehicle,side*.8,1.56,-.12,.07,.63,.065,carMat);box(vehicle,side*.84,1.25,.12,.035,.035,.2,metal);box(vehicle,side*1,1.39,-.54,.09,.24,.2,metal);branch(vehicle,[side*.77,1.26,-.53],[side*.99,1.34,-.54],.018,metal);}
    box(vehicle,0,1.97,-.12,1.68,.11,1.51,carMat);box(vehicle,0,1.55,.59,1.25,.56,.025,glass);
    box(vehicle,0,.77,1.03,1.47,.12,1.11,wood);
    for(const side of [-1,1])box(vehicle,side*.73,1.02,1.13,.12,.51,1.1,carMat);box(vehicle,0,1.02,1.69,1.55,.51,.11,carMat);
    box(vehicle,0,.67,-1.61,1.56,.39,.09,metal);for(let i=0;i<9;i++)box(vehicle,-.51+i*.127,.7,-1.666,.055,.3,.033,carMat);
    const lightMat=material('#ded7aa',{emissive:'#665b34',emissiveIntensity:.12,roughness:.3});
    for(const side of [-1,1]){cyl(vehicle,side*.65,.83,-1.677,.12,.07,lightMat,[Math.PI/2,0,0]);box(vehicle,side*.59,.78,1.76,.18,.12,.06,material('#9b4b34'));}
    box(vehicle,0,.45,-1.78,1.8,.13,.13,metal);box(vehicle,0,.45,1.83,1.76,.13,.13,metal);
    box(vehicle,-.31,1.28,1.21,.62,.57,.61,wood);box(vehicle,-.31,1.28,1.21,.65,.08,.66,darkWood,[0,0,.7]);
  } else box(vehicle,0,1.4,-.18,1.45,.95,1.42,carMat);
  for(const side of [-1,1])for(const z of [-1.01,1.04]) {
    cyl(vehicle,side*.88,.46,z,.42,.31,tire,[0,0,Math.PI/2]);
    if(refined){cyl(vehicle,side*1.045,.46,z,.24,.018,metal,[0,0,Math.PI/2]);cyl(vehicle,side*1.06,.46,z,.105,.025,carMat,[0,0,Math.PI/2]);for(let j=0;j<18;j++){const a=j/18*Math.PI*2;box(vehicle,side*.88,.46+Math.sin(a)*.414,z+Math.cos(a)*.414,.325,.06,.107,tire,[a,0,0]);}box(vehicle,side*.77,.92,z,.26,.07,.93,carMat);}
  }
  if(refined){cyl(vehicle,.49,1.1,1.8,.38,.22,tire,[Math.PI/2,0,0]);cyl(vehicle,.49,1.1,1.92,.21,.021,metal,[Math.PI/2,0,0]);}
  shadow(4.6,3.15,1.2,1.8,.13);
  // Branches and cutout leaf cards avoid the sphere-tree silhouette of V1.
  function leafTexture() {
    const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d');
    for(let i=0;i<62;i++){const x=range(20,236),y=range(18,238),a=range(-Math.PI,Math.PI),r=range(5,13);c.save();c.translate(x,y);c.rotate(a);c.fillStyle=`rgb(${Math.floor(range(172,221))},${Math.floor(range(188,227))},${Math.floor(range(143,193))})`;c.beginPath();c.ellipse(0,0,r*.62,r,0,0,Math.PI*2);c.fill();c.strokeStyle='rgba(72,85,45,.22)';c.lineWidth=1;c.beginPath();c.moveTo(0,-r*.72);c.lineTo(0,r*.72);c.stroke();c.restore();}
    const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;textures.add(t);return t;
  }
  let foliage;
  if(refined){foliage=material('#ffffff',{map:leafTexture(),alphaTest:.46,side:THREE.DoubleSide,roughness:.96});
    foliage.onBeforeCompile=shader=>{shader.uniforms.uStudyWind={value:motionTime};leafUniforms.push(shader.uniforms.uStudyWind);shader.vertexShader='uniform float uStudyWind;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n#ifdef USE_INSTANCING\nfloat studyPhase = instanceMatrix[3].x * 1.7 + instanceMatrix[3].z * 1.1;\ntransformed.x += sin(uStudyWind * 1.15 + studyPhase) * 0.022 * (position.y + 0.5);\ntransformed.z += cos(uStudyWind * 0.9 + studyPhase) * 0.015;\n#endif');};foliage.customProgramCacheKey=()=> 'scene-study-leaf-wind-v2';
  }
  const leafRecords=[];
  const treeLocations=[[-9,-4.7,4.6,1.8],[-8.8,.9,3.9,1.55],[-6.9,-6.5,4.8,1.7],[3.2,-6.7,5.1,1.8],[7.8,-7,4.5,1.9],[9.2,-1.6,4.4,1.7],[10.6,5.5,3.55,1.3]];
  for(const [x,z,h,r]of treeLocations){stats.trees++;shadow(x,z,r*.85,r*.65,.095);
    if(!refined){cyl(group,x,h*.27,z,.19,h*.54,wood);add(sphereGeo,material(p.leaf),group,[x,h*.76,z],[r,h*.35,r]);continue;}
    const tree=new THREE.Group();tree.position.set(x,0,z);group.add(tree);
    const bend=range(-.21,.21);branch(tree,[0,0,0],[bend,h*.41,.06],.22);branch(tree,[bend,h*.41,.06],[bend+.12,h*.72,-.08],.15);
    for(let j=0;j<7;j++){const a=j/7*Math.PI*2+range(-.4,.4),y=h*range(.4,.7),bx=Math.cos(a)*r*.62,bz=Math.sin(a)*r*.62;branch(tree,[bend,y*.86,0],[bx,y+r*.5,bz],range(.042,.085));branch(tree,[bx,y+r*.5,bz],[bx*1.35,y+r*.64,bz*1.35],.027);}
    for(let j=0;j<4;j++){const a=j*Math.PI/2;branch(tree,[Math.cos(a)*.49,.08,Math.sin(a)*.49],[0,.48,0],.08);}
    const count=barren?32:165;
    for(let i=0;i<count;i++) {const a=rand()*Math.PI*2,v=range(-1,1),rad=Math.sqrt(1-v*v),radius=Math.cbrt(rand());leafRecords.push({pos:[x+bend+Math.cos(a)*rad*r*radius,h*.76+v*r*.88*radius,z+Math.sin(a)*rad*r*radius],scale:[range(.75,1.15),range(.75,1.1),1],rot:[range(-Math.PI,Math.PI),range(-Math.PI,Math.PI),range(-Math.PI,Math.PI)],color:tint(p.leaf,range(.86,1.16))});}
  }
  if(leafRecords.length){const leaves=instanced(geo('leaf-card',()=>new THREE.PlaneGeometry(1,1)),foliage,leafRecords,'alpha-cut-leaf-clusters');leaves.frustumCulled=false;stats.leafCards=leafRecords.length;}
  function pathDistance(x,z) {let best=Infinity;for(let i=0;i<=35;i++){const q=path.getPoint(i/35);best=Math.min(best,(q.x-x)**2+(q.z-z)**2);}return Math.sqrt(best);}
  if(refined) {
    const grassGeometry=geo('grass-clump',()=>{const pos=[],ix=[];for(let j=0;j<5;j++){const a=j*Math.PI*.76,ox=Math.cos(a)*.09,oz=Math.sin(a)*.09,dx=Math.cos(a+Math.PI/2)*.035,dz=Math.sin(a+Math.PI/2)*.035,h=.3+j*.04,s=pos.length/3;pos.push(ox-dx,0,oz-dz,ox+dx,0,oz+dz,ox+dx*.5+.045,h*.58,oz+dz*.5,ox-dx*.5+.045,h*.58,oz-dz*.5,ox+.09,h,oz+.02);ix.push(s,s+1,s+2,s,s+2,s+3,s+3,s+2,s+4);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(ix);g.computeVertexNormals();return g;});
    const grass=[],stones=[],flowers=[];
    for(let i=0;i<1300;i++){const x=range(-11,11),z=range(-8.6,8.6);if(Math.abs(x+3.5)<3.55&&Math.abs(z+1)<2.8)continue;if(Math.abs(x-4.6)<1.8&&Math.abs(z-3.15)<1.8)continue;const d=pathDistance(x,z);if(d<1.57)continue;
      const patch=.5+.25*Math.sin(x*.76+.6*Math.cos(z*.64))+.25*Math.sin(z*.83-x*.26);
      if(rand()>(d<2?.72:.18+patch*.76))continue;if(barren&&rand()<.65)continue;
      const size=range(.65,1.25)*(d<2?1.06:.82);grass.push({pos:[x,.08,z],scale:[size,size,size],rot:[0,range(0,Math.PI*2),0],color:tint(p.grass,range(.76,1.18))});if(!barren&&i%9===0)flowers.push({pos:[x,.33*size,z],scale:[.045,.035,.045],color:tint(p.flower,range(.85,1.15))});}
    for(let i=0;i<275;i++){const t=range(.03,.97),q=path.getPoint(t),n=new THREE.Vector3(-path.getTangent(t).z,0,path.getTangent(t).x).normalize(),side=rand()<.5?-1:1;const r=range(.045,.14),distance=range(1.45,1.99)*side;q.addScaledVector(n,distance);stones.push({pos:[q.x,.09,q.z],scale:[r*1.7,r*.65,r*1.25],rot:[0,range(0,Math.PI*2),range(-.1,.1)],color:tint(p.stone,range(.63,.96))});}
    instanced(grassGeometry,grassMat,grass,'individual-grass-clumps');stats.grassClumps=grass.length;
    instanced(bevelUnit(),stone,stones,'roadside-pebbles');stats.groundStones=stones.length;
    if(flowers.length)instanced(sphereGeo,flowerMat,flowers,'tiny-meadow-flowers');
    // Small shrubs use the same leaf-card vocabulary, at a lower scale.
    const shrubLeaves=[];for(const [x,z]of [[-6.55,1.65],[-.65,-3.7],[1.8,-5.1],[-8.3,3.15],[6.4,6.4]])for(let i=0;i<(barren?7:32);i++){const a=range(0,Math.PI*2),r=range(0,.6);shrubLeaves.push({pos:[x+Math.cos(a)*r,.32+range(0,.45),z+Math.sin(a)*r],scale:[.45,.45,1],rot:[range(-2,2),range(-3,3),range(-2,2)],color:tint(p.leaf,range(.81,1.12))});}instanced(geo('leaf-card',()=>new THREE.PlaneGeometry(1,1)),foliage,shrubLeaves,'garden-shrub-leaves');stats.leafCards+=shrubLeaves.length;
    const barrel=(x,z)=>{cyl(group,x,.48,z,.32,.77,wood);for(const y of [.19,.5,.8])cyl(group,x,y,z,.333,.035,metal);cyl(group,x,.87,z,.32,.07,darkWood);box(group,x-.05,.912,z,.38,.024,.06,wood);};
    barrel(-6.95,1.1);barrel(-7.12,.3);
    for(let i=0;i<6;i++){const row=i<4?0:1,x=-5.4+(i%4)*.2;branch(group,[x,.17+row*.16,-3.7],[x,.17+row*.16,-4.5],.075,wood);}
    for(const x of [-5.8,-3.8,-1.8]){box(group,x,.46,-4.3,.13,.81,.13,wood);box(group,x-.06,.86,-4.3,.26,.08,.22,darkWood);}box(group,-3.8,.46,-4.3,4.1,.09,.1,wood);box(group,-3.8,.72,-4.3,4.1,.09,.1,wood);
    const terracotta=material(tint(p.roof,.94));for(const [x,z,r]of [[-3.65,1.97,.21],[-2.63,2.1,.17],[-6.4,1.78,.18]]){cyl(group,x,.22,z,r,.28,terracotta);cyl(group,x,.36,z,r*1.09,.075,terracotta);cyl(group,x,.401,z,r*.83,.02,material('#4f4837'));}
    box(group,-.28,.51,1.08,1.26,.11,.44,wood);for(const x of [-.76,.2])box(group,x,.28,1.08,.09,.47,.34,darkWood);
    const crate=(x,y,z,s)=>{box(group,x,y,z,s,s*.7,s,wood);for(const a of [-1,1]){box(group,x+a*s*.4,y,z+s*.51,s*.08,s*.69,.05,darkWood);box(group,x,y+a*s*.26,z+s*.51,s,.06,.05,darkWood);}box(group,x,y,z+s*.54,s*1.02,.065,.055,darkWood,[0,0,.45]);};crate(-.8,.38,-2.88,.65);crate(-.15,.28,-3.06,.49);
    // Flat wear patches and small stones anchor props without heavy post processing.
    shadow(-4.24,1.78,.78,.49,.095);shadow(-6.8,.65,.61,.7,.105);
    const wearMat=material(tint(p.road,.95));for(const [x,z,r]of [[-4.1,2.35,.48],[-6.8,.6,.44],[-.15,-3.02,.53]]){const m=add(geo('shadow-circle',()=>new THREE.CircleGeometry(1,30)),wearMat,group,[x,.082,z],[r,r*.62,1],[-Math.PI/2,0,0]);m.castShadow=false;}
    if(barren){for(let i=0;i<19;i++){const r=range(.09,.23);add(bevelUnit(),stone,group,[-.05+range(-.7,.7),.12,2.52+range(-.42,.65)],[r*1.6,r,r], [range(-.4,.4),range(0,6),range(-.4,.4)],tint(p.stone,range(.7,.95)));}}
  }
  function character(x,z,rotation,role,seed) {
    const model=buildCharacter(THREE,{quality:characterQuality,style,role,pose:characterPose,seed});
    model.group.position.set(x,.09,z);model.group.rotation.y=rotation;model.group.userData.dynamic=true;group.add(model.group);
    people.push({model,x,z,rotation,phase:seed*.3});shadow(x,z,.28,.2,.11);
  }
  character(-2.75,2.98,.38,'scout',1);character(3.1,3.33,-.35,'civilian',2);
  if(refined&&!barren){
    const laundry=new THREE.Group();laundry.position.set(-7.4,0,-3.4);group.add(laundry);for(const x of [-.6,.7])box(laundry,x,.8,0,.05,1.6,.05,darkWood);branch(laundry,[-.6,1.49,0],[.7,1.47,0],.01,metal);
    const cloth=new THREE.Group();cloth.position.set(.04,1.46,0);cloth.userData.dynamic=true;laundry.add(cloth);box(cloth,0,-.24,0,.51,.44,.018,material('#c5bca1'));animated.push({object:cloth,type:'cloth'});
  }
  // Static pieces share instanced batches. Counts are model construction facts;
  // renderer.info is the appropriate source for actual draw calls and triangles.
  group.updateMatrixWorld(true);
  const batches=new Map(),remove=[];
  group.traverse(object=>{
    if(!object.isMesh||object.isInstancedMesh||Array.isArray(object.material))return;
    let parent=object;while(parent&&parent!==group){if(parent.userData.dynamic)return;parent=parent.parent;}
    const key=`${object.geometry.uuid}:${object.material.uuid}:${object.castShadow}:${object.receiveShadow}`;
    if(!batches.has(key))batches.set(key,{geometry:object.geometry,material:object.material,items:[],cast:object.castShadow,receive:object.receiveShadow});batches.get(key).items.push({matrix:object.matrixWorld.clone(),color:object.userData.tint});remove.push(object);
  });
  for(const object of remove)object.removeFromParent();
  for(const batch of batches.values()){
    const mesh=new THREE.InstancedMesh(batch.geometry,batch.material,batch.items.length);mesh.name='static-detail-batch';mesh.castShadow=batch.cast;mesh.receiveShadow=batch.receive;
    const hasColor=batch.items.some(item=>item.color);batch.items.forEach((item,i)=>{mesh.setMatrixAt(i,item.matrix);if(hasColor)mesh.setColorAt(i,item.color||new THREE.Color('#ffffff'));});mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();group.add(mesh);
  }
  stats.staticBatches=batches.size;stats.textures=textures.size;stats.materials=materials.size;
  return {
    group, stats,
    setCharacterPose(pose) { characterPose=pose;peopleTime=0;for(const person of people) person.model.setPose(pose); },
    update(dt, time, motion = true) {
      if(disposed)return;if(motion){motionTime+=Math.min(dt,.06);peopleTime+=Math.min(dt,.06);}
      for(const uniform of leafUniforms)uniform.value=motionTime;
      for(const item of animated)item.object.rotation.x=Math.sin(motionTime*1.1)*.045;
      for(const person of people){
        person.model.update(dt,peopleTime,motion);
        if(characterPose==='walk'){
          const angle=peopleTime*.55+person.phase;
          person.model.group.position.x=person.x+Math.sin(angle)*.65;
          person.model.group.position.z=person.z+(1-Math.cos(angle))*.3;
          person.model.group.rotation.y=Math.atan2(Math.cos(angle)*.65,Math.sin(angle)*.3);
        }else{person.model.group.position.set(person.x,.09,person.z);person.model.group.rotation.y=person.rotation;}
      }
    },
    dispose() { if(disposed)return;disposed=true;for(const person of people)person.model.dispose();people.length=0;group.traverse(object=>{if(object.isInstancedMesh)object.dispose();});for(const geometry of geometries)geometry.dispose();for(const mat of materials)mat.dispose();for(const tex of textures)tex.dispose();leafUniforms.length=0;animated.length=0;group.clear(); },
  };
}
