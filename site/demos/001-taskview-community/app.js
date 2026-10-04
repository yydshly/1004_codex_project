(() => {
  // Source preview and the generated catalog use different directory depths.
  if (location.pathname.includes('/projects/001-taskview-community/demo/')) {
    document.getElementById('catalog-link').href = '../../../site/index.html';
  }
  const tabs = [...document.querySelectorAll('[role="tab"][data-mode]')];
  const detail = document.querySelector('.connection-detail');
  const descriptions = {
    human: '当前场景：成员执行实际工作，TaskView 记录与协调任务。',
    local: '当前场景：本地 Agent 经 stdio MCP 操作任务，具体工具和执行能力由 Agent 提供。',
    backend: '当前场景：后台 Agent 经 HTTP MCP 或 API 接入；自动领取、执行调度与验收需我们补充。'
  };
  function select(tab, focus = false) {
    tabs.forEach(item => {
      const active = item === tab;
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
      document.getElementById(item.getAttribute('aria-controls')).hidden = !active;
    });
    detail.textContent = descriptions[tab.dataset.mode];
    if (focus) tab.focus();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) {
        event.preventDefault();
        select(tabs[next], true);
      }
    });
  });
})();
