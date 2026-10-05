(() => {
 'use strict';
 const key='water-duck-research-trials-v2',legacyKey='water-duck-research-trials-v1',pageSize=20;
 const form=document.getElementById('trial-form'),status=document.getElementById('journal-status');
 const list=document.getElementById('trial-records'),count=document.getElementById('trial-count'),exportButton=document.getElementById('export-trials');
 const pagination=document.querySelector('.record-pagination'),newer=document.getElementById('newer-trials'),older=document.getElementById('older-trials'),pageText=document.getElementById('trial-page');
 const sources={self:'自己的试玩',observed:'观察他人试玩',automated:'程序检查'};
 const conditions={'hints-on':'V3 · 方向提示开启','hints-off':'V3 · 方向提示关闭',baseline:'V2 · 基础挑战','reservoir-pulse':'V4 · 小量多次放水','reservoir-batch':'V4 · 集中放水','reservoir-other':'V4 · 其他策略',other:'其他条件'};
 const decisions={insufficient:'证据不足，继续观察',adjust:'调整规则后再试',retain:'保留改动，继续复测',defer:'暂缓这个方向'};
 const orders={first:'第一次体验',on_off:'先开提示，再关提示',off_on:'先关提示，再开提示',other:'其他顺序'};
 const has=(map,value)=>Object.prototype.hasOwnProperty.call(map,value);
 const smallNumber=value=>value===null||(Number.isInteger(value)&&value>=0&&value<=9999);
 const validText=(value,max,required=false)=>typeof value==='string'&&value.length<=max&&(!required||value.trim().length>0);
 function valid(record){
  return record&&typeof record.id==='string'&&record.id.length<=80&&typeof record.created==='string'&&Number.isFinite(Date.parse(record.created))&&
   /^[A-F]$/.test(record.experiment)&&has(sources,record.source)&&has(conditions,record.condition)&&has(decisions,record.decision)&&has(orders,record.order)&&
   validText(record.hypothesis,600,true)&&validText(record.prediction,600)&&validText(record.observation,1400,true)&&validText(record.next,600)&&
   smallNumber(record.hits)&&smallNumber(record.misses)&&smallNumber(record.nudges)&&typeof record.withdrawn==='boolean';
 }
 let records=[],page=0;
 function read(){
  let migrate=false;
  try{const current=localStorage.getItem(key),legacy=current===null?localStorage.getItem(legacyKey):null;migrate=current===null&&legacy!==null;const saved=JSON.parse(current??legacy??'null');records=saved?.version===1&&Array.isArray(saved.records)?saved.records.filter(valid):[];}
  catch{records=[];status.textContent='浏览器记录暂时无法读取；已有文件备份可用于保留研究。';}
  if(migrate)try{localStorage.setItem(key,JSON.stringify({version:1,records}));}catch{status.textContent='已读取现有记录，但浏览器未能保存；请先导出备份。';}
 }
 function persist(next){
  try{localStorage.setItem(key,JSON.stringify({version:1,records:next}));records=next;render();return true;}
  catch{status.textContent='浏览器未能保存。这次操作没有写入，请保留输入或导出现有记录。';return false;}
 }
 function element(tag,text,className){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;}
 function render(){
  const active=records.filter(r=>!r.withdrawn),withdrawn=records.length-active.length;
  count.textContent=active.length?active.length+' 条实验记录'+(withdrawn?' · '+withdrawn+' 条已撤回':''):(withdrawn?'没有有效记录 · '+withdrawn+' 条已撤回':'还没有实验记录');
  exportButton.disabled=records.length===0;list.replaceChildren();
  const pages=Math.max(1,Math.ceil(records.length/pageSize));page=Math.min(page,pages-1);pagination.hidden=pages===1;newer.disabled=page===0;older.disabled=page===pages-1;pageText.textContent='第 '+(page+1)+' / '+pages+' 页';
  if(!records.length){list.append(element('p','保存第一条记录后，它会显示在这里。','empty-records'));return;}
  for(const record of [...records].reverse().slice(page*pageSize,(page+1)*pageSize)){
   const card=element('details',undefined,'trial-record'+(record.withdrawn?' withdrawn':''));
   const summary=element('summary');
   summary.append(element('strong','实验 '+record.experiment+' · '+conditions[record.condition]),element('span',sources[record.source]+' · '+new Intl.DateTimeFormat('zh-CN',{dateStyle:'short',timeStyle:'short'}).format(new Date(record.created))+(record.withdrawn?' · 已撤回':'')));
   card.append(summary);const body=element('div',undefined,'trial-body');
   const fields=[['顺序',orders[record.order]],['假设',record.hypothesis],['操作前的预测',record.prediction||'未记录'],['观察',record.observation],['本次判断',decisions[record.decision]],['下一步',record.next||'未记录']];
   const reservoir=record.condition.startsWith('reservoir-');
   const stats=[[reservoir?'救援':'入圈',record.hits],['失误',record.misses],[reservoir?'放水':'拨水',record.nudges]].map(([name,value])=>name+'：'+(value===null?'未记录':value)).join(' · ');
   body.append(element('p',stats,'trial-stats'));const dl=element('dl');
   for(const [label,value] of fields)dl.append(element('dt',label),element('dd',value));body.append(dl);
   const change=element('button',record.withdrawn?'恢复记录':'撤回这条记录','text-button');change.type='button';
   change.addEventListener('click',()=>{if(persist(records.map(r=>r.id===record.id?{...r,withdrawn:!r.withdrawn}:r)))status.textContent=record.withdrawn?'记录已恢复。':'记录已撤回并保留，可随时恢复。';});
   body.append(change);card.append(body);list.append(card);
  }
 }
 form.addEventListener('submit',event=>{
  event.preventDefault();if(!form.reportValidity())return;
  const data=new FormData(form),text=name=>String(data.get(name)||'').trim(),numeric=name=>text(name)===''?null:Number(text(name));
  const record={id:crypto.randomUUID(),created:new Date().toISOString(),experiment:text('experiment'),source:text('source'),condition:text('condition'),decision:text('decision'),order:text('order'),hypothesis:text('hypothesis'),prediction:text('prediction'),observation:text('observation'),next:text('next'),hits:numeric('hits'),misses:numeric('misses'),nudges:numeric('nudges'),withdrawn:false};
  if(!valid(record)){status.textContent='请检查必填文字与次数；次数须为 0–9999 的整数。';return;}
  const previousPage=page;page=0;if(persist([...records,record])){for(const name of ['prediction','observation','next','hits','misses','nudges'])form.elements.namedItem(name).value='';status.textContent='实验记录已保存到当前浏览器。可展开查看、撤回或导出归档。';}else page=previousPage;
 });
 exportButton.addEventListener('click',()=>{
  if(!records.length)return;
  const payload={schema:'water-duck-trials',version:1,exportedAt:new Date().toISOString(),note:'包含人工输入与程序检查；撤回记录保留 withdrawn 标记，不应计入试玩结论。',records};
  const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
  const anchor=document.createElement('a');anchor.href=url;anchor.download='water-duck-trials-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent='已发起 JSON 文件导出，请在浏览器下载中查看。';
 });
 window.addEventListener('storage',event=>{if(event.key===key){read();render();status.textContent='记录已随当前浏览器的另一窗口更新。';}});
 newer.addEventListener('click',()=>{page=Math.max(0,page-1);render();});older.addEventListener('click',()=>{page++;render();});
 form.elements.namedItem('experiment').addEventListener('change',()=>{
  const experiment=form.elements.namedItem('experiment').value,condition=form.elements.namedItem('condition');
  if(experiment==='B'){condition.value='reservoir-other';status.textContent='V4 已可试玩。可选择小量多次或集中放水，记录等待、放水量、溢流与救援结果。';}
  else if(experiment!=='A'){condition.value='other';status.textContent='这个方向待实现；后续试玩时请在观察中写明使用的版本与条件。';}
  else{if(condition.value.startsWith('reservoir-'))condition.value='hints-on';status.textContent='V3 已可试玩。比较提示开关时请写明顺序、预测和失败解释。';}
 });
 read();render();
})();
