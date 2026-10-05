(() => {
  // The source project and generated site have different directory depths.
  const catalogLink = document.getElementById('catalog-link');
  if (catalogLink && location.pathname.replaceAll('\\', '/').includes('/projects/002-codeflow/demo/')) {
    catalogLink.href = '../../../site/index.html';
  }

  // This graph is a fixed teaching example; no repository or source is fetched.
  const graph = {
    pricing: { file: 'pricing.ts', users: ['checkout'] },
    checkout: { file: 'checkout.ts', users: ['orders'] },
    orders: { file: 'orders.ts', users: ['routes'] },
    routes: { file: 'routes.ts', users: ['app'] },
    app: { file: 'app.ts', users: [] }
  };
  const nodeButtons = [...document.querySelectorAll('[data-node]')];
  const depthButtons = [...document.querySelectorAll('[data-depth]')];
  const edges = [...document.querySelectorAll('[data-edge]')];
  const status = document.getElementById('impact-status');
  const list = document.getElementById('impact-list');
  let selected = 'pricing';
  let maxDepth = 3;

  function distancesFrom(start) {
    const distances = new Map([[start, 0]]);
    const queue = [start];
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor];
      graph[current].users.forEach(user => {
        if (!distances.has(user)) {
          distances.set(user, distances.get(current) + 1);
          queue.push(user);
        }
      });
    }
    return distances;
  }

  function renderImpact() {
    const distances = selected ? distancesFrom(selected) : new Map();
    const candidates = [...distances].filter(([, depth]) => depth > 0 && depth <= maxDepth);
    const excluded = [...distances].filter(([, depth]) => depth > maxDepth);
    nodeButtons.forEach(button => {
      const id = button.dataset.node;
      const depth = distances.get(id);
      const isSource = id === selected;
      const label = button.querySelector('.node-depth');
      button.classList.toggle('is-source', isSource);
      button.classList.toggle('is-direct', depth === 1);
      button.classList.toggle('is-indirect', depth > 1 && depth <= maxDepth);
      button.classList.toggle('is-outside', depth > maxDepth);
      button.setAttribute('aria-pressed', String(isSource));
      const description = isSource ? '选中源文件' : depth === undefined ? '' : depth > maxDepth ? `第 ${depth} 层 · 不计入` : `第 ${depth} 层`;
      label.textContent = description;
      button.setAttribute('aria-label', `${graph[id].file}${description ? `，${description}` : '，点击查看潜在影响'}`);
    });
    edges.forEach(edge => {
      const [, user] = edge.dataset.edge.split(':');
      const depth = distances.get(user);
      edge.classList.toggle('is-active', depth === 1);
      edge.classList.toggle('is-indirect', depth > 1 && depth <= maxDepth);
    });
    depthButtons.forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.depth) === maxDepth)));
    list.replaceChildren();
    if (!selected) {
      status.textContent = '选择一个文件，查看它的直接或最多 3 层潜在影响候选。箭头从提供者指向使用者。';
      return;
    }
    candidates.forEach(([id, depth]) => {
      const item = document.createElement('li');
      const number = document.createElement('span');
      const file = document.createElement('code');
      const relation = document.createElement('small');
      number.textContent = String(depth);
      file.textContent = graph[id].file;
      relation.textContent = depth === 1 ? '直接使用者' : '间接使用者';
      item.append(number, file, relation);
      list.append(item);
    });
    const depthDescription = maxDepth === 1 ? '仅查看直接使用者' : '最多追踪 3 层';
    let message = `${graph[selected].file}：${depthDescription}，找到 ${candidates.length} 个潜在影响文件。`;
    if (excluded.length) {
      message += maxDepth === 3
        ? `${excluded.map(([id, depth]) => `${graph[id].file} 在第 ${depth} 层`).join('、')}，不计入。`
        : `另有 ${excluded.length} 个间接使用者，当前不计入。`;
    } else if (!candidates.length) {
      message += '此教学图中没有使用该文件的后续节点。';
    }
    status.textContent = message;
  }

  nodeButtons.forEach(button => button.addEventListener('click', () => {
    selected = button.dataset.node;
    renderImpact();
  }));
  depthButtons.forEach(button => button.addEventListener('click', () => {
    maxDepth = Number(button.dataset.depth);
    renderImpact();
  }));
  document.getElementById('reset-impact').addEventListener('click', () => {
    selected = null;
    maxDepth = 3;
    renderImpact();
  });
  renderImpact();

  const tabs = [...document.querySelectorAll('[role="tab"][data-scenario]')];
  function selectTab(tab, focus = false) {
    tabs.forEach(item => {
      const active = item === tab;
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
      document.getElementById(item.getAttribute('aria-controls')).hidden = !active;
    });
    if (focus) tab.focus();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) {
        event.preventDefault();
        selectTab(tabs[next], true);
      }
    });
  });
})();
