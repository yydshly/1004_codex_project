import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildCharacter } from './character-builder.js';

// The close view and the village use the same original character module.
const $=id=>document.getElementById(id);
const names={baseline:'基础人物',refined:'细化人物',scout:'侦察兵',civilian:'居民',idle:'站立',walk:'行走',alert:'观察',natural:'自然写实',miniature:'温暖微缩',wasteland:'荒凉废土'};
const state={quality:'refined',role:'scout',pose:'walk',style:'natural',motion:!matchMedia('(prefers-reduced-motion: reduce)').matches};
let renderer,scene,camera,controls,model,key,fill,ambient,observer;
let last=performance.now(),time=0,hidden=document.hidden;
const fixedGeometry=[],fixedMaterials=[],fixedTextures=[];

function status(){
  $('character-status').textContent=`${names[state.quality]} / ${names[state.role]} / ${names[state.pose]} · ${names[state.style]} · ${state.motion?'动作观察中':'已暂停'}`;
  for(const [kind,value]of [['quality',state.quality],['role',state.role],['pose',state.pose]]){
    for(const button of document.querySelectorAll(`button[data-character-${kind}]`))button.setAttribute('aria-pressed',String(button.getAttribute(`data-character-${kind}`)===value));
  }
  $('character-motion').textContent=state.motion?'暂停动作':'播放动作';
  $('character-motion').setAttribute('aria-pressed',String(state.motion));
}
function publish(){window.dispatchEvent(new CustomEvent('atlas-character-change',{detail:{quality:state.quality,pose:state.pose}}));}
function makeModel(){
  if(model){scene.remove(model.group);model.dispose();}
  model=buildCharacter(THREE,{quality:state.quality,role:state.role,pose:state.pose,style:state.style,seed:1});
  scene.add(model.group);
  const backgrounds={natural:'#29352f',miniature:'#484635',wasteland:'#333941'};
  scene.background=new THREE.Color(backgrounds[state.style]);
  key.color.set(state.style==='wasteland'?'#d5e0e8':'#ffe4be');
  fill.color.set(state.style==='miniature'?'#d8e2cb':'#b6cfe0');
  renderer.toneMappingExposure=state.style==='miniature'?1.05:.96;
  status();renderer.render(scene,camera);
}
function resize(){
  const rect=$('character-canvas').parentElement.getBoundingClientRect();
  const width=Math.max(1,Math.floor(rect.width)),height=Math.max(1,Math.floor(rect.height));
  const aspect=width/height,span=2.3*Math.max(1,.75/aspect);
  camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;
  camera.updateProjectionMatrix();renderer.setSize(width,height,false);
}
function reset(){camera.position.set(2.2,1.65,3.8);controls.target.set(0,.86,0);camera.zoom=1;camera.lookAt(controls.target);controls.update();resize();}
function save(){
  renderer.render(scene,camera);
  const image=renderer.domElement.toDataURL('image/png');
  $('detail-snapshot-image').src=image;$('detail-snapshot-download').href=image;
  $('detail-snapshot-download').download=`scene-atlas-v3-character-${state.quality}-${state.role}-${state.pose}-${state.style}.png`;
  $('detail-snapshot-dialog').showModal();
}
function ground(){
  const geometry=new THREE.CylinderGeometry(.76,.8,.035,64);
  const material=new THREE.MeshStandardMaterial({color:'#667062',roughness:.97});
  const base=new THREE.Mesh(geometry,material);base.position.y=-.025;base.receiveShadow=true;scene.add(base);fixedGeometry.push(geometry);fixedMaterials.push(material);
  const c=document.createElement('canvas');c.width=c.height=128;const context=c.getContext('2d');
  const g=context.createRadialGradient(64,64,8,64,64,60);g.addColorStop(0,'rgba(5,10,8,.35)');g.addColorStop(1,'rgba(5,10,8,0)');context.fillStyle=g;context.fillRect(0,0,128,128);
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;fixedTextures.push(texture);
  const shadowMaterial=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false});
  const shadowGeometry=new THREE.PlaneGeometry(.95,.6),shadow=new THREE.Mesh(shadowGeometry,shadowMaterial);
  shadow.rotation.x=-Math.PI/2;shadow.position.y=-.003;scene.add(shadow);fixedMaterials.push(shadowMaterial);fixedGeometry.push(shadowGeometry);
}
function wire(){
  for(const button of document.querySelectorAll('button[data-character-quality]'))button.addEventListener('click',()=>{
    const quality=button.dataset.characterQuality;if(quality===state.quality)return;state.quality=quality;makeModel();publish();
  });
  for(const button of document.querySelectorAll('button[data-character-role]'))button.addEventListener('click',()=>{
    const role=button.dataset.characterRole;if(role===state.role)return;state.role=role;makeModel();publish();
  });
  for(const button of document.querySelectorAll('button[data-character-pose]'))button.addEventListener('click',()=>{
    const pose=button.dataset.characterPose;if(pose===state.pose)return;state.pose=pose;model.setPose(pose);status();publish();
  });
  $('character-motion').addEventListener('click',()=>{state.motion=!state.motion;status();window.dispatchEvent(new CustomEvent('atlas-character-motion',{detail:{motion:state.motion}}));});
  $('character-reset').addEventListener('click',reset);$('character-snapshot').addEventListener('click',save);
  window.addEventListener('atlas-style-change',event=>{if(event.detail.style===state.style)return;state.style=event.detail.style;makeModel();});
  window.addEventListener('atlas-motion-change',event=>{state.motion=event.detail.motion;status();});
  document.addEventListener('visibilitychange',()=>{hidden=document.hidden;last=performance.now();});
  $('character-canvas').addEventListener('keydown',event=>{
    if(event.key==='+'||event.key==='-'){event.preventDefault();camera.zoom=THREE.MathUtils.clamp(camera.zoom+(event.key==='+'?.1:-.1),.8,2);camera.updateProjectionMatrix();}
  });
}
function frame(now){
  requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.04);last=now;if(hidden)return;
  if(state.motion)time+=dt;model.update(dt,time,state.motion);controls.update();renderer.render(scene,camera);
}
try{
  renderer=new THREE.WebGLRenderer({canvas:$('character-canvas'),antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-2,2,1.15,-1.15,.05,30);
  controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minPolarAngle=.55;controls.maxPolarAngle=Math.PI/2;
  controls.minZoom=.8;controls.maxZoom=2;controls.enablePan=false;
  key=new THREE.DirectionalLight('#ffe4be',2.8);key.position.set(-3,5,4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);
  key.shadow.camera.left=-2;key.shadow.camera.right=2;key.shadow.camera.top=2.5;key.shadow.camera.bottom=-1;key.shadow.camera.near=.1;key.shadow.camera.far=12;
  key.shadow.normalBias=.004;key.shadow.bias=-.0001;scene.add(key);
  fill=new THREE.DirectionalLight('#b6cfe0',.45);fill.position.set(3,2,-2);scene.add(fill);
  ambient=new THREE.HemisphereLight('#d8e2cc','#6c6557',.8);scene.add(ambient);
  ground();reset();makeModel();wire();observer=new ResizeObserver(resize);observer.observe($('character-canvas').parentElement);
  $('character-loading').hidden=true;requestAnimationFrame(frame);
}catch(error){console.error('V3 character preview failed:',error);$('character-loading').hidden=true;$('character-error').hidden=false;$('character-status').textContent='人物预览加载失败；制作记录仍可阅读。';}
window.addEventListener('pagehide',event=>{
  if(event.persisted)return;if(model)model.dispose();for(const g of fixedGeometry)g.dispose();for(const m of fixedMaterials)m.dispose();for(const t of fixedTextures)t.dispose();
  observer?.disconnect();controls?.dispose();renderer?.dispose();
},{once:true});
