import { createInitialWorld, cloneWorld, scatterAt, serializeWorld, deserializeWorld, worldSummary } from './world.js';
import { createScene } from './scene.js';
import { saveWorld, loadWorld } from './storage.js';

const $ = (selector) => document.querySelector(selector);
const canvas = $('#landscape');
let world = createInitialWorld();
if (matchMedia('(prefers-reduced-motion: reduce)').matches) world.reducedMotion = true;
let engine, brush = 'tree', radius = 3, exploring = false, dirty = false, savedAt = null;
let painting = false, strokeChanged = false, beforeStroke = null, lastPaint = 0;
let toastTimer;
const history = [];
const atmosphereLabels = { morning: '晨光中的溪谷', sunset: '暮色中的溪谷', mist: '薄雾中的溪谷' };
const brushLabels = { tree: '树木', grass: '草地', flower: '野花', erase: '景物', spring: '泉眼' };

function notify(message, failure = false) {
  const toast = $('#toast');
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.toggle('failure', failure);
  toast.classList.add('visible');
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 3600);
}
function signature() {
  let hash = 2166136261;
  const value = serializeWorld(world);
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16);
}
function updateUI() {
  $('#world-name').value = world.name;
  $('#reduced-motion').checked = world.reducedMotion;
  $('#quality').value = world.quality;
  $('#scene-label').textContent = atmosphereLabels[world.atmosphere];
  document.querySelectorAll('[data-atmosphere]').forEach((button) => {
    const active = button.dataset.atmosphere === world.atmosphere;
    button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));
  });
  $('#undo').disabled = history.length === 0;
  const summary = worldSummary(world);
  $('#object-count').textContent = `${summary.counts.tree} 棵树 · ${summary.counts.flower} 簇野花 · ${summary.counts.grass} 丛草`;
  const timestamp = savedAt ? new Date(savedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '';
  $('#save-state').textContent = savedAt ? `${dirty ? '有新的布置，等待保存' : `已保存 ${timestamp}`} · 当前浏览器` : '尚未保存 · 仅保存在这台浏览器';
  $('#save').textContent = dirty ? '保存风景 ·' : '保存风景';
  canvas.dataset.worldSignature = signature();
  canvas.dataset.objects = String(world.objects.length);
  canvas.dataset.atmosphere = world.atmosphere;
  canvas.dataset.spring = JSON.stringify(world.spring);
  canvas.dataset.reducedMotion = String(world.reducedMotion);
  canvas.dataset.quality = world.quality;
  canvas.dataset.history = String(history.length);
  canvas.dataset.mode = exploring ? 'explore' : 'edit';
}
function pushHistory(snapshot) { history.push(snapshot); if (history.length > 30) history.shift(); }
function applyChange(operation) {
  const previous = cloneWorld(world);
  operation();
  if (serializeWorld(previous) === serializeWorld(world)) return;
  pushHistory(previous); dirty = true;
  engine.setWorld(world); updateUI();
}
function selectBrush(value) {
  brush = value;
  document.querySelectorAll('[data-brush]').forEach((button) => {
    const active = button.dataset.brush === value;
    button.classList.toggle('selected', active); button.setAttribute('aria-pressed', String(active));
  });
  $('#radius').disabled = value === 'spring';
  notify(value === 'spring' ? '点击地面移动泉眼。溪流与河谷会一同重排。' : `已选择${brushLabels[value]}笔刷`);
}
function paint(event) {
  const point = engine.pick(event.clientX, event.clientY);
  if (!point) return;
  let changed = false;
  if (brush === 'erase') {
    const before = world.objects.length;
    world.objects = world.objects.filter((object) => Math.hypot(object.x - point.x, object.z - point.z) > radius);
    changed = before !== world.objects.length;
  } else if (brush === 'spring') {
    const x = Math.max(-12, Math.min(12, point.x)), z = Math.max(-12, Math.min(24, point.z));
    changed = Math.hypot(world.spring.x - x, world.spring.z - z) > .05;
    if (changed) world.spring = { x, z };
    painting = false;
  } else {
    const count = brush === 'tree' ? 4 : brush === 'flower' ? 13 : 18;
    const added = scatterAt(world, brush, point.x, point.z, radius, count, (world.seed + Date.now()) >>> 0);
    changed = added.length > 0;
  }
  if (changed) {
    if (!strokeChanged) pushHistory(beforeStroke);
    strokeChanged = true; dirty = true; engine.setWorld(world); updateUI();
  }
  engine.setBrush(point, brush === 'spring' ? 1 : radius, brush);
}
canvas.addEventListener('contextmenu', (event) => event.preventDefault());
canvas.addEventListener('pointerdown', (event) => {
  if (!engine || exploring || event.button !== 0) return;
  event.preventDefault(); canvas.focus({ preventScroll: true });
  beforeStroke = cloneWorld(world); strokeChanged = false; painting = true;
  canvas.setPointerCapture(event.pointerId); lastPaint = performance.now(); paint(event);
});
canvas.addEventListener('pointermove', (event) => {
  if (!engine || exploring) return;
  engine.setBrush(engine.pick(event.clientX, event.clientY), brush === 'spring' ? 1 : radius, brush);
  if (painting && performance.now() - lastPaint > 90) { lastPaint = performance.now(); paint(event); }
});
function endStroke() {
  if (beforeStroke && !exploring) {
    if (strokeChanged && brush === 'spring') notify('泉眼已移动，溪流与河谷已重排。');
    else if (!strokeChanged) notify(brush === 'erase' ? '这里没有可擦除的景物。' : '试试河岸或更空旷的地面。', false);
  }
  painting = false; beforeStroke = null;
}
canvas.addEventListener('pointerup', endStroke); canvas.addEventListener('pointercancel', endStroke);
window.addEventListener('blur', endStroke);
canvas.addEventListener('pointerleave', () => { if (!painting && engine) engine.setBrush(null, radius, brush); });
document.querySelectorAll('[data-brush]').forEach((button) => button.addEventListener('click', () => selectBrush(button.dataset.brush)));
$('#radius').addEventListener('input', (event) => { radius = Number(event.target.value); $('#radius-value').textContent = `${radius} 米`; });
$('#undo').addEventListener('click', () => {
  if (!history.length) return;
  world = history.pop(); dirty = true; engine.setWorld(world); updateUI(); notify('已回到上一步布置。');
});
document.querySelectorAll('[data-atmosphere]').forEach((button) => button.addEventListener('click', () => applyChange(() => { world.atmosphere = button.dataset.atmosphere; })));
$('#reduced-motion').addEventListener('change', (event) => applyChange(() => { world.reducedMotion = event.target.checked; }));
$('#quality').addEventListener('change', (event) => applyChange(() => { world.quality = event.target.value; }));
$('#world-name').addEventListener('change', (event) => {
  const name = event.target.value.trim();
  if (!name || /[\u0000-\u001f\u007f]/.test(name)) { event.target.value = world.name; notify('给风景留一个清晰的名字。', true); return; }
  applyChange(() => { world.name = name; });
});
function toggleExplore() {
  if (!engine) return;
  endStroke();
  if (!exploring) {
    try { engine.enterExplore(); }
    catch { notify('这片风景暂时没有安全落脚点。试着留出一块空地。', true); return; }
  } else engine.leaveExplore();
  exploring = !exploring;
  document.body.classList.toggle('exploring', exploring);
  $('#explore').innerHTML = exploring ? '返回布置 <span aria-hidden="true">↙</span>' : '进入风景 <span aria-hidden="true">↗</span>';
  updateHint();
  $('#walk-controls').hidden = !exploring;
  updateUI();
}
function updateHint() {
  const narrow = matchMedia('(max-width: 800px)').matches;
  $('#hint').innerHTML = exploring
    ? narrow ? '<span>箭头漫游</span><span>拖动环顾</span><span>返回布置继续创作</span>' : '<span>WASD / 方向键漫游</span><span>拖动环顾</span><span>Esc 返回布置</span>'
    : narrow ? '<span>单指布置</span><span>双指缩放 / 平移</span><span>工具可收起</span>' : '<span>拖动地面布置</span><span>右键转动视角</span><span>滚轮缩放</span>';
}
window.addEventListener('resize', updateHint);
$('#explore').addEventListener('click', toggleExplore);
window.addEventListener('keydown', (event) => { if (event.key === 'Escape' && exploring) toggleExplore(); });
document.querySelectorAll('[data-walk]').forEach((button) => {
  let pressedAt = 0;
  button.addEventListener('pointerdown', (event) => { pressedAt = performance.now(); button.setPointerCapture(event.pointerId); engine.setWalk(button.dataset.walk, true); event.preventDefault(); });
  const stop = () => engine?.setWalk(button.dataset.walk, false);
  button.addEventListener('pointerup', stop); button.addEventListener('pointercancel', stop);
  button.addEventListener('click', (event) => { if (event.detail === 0 || performance.now() - pressedAt < 180) engine.stepWalk(button.dataset.walk); });
});
$('#save').addEventListener('click', () => {
  try {
    const saved = saveWorld(localStorage, world); savedAt = saved.savedAt; dirty = false;
    updateUI(); notify('风景已保存。下次打开会回到这里。');
  } catch { notify('浏览器没有保存成功。请导出文件，把这片风景带走。', true); }
});
$('#restore').addEventListener('click', () => {
  try {
    const saved = loadWorld(localStorage);
    if (!saved) { notify('还没有保存过风景。先按“保存风景”。'); return; }
    pushHistory(cloneWorld(world)); world = saved.world; savedAt = saved.savedAt; dirty = false;
    engine.setWorld(world); updateUI(); notify('已恢复保存的风景。');
  } catch { notify('保存的风景无法读取，当前布置已保留。', true); }
});
let exportUrl = null;
function openFileDialog(mode) {
  const exporting = mode === 'export';
  $('#file-title').textContent = exporting ? '带走这片风景' : '打开另一片风景';
  $('#file-description').textContent = exporting ? '下载 JSON 文件，或复制内容留存。其他浏览器可以导入同一片风景。' : '选择风景文件，或粘贴之前导出的内容。导入以后可以撤销。';
  $('#file-content').readOnly = exporting; $('#file-content').value = exporting ? serializeWorld(world) : '';
  $('#file-message').textContent = '';
  $('#choose-file').hidden = exporting; $('#apply-import').hidden = exporting;
  $('#copy-file').hidden = !exporting; $('#download-file').hidden = !exporting;
  if (exportUrl) { URL.revokeObjectURL(exportUrl); exportUrl = null; }
  if (exporting) {
    exportUrl = URL.createObjectURL(new Blob([serializeWorld(world)], { type: 'application/json' }));
    $('#download-file').href = exportUrl;
    $('#download-file').download = `一隅-${world.name.replace(/[\\/:*?"<>|]/g, '-')}.json`;
  }
  $('#file-dialog').showModal();
}
function adoptImport(text) {
  const restored = deserializeWorld(text);
  pushHistory(cloneWorld(world)); world = restored; dirty = true;
  engine.setWorld(world); updateUI(); $('#file-dialog').close(); notify('风景已导入。喜欢的话，记得保存。');
}
$('#export').addEventListener('click', () => openFileDialog('export'));
$('#import').addEventListener('click', () => openFileDialog('import'));
$('#close-file').addEventListener('click', () => $('#file-dialog').close());
$('#choose-file').addEventListener('click', () => $('#import-file').click());
$('#download-file').addEventListener('click', () => { $('#file-message').textContent = '下载已发起。若浏览器没有保存文件，可以复制上面的内容。'; });
$('#copy-file').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('#file-content').value); $('#file-message').textContent = '风景内容已复制。'; }
  catch { $('#file-content').focus(); $('#file-content').select(); $('#file-message').textContent = '请按 Ctrl+C 复制选中的风景内容。'; }
});
$('#apply-import').addEventListener('click', () => {
  try { adoptImport($('#file-content').value); }
  catch { $('#file-message').textContent = '这不是有效的风景存档，当前风景已保留。'; }
});
$('#import-file').addEventListener('change', async (event) => {
  const file = event.target.files[0]; if (!file) return;
  try {
    if (file.size > 1024 * 1024) throw new Error('File too large');
    adoptImport(await file.text());
  } catch { $('#file-message').textContent = '这个文件不是有效的风景存档，当前风景已保留。'; }
  event.target.value = '';
});
$('#panel-toggle').addEventListener('click', () => {
  const open = $('#editor-panel').classList.toggle('open'); $('#panel-toggle').setAttribute('aria-expanded', String(open));
});
try {
  const saved = loadWorld(localStorage);
  if (saved) { world = saved.world; savedAt = saved.savedAt; }
} catch { notify('之前的保存无法读取，先为你打开一片新的风景。', true); }
try {
  engine = await createScene(canvas); engine.setWorld(world); updateUI(); updateHint();
  canvas.dataset.ready = 'true'; $('#loading').hidden = true; $('#explore').disabled = false;
} catch (error) {
  console.error('Landscape initialization failed:', error);
  $('#loading').hidden = true; $('#error').hidden = false;
  $('#error-message').textContent = '请使用支持 WebGL 的浏览器，并通过子项目的本地服务器打开。若模型加载中断，可以重新打开。';
  canvas.dataset.ready = 'error';
}
