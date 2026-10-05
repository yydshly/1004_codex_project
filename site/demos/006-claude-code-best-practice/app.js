"use strict";
(() => {
  const SHA = "870f39e36b6aaf63a31edc0bfdb5f20ef14c4d82";
  const source = (path) => `https://github.com/shanraisshan/claude-code-best-practice/blob/${SHA}/${path}`;
  document.querySelectorAll("[data-source]").forEach((link) => { link.href = source(link.dataset.source); });
  // The same static files work in the project directory and in the generated catalog.
  const projectView = /\/projects\/006-claude-code-best-practice\/demo(?:\/|$)/.test(location.pathname);
  if (projectView) document.querySelectorAll(".catalog-link").forEach((link) => { link.href = "../../../site/index.html"; });
  const put = (id, value) => { document.getElementById(id).textContent = value; };
  const capabilities = {
    memory: { name: "让新会话知道项目怎么工作。", description: "把目录结构、构建与测试命令、开发约定写进 CLAUDE.md；按目录组织规则，用记忆保存可重复使用的经验。", input: "项目说明、路径规则、可持续维护的经验记录。", process: "Claude Code 加载相关文字，模型结合实际源码进行判断。", output: "更一致的项目上下文，减少重复输入与环境摸索。", file: "CLAUDE.md · 简化示意", code: "# 项目约定\n构建：npm run build\n测试：npm test\n新增功能沿用现有目录与命名。", boundary: "文字规范进入模型上下文；强制操作限制需要权限配置或能阻断的事件检查。", source: "CLAUDE.md" },
    command: { name: "用一个任务入口启动重复流程。", description: "命令文件保存目标、输入和流程要求。用户通过斜杠命令调用，主会话依据内容询问偏好、委派任务并汇总交付。", input: "一次命令调用，以及参数或用户回答。", process: "Claude Code 加载命令内容，模型使用现有工具逐步执行。", output: "统一的任务入口，清楚的步骤与预期交付。", file: ".claude/commands/weather-orchestrator.md · 简化示意", code: "/weather-orchestrator\n1. 询问温度单位\n2. Agent(weather-agent)\n3. Skill(weather-svg-creator)", boundary: "这是面向模型的工作流指令。步骤之间的校验要求仍需结合实际工具调用与产出验证。", source: ".claude/commands/weather-orchestrator.md" },
    skill: { name: "把有效做法保存下来，需要时再加载。", description: "SKILL.md 描述何时使用、如何完成任务；目录还能包含参考模板、示例和脚本。仓库用天气查询和 SVG 生成展示技能的复用。", input: "技能描述、任务指令，以及可选参考资料。", process: "通常先提供名称与描述；调用时加载完整内容。子代理也可预加载指定技能。", output: "可复用的领域知识、输出模板与任务做法。", file: ".claude/skills/weather-svg-creator/SKILL.md · 简化示意", code: "name: weather-svg-creator\ndescription: 创建迪拜天气 SVG 卡片\n\n读取 reference.md 的模板\n使用传入温度生成 SVG 与摘要", boundary: "技能通过上下文指导模型，不会训练一个新模型。附带脚本或外部工具时，还需要对应运行环境。", source: ".claude/skills/weather-svg-creator/SKILL.md" },
    agent: { name: "把专门的任务交给独立上下文。", description: "子代理定义角色、模型、技能和记忆等配置。主会话传入任务，子代理执行后交回结果；大量研究过程可以留在子任务里。", input: "任务提示，以及子代理定义与配置。", process: "Claude Code 创建独立上下文，调用指定模型和工具，完成后返回结果。", output: "职责明确的子任务结果，减少主会话中的过程信息。", file: ".claude/agents/weather-agent.md · 字段摘录", code: "name: weather-agent\nmodel: sonnet\nmaxTurns: 5\nmemory: project\nskills:\n  - weather-fetcher", boundary: "角色定义是指令与配置；上下文隔离不等于文件系统隔离。调用时还能指定模型，例如天气命令传入 haiku。", source: ".claude/agents/weather-agent.md" },
    hook: { name: "在事件发生时执行配置好的脚本。", description: "Claude Code 在工具调用、任务停止等事件触发 hooks。仓库的 Python 实现读取事件 JSON、保存日志，并选择和播放通知声音。", input: "事件名称、工具调用信息、共享与个人配置。", process: "运行时按事件调用脚本；脚本读取 stdin，记录数据并播放对应声音。", output: "声音提醒与事件记录，便于观察任务状态。", file: ".claude/hooks/scripts/hooks.py · 行为示意", code: "事件 JSON → stdin\n读取 hooks-config.json\n记录事件 → 选择音效 → 播放\nexit 0", boundary: "本仓库脚本主要实现观察与通知。它以成功状态退出，不能据此认定已建立自动质量门禁。", source: ".claude/hooks/scripts/hooks.py" },
    mcp: { name: "让模型能调用外部工具与数据。", description: "MCP 配置连接外部服务。本仓库列出 Playwright、Context7 和 DeepWiki；浏览器技能也展示了如何使用 agent-browser CLI。", input: "服务启动命令、工具定义与对应环境。", process: "外部服务提供工具；Claude Code 发现并调用，将结果反馈给模型。", output: "浏览器操作、文档查询和外部数据等实际能力。", file: ".mcp.json · 服务名摘录", code: "mcpServers:\n  playwright   # 浏览器操作\n  context7     # 文档上下文\n  deepwiki     # 仓库资料查询", boundary: "配置提供连接入口，服务能力由外部包或系统提供；需要单独准备依赖、网络和必要认证。", source: ".mcp.json" }
  };
  function activateTab(buttons, active, panelId) {
    buttons.forEach((button) => { const selected = button === active; button.setAttribute("aria-selected", String(selected)); button.tabIndex = selected ? 0 : -1; });
    document.getElementById(panelId).setAttribute("aria-labelledby", active.id);
  }
  function tabKeyboard(buttons, callback, vertical = false) {
    buttons.forEach((button, index) => button.addEventListener("keydown", (event) => {
      const next = vertical ? "ArrowDown" : "ArrowRight";
      const prev = vertical ? "ArrowUp" : "ArrowLeft";
      let target;
      if (event.key === next) target = (index + 1) % buttons.length;
      if (event.key === prev) target = (index + buttons.length - 1) % buttons.length;
      if (event.key === "Home") target = 0;
      if (event.key === "End") target = buttons.length - 1;
      if (target !== undefined) { event.preventDefault(); buttons[target].focus(); callback(buttons[target]); }
    }));
  }
  const capabilityButtons = [...document.querySelectorAll("[data-capability]")];
  function chooseCapability(button) {
    const data = capabilities[button.dataset.capability];
    activateTab(capabilityButtons, button, "capability-panel");
    for (const [field, suffix] of Object.entries({ name: "name", description: "description", input: "input", process: "process", output: "output", file: "file", code: "code", boundary: "boundary" })) put(`capability-${suffix}`, data[field]);
    put("capability-index", `${String(capabilityButtons.indexOf(button) + 1).padStart(2, "0")} / 06`);
    document.getElementById("capability-source").href = source(data.source);
  }
  capabilityButtons.forEach((button) => button.addEventListener("click", () => chooseCapability(button)));
  tabKeyboard(capabilityButtons, chooseCapability, true);

  const loops = [
    { symbol: "◎", owner: "用户 / 任务定义", name: "先说明要实现什么，以及如何确认成功。", description: "例如：修复登录失败，保留现有接口，相关测试通过。清楚的目标和验收条件，能帮助后续每一步围绕同一个任务展开。" },
    { symbol: "≡", owner: "Claude Code / 上下文管理", name: "给模型提供与任务相关的信息。", description: "加载项目规则，按需要读取技能和参考资料，再通过文件搜索与阅读理解实际代码。给子代理分配任务时，它也有自己的上下文。" },
    { symbol: "◇", owner: "模型 / 推理与决策", name: "根据当前信息决定下一步。", description: "模型判断应该继续读代码、编辑文件、执行测试，还是委派研究任务。子代理的角色和技能为这次判断提供额外指令。" },
    { symbol: "↗", owner: "运行时与工具 / 实际执行", name: "工具承担读、写、运行和查询。", description: "Claude Code 处理工具调用与权限，工具执行真实操作。MCP 服务提供外部接口；对应事件还可以触发 Hooks 脚本。" },
    { symbol: "↺", owner: "模型 + 执行证据 / 反馈", name: "检查结果，再决定继续还是交付。", description: "把测试、构建、API 返回和文件结果反馈给模型。发现问题后调整行动并重新验证；符合验收条件后，交付结果及其证据。" }
  ];
  document.querySelectorAll("[data-loop]").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll("[data-loop]").forEach((item) => { item.classList.toggle("selected", item === button); item.setAttribute("aria-pressed", String(item === button)); });
    const data = loops[Number(button.dataset.loop)];
    Object.entries(data).forEach(([key, value]) => put(`loop-${key}`, value));
  }));

  const weather = [
    { stage: "主会话 / Command", name: "明确温度单位。", description: "命令要求先用 AskUserQuestion 取得摄氏或华氏的选择，然后把单位传给天气子代理。", file: ".claude/commands/weather-orchestrator.md", code: "/weather-orchestrator\n  ↓ AskUserQuestion\nunit = Celsius | Fahrenheit", output: "用户选择的温度单位", source: ".claude/commands/weather-orchestrator.md" },
    { stage: "主会话 → 子代理 / Agent", name: "把获取数据的职责交出去。", description: "主会话通过 Agent 工具调用 weather-agent，把查询地点与用户选择的单位一起传入。这个命令在调用时指定 haiku 模型。", file: ".claude/commands/weather-orchestrator.md", code: "Agent(\n  subagent_type: weather-agent,\n  prompt: 查询迪拜温度，使用指定单位,\n  model: haiku\n)", output: "包含地点与单位的子任务", source: ".claude/commands/weather-orchestrator.md" },
    { stage: "子代理 / Skill → WebFetch", name: "用查询技能获取实际数据。", description: "当前 agent 明确调用 Skill(weather-fetcher)。技能指令要求 WebFetch 请求 Open-Meteo，固定使用迪拜坐标，并提取 current.temperature_2m。", file: ".claude/skills/weather-fetcher/SKILL.md", code: "Skill(weather-fetcher)\n  ↓ WebFetch\nOpen-Meteo API\nlatitude=25.2048, longitude=55.2708\ncurrent=temperature_2m", output: "API 返回的温度数值与单位", source: ".claude/skills/weather-fetcher/SKILL.md" },
    { stage: "子代理 → 主会话 / 数据交接", name: "取得有效结果后再生成图卡。", description: "子代理交回温度数值与单位。命令要求检查是否有有效返回；缺少数值或单位时停止流程。agent 还要求把读取记录保存到记忆。", file: ".claude/agents/weather-agent.md", code: "weather-agent → 主会话\nresult = { temperature, unit }\n\n命令检查：数值与单位齐全\n失败时：报告问题并停止", output: "检查过的温度与单位", source: ".claude/agents/weather-agent.md" },
    { stage: "主会话 / SVG Skill", name: "把同一份数据交给输出技能。", description: "主会话调用 weather-svg-creator，技能读取 reference.md 中的 SVG 与摘要模板，使用已有温度值进行填充。", file: ".claude/skills/weather-svg-creator/SKILL.md", code: "Skill(weather-svg-creator)\n  ↓ 读取 reference.md\n传入值 + SVG 模板\n  → 天气卡片与 Markdown 摘要", output: "准备写出的 SVG 与摘要", source: ".claude/skills/weather-svg-creator/SKILL.md" },
    { stage: "文件工具 / 最终交付", name: "写出可查看的任务产物。", description: "技能指令要求写入两个固定路径，并保持 SVG 自包含。这个示例的交付是迪拜天气卡片与简短摘要，后续可改造输入和输出约定。", file: ".claude/skills/weather-svg-creator/SKILL.md", code: "orchestration-workflow/\n├── weather.svg\n└── output.md\n\n使用原温度值，避免重复查询", output: "可查看的卡片文件 + 文字摘要", source: ".claude/skills/weather-svg-creator/SKILL.md" }
  ];
  let weatherIndex = 0;
  function chooseWeather(index) {
    weatherIndex = Math.max(0, Math.min(weather.length - 1, index));
    const data = weather[weatherIndex];
    Object.entries(data).filter(([key]) => key !== "source").forEach(([key, value]) => put(`weather-${key}`, value));
    document.querySelectorAll("[data-weather]").forEach((button) => { const selected = Number(button.dataset.weather) === weatherIndex; button.classList.toggle("selected", selected); button.setAttribute("aria-pressed", String(selected)); });
    put("weather-count", `${String(weatherIndex + 1).padStart(2, "0")} / 06`);
    document.getElementById("weather-source").href = source(data.source);
    document.getElementById("weather-progress").style.width = `${((weatherIndex + 1) / weather.length) * 100}%`;
    document.getElementById("weather-prev").disabled = weatherIndex === 0;
    document.getElementById("weather-next").disabled = weatherIndex === weather.length - 1;
  }
  document.querySelectorAll("[data-weather]").forEach((button) => button.addEventListener("click", () => chooseWeather(Number(button.dataset.weather))));
  document.getElementById("weather-prev").addEventListener("click", () => chooseWeather(weatherIndex - 1));
  document.getElementById("weather-next").addEventListener("click", () => chooseWeather(weatherIndex + 1));

  const scenarios = {
    repeat: { name: "每天都在重复解释同一套检查步骤。", description: "例如提交前检查、变更说明、固定格式的代码审查。把稳定的做法沉淀为一个 Skill 或 Command。", tools: ["Commands", "Skills", "参考模板"], benefit: "减少重复提示，稳定任务输入、执行要求和输出格式。", check: "观察重复输入次数、漏检项和产出是否符合检查清单。", cost: "需要把有效步骤提炼清楚，并在工具或项目约定改变时更新。" },
    feature: { name: "功能跨越多个模块，容易遗漏交接与验证。", description: "例如登录、支付或大型重构。借鉴 RPI 先研究需求，再写分阶段计划，为实现、审查与用户验收保留记录。", tools: ["RPI", "子代理", "阶段验收"], benefit: "提前暴露可行性问题，让需求、计划、修改和验证更容易追溯。", check: "核对验收标准是否被覆盖、阶段测试是否执行、审查发现是否解决。", cost: "增加研究、计划和审查开销；简单修改通常无需采用完整分工。" },
    team: { name: "每次接手项目，都要重新解释目录和开发约定。", description: "把构建命令、测试方法和模块规则放进版本管理；团队一起维护 Claude Code 的项目指令与常用技能。", tools: ["CLAUDE.md", "路径规则", "共享配置"], benefit: "减少环境摸索与规范差异，形成可共同维护的任务入口。", check: "新会话能否正确构建、测试，生成的修改是否遵循项目约定。", cost: "需要保持指令与实际项目一致，清理过时规则并区分个人设置。" },
    research: { name: "需要重复比较资料，记录变化和研究依据。", description: "参考仓库维护命令，拆分来源调研，再汇总差异与更新建议。每条结论记录来源、版本和验证范围。", tools: ["研究命令", "并行子任务", "来源记录"], benefit: "让资料收集和更新有稳定步骤，便于复查不同版本的变化。", check: "来源是否可访问、结论是否有依据、差异是否准确、更新是否经过核对。", cost: "网络和调研会消耗时间与模型额度；信息准确性仍需复核。" }
  };
  const scenarioButtons = [...document.querySelectorAll("[data-scenario]")];
  function chooseScenario(button) {
    activateTab(scenarioButtons, button, "scenario-panel");
    const data = scenarios[button.dataset.scenario];
    Object.entries(data).filter(([key]) => key !== "tools").forEach(([key, value]) => put(`scenario-${key}`, value));
    document.getElementById("scenario-tools").replaceChildren(...data.tools.map((text) => { const span = document.createElement("span"); span.textContent = text; return span; }));
  }
  scenarioButtons.forEach((button) => button.addEventListener("click", () => chooseScenario(button)));
  tabKeyboard(scenarioButtons, chooseScenario);
  const navLinks = [...document.querySelectorAll(".section-nav a")];
  const sections = [...document.querySelectorAll("main > section[id]")];
  let scheduled = false;
  function updateNav() {
    const scrollPadding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    const sectionMargin = parseFloat(getComputedStyle(sections[0]).scrollMarginTop) || 0;
    const threshold = Math.max(innerWidth <= 960 ? 145 : 95, scrollPadding + sectionMargin + 2);
    let current = sections[0];
    sections.forEach((section) => { if (section.getBoundingClientRect().top <= threshold) current = section; });
    navLinks.forEach((link) => { const active = link.hash === `#${current.id}`; link.classList.toggle("active", active); if (active) link.setAttribute("aria-current", "location"); else link.removeAttribute("aria-current"); });
    scheduled = false;
  }
  addEventListener("scroll", () => { if (!scheduled) { scheduled = true; requestAnimationFrame(updateNav); } }, { passive: true });
  addEventListener("resize", updateNav);
  updateNav();
})();
