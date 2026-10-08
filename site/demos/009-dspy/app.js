/* Reading controls only. This page does not call a model or run an optimizer. */
const filters = [...document.querySelectorAll('[data-filter]')];
const cards = [...document.querySelectorAll('.algorithm-card')];
const count = document.getElementById('algorithm-count');
filters.forEach(button => button.addEventListener('click', () => {
  const category = button.dataset.filter;
  let visible = 0;
  cards.forEach(card => {
    card.hidden = category !== 'all' && !card.dataset.groups.split(' ').includes(category);
    if (!card.hidden) visible++;
  });
  filters.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  count.textContent = `显示 ${visible} / ${cards.length} 个优化相关类；GRPO 单独列为实验路径。`;
}));

const tabs = [...document.querySelectorAll('[role="tab"]')];
const panels = [...document.querySelectorAll('[role="tabpanel"]')];
function selectTab(tab, focus = false) {
  tabs.forEach(item => {
    const active = item === tab;
    item.setAttribute('aria-selected', String(active));
    item.tabIndex = active ? 0 : -1;
  });
  panels.forEach(panel => { panel.hidden = panel.id !== tab.getAttribute('aria-controls'); });
  if (focus) tab.focus();
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', event => {
    const movements = {ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index - 1 + tabs.length) % tabs.length, Home: 0, End: tabs.length - 1};
    if (event.key in movements) { event.preventDefault(); selectTab(tabs[movements[event.key]], true); }
  });
});
if (tabs.length) selectTab(tabs[0]);

const modal = document.getElementById('overview-dialog');
const openImage = document.getElementById('open-overview');
const closeImage = document.getElementById('close-overview');
openImage?.addEventListener('click', () => {
  if (typeof modal.showModal === 'function') modal.showModal();
  else window.open('./dspy-overview.png', '_blank', 'noopener');
});
closeImage?.addEventListener('click', () => modal.close());
modal?.addEventListener('click', event => { if (event.target === modal) modal.close(); });
modal?.addEventListener('close', () => openImage.focus());

const navLinks = [...document.querySelectorAll('.rail nav a')];
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    const active = entries.filter(entry => entry.isIntersecting).sort((a,b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
    if (!active) return;
    navLinks.forEach(link => {
      if (link.hash === `#${active.target.id}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }, {rootMargin: '-8% 0px -65% 0px', threshold: 0});
  document.querySelectorAll('main > section[id]').forEach(section => observer.observe(section));
}
