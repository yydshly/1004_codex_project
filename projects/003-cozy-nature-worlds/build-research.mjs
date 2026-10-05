/** Build readable static research pages from the project's canonical Markdown. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Marked, Renderer } from './tools/vendor/marked/marked.esm.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(root, '../..');
const demo = path.join(root, 'demo');
const destination = path.join(demo, 'research');
const check = process.argv.includes('--check');
const docs = [
  ['expansion-plan.md', '扩展计划'], ['README.md', '理解导览'],
  ['objectives.md', '目标与验收'], ['notes.md', '过程记录'],
  ['implementation.md', '实现方式'], ['verification.md', '验证报告'],
  ['prototype-plan.md', '原型计划'], ['visual-analysis.md', '视觉研究'],
  ['technical-research.md', '技术研究'], ['product-research.md', '产品研究'],
].map(([source, label]) => ({ source, label, page: source.replace(/\.md$/i, '.html') }));
const pages = new Map(docs.map(doc => [path.join(root, doc.source), doc.page]));
const outputs = new Map();
const baseRenderer = new Renderer();
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const inside = (base, target) => { const relative = path.relative(base, target); return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative); };
const urlPath = value => value.split('/').map(encodeURIComponent).join('/');
const headingSlug = text => text.replace(/<[^>]*>/g, '').replace(/[`*_]/g, '').toLowerCase().replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, '').trim().replace(/\s/g, '-');

async function linkTo(href) {
  if (!href || href.startsWith('#')) return href || '#';
  if (/^[a-z][a-z\d+.-]*:/i.test(href)) {
    if (!/^(https?:|mailto:)/i.test(href)) throw new Error(`Unsupported link: ${href}`);
    return href;
  }
  const [filename, fragment] = href.split('#', 2);
  const target = path.resolve(root, decodeURIComponent(filename));
  const suffix = fragment ? `#${fragment}` : '';
  if (pages.has(target)) return `./${pages.get(target)}${suffix}`;
  if (inside(demo, target)) {
    await readFile(target); // Fail the build on a broken local reference.
    return `../${urlPath(path.relative(demo, target).split(path.sep).join('/'))}${suffix}`;
  }
  if (inside(root, target)) {
    const relative = path.relative(root, target).split(path.sep).join('/');
    const output = relative.startsWith('assets/') ? relative : `files/${relative}`;
    outputs.set(output, await readFile(target));
    return `./${urlPath(output)}${suffix}`;
  }
  if (inside(repo, target)) {
    await readFile(target);
    return `https://github.com/yydshly/1004_codex_project/blob/main/${urlPath(path.relative(repo, target).split(path.sep).join('/'))}${suffix}`;
  }
  throw new Error(`Local link outside repository: ${href}`);
}

for (const doc of docs) {
  const source = await readFile(path.join(root, doc.source), 'utf8');
  outputs.set(`source/${doc.source}`, Buffer.from(source));
  const headings = [], usedIds = new Map(), links = new Map();
  const parser = new Marked({ gfm: true });
  const tokens = parser.lexer(source);
  const pending = [];
  parser.walkTokens(tokens, token => {
    if ((token.type === 'link' || token.type === 'image') && !links.has(token.href)) {
      const href = token.href;
      links.set(href, null);
      pending.push(linkTo(href).then(result => links.set(href, result)));
    }
  });
  await Promise.all(pending);
  parser.use({ renderer: {
    heading(token) {
      const base = headingSlug(token.text) || 'section';
      const count = usedIds.get(base) || 0;
      usedIds.set(base, count + 1);
      const id = `${base}${count ? `-${count}` : ''}`;
      const text = this.parser.parseInline(token.tokens);
      if (token.depth === 2) headings.push({ id, text });
      return `<h${token.depth} id="${escape(id)}">${text}</h${token.depth}>\n`;
    },
    link(token) {
      const href = links.get(token.href);
      const external = /^https?:/i.test(href);
      return `<a href="${escape(href)}"${token.title ? ` title="${escape(token.title)}"` : ''}${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${this.parser.parseInline(token.tokens)}</a>`;
    },
    image(token) { return `<img src="${escape(links.get(token.href))}" alt="${escape(token.text)}" loading="lazy">`; },
    html(token) { return /^\s*<!--[\s\S]*-->\s*$/.test(token.text) ? '' : escape(token.text); },
    table(token) { return `<div class="table-scroll" role="region" aria-label="文档表格" tabindex="0">${baseRenderer.table.call(this, token)}</div>`; },
  } });
  const content = parser.parser(tokens);
  const navigation = docs.map(item => `<a href="./${item.page}"${item === doc ? ' aria-current="page"' : ''}>${item.label}</a>`).join('\n');
  const toc = headings.map(item => `<a href="#${escape(item.id)}">${item.text}</a>`).join('\n');
  const status = doc.source === 'expansion-plan.md' ? '下一轮扩展方案 · 尚未实施' : doc.source === 'README.md' ? '首轮研究已交付 · 功能底座 · 扩展暂停' : '研究与开发记录';
  outputs.set(doc.page, Buffer.from(`<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f6f5ed"><title>${doc.label} · 一隅</title><link rel="icon" href="data:,"><link rel="stylesheet" href="./research.css"></head>
<body><a class="skip" href="#document">跳到正文</a>
<header class="research-header"><a class="research-brand" href="./README.html">一隅 <span>自然空间研究</span></a><a class="return-demo" href="../index.html">试玩原型 <span aria-hidden="true">↗</span></a></header>
<div class="research-layout"><aside class="documents"><div class="nav-label">关联文档</div><nav aria-label="项目文档">${navigation}</nav><a class="original" href="./source/${doc.source}" target="_blank" rel="noopener">查看原始文档 ↗</a></aside>
<main id="document"><div class="document-status">${status}</div><article>${content}</article><footer>一隅 · 自然氛围与可探索造景研究</footer></main>
<aside class="contents"><div class="nav-label">本页内容</div><nav aria-label="本页目录">${toc}</nav></aside></div>
</body></html>\n`));
}

let changed = 0;
for (const [relative, bytes] of outputs) {
  const target = path.join(destination, relative);
  const previous = await readFile(target).catch(() => null);
  if (previous?.equals(bytes)) continue;
  changed++;
  if (check) { console.error(`Research page out of date: ${relative}`); continue; }
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes);
}
if (check && changed) process.exitCode = 1;
else console.log(`Research pages ${check ? 'verified' : 'built'}: ${docs.length} documents, ${changed} files ${check ? 'out of date' : 'updated'}.`);
