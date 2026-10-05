const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const text = value => escapeHTML(value);
const paragraph = (value, className = '') => value ? `<p${className ? ` class="${className}"` : ''}>${text(value)}</p>` : '';
const list = items => items?.length ? `<ul>${items.map(item => `<li>${text(item)}</li>`).join('')}</ul>` : '';
const fact = (label, value) => value ? `<div class="fact-row"><span class="fact-label">${text(label)}</span><span class="fact-value">${text(value)}</span></div>` : '';
const externalLink = (href, label, className = 'card-link') => href ? `<a class="${className}" href="${text(href)}"${/^https?:/.test(href) ? ' target="_blank" rel="noopener"' : ''}>${text(label)} ↗</a>` : '';
const render = (id, markup) => { document.getElementById(id).innerHTML = markup; };

function imageCard({src, title, caption, provenance, kind = 'actual', source, wide = false}) {
  return `<figure class="image-card${wide ? ' wide' : ''}"><button type="button" class="image-button" data-image="${text(src)}" data-title="${text(title)}" data-caption="${text(`${provenance} · ${caption}`)}" aria-label="放大查看：${text(title)}"><img src="${text(src)}" alt="${text(title)}" loading="lazy" decoding="async"></button><figcaption class="image-caption"><span class="source-badge ${kind}">${text(provenance)}</span><h4>${text(title)}</h4>${paragraph(caption)}${externalLink(source, '查看原始来源', '')}</figcaption></figure>`;
}

function evidenceGallery() {
  const official = 'https://store.steampowered.com/app/5246700/';
  return `<div class="evidence-block"><div class="evidence-heading"><h3>原游戏：Defilade 公开展示</h3><span class="source-badge official">官方 Steam 截图 · 外部参考</span></div><p class="evidence-note">保留原作实际公开画面，用来观察场景组织与美术完成度。以下不是我们的渲染，也没有据此推断原作的面数、贴图尺寸或内部管线。</p><div class="image-grid">${imageCard({src:'./assets/defilade-official-overview.jpg', title:'Defilade · 场景整体参考', caption:'观察道路、建筑、植被、单位和活动空间怎样组成一块可读的战场。', provenance:'原游戏官方公开画面',kind:'official',source:official})}${imageCard({src:'./assets/defilade-official-detail.jpg',title:'Defilade · 模型与环境参考',caption:'观察对象密度、材料区别、尺度关系与场景痕迹。此图仅承担视觉参考作用。',provenance:'原游戏官方公开画面',kind:'official',source:official})}</div></div>
  <div class="evidence-block"><div class="evidence-heading"><h3>我们的 V1：建立比较框架</h3><span class="source-badge actual">原创 Three.js · 实际渲染</span></div><div class="image-grid">${imageCard({src:'./assets/v1-scene.png',title:'第一轮 · 场景与风格的结构样板',caption:'先建立可观察的中景，再比较场景、风格、细节、光照与动态。画面里的简化形体也是这一轮的制作局限。',provenance:'V1 本地实时样板截图',wide:true,source:'../versions/v1/'})}</div></div>
  <div class="evidence-block"><div class="evidence-heading"><h3>我们的 V2：同构图场景细化</h3><span class="source-badge actual">同机位 · 自然风格 · 实际渲染</span></div><p class="evidence-note">保持主要布局、镜头和光向，检查建筑构造、地表、植被与道具的可见收益。比较支持“画面更完整”，尚未量化玩家体感。</p><div class="image-grid">${imageCard({src:'./assets/v2-baseline.png',title:'第二轮 · 基础体块',caption:'对象和空间关系已经成立，模型构造、材料层次与生活痕迹仍较概括。',provenance:'V2 基础阶段实际 PNG',source:'../versions/v2/detail-study/'})}${imageCard({src:'./assets/v2-refined.png',title:'第二轮 · 细化场景',caption:'补充曲瓦、砌石、门窗厚度、分枝叶卡、地表色斑、草簇、车辙与车辆细部。',provenance:'V2 细化阶段实际 PNG',source:'../versions/v2/detail-study/'})}</div></div>
  <div class="evidence-block"><div class="evidence-heading"><h3>我们的 V3：人物的尺度与动作线索</h3><span class="source-badge actual">同机位 · 站立姿态 · 实际渲染</span></div><p class="evidence-note">人物制作目前暂停，保留这一轮的改进和局限作为证据。近景展示比例与服饰变化，不代表正式骨骼动画和资产已经完成。</p><div class="image-grid">${imageCard({src:'./assets/v3-baseline.png',title:'第三轮 · 基础人物',caption:'用于比较的简化人物；以同角色、同姿态、同光照和同镜头留下基线。',provenance:'V3 基础人物实际 PNG',source:'../detail-study/#character-study'})}${imageCard({src:'./assets/v3-refined.png',title:'第三轮 · 细化人物',caption:'帽子、衣领、袖口、口袋、背包和鞋靴可辨；肩肘、面部、布料与步态仍简化。',provenance:'V3 细化人物实际 PNG',source:'../detail-study/#character-study'})}</div></div>
  <div class="evidence-block"><div class="evidence-heading"><h3>AI 概念图：描述风格方向</h3><span class="source-badge concept">AI 生成 · 美术方向目标</span></div><div class="image-grid">${imageCard({src:'./assets/style-triptych.png',title:'同一村落的三种概念方向',caption:'自然写实、温暖微缩与荒凉废土的方向表达。它用于沟通预期气质，不是原游戏截图，也不是已经实现的运行画面。',provenance:'AI 概念三联图 · 非实时渲染',kind:'concept',wide:true})}</div></div>`;
}

function renderContent(data) {
  document.title = `${data.meta.title} — 中景 FIELD ATLAS`;
  document.querySelector('.hero > .eyebrow').textContent = data.hero.eyebrow;
  document.getElementById('page-title').textContent = data.hero.title;
  document.getElementById('hero-lead').textContent = data.hero.description;
  document.getElementById('hero-meta').innerHTML = `<span>更新 ${text(data.meta.date)} · 原作参考／实际样板／设计假设</span><span>人物模型暂停在 V3</span>`;
  document.getElementById('conclusion-title').textContent = data.hero.conclusion;
  render('summary-content', `<div class="summary-grid">${data.summary.items.map(item => `<div class="summary-item"><h3>${text(item.title)}</h3>${paragraph(item.description)}</div>`).join('')}</div>`);

  render('journey-content', `<div class="timeline">${data.journey.items.map(item => `<article class="card"><span class="tag">${text(item.step)}</span><div><h3>${text(item.title)}</h3>${paragraph(item.description)}</div></article>`).join('')}</div>`);

  const kindTags = {official:'官方描述',observation:'视觉观察',hypothesis:'设计假设',implementation:'实际实现'};
  render('evidence-content', `${evidenceGallery()}<h3 class="subheading">这些依据分别能说明什么</h3><div class="card-grid">${data.evidence.items.map(item => `<article class="card"><span class="tag">${text(kindTags[item.kind] || item.label)}</span><h3>${text(item.title)}</h3>${paragraph(item.description)}${fact('支持判断',item.supports)}${fact('尚未证明',item.doesNotProve)}${externalLink(item.source,'查看来源')}</article>`).join('')}</div>`);

  render('mechanism-content', `<div class="relation-chain">${data.mechanism.formula.split(/\s*×\s*|\s*→\s*/).map((part,index) => `${index ? `<i aria-hidden="true">${index === 5 ? '→' : '×'}</i>` : ''}<span>${text(part)}</span>`).join('')}</div>${paragraph(data.mechanism.formulaNote,'lead')}<div class="card-grid">${data.mechanism.items.map(item => `<article class="card"><h3>${text(item.title)}</h3>${fact('表现输入',item.input)}${fact('作用原理',item.mechanism)}${fact('预期体感',item.effect)}${fact('观察例子',item.example)}${fact('可以沉淀',item.reusable)}</article>`).join('')}</div><div class="callout">${text(data.mechanism.outcomeNote)}</div>`);

  render('styles-content', `<div class="card-grid three">${data.styles.items.map(item => `<article class="card"><span class="tag">${text(item.id.toUpperCase())}</span><h3>${text(item.title)}</h3>${fact('表现规则',item.visual)}${fact('体感假设',item.hypothesis)}${fact('候选使用',item.application)}${fact('当前局限',item.limit)}</article>`).join('')}</div>`);

  render('iterations-content', `<div class="card-grid">${data.iterations.items.map(item => `<article class="card"><span class="tag">${text(item.state)}</span><h3>${text(item.title)}</h3>${fact('要回答',item.question)}${item.implemented.length ? `<h4>实际做了什么</h4>${list(item.implemented)}` : ''}${fact('观察结果',item.observed)}${fact('仍有差距',item.limit)}${fact('保留证据',item.evidence)}${externalLink(item.href,'打开当时的样板')}</article>`).join('')}</div>`);

  render('comparison-content', `<ol class="numbered-list">${data.comparisonMethod.items.map((item,index) => `<li><span class="step-number">${String(index+1).padStart(2,'0')}</span><div><strong>${text(item.title)}</strong>${text(item.description)}</div></li>`).join('')}</ol>`);

  render('use-cases-content', `<div class="card-grid">${data.useCases.items.map(item => `<article class="card"><span class="tag">${text(item.stage)}</span><h3>${text(item.title)}</h3>${paragraph(item.description)}${fact('使用价值',item.value)}</article>`).join('')}</div>`);

  render('value-content', `<div class="card-grid">${data.reusableValue.items.map(item => `<article class="card"><h3>${text(item.title)}</h3>${paragraph(item.description)}</article>`).join('')}</div>`);

  render('extension-content', `<p class="lead">${text(data.extensionLayers.title)}</p><div class="relation-chain">${data.extensionLayers.items.map((item,index) => `${index ? '<i aria-hidden="true">→</i>' : ''}<span>${text(item.title)}</span>`).join('')}</div><div class="card-grid">${data.extensionLayers.items.map(item => `<article class="card"><span class="tag">LAYER ${text(item.level)}</span><h3>${text(item.title)}</h3>${fact('核心问题',item.question)}${fact('扩展例子',item.examples)}${fact('前置条件',item.prerequisite)}${fact('当前现状',item.current)}</article>`).join('')}</div><div class="callout"><strong>用一个乡村把四层接起来：</strong><br>${text(data.extensionLayers.example)}</div>`);

  render('status-content', `<p class="lead">${text(data.status.verdict)}</p><div class="card-grid"><article class="card"><span class="tag">DONE / 已有</span><h3>现在已经能用</h3>${list(data.status.done)}</article><article class="card"><span class="tag">NOT DONE / 未完成</span><h3>还不能据此认定完成</h3>${list(data.status.notDone)}</article></div><div class="callout"><strong>暂停范围：</strong>${text(data.status.paused.join(' '))}<br>${text(data.status.boundary)}</div>`);

  render('next-content', `<h3 class="subheading">${text(data.nextCandidates.title)}</h3>${paragraph(data.nextCandidates.note,'lead')}<div class="card-grid three">${data.nextCandidates.items.map(item => `<article class="card"><span class="tag">${text(item.priority)} · ${text(item.state)}</span><h3>${text(item.title)}</h3>${fact('可以做',item.action)}${fact('验证什么',item.question)}${fact('预期价值',item.value)}</article>`).join('')}</div>`);

  render('principles-content', `<h3 class="subheading">${text(data.principles.title)}</h3><ol class="numbered-list">${data.principles.items.map((item,index) => `<li><span class="step-number">${String(index+1).padStart(2,'0')}</span><span>${text(item)}</span></li>`).join('')}</ol>`);

  const typeNames = {official:'官方来源',reference:'参考入口',local:'本地研究记录'};
  render('sources-content', `<ul class="source-list">${data.sources.map(item => `<li><span class="source-type">${text(typeNames[item.type] || item.type)}</span>${item.href ? externalLink(item.href,item.title,'') : `<span>${text(item.title)}</span>`}${paragraph(item.note)}${item.checkedOn ? paragraph(`查阅日期：${item.checkedOn}`) : ''}${item.files ? paragraph(`记录文件：${item.files.join(' · ')}`) : ''}</li>`).join('')}<li><span class="source-type">图像来源</span><span>三类画面分别保留身份</span><p>原作图片来自 Defilade 的公开 Steam 商店截图，相关权利属于原权利人；本页用于参考说明。V1–V3 图片为本项目实际渲染与截图，AI 三联图为本项目概念方向图。总览图为这些既有素材与文字的整理。</p></li><li><span class="source-type">交付形式</span><span>本地页面与可下载总览图</span><p>PNG 便于回顾和分享；SVG 保留文字和图形结构，包含嵌入的画面素材。人物与玩法未在本次整理中继续扩展。</p></li></ul>`);
}

const dialog = document.getElementById('image-dialog');
document.addEventListener('click', event => {
  const button = event.target.closest('[data-image]');
  if (!button) return;
  document.getElementById('image-dialog-title').textContent = button.dataset.title;
  const image = document.getElementById('image-dialog-image');
  image.src = button.dataset.image;
  image.alt = button.dataset.title;
  document.getElementById('image-dialog-caption').textContent = button.dataset.caption;
  document.getElementById('image-dialog-original').href = button.dataset.image;
  if (!dialog.open) dialog.showModal();
});
document.getElementById('image-dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
});

try {
  const response = await fetch('./content.json');
  if (!response.ok) throw new Error(`Research content ${response.status}`);
  const data = await response.json();
  renderContent(data);
} catch (error) {
  document.getElementById('load-error').hidden = false;
  document.getElementById('summary-content').textContent = '完整记录暂时无法加载；可查看总览图或返回项目工作台。';
  console.error('Understanding page:', error);
}
