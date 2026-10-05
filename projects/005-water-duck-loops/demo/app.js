const stages={
 source:{title:'上游蓄水',text:'V2 / V3 用命中后的四滴水触发升级。V4 将总水量限制为 120：初始上池 24、下池 96；水经可见回流管返回上池，池容量为 60，继续等待可能产生溢流。',next:'V4：水量已参与规则，策略效果待验证'},
 gate:{title:'开闸分流',text:'闸门改变主要水路，鸭子随水流进入左侧或右侧瀑布。当前路线只有二选一；以后可加入少量挡板，让玩家预先设计路线。',next:'下一步：从选路线到搭路线'},
 ring:{title:'拨水入圈',text:'亮圈给出目标，涟漪推力调整鸭子偏移。V3 已显示推力范围并解释走错水路或偏离圈边；需要实际试玩确认这些提示能否帮助玩家解释失败。',next:'V3 已实现提示；下一步验证是否减少误解'},
 pond:{title:'落入水潭',text:'V2 / V3 的鸭子入水后游向回程入口。V4 把浅湾水量是否达到 12 作为输运门槛：不足时鸭子停留，进入安全池才计救援；关闸后余水仍可推动。',next:'V4 已有浅湾门槛；完整连锁规则仍待实现'},
 return:{title:'气泡回游',text:'V2 / V3 的气泡水柱把鸭子送回高处。V4 下池水经过可见回流管补上池，已救鸭回到上游安全区，本轮不再出发或计数；45 秒救援窗结束后停止操作与输运，回程完成后结算。',next:'下一步：让玩家自己连接回程'}
};
const experiments={
 readable:{letter:'A',status:'已实现 V3，效果待验证',title:'读得见的水流',action:'开闸前观察箭头，点水时看到涟漪的作用范围；关闭方向提示再比较。',response:'分流点标出选路时机，箭头解释回程；涟漪范围表示点击瞬间向外推，失败给出具体原因。',question:'玩家能否在鸭子抵达前预测路线，并解释自己为什么成功或失败？',minimum:'V3 已加入可开关的方向提示、推力范围与失败解释，保持基础挑战的循环规则。',measure:'首次正确预测次数、失败解释、无意拨错方向的次数。先解决可读性，再提高水速。'},
 overflow:{letter:'B',status:'已实现 V4，策略效果待验证',title:'蓄水与溢流',action:'选择少量放水 24 争取及时首救，或蓄到 48 后集中放水争取连救；达到选定水量自动关闸，也可提前关闭。45 秒内把六只鸭送到安全池。',response:'浅湾水量达到 12 才推动鸭子；关闸后余水继续作用。前 5 秒首救奖励 30 分，2.5 秒内接续救援加 5 分；满池溢流绕过浅湾。水和已救鸭沿可见回程返回，每只鸭本轮只计一次。',question:'及时首救与成批连救是否提供了有意义的取舍？两种策略能否有效救援，玩家能否解释等待、浅湾门槛与溢流的代价？',minimum:'V4 已提供总水量 120 的上池、浅湾、下池与回流管，初始上池 24、容量 60；规则近似输运，没有流体求解。奖励与输运参数仍可调整，策略平衡尚未验证。',measure:'首救时间、等待时长、放水次数与每次水量、溢流、救援数与分数；从相同初始状态比较，未知数值写明未知，不由单次高分推断长期可玩性。'},
 build:{letter:'C',title:'自己搭循环',action:'移动三块挡板，连接出发、目标与回程路线。',response:'连通的水路持续运转，断开的地方积水或停鸭；完整循环不依赖重置位置。',question:'同样三个零件，能否产生至少两种有效路线，并让玩家说明自己的设计？',minimum:'固定水源和出口，加入三块可移动挡板；先验证路线可解，再增加关卡。',measure:'有效路线数量、试错次数、鸭子滞留位置、玩家是否主动重排水路。'},
 ducks:{letter:'D',title:'不同的鸭子',action:'用同一股水分别引导轻鸭与重鸭，选择推力位置和时机。',response:'轻鸭容易转向，重鸭保留更多惯性；差异同时用体型和动作表示。',question:'鸭子差异会改变玩家的策略，还是仅仅增加点击次数？',minimum:'先增加两种响应参数和明显的外观差异，不引入养成或收集系统。',measure:'面对不同鸭子是否改变放水时机、拨水距离和补救次数。'},
 chain:{letter:'E',title:'连锁救援',action:'用一次放水或涟漪带动多批鸭子，规划连锁延续的时机。',response:'水波推动第一批鸭子，再把变化传到后续滞留区；一次操作产生跨区域的连续反馈。',question:'玩家能否预期连锁结果，并为了更长的连锁主动调整时机？',minimum:'V4 的同一浅湾批量救援与连救奖励只作为起点；跨滞留区传播、连锁中断与补救规则仍待实现。',measure:'一次操作带动的数量、连锁中断原因、玩家是否愿意重复尝试更好的时机。'},
 garden:{letter:'F',title:'瀑布花园',action:'把鸭子送到不同水潭，选择下一处扩建的位置。',response:'新水路打开，水潭逐层连接；场景出现植物与新的瀑布，同时提供新的分流选择。',question:'玩家继续玩是为了新景观，还是因为新路线提供了新决策？',minimum:'只提供两个扩建选项：更短的回程或更多的分流；两者都有可见后果。',measure:'扩建选择、之后的路线变化，以及玩家对选择原因的解释。'}
};
function showDemo(name,scroll=false){
 const tabs=[...document.querySelectorAll('[data-demo]')];
 const template=document.getElementById('template-'+name);if(template)template.replaceWith(template.content.cloneNode(true));
 tabs.forEach(tab=>{const selected=tab.dataset.demo===name;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;document.getElementById(tab.getAttribute('aria-controls')).hidden=!selected;const frame=document.getElementById('frame-'+tab.dataset.demo);frame?.contentWindow?.postMessage({type:'water-research-visibility',visible:selected},location.origin);});
 if(scroll)document.getElementById('playground').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
}
document.querySelectorAll('[data-demo]').forEach((tab,index,tabs)=>{
 tab.addEventListener('click',()=>showDemo(tab.dataset.demo));
 tab.addEventListener('keydown',e=>{let next=index;if(e.key==='ArrowRight')next=(index+1)%tabs.length;else if(e.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=tabs.length-1;else return;e.preventDefault();showDemo(tabs[next].dataset.demo);tabs[next].focus();});
});
document.querySelectorAll('[data-open-demo]').forEach(button=>button.addEventListener('click',()=>showDemo(button.dataset.openDemo,true)));
new IntersectionObserver(entries=>{for(const entry of entries)if(!entry.isIntersecting)for(const frame of document.querySelectorAll('.prototype-frame'))frame.contentWindow?.postMessage({type:'water-research-visibility',visible:false},location.origin);},{threshold:0}).observe(document.querySelector('.prototype-panel'));
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.data?.type!=='water-research-height')return;
 for(const frame of document.querySelectorAll('.prototype-frame'))if(event.source===frame.contentWindow&&Number.isFinite(event.data.height))frame.style.height=Math.min(3000,Math.max(280,event.data.height+2))+'px';
});
document.querySelectorAll('[data-stage]').forEach(button=>button.addEventListener('click',()=>{
 document.querySelectorAll('[data-stage]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
 const data=stages[button.dataset.stage],panel=document.getElementById('stage-detail');panel.querySelector('h3').textContent=data.title;panel.querySelector('p').textContent=data.text;panel.querySelector('.label').textContent=data.next;
}));
document.querySelectorAll('[data-experiment]').forEach(button=>button.addEventListener('click',()=>{
 document.querySelectorAll('[data-experiment]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
 const d=experiments[button.dataset.experiment],panel=document.getElementById('experiment-detail');
 panel.querySelector('.eyebrow').textContent='实验 '+d.letter+' / '+(d.status||'待实现，效果待验证');panel.querySelector('h3').textContent=d.title;
 const cells=panel.querySelectorAll('dd');[d.action,d.response,d.question,d.minimum].forEach((text,i)=>cells[i].textContent=text);panel.querySelector('.acceptance p').textContent=d.measure;
}));
