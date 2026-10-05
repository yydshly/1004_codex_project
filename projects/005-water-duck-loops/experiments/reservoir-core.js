(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ReservoirCore=api;})(globalThis,function(){
 'use strict';
 const C=Object.freeze({total:120,capacity:60,initial:24,threshold:12,pump:6,pipeSeconds:3.5,outflow:30,drain:8,duckSpeed:.18,returnSeconds:6,deadline:45,small:24,batch:48,earlyDeadline:5,earlyBonus:30});
 function createState(){return{phase:'ready',tank:C.initial,channel:0,lower:C.total-C.initial,packets:[],gate:false,budget:0,elapsed:0,clock:0,spilled:0,spillRate:0,releasedWater:0,releases:0,rescued:0,returned:0,score:0,bestBatch:0,batchHits:0,lastRescue:null,firstRescueTime:null,earlyBonus:0,rescueTime:null,ducks:Array.from({length:6},(_,i)=>({id:i,progress:i===0?.94:.82-i*.15,stage:'waiting',returnProgress:0,rescuedAt:null})),message:'目标：45 秒内救六只。前 5 秒救出首只可加 30 分；水够 12 才推动鸭子。'};}
 const waterTotal=s=>s.tank+s.channel+s.lower+s.packets.reduce((n,p)=>n+p.amount,0);
 function start(s){if(s.phase==='ready'||s.phase==='paused')s.phase='running';}
 function pause(s){if(s.phase==='running'||s.phase==='settling'){s.resumePhase=s.phase;s.phase='paused';}}
 function resume(s){if(s.phase==='paused'){s.phase=s.resumePhase||'running';delete s.resumePhase;}else start(s);}
 function setGate(s,open){if(s.phase!=='running')return false;if(open){s.gate=true;s.budget=Infinity;s.releases++;s.batchHits=0;}else{s.gate=false;s.budget=0;}return true;}
 function release(s,amount){if(s.phase!=='running'||s.gate||![C.small,C.batch].includes(amount)||s.tank+1e-8<amount)return false;s.gate=true;s.budget=amount;s.releases++;s.batchHits=0;s.message='正在放水 '+amount+' 格；浅湾达到 12 格后鸭子才会前进。';return true;}
 function settle(s){s.phase='settling';s.gate=false;s.budget=0;s.message=s.rescued===6?'六只已安全抵达，等鸭子和在途水沿回路返回。':'救援时间到：已到安全池的鸭子继续回程，浅湾中的鸭子留在原处。';}
 function tick(s,dt){
  const running=s.phase==='running';s.clock+=dt;if(running)s.elapsed=Math.min(C.deadline,s.elapsed+dt);
  // The four stores form a closed loop. Overspill rejoins the lower pond.
  s.spillRate=0;
  for(const p of s.packets)p.progress+=dt/C.pipeSeconds;
  const arrived=s.packets.filter(p=>p.progress>=1).reduce((n,p)=>n+p.amount,0);s.packets=s.packets.filter(p=>p.progress<1);s.tank+=arrived;
  if(s.tank>C.capacity){const excess=s.tank-C.capacity;s.tank=C.capacity;s.lower+=excess;s.spilled+=excess;s.spillRate=excess/dt;}
  if(running){const pumped=Math.min(s.lower,C.pump*dt);s.lower-=pumped;if(pumped>0)s.packets.push({amount:pumped,progress:0});}
  if(running&&s.gate){const moved=Math.min(s.tank,C.outflow*dt,s.budget);s.tank-=moved;s.channel+=moved;s.budget-=moved;s.releasedWater+=moved;if(s.budget<=1e-8||s.tank<=1e-8){s.gate=false;s.budget=0;s.message='闸门已关。浅湾余水仍会推动鸭子；观察水位后决定下一次放水。';}}
  const draining=Math.min(s.channel,C.drain*dt);s.channel-=draining;s.lower+=draining;
  for(const duck of s.ducks){
   if(duck.stage==='waiting'&&running&&s.channel>=C.threshold){duck.progress=Math.min(1,duck.progress+C.duckSpeed*dt);if(duck.progress>=1){duck.stage='returning';duck.rescuedAt=s.elapsed;s.rescued++;s.batchHits++;s.bestBatch=Math.max(s.bestBatch,s.batchHits);const linked=s.lastRescue!==null&&s.elapsed-s.lastRescue<=2.5;s.score+=10+(linked?5:0);if(s.firstRescueTime===null){s.firstRescueTime=s.elapsed;if(s.elapsed<=C.earlyDeadline){s.earlyBonus=C.earlyBonus;s.score+=C.earlyBonus;}}s.lastRescue=s.elapsed;s.message='第 '+s.rescued+' 只安全抵达'+(s.rescued===1&&s.earlyBonus?' · 及时首救 +30':linked?' · 连救 +5':'')+'，正在回游。';}}
   else if(duck.stage==='returning'){duck.returnProgress=Math.min(1,duck.returnProgress+dt/C.returnSeconds);if(duck.returnProgress>=1){duck.stage='home';s.returned++;}}
  }
  if(running&&(s.rescued===6||s.elapsed>=C.deadline)){s.rescueTime=s.elapsed;settle(s);}
  if(s.phase==='settling'&&s.returned===s.rescued&&s.channel<1e-8&&s.packets.length===0){s.phase=s.rescued===6?'won':'over';if(s.phase==='won')s.score+=Math.max(0,Math.round((C.deadline-s.rescueTime)*2));s.message=s.phase==='won'?'全部救援完成！鸭子已回到上游。换一种放水节奏，再比较结果。':'本轮救回 '+s.rescued+' / 6 只。可以重试，比较更早的小放与蓄水后的集中放水。';}
 }
 function step(s,dt){if(!['running','settling'].includes(s.phase)||!Number.isFinite(dt)||dt<=0)return s;let remaining=Math.min(dt,120);while(remaining>1e-9&&['running','settling'].includes(s.phase)){let h=Math.min(remaining,1/60);if(s.phase==='running')h=Math.min(h,C.deadline-s.elapsed||h);tick(s,h);remaining-=h;}return s;}
 return{constants:C,createState,waterTotal,start,pause,resume,setGate,release,step};
});
