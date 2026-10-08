import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const check = process.argv.includes('--check');
const commit = 'a7e7edb8c6803d88aeb25c6a0412657c01835bc5';
const blob = `https://github.com/stanfordnlp/dspy/blob/${commit}`;
const escape = value => value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const inline = value => escape(value).replace(/\[([^\]]+)\]\((https:\/\/[^)]+)\)/g, '<a href="$2">$1</a>').replace(/`([^`]+)`/g, '<code>$1</code>');
const groups = {
  LabeledFewShot: ['demos','示例设置'],
  BootstrapFewShot: ['demos','轨迹引导示例'],
  BootstrapFewShotWithRandomSearch: ['demos','示例随机搜索'],
  BootstrapFewShotWithOptuna: ['demos','Optuna 索引搜索'],
  MIPROv2: ['instructions demos','指令与示例联合搜索'],
  COPRO: ['instructions','指令与前缀搜索'],
  SIMBA: ['instructions demos','规则与示例小批次搜索'],
  GEPA: ['instructions','反思演化'],
  KNNFewShot: ['demos runtime','推理时邻近示例'],
  InferRules: ['instructions demos','自然语言规则归纳'],
  AvatarOptimizer: ['instructions','工具流程指令优化'],
  BootstrapFinetune: ['weights','后端权重训练'],
  BetterTogether: ['composition weights instructions demos','优化流程组合'],
  Ensemble: ['runtime composition','推理时集成']
};
const notes = readFileSync(join(root,'notes.md'),'utf8');
const table = notes.split('## 优化相关类与算法的完整映射')[1]?.split('\n## ')[0];
if (!table) throw new Error('Algorithm table is missing from notes.md.');
const rows = table.split('\n').filter(line => /^\| [A-Z]/.test(line)).map(line => line.split('|').slice(1,-1).map(cell => cell.trim()));
if (rows.length !== 14) throw new Error(`Expected 14 algorithms, found ${rows.length}.`);
const cards = rows.map(([name, mechanism, target, source]) => {
  if (!groups[name]) throw new Error(`Unknown algorithm: ${name}`);
  const [categories,label] = groups[name];
  return `<article class="algorithm-card" data-groups="${categories}"><span class="badge">${label}</span><h3>${escape(name)}</h3><p>${inline(mechanism)}</p><p class="target"><strong>优化对象：</strong>${inline(target)}</p>${inline(source)}</article>`;
}).join('\n');
const image = readFileSync(join(root,'assets','dspy-overview.png'));
if (!image.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw new Error('Overview image must be PNG.');
const width = image.readUInt32BE(16), height = image.readUInt32BE(20);
let page = readFileSync(join(root,'web','index.html'),'utf8');
page = page.replace('{{ALGORITHMS}}',cards).replaceAll('{{DSPY_BLOB}}',blob).replaceAll('{{IMAGE_WIDTH}}',String(width)).replaceAll('{{IMAGE_HEIGHT}}',String(height));
if (/\{\{[A-Z_]+\}\}|REMAINING_CHAPTERS/.test(page)) throw new Error('Unresolved page placeholder.');
const files = new Map([
  ['index.html',Buffer.from(page)],
  ['styles.css',readFileSync(join(root,'web','styles.css'))],
  ['app.js',readFileSync(join(root,'web','app.js'))],
  ['dspy-overview.png',image],
  ['image-prompt.txt',readFileSync(join(root,'assets','image-prompt.txt'))]
]);
let stale = 0;
for (const [name, content] of files) {
  const destination = join(root,'demo',name);
  const matches = existsSync(destination) && readFileSync(destination).equals(content);
  if (!matches) {
    stale++;
    if (!check) { mkdirSync(dirname(destination),{recursive:true}); writeFileSync(destination,content); }
  }
}
if (check && stale) throw new Error(`${stale} research page files are out of date.`);
console.log(`DSPy research page ${check ? 'verified' : 'built'}: ${rows.length} algorithms, ${width}×${height} overview, ${stale} ${check ? 'out of date' : 'updated'} files.`);
