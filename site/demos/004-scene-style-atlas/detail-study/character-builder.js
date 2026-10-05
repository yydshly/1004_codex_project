// V3 character study: original geometry and a small joint hierarchy. No model,
// texture, rig, or animation has been copied from a game or an asset library.
// Characters face +Z, stand on y=0, and use metres. 1.72 m includes the headwear.
export function buildCharacter(THREE, { quality = 'refined', style = 'natural', role = 'scout', pose = 'idle', seed = 1 } = {}) {
  const refined = quality !== 'baseline';
  const civilian = role === 'civilian';
  const palettes = {
    natural: { skin: '#c79d7e', jacket: civilian ? '#977761' : '#68745b', cloth: '#909779', pants: '#555c50', leather: '#6b5743', boots: '#443f33', hair: '#45382b', dark: '#333930', metal: '#9c9784' },
    miniature: { skin: '#dcad88', jacket: civilian ? '#ba865d' : '#789a87', cloth: '#a6b99a', pants: '#5b7369', leather: '#927351', boots: '#555140', hair: '#6f4930', dark: '#4a5547', metal: '#c8b687' },
    wasteland: { skin: '#bba18d', jacket: civilian ? '#9d8b70' : '#82866f', cloth: '#afa58a', pants: '#696859', leather: '#796953', boots: '#4d493e', hair: '#554b40', dark: '#42453b', metal: '#a09a83' },
  };
  const p = palettes[style] || palettes.natural;
  const group = new THREE.Group();
  group.name = `character-${refined ? 'refined' : 'baseline'}-${style}-${civilian ? 'civilian' : 'scout'}`;
  group.userData.dynamic = true;
  const body = new THREE.Group(); group.add(body);
  const geometries = new Set(), materials = new Set(), textures = new Set(), cache = new Map();
  let disposed = false, clock = 0, currentPose = ['idle', 'walk', 'alert'].includes(pose) ? pose : 'idle';
  let randomSeed = Number(seed) >>> 0;
  const random = () => { randomSeed = (1664525 * randomSeed + 1013904223) >>> 0; return randomSeed / 4294967296; };
  const variation = (random() - .5) * .025;
  const phaseOffset = random() * Math.PI * 2;
  function owned(geometry) { geometries.add(geometry); return geometry; }
  function geo(key, factory) { if (!cache.has(key)) cache.set(key, owned(factory())); return cache.get(key); }
  function mat(color, options = {}) { const m = new THREE.MeshStandardMaterial({ color, roughness: .86, ...options }); materials.add(m); return m; }
  // The very fine woven bump affects highlights without printing large noise
  // onto a small character. Node-only construction also works without a canvas.
  let weave = null;
  if (refined && typeof document !== 'undefined') {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#888'; ctx.fillRect(0, 0, 64, 64);
      for (let y = 0; y < 64; y += 2) for (let x = 0; x < 64; x += 2) {
        const value = 116 + ((x / 2 + y / 2) % 2) * 23 + Math.floor(random() * 8);
        ctx.fillStyle = `rgb(${value},${value},${value})`; ctx.fillRect(x, y, 1, 2);
      }
      weave = new THREE.CanvasTexture(canvas); weave.wrapS = weave.wrapT = THREE.RepeatWrapping;
      weave.repeat.set(3, 3); textures.add(weave);
    }
  }
  const clothOptions = weave ? { bumpMap: weave, bumpScale: .0017 } : {};
  const skin = mat(p.skin, { roughness: .72 });
  const jacket = mat(p.jacket, clothOptions), cloth = mat(p.cloth, clothOptions), pants = mat(p.pants, clothOptions);
  const leather = mat(p.leather, { roughness: .82 }), boots = mat(p.boots, { roughness: .9 });
  const hair = mat(p.hair), dark = mat(p.dark), metal = mat(p.metal, { metalness: .25, roughness: .64 });
  const whites = mat('#d5c7af', { roughness: .76 }), eye = mat('#3d3830', { roughness: .55 });
  const sphere = geo('sphere', () => new THREE.SphereGeometry(1, 12, 8));
  const box = geo('box', () => new THREE.BoxGeometry(1, 1, 1));
  const roundBox = geo('round-box', () => {
    const s = new THREE.Shape(), r = .14, a = .5 - r;
    s.moveTo(-a, -.5); s.lineTo(a, -.5); s.quadraticCurveTo(.5, -.5, .5, -a);
    s.lineTo(.5, a); s.quadraticCurveTo(.5, .5, a, .5); s.lineTo(-a, .5);
    s.quadraticCurveTo(-.5, .5, -.5, a); s.lineTo(-.5, -a); s.quadraticCurveTo(-.5, -.5, -a, -.5);
    const g = new THREE.ExtrudeGeometry(s, { depth: .82, bevelEnabled: true, bevelThickness: .09, bevelSize: .025, bevelSegments: 2, steps: 1, curveSegments: 2 });
    g.center(); g.computeBoundingBox(); const size = g.boundingBox.getSize(new THREE.Vector3()); g.scale(1 / size.x, 1 / size.y, 1 / size.z); return g;
  });
  function mesh(parent, geometry, material, position = [0, 0, 0], scale = [1, 1, 1], rotation = [0, 0, 0]) {
    const m = new THREE.Mesh(geometry, material); m.position.set(...position); m.scale.set(...scale); m.rotation.set(...rotation);
    m.castShadow = true; m.receiveShadow = true; m.userData.dynamic = true; parent.add(m); return m;
  }
  const block = (parent, x, y, z, w, h, d, material, rot = [0, 0, 0], rounded = true) => mesh(parent, refined && rounded ? roundBox : box, material, [x, y, z], [w, h, d], rot);
  const oval = (parent, x, y, z, rx, ry, rz, material, rotation = [0, 0, 0]) => mesh(parent, sphere, material, [x, y, z], [rx, ry, rz], rotation);
  function joint(parent, name, position) { const g = new THREE.Group(); g.name = name; g.position.set(...position); g.userData.dynamic = true; parent.add(g); return g; }
  // An elliptical loft provides a continuous cloth/anatomy surface. Ring fields:
  // [height, half-width, half-depth, centre-Z, centre-X]. The caps close seams.
  function loft(parent, rings, material, sides = 14) {
    const pos = [], uv = [], index = [];
    const rising = rings[rings.length - 1][0] > rings[0][0];
    rings.forEach((r, i) => {
      for (let j = 0; j <= sides; j++) {
        const angle = j / sides * Math.PI * 2;
        pos.push((r[4] || 0) + Math.sin(angle) * r[1], r[0], (r[3] || 0) + Math.cos(angle) * r[2]);
        uv.push(j / sides, i / (rings.length - 1));
      }
    });
    for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < sides; j++) {
      const a = i * (sides + 1) + j, b = a + sides + 1;
      if (rising) index.push(a, a + 1, b, a + 1, b + 1, b);
      else index.push(a, b, a + 1, a + 1, b, b + 1);
    }
    [0, rings.length - 1].forEach((rIndex, capIndex) => {
      const r = rings[rIndex], centre = pos.length / 3;
      pos.push(r[4] || 0, r[0], r[3] || 0); uv.push(.5, capIndex);
      for (let j = 0; j < sides; j++) {
        const a = rIndex * (sides + 1) + j;
        if ((capIndex === 0) === rising) index.push(centre, a + 1, a); else index.push(centre, a, a + 1);
      }
    });
    const g = owned(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(index); g.computeVertexNormals();
    // The first/last ring vertex is duplicated for wrapping UVs. Average its
    // normals so the cloth and face do not show a hard vertical seam at +Z.
    const normals = g.getAttribute('normal');
    for (let i = 0; i < rings.length; i++) {
      const a = i * (sides + 1), b = a + sides;
      const n = new THREE.Vector3(normals.getX(a)+normals.getX(b),normals.getY(a)+normals.getY(b),normals.getZ(a)+normals.getZ(b)).normalize();
      normals.setXYZ(a,n.x,n.y,n.z); normals.setXYZ(b,n.x,n.y,n.z);
    }
    return mesh(parent, g, material);
  }
  // Cloth webbing has a flat, thickened cross-section, rather than looking like
  // rope. A Catmull-Rom centreline gently follows shoulders/chest/backpack.
  function ribbon(parent, path, width, thickness, material) {
    const curve = new THREE.CatmullRomCurve3(path.map(v => new THREE.Vector3(...v)));
    const pos = [], index = [], uv = [], n = 12;
    for (let i = 0; i <= n; i++) {
      const point = curve.getPoint(i / n), tangent = curve.getTangent(i / n);
      const transverse = new THREE.Vector3(1, 0, 0);
      const normal = new THREE.Vector3().crossVectors(transverse, tangent).normalize();
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([x, z], j) => {
        const v = point.clone().addScaledVector(transverse, x * width / 2).addScaledVector(normal, z * thickness / 2);
        pos.push(v.x, v.y, v.z); uv.push(j / 3, i / n);
      });
    }
    for (let i = 0; i < n; i++) for (let j = 0; j < 4; j++) {
      const a = i * 4 + j, b = i * 4 + (j + 1) % 4, c = a + 4, d = b + 4;
      index.push(a, c, b, b, c, d);
    }
    index.push(0, 1, 2, 0, 2, 3, n * 4, n * 4 + 2, n * 4 + 1, n * 4, n * 4 + 3, n * 4 + 2);
    const g = owned(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(index); g.computeVertexNormals(); return mesh(parent, g, material);
  }
  const torso = joint(body, 'waist', [0, .98, 0]);
  const neck = joint(torso, 'neck', [0, .435, 0]);
  const head = joint(neck, 'head', [0, .065, .002]);
  if (refined) {
    // Shoulders are wider than the waist, with a curved chest and jacket hem.
    loft(torso, [[-.016,.151,.106,0],[.035,.147,.109,.001],[.095,.130,.090,.002],[.17,.132,.092,.008],[.255,.166,.102,.006],[.325,.191,.104,-.002],[.39,.205,.093,-.010],[.425,.165,.072,-.007]], jacket, 16);
    loft(torso, [[-.036,.142,.104],[.012,.147,.103],[.071,.137,.09]], pants, 14);
    loft(neck, [[-.006,.041,.039],[.056,.042,.037],[.082,.046,.039]], skin, 12);
    // The face has a narrower chin, cheekbones and skull, not a scaled sphere.
    loft(head, [[0,.037,.037,.032],[.021,.064,.058,.016],[.055,.082,.070,.006],[.104,.093,.079,0],[.153,.096,.079,-.004],[.193,.087,.073,-.008],[.224,.060,.051,-.009],[.236,.017,.018,-.006]], skin, 16);
    oval(head, -.096,.109,-.006,.015,.025,.012,skin); oval(head,.096,.109,-.006,.015,.025,.012,skin);
    oval(head,-.098,.107,.002,.007,.013,.005,leather); oval(head,.098,.107,.002,.007,.013,.005,leather);
    // A modest nose bridge and tip project from the cheeks. The small eye planes
    // are deliberately subdued so the face does not turn into a cartoon mask.
    loft(head, [[.067,.010,.014,.080],[.080,.021,.023,.090],[.097,.013,.022,.085],[.129,.009,.010,.078]], skin, 8);
    oval(head,-.040,.133,.073,.016,.0047,.005,whites); oval(head,.040,.133,.073,.016,.0047,.005,whites);
    oval(head,-.040,.133,.078,.0052,.0048,.0028,eye); oval(head,.040,.133,.078,.0052,.0048,.0028,eye);
    block(head,-.041,.146,.076,.033,.004,.006,hair,[0,0,-.04]); block(head,.041,.146,.076,.033,.004,.006,hair,[0,0,.04]);
    block(head,0,.047,.069,.034,.0035,.004,leather,[0,0,0]);
    if (civilian) {
      loft(head, [[.148,.096,.081,-.009],[.174,.096,.081,-.011],[.204,.082,.070,-.011],[.228,.055,.048,-.009],[.240,.015,.015,-.006]], hair, 16);
      // Sideburns and a quiet swept fringe give the unhelmeted silhouette shape.
      block(head,-.087,.128,-.009,.016,.045,.039,hair,[0,0,-.07]); block(head,.087,.133,-.012,.016,.039,.035,hair,[0,0,.05]);
      oval(head,-.024,.180,.058,.064,.022,.026,hair,[0,0,-.12]);
    } else {
      // A fitted field cap follows the crown. Its visor is broad and thin.
      loft(head, [[.171,.098,.082,-.010],[.179,.099,.083,-.010],[.210,.087,.075,-.012],[.234,.064,.056,-.011],[.240,.032,.031,-.010]], jacket, 16);
      loft(head, [[.169,.099,.083,-.010],[.179,.100,.084,-.010]], dark, 16);
      block(head,0,.174,.106,.148,.012,.105,jacket,[-.035,0,0]);
      block(head,0,.180,.079,.018,.009,.004,metal);
    }
    // Open jacket collar; the centre seam is placed on top of the main cloth.
    block(torso,-.055,.410,.053,.090,.048,.018,cloth,[.30,0,-.34]); block(torso,.055,.410,.053,.090,.048,.018,cloth,[.30,0,.34]);
    block(torso,0,.215,.104,.009,.320,.009,dark);
    for (const y of [.102,.194,.283,.358]) oval(torso,.011,y,.110,.0037,.0037,.0027,metal);
    // The belt wraps a waist-shaped profile, with a buckle and real loop spacing.
    loft(torso, [[.012,.151,.108],[.039,.151,.108]], leather, 16);
    block(torso,0,.026,.112,.034,.028,.012,metal);
    block(torso,0,.026,.120,.019,.013,.004,dark);
    for (const x of [-.112,-.064,.064,.112]) block(torso,x,.030,.090,.010,.044,.013,jacket);
    for (const side of [-1,1]) {
      block(torso,side*.089,.282,.099,.091,.095,.025,civilian ? jacket : cloth,[0,0,side*.045]);
      block(torso,side*.089,.318,.115,.090,.026,.017,jacket,[.12,0,side*.045]);
      oval(torso,side*.089,.312,.126,.0038,.0038,.0026,metal);
      block(torso,side*.091,.098,.098,.071,.069,.022,jacket,[0,0,side*.08]);
      // Low-profile crease bands read as clothing rather than large seams.
      block(torso,side*.083,.210,.103,.070,.004,.004,cloth,[0,0,side*-.17]);
    }
    if (civilian) {
      // A loose neck scarf and cross-body satchel distinguish the civilian.
      loft(neck, [[.007,.064,.056,.009],[.028,.062,.051,.007],[.055,.053,.043,.003]], cloth, 14);
      ribbon(torso, [[-.17,.40,.02],[-.09,.31,.118],[.05,.19,.115],[.15,.09,.090]],.030,.006,leather);
      block(torso,.175,.020,.025,.145,.175,.075,leather,[0,-.12,-.06]);
      block(torso,.176,.083,.065,.145,.055,.021,cloth,[0,-.12,-.06]);
      block(torso,.180,.075,.080,.018,.025,.007,metal,[0,-.12,0]);
    } else {
      // The pack is a lofted soft volume; its pockets and straps remain small.
      loft(torso, [[.080,.118,.055,-.155],[.104,.143,.073,-.165],[.196,.146,.081,-.169],[.308,.138,.073,-.161],[.373,.118,.055,-.148],[.387,.070,.044,-.144]], leather, 14);
      block(torso,0,.183,-.253,.187,.158,.033,cloth);
      block(torso,0,.254,-.265,.180,.040,.022,jacket,[.09,0,0]);
      for (const side of [-1,1]) {
        ribbon(torso, [[side*.100,.082,.105],[side*.132,.275,.106],[side*.160,.405,.020],[side*.132,.389,-.115],[side*.109,.104,-.202]],.031,.007,leather);
        block(torso,side*.117,.178,.123,.023,.031,.010,metal);
        block(torso,side*.147,.115,-.169,.034,.084,.069,cloth);
        block(torso,side*.147,.150,-.176,.040,.023,.073,jacket);
      }
      ribbon(torso, [[-.13,.28,.118],[0,.272,.122],[.13,.28,.118]],.014,.005,leather);
    }
  } else {
    block(torso,0,.203,0,.340,.407,.210,jacket,[0,0,0],false);
    block(torso,0,-.006,0,.274,.073,.183,pants,[0,0,0],false);
    block(neck,0,.034,0,.075,.065,.072,skin,[0,0,0],false);
    oval(head,0,.123,0,.098,.117,.089,skin);
    if (!civilian) block(head,0,.225,0,.185,.030,.167,jacket,[0,0,0],false);
    block(torso,0,.025,0,.347,.025,.217,leather,[0,0,0],false);
  }
  const arms = [-1,1].map(side => {
    const shoulder = joint(torso, side < 0 ? 'left-shoulder' : 'right-shoulder', [side*.209,.383,-.008]);
    const elbow = joint(shoulder, side < 0 ? 'left-elbow' : 'right-elbow', [0,-.276,0]);
    const wrist = joint(elbow, side < 0 ? 'left-wrist' : 'right-wrist', [0,-.253,0]);
    if (refined) {
      // The sleeve rounds into the shoulder and narrows towards the elbow.
      // A slightly curved centreline softens the cylindrical "armour tube" look.
      loft(shoulder, [[.018,.039,.044,-.008],[-.021,.065,.067,-.005],[-.089,.068,.062,0],[-.170,.056,.053,.004],[-.235,.049,.046,.006],[-.276,.045,.043,.009]], jacket, 12);
      loft(elbow, [[.022,.046,.046,.009],[0,.049,.047,.009],[-.066,.048,.046,.007],[-.159,.038,.039,.004],[-.231,.033,.033],[-.257,.033,.032]], civilian ? skin : jacket, 12);
      // Rolled sleeves for civilians; scout cuffs and a small elbow patch.
      if (civilian) {
        loft(elbow, [[.024,.056,.055],[-.047,.056,.055],[-.061,.055,.053]], cloth, 12);
        loft(elbow, [[-.018,.058,.057],[-.032,.058,.057]], jacket, 12);
      } else {
        loft(elbow, [[-.221,.038,.037],[-.255,.037,.035]], cloth, 12);
        block(elbow,0,-.035,-.042,.056,.060,.006,cloth,[.10,0,0]);
      }
      loft(wrist, [[.014,.030,.027],[0,.031,.029],[-.028,.040,.028],[-.060,.040,.025],[-.084,.034,.022]], civilian ? skin : leather, 10);
      const handMat = civilian ? skin : leather;
      for (let finger = 0; finger < 4; finger++) {
        const x = (finger - 1.5) * .018, length = [.044,.055,.052,.040][finger];
        const f = joint(wrist,'finger',[x,-.075,.006]); f.rotation.x = -.18;
        loft(f, [[.005,.010,.011],[0,.010,.011],[-length*.58,.009,.010,.003],[-length,.006,.007,.005]],handMat,6);
      }
      oval(wrist,-side*.039,-.030,.014,.012,.029,.012,handMat,[0,0,side*-.52]);
      if (side === -1) {
        loft(elbow, [[-.209,.039,.039],[-.223,.039,.039]],dark,10);
        block(elbow,0,-.216,.040,.022,.022,.007,metal);
      }
    } else {
      block(shoulder,0,-.138,0,.104,.276,.111,jacket,[0,0,0],false);
      block(elbow,0,-.123,0,.076,.247,.084,civilian ? skin : jacket,[0,0,0],false);
      block(wrist,0,-.065,0,.063,.130,.057,skin,[0,0,0],false);
    }
    return { side, shoulder, elbow, wrist };
  });
  const thighLength = .425, shinLength = .410, ankleHeight = .145;
  const legs = [-1,1].map(side => {
    const hip = joint(body,side < 0 ? 'left-hip' : 'right-hip',[side*.095,.975,-.004]);
    const knee = joint(hip,side < 0 ? 'left-knee' : 'right-knee',[0,-thighLength,0]);
    const ankle = joint(knee,side < 0 ? 'left-ankle' : 'right-ankle',[0,-shinLength,0]);
    if (refined) {
      loft(hip, [[.024,.079,.086],[.007,.083,.087],[-.077,.081,.081],[-.208,.069,.069],[-.338,.059,.058],[-.426,.057,.053]],pants,12);
      loft(knee, [[.021,.056,.054],[0,.057,.057],[-.085,.056,.051],[-.181,.051,.045],[-.309,.037,.035],[-.413,.036,.035]],pants,12);
      // Cargo pockets sit on the outer thigh, and knees have softly raised pads.
      block(hip,side*.071,-.162,.008,.031,.113,.086,jacket,[0,0,side*.035]);
      block(hip,side*.087,-.121,.008,.014,.032,.093,cloth,[0,0,side*.035]);
      block(hip,0,-.314,.057,.080,.005,.005,cloth,[0,0,side*.1]);
      if (!civilian) {
        const pad = joint(knee,'knee-pad',[0,.006,.055]); pad.rotation.x = -.03;
        loft(pad, [[-.070,.026,.013],[ -.057,.040,.017],[-.013,.042,.019],[.040,.033,.013]],dark,10);
        loft(knee, [[-.043,.059,.058],[-.031,.059,.058]],leather,12);
      }
      // The sole has a rounded toe, a separate heel and a tapered ankle shaft.
      loft(ankle, [[-.145,.056,.139,.047],[-.128,.059,.143,.047],[-.113,.058,.141,.047]],boots,14);
      loft(ankle, [[-.112,.056,.130,.042],[-.093,.057,.124,.040],[-.068,.052,.101,.027],[-.022,.045,.059,.002],[.036,.043,.043,-.009],[.080,.043,.041,-.010]],leather,14);
      block(ankle,0,-.1345,-.060,.093,.021,.075,dark);
      block(ankle,0,-.063,.134,.085,.010,.042,boots,[-.11,0,0]);
      block(ankle,0,.022,.035,.037,.060,.010,boots,[.11,0,0]);
      for (let lace = 0; lace < 4; lace++) block(ankle,0,.047-lace*.017,.041+lace*.007,.045,.003,.003,cloth,[.20,0,(lace%2 ? 1 : -1)*.11]);
      loft(ankle, [[.061,.046,.044,-.010],[.079,.046,.044,-.010]],boots,12);
      block(knee,side*.032,-.230,.031,.029,.087,.008,jacket,[0,0,side*.05]);
    } else {
      block(hip,0,-thighLength/2,0,.126,thighLength,.145,pants,[0,0,0],false);
      block(knee,0,-shinLength/2,0,.101,shinLength,.112,pants,[0,0,0],false);
      block(ankle,0,-.074,.041,.113,.142,.256,boots,[0,0,0],false);
    }
    return { side, hip, knee, ankle };
  });
  // Merge direct, rigid children by material within each joint. The movable
  // joints remain separate; uniforms/face/pockets do not each need a draw call.
  function mergeRigidParts(parent) {
    // Fingers are posed once; keep the animated wrist, but fold these small
    // static groups into it before merging, so each finger is not a draw call.
    parent.children.filter(c => c.isGroup && c.name === 'finger').forEach(f => {
      f.updateMatrix(); [...f.children].forEach(m => { m.applyMatrix4(f.matrix); parent.add(m); }); parent.remove(f);
    });
    parent.children.filter(c => c.isGroup).forEach(mergeRigidParts);
    const buckets = new Map();
    parent.children.filter(c => c.isMesh && !c.isSkinnedMesh).forEach(m => {
      if (!buckets.has(m.material)) buckets.set(m.material, []); buckets.get(m.material).push(m);
    });
    buckets.forEach((parts, material) => {
      if (parts.length < 2) return;
      const positions = [], normals = [], uvs = [], indices = []; let offset = 0;
      parts.forEach(m => {
        m.updateMatrix(); const g = m.geometry, pp = g.getAttribute('position'), nn = g.getAttribute('normal'), uu = g.getAttribute('uv');
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(m.matrix), point = new THREE.Vector3(), normal = new THREE.Vector3();
        for (let i = 0; i < pp.count; i++) {
          point.fromBufferAttribute(pp,i).applyMatrix4(m.matrix); positions.push(point.x,point.y,point.z);
          normal.fromBufferAttribute(nn,i).applyMatrix3(normalMatrix).normalize(); normals.push(normal.x,normal.y,normal.z);
          uvs.push(uu ? uu.getX(i) : 0,uu ? uu.getY(i) : 0);
        }
        if (g.index) for (let i = 0; i < g.index.count; i++) indices.push(offset+g.index.getX(i));
        else for (let i = 0; i < pp.count; i++) indices.push(offset+i);
        offset += pp.count; parent.remove(m);
      });
      const g = owned(new THREE.BufferGeometry()); g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
      g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3)); g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2)); g.setIndex(indices);
      g.computeBoundingBox(); g.computeBoundingSphere(); mesh(parent,g,material);
    });
  }
  mergeRigidParts(body);
  let triangles = 0, meshCount = 0;
  group.traverse(o => { o.userData.dynamic = true; if (o.isMesh) { meshCount++; triangles += (o.geometry.index?.count || o.geometry.getAttribute('position').count)/3; } });
  group.userData.character = { quality: refined ? 'refined' : 'baseline', role: civilian ? 'civilian' : 'scout', style, height: 1.72, triangles, meshCount, headCount: 7.17, originalGeometry: true };
  function solveLeg(leg, footY, footZ, bodyY) {
    const dy = footY - (leg.hip.position.y + bodyY), dz = footZ - leg.hip.position.z;
    const reach = Math.min(Math.hypot(dy,dz),thighLength+shinLength-.00001);
    const angle = -Math.atan2(dz,-dy), a = Math.acos(THREE.MathUtils.clamp((thighLength*thighLength+reach*reach-shinLength*shinLength)/(2*thighLength*reach),-1,1));
    const bend = Math.acos(THREE.MathUtils.clamp((reach*reach-thighLength*thighLength-shinLength*shinLength)/(2*thighLength*shinLength),-1,1));
    leg.hip.rotation.x = angle-a; leg.knee.rotation.x = bend;
    leg.ankle.rotation.x = -(leg.hip.rotation.x+leg.knee.rotation.x);
  }
  function applyPose() {
    const walking = currentPose === 'walk', alert = currentPose === 'alert';
    const phase = clock * 4.6 + phaseOffset, breath = Math.sin(clock*1.75+phaseOffset);
    body.position.y = walking ? -.014-.004*Math.cos(phase*2) : alert ? -.008 : 0;
    torso.rotation.set(walking ? .025 : alert ? .028 : .004*breath,walking ? Math.sin(phase)*.038 : alert ? -.065 : Math.sin(clock*.7+phaseOffset)*.008,walking ? Math.cos(phase)*.016 : variation);
    head.rotation.set(alert ? -.04 : -.012+breath*.008,alert ? .24 : walking ? -.025*Math.sin(phase) : Math.sin(clock*.45+phaseOffset)*.045,alert ? -.02 : 0);
    for (const leg of legs) {
      const lp = phase+(leg.side<0 ? Math.PI : 0), swing = Math.max(0,Math.sin(lp));
      const footZ = walking ? -Math.cos(lp)*.162 : alert ? (leg.side<0 ? -.070 : .060) : (leg.side<0 ? -.020 : .025);
      const footY = ankleHeight+(walking ? swing*.102 : 0);
      solveLeg(leg,footY,footZ,body.position.y);
      leg.hip.rotation.z = 0; leg.ankle.rotation.y = leg.side*(walking ? .035 : .080);
      if (walking) leg.ankle.rotation.x -= swing*.12;
    }
    for (const arm of arms) {
      const ap = phase+(arm.side<0 ? Math.PI : 0);
      arm.shoulder.rotation.x = walking ? -.32*Math.cos(ap) : alert ? -.13 : .065;
      arm.shoulder.rotation.z = arm.side*(alert ? .070 : .072);
      arm.shoulder.rotation.y = arm.side*(alert ? -.13 : .025);
      arm.elbow.rotation.x = walking ? -.18-Math.max(0,Math.cos(ap))*.14 : alert ? (arm.side<0 ? -.58 : -.91) : -.33;
      arm.wrist.rotation.x = alert ? -.08 : -.035; arm.wrist.rotation.z = -arm.side*.07;
      arm.wrist.rotation.y = arm.side*.10;
    }
    group.userData.character.pose = currentPose;
  }
  applyPose();
  return {
    group, height: 1.72,
    update(dt, _time, motion = true) {
      if (disposed || !motion) return;
      // Internal elapsed time freezes with motion=false. An outside clock may
      // continue running, but resuming does not jump the limbs to a later pose.
      clock += Math.max(0,Math.min(Number.isFinite(dt) ? dt : 0,.1)); applyPose();
    },
    setPose(next) { if (disposed) return; currentPose = ['idle','walk','alert'].includes(next) ? next : 'idle'; applyPose(); },
    dispose() {
      if (disposed) return; disposed = true;
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); group.clear();
    },
  };
}
