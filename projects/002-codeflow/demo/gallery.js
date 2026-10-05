(() => {
  const viewer = document.getElementById('native-viewer');
  if (!viewer) return;
  const viewDescriptions = {
    graph: {
      title: '文件关系图', english: 'Graph',
      see: '节点是文件，连线表示分析器提取的调用或引用关系。用整体分布识别中心文件与关联模块。',
      operate: '在原生画布中拖动节点、缩放与平移；点击文件节点查看细节，也可试试力导向、放射、分层、网格和地铁布局。',
      scenario: '第一次阅读项目，寻找关键模块、强关联文件与下一步的源码阅读入口。'
    },
    code: {
      title: '代码关联图', english: 'Code',
      see: '将文件关系图与代码卡片放在同一画布里，同时阅读结构位置、函数内容与关联线索。根层文件超过原生加载阈值时，可先选择目录或文件。',
      operate: '缩放和平移画布，选择文件查看代码卡片；通过布局选项对比不同排列。此快照的语法着色会漏出 HTML 标记；可在“查看示例源码”阅读原文。',
      scenario: '从结构总览进入实现细节，沿关联文件核对函数定义、引用和调用。'
    },
    graph3d: {
      title: '三维关系图', english: '3D Graph',
      see: '将文件和关系放进三维空间，观察二维投影里相互遮挡的节点及连线。',
      operate: '在原生三维画布中拖动调整观察角度，滚轮缩放；使用运行器内的视图控件继续探索。',
      scenario: '从空间分布探索关系较密集的代码图，为演示和结构观察增加另一个视角。'
    },
    treemap: {
      title: '矩形树图', english: 'Treemap',
      see: '嵌套矩形组织目录与文件，面积按源码行数（至少 1 行）编码，帮助比较不同目录及文件的相对占比。',
      operate: '在矩形区域查看文件标签，悬停或选择文件读取原生细节；结合目录着色辨认分组。',
      scenario: '识别体量集中在哪些目录，定位大文件，形成精简或拆分代码的调查清单。'
    },
    matrix: {
      title: '依赖矩阵', english: 'Matrix',
      see: '前 40 个文件排成矩阵：行是提供者，列是使用者；格子深浅表示关系 count 的累加，便于观察密集关联区域。',
      operate: '沿行列标签定位两端文件，悬停格子查看关系；点击格子选中该行对应的源文件。',
      scenario: '密集关系图连线难读时，比较文件之间的关联分布，寻找高耦合模块群。'
    },
    dendro: {
      title: '目录树', english: 'Tree',
      see: '将前 80 个文件排成根节点 → 目录组 → 文件的树状层级，突出文件的目录归属。',
      operate: '缩放、拖移并沿分支阅读路径。点文件选中，点目录进行过滤；此原生视图没有分支折叠功能。',
      scenario: '熟悉文件夹结构，检查项目的目录边界，并把路径与代码职责联系起来。'
    },
    sankey: {
      title: '关系流图', english: 'Flow',
      see: '最多展示 15 个目录的关联流向。双向引用通常取差值形成带宽，它不等于总调用量；剩余循环可能导致无法布局。',
      operate: '沿带状连线阅读目录两端，悬停查看原生提示；出现布局提示时，切换 Graph 或 Matrix 检查关联。',
      scenario: '讲解模块之间的关联流向，识别需要进一步阅读的跨模块连接。'
    },
    disjoint: {
      title: '目录簇图', english: 'Cluster',
      see: '前 100 个文件按目录分组，力导向布局将节点聚向预设的目录中心，同时保留跨目录关系。',
      operate: '缩放、平移并查看目录簇中的文件，选中节点查看原生细节，沿跨目录连线追查关联。',
      scenario: '对照文件目录和实际关系，观察目录内部结构及跨目录耦合。'
    },
    bundle: {
      title: '环形连线图', english: 'Bundle',
      see: '前 70 个文件按目录沿圆周排列，二次 Bézier 曲线呈现引用关系，方便观察目录内与跨目录连接。',
      operate: '沿圆周标签查找文件，悬停或选中节点高亮相关连线，查看关系的两端。',
      scenario: '对比目录之间的关联程度，用较整齐的整体图讲解项目结构。'
    },
    architecture: {
      title: '架构方块图', english: 'Block Diagram',
      see: '独立的 Architecture 规则结合导入、目录和代码特征，生成模块方块、角色与架构关联。',
      operate: '浏览原生方块和连接，查看模块标签与信息；此视图使用自身的架构布局，不使用上方五种关系图布局。',
      scenario: '快速说明项目分层和模块角色，随后到源码确认规则推断是否符合真实设计。'
    }
  };
  const tabs = [...document.querySelectorAll('[data-native-view]')];
  const panel = document.getElementById('native-view-panel');
  const status = document.getElementById('native-status');
  const statusText = status.querySelector('span');
  const name = document.getElementById('native-view-name');
  const layout = document.getElementById('native-layout');
  const color = document.getElementById('native-color');
  const stage = document.getElementById('native-stage');
  const fullscreen = document.getElementById('native-fullscreen');
  const actionNote = document.getElementById('native-action-note');
  let selectedView = 'graph';
  let pendingView = 'graph';
  let runtimeReady = false;

  function setStatus(state, message) {
    status.dataset.state = state;
    statusText.textContent = message;
  }
  function send(action, values = {}) {
    if (!viewer.contentWindow) return;
    try {
      viewer.contentWindow.postMessage({ type: 'codeflow-demo', action, ...values }, location.origin);
    } catch {
      setStatus('error', '无法连接原生运行器。请通过研究网站的 HTTP 预览打开本页。');
    }
  }
  function updateView(view) {
    selectedView = view;
    const description = viewDescriptions[view];
    tabs.forEach(tab => {
      const active = tab.dataset.nativeView === view;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    panel.setAttribute('aria-labelledby', `view-${view}`);
    const english = document.createElement('span');
    english.textContent = description.english;
    name.replaceChildren(document.createTextNode(`${description.title} `), english);
    document.getElementById('view-see').textContent = description.see;
    document.getElementById('view-operate').textContent = description.operate;
    document.getElementById('view-scenario').textContent = description.scenario;
    layout.disabled = !['graph', 'code'].includes(view);
    layout.title = layout.disabled ? '此视图使用自己的原生布局' : '切换关系图与代码图的布局';
    color.disabled = !['graph', 'code', 'graph3d'].includes(view);
    color.title = color.disabled ? '此视图使用自己的原生着色方式' : '按目录或分层给节点着色';
    document.getElementById('native-open').href = `./runtime/index.html?view=${view}&theme=dark`;
  }
  function selectView(view, focus = false) {
    updateView(view);
    pendingView = view;
    setStatus('loading', runtimeReady ? `正在切换 ${viewDescriptions[view].english} 原生视图…` : '正在加载原生分析器与示例项目…');
    send('view', { view, layout: layout.value, color: color.value });
    if (focus) document.getElementById(`view-${view}`).focus();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectView(tab.dataset.nativeView));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) {
        event.preventDefault();
        selectView(tabs[next].dataset.nativeView, true);
      }
    });
  });
  function applyOptions() {
    send('view', { view: selectedView, layout: layout.value, color: color.value });
  }
  layout.addEventListener('change', applyOptions);
  color.addEventListener('change', applyOptions);
  viewer.addEventListener('load', () => {
    runtimeReady = false;
    pendingView = selectedView;
    setStatus('loading', '原生运行器已载入，正在分析 Mini Shop 示例源码…');
    send('view', { view: selectedView, layout: layout.value, color: color.value });
  });
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== viewer.contentWindow) return;
    const data = event.data;
    if (!data || typeof data !== 'object' || data.type !== 'codeflow-demo-state') return;
    if (data.error) {
      setStatus('error', `原生运行器报告错误：${String(data.error)}`);
      return;
    }
    const counts = [['files', '文件'], ['connections', '连接'], ['functions', '函数']]
      .filter(([key]) => typeof data[key] === 'number' && Number.isFinite(data[key]))
      .map(([key, label]) => `${data[key]} ${label}`);
    if (counts.length && (data.analysisReady || data.ready)) document.getElementById('native-counts').textContent = `原生分析结果 · ${counts.join(' / ')}`;
    const view = Object.hasOwn(viewDescriptions, data.view) ? data.view : null;
    if (!pendingView) {
      if (view && view !== selectedView) updateView(view);
      if ([...layout.options].some(option => option.value === data.layout)) layout.value = data.layout;
      if ([...color.options].some(option => option.value === data.color)) color.value = data.color;
    }
    if (!data.ready) {
      setStatus('loading', data.analysisReady ? `正在渲染 ${viewDescriptions[selectedView].english} 原生视图…` : '正在由原生分析器读取与分析示例源码…');
      return;
    }
    runtimeReady = true;
    if (pendingView && view !== pendingView) {
      send('view', { view: pendingView, layout: layout.value, color: color.value });
      return;
    }
    pendingView = null;
    if (view && view !== selectedView) updateView(view);
    setStatus('ready', `${viewDescriptions[selectedView].english} 原生视图已就绪`);
  });
  fullscreen.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement === stage) {
        await document.exitFullscreen();
      } else if (stage.requestFullscreen) {
        await stage.requestFullscreen();
      } else {
        actionNote.textContent = '当前环境不支持大屏模式，可使用“单独打开”查看完整原生页面。';
      }
    } catch {
      actionNote.textContent = '当前环境未允许大屏模式，可使用“单独打开”查看完整原生页面。';
    }
  });
  document.addEventListener('fullscreenchange', () => {
    const active = document.fullscreenElement === stage;
    fullscreen.textContent = active ? '退出大屏 ⛶' : '大屏模式 ⛶';
    fullscreen.setAttribute('aria-pressed', String(active));
    actionNote.textContent = active ? '已进入大屏模式，按 Esc 或“退出大屏”返回。' : '';
  });
  updateView(selectedView);
})();
