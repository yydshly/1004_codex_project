"use strict";
(() => {
  const traces = {
    request: {owner:"用户提供 / 本次目标",title:"一句话描述任务，再补齐范围。",description:"用户给出检查目标与改动范围。需要明确是当前未提交修改，还是某个提交、分支或 PR，才能取得正确材料。",output:"目标、修改范围、预期检查方式。",label:"原始输入 · 示意",code:"检查当前未提交的修改。\n说明行为变化、可能的问题，\n以及哪些检查已经执行。"},
    context: {owner:"Claude Code 组织 / 推理输入",title:"把相关知识与任务材料放到一起。",description:"运行时加载相关项目指令，调用技能后加入完整说明；模型使用搜索和文件读取取得实际改动。它看到的上下文，比原始一句请求更完整。",output:"任务 + 项目规则 + 技能说明 + 源码与差异。",label:"上下文组成 · 简化示意",code:"任务：检查当前修改\nCLAUDE.md：项目目录、检查命令\nSkill：审查做法、输出要求\n工具定义：Read / Grep / Bash 等\n工具结果：相关源码与 diff\n…"},
    tool: {owner:"模型选择 / 运行时执行",title:"把判断转成实际工具调用。",description:"模型先提出具体操作。Claude Code 按权限处理调用，再由工具读文件或运行命令。文字中列出命令，与真正得到工具返回结果，是两个环节。",output:"对应范围的材料、命令结果或明确错误。",label:"调用与执行 · 行为示意",code:"模型提出：读取相关源码\n→ Read(相关文件)\n\n模型提出：查看当前修改\n→ Bash(git diff …)\n\n运行时处理权限与工具返回"},
    feedback: {owner:"工具返回 / 模型复查",title:"用结果核对结论，保留验证范围。",description:"工具结果重新进入上下文。模型据此复核发现与检查状态，再决定补充调查还是交付。错误或缺失环境也应成为反馈，不能直接当成成功。",output:"具体发现 + 依据 + 已执行检查 + 尚未验证项。",label:"结果反馈 · 非实测数据",code:"返回：diff、源码或命令输出\n若失败：错误信息与原因\n\n复核：结论是否有依据？\n交付：发现、检查与未验证项\n需要更多信息时继续调用工具"}
  };
  const buttons=[...document.querySelectorAll("[data-trace]")];
  const put=(id,text)=>{document.getElementById(id).textContent=text;};
  function selectTrace(button){
    buttons.forEach(item=>{const active=item===button;item.setAttribute("aria-selected",String(active));item.tabIndex=active?0:-1;});
    document.getElementById("trace-panel").setAttribute("aria-labelledby",button.id);
    Object.entries(traces[button.dataset.trace]).forEach(([key,value])=>put(`trace-${key}`,value));
  }
  buttons.forEach((button,index)=>{
    button.addEventListener("click",()=>selectTrace(button));
    button.addEventListener("keydown",event=>{
      let target;
      if(event.key==="ArrowRight")target=(index+1)%buttons.length;
      if(event.key==="ArrowLeft")target=(index+buttons.length-1)%buttons.length;
      if(event.key==="Home")target=0;
      if(event.key==="End")target=buttons.length-1;
      if(target!==undefined){event.preventDefault();buttons[target].focus();selectTrace(buttons[target]);}
    });
  });
  const recommendations={
    repeat:{name:"Skill · 一个可重复调用的流程",reason:"把稳定步骤、参考资料与输出要求保存下来；用户通过 /名称 主动调用，也可按描述由模型选用。",cost:"提炼触发条件与验收标准，并随项目约定维护。",target:"skill",href:"#capabilities",link:"查看对应机制 ↑"},
    rules:{name:"CLAUDE.md / rules · 持续使用的知识",reason:"保存构建命令、目录约定和项目事实。整体约定放根目录，局部规则按相关工作路径组织。",cost:"保持信息与实际代码一致，整理重复、矛盾和过时规则。",target:"memory",href:"#capabilities",link:"查看对应机制 ↑"},
    delegate:{name:"Subagent · 可明确交接的子任务",reason:"把独立检索或专门审查交给单独上下文。交接时说明目标、材料、工具范围和返回格式。",cost:"额外模型使用与协调成本；委派信息不足时需要返工。",target:"agent",href:"#capabilities",link:"查看对应机制 ↑"},
    event:{name:"Hook · 按事件执行的处理程序",reason:"在匹配的生命周期事件触发脚本。通知和日志可异步处理；需要阻断时核对同步执行与决策语义。",cost:"编写、测试和维护脚本，核对失败与超时行为。",target:"hook",href:"#capabilities",link:"查看对应机制 ↑"},
    external:{name:"MCP · 外部工具与数据连接",reason:"当本地工具无法取得外部数据或执行相应操作时，用 MCP 接入对应服务，再用技能说明如何使用。",cost:"服务依赖、认证、网络和工具契约，需要单独配置与维护。",target:"mcp",href:"#capabilities",link:"查看对应机制 ↑"},
    once:{name:"直接提示 · 先把一次任务说明白",reason:"任务只做一次、输入已齐全、产物容易检查时，直接提供目标与材料即可。先观察实际需要，再封装流程。",cost:"需要当次说明目标与验收要求；出现重复步骤后再决定是否复用。",target:"",href:"#start",link:"查看渐进使用建议 ↑"}
  };
  const goal=document.getElementById("mechanism-goal");
  const link=document.getElementById("recommendation-link");
  function updateRecommendation(){
    const data=recommendations[goal.value];
    for(const key of ["name","reason","cost"])put(`recommendation-${key}`,data[key]);
    link.href=data.href;link.dataset.jumpCapability=data.target;link.textContent=data.link;
  }
  goal.addEventListener("change",updateRecommendation);
  link.addEventListener("click",()=>{
    const target=link.dataset.jumpCapability;
    if(target)document.querySelector(`[data-capability="${target}"]`).click();
  });
  updateRecommendation();
})();
