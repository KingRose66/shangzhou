const DATA = {
  factions: {
    shang:{name:"大邑商", color:"shang", shells:5200, prestige:82, livestock:860, tech:["成熟陶范铸造","车作","王室占卜体系"], ruler:"文丁"},
    zhou:{name:"周", color:"zhou", shells:2450, prestige:46, livestock:420, tech:["渭水农作组织","宗族征召"], ruler:"季历"},
    gaodi:{name:"晋陕高地方", color:"gaodi", shells:1600, prestige:38, livestock:720, tech:["山地行军","马畜贸易"], ruler:"高地君长"},
    neutral:{name:"小方与族邑", color:"neutral", shells:900, prestige:25, livestock:310, tech:["地方工艺"], ruler:"族长"}
  },
  settlements:[
    {id:"yin",name:"大邑商·殷",owner:"shang",x:76,y:47,capital:true,pop:{clan:42500,slave:18400},grain:18600,fodder:7200,bronze:1480,weapons:{wood:2600,bow:640,ge:930,spear:520,chariot:46},farm:88,forge:3,roads:["taihang","jinnan","nan"]},
    {id:"taihang",name:"太行东麓邑",owner:"shang",x:66,y:38,pop:{clan:6900,slave:2100},grain:4600,fodder:1750,bronze:270,weapons:{wood:700,bow:160,ge:150,spear:90,chariot:8},farm:61,forge:1,roads:["yin","jinnan"]},
    {id:"nan",name:"王畿南邑",owner:"shang",x:79,y:63,pop:{clan:9200,slave:3600},grain:6900,fodder:1900,bronze:220,weapons:{wood:1100,bow:120,ge:110,spear:70,chariot:4},farm:82,forge:1,roads:["yin"]},
    {id:"jinnan",name:"晋南据点",owner:"shang",x:55,y:48,pop:{clan:5400,slave:1700},grain:4100,fodder:1800,bronze:190,weapons:{wood:650,bow:130,ge:105,spear:55,chariot:5},farm:60,forge:1,roads:["yin","taihang","crossing","gaodi"]},
    {id:"crossing",name:"黄河渡口邑",owner:"neutral",x:45,y:52,pop:{clan:3200,slave:850},grain:2500,fodder:1200,bronze:80,weapons:{wood:400,bow:80,ge:40,spear:25,chariot:1},farm:52,forge:0,roads:["jinnan","zhouyuan","gaodi"]},
    {id:"gaodi",name:"寨沟高地中心",owner:"gaodi",x:42,y:33,pop:{clan:7600,slave:1800},grain:3500,fodder:3700,bronze:260,weapons:{wood:1000,bow:230,ge:120,spear:65,chariot:7},farm:43,forge:1,roads:["jinnan","crossing","zhouyuan"]},
    {id:"zhouyuan",name:"周原",owner:"zhou",x:29,y:57,capital:true,pop:{clan:17200,slave:5300},grain:10400,fodder:3900,bronze:510,weapons:{wood:1800,bow:320,ge:230,spear:160,chariot:13},farm:86,forge:2,roads:["crossing","gaodi","weis"]},
    {id:"weis",name:"渭水东部邑",owner:"zhou",x:37,y:68,pop:{clan:7800,slave:2100},grain:6200,fodder:2100,bronze:140,weapons:{wood:880,bow:120,ge:80,spear:55,chariot:3},farm:90,forge:0,roads:["zhouyuan"]},
    {id:"west",name:"西部诸邑",owner:"neutral",x:17,y:48,pop:{clan:4100,slave:800},grain:2700,fodder:2600,bronze:90,weapons:{wood:520,bow:110,ge:35,spear:25,chariot:2},farm:48,forge:0,roads:["zhouyuan"]},
  ],
  characters:[
    {name:"文丁",faction:"shang",role:"商王",command:77,admin:73,prestige:88,trait:"谨慎维持四方"},
    {name:"季历",faction:"zhou",role:"周君",command:83,admin:74,prestige:69,trait:"西土扩张"},
    {name:"商王族将",faction:"shang",role:"王族将领",command:72,admin:48,prestige:58,trait:"车战娴熟"},
    {name:"周宗族将",faction:"zhou",role:"宗族将领",command:69,admin:55,prestige:54,trait:"族兵凝聚"},
  ],
  archive:[
    {name:"武丁",era:"较早的晚商剧本",note:"商王。后续独立剧本核心人物。"},
    {name:"妇好",era:"武丁时期",note:"王后、军事统帅。后续剧本将赋予独立军队与封邑体系。"},
  ],
  units:{
    slave_levy:{name:"征发奴隶",size:120,kind:"levy",population:"slave",weapon:"wood",weaponNeed:100,shell:25,grain:35,train:0,morale:34,order:30,power:18,labor:12},
    clan_levy:{name:"族兵",size:100,kind:"levy",population:"clan",weapon:"wood",weaponNeed:80,shell:38,grain:35,train:0,morale:49,order:46,power:27,labor:10},
    archer:{name:"弓手",size:80,kind:"trained",population:"clan",weapon:"bow",weaponNeed:80,shell:90,grain:45,train:1,morale:56,order:51,power:38,labor:9},
    bronze_ge:{name:"青铜戈兵",size:80,kind:"regular",population:"clan",weapon:"ge",weaponNeed:80,shell:150,grain:70,train:2,morale:67,order:68,power:56,labor:12},
    bronze_spear:{name:"青铜矛兵",size:80,kind:"regular",population:"clan",weapon:"spear",weaponNeed:80,shell:145,grain:70,train:2,morale:65,order:70,power:54,labor:12},
    chariot:{name:"战车乘",size:24,kind:"regular",population:"clan",weapon:"chariot",weaponNeed:6,shell:310,grain:95,fodder:140,train:3,morale:78,order:76,power:88,labor:18}
  }
};

let state;

function freshState(){
  return {
    player:"shang", year:-1120, season:0, selectedSettlement:"yin", selectedArmy:null,
    factions:JSON.parse(JSON.stringify(DATA.factions)),
    settlements:JSON.parse(JSON.stringify(DATA.settlements)),
    armies:[
      {id:"a1",owner:"shang",name:"王师第一旅",at:"yin",units:[{type:"bronze_ge",men:80},{type:"clan_levy",men:200},{type:"archer",men:80},{type:"chariot",men:24}],grain:620,fodder:420,laborers:95,morale:72,supply:true,training:0},
      {id:"a2",owner:"zhou",name:"周师",at:"zhouyuan",units:[{type:"clan_levy",men:300},{type:"archer",men:80},{type:"bronze_spear",men:80}],grain:520,fodder:180,laborers:70,morale:69,supply:true,training:0},
      {id:"a3",owner:"gaodi",name:"高地战团",at:"gaodi",units:[{type:"clan_levy",men:200},{type:"archer",men:80}],grain:340,fodder:160,laborers:46,morale:64,supply:true,training:0}
    ],
    training:[],
    log:["局势初定：大邑商仍掌握最强的青铜与车战力量，周在西土积蓄实力。"],
    omen:null
  };
}
const seasons=["春","夏","秋","冬"];
const $=s=>document.querySelector(s);
const fmt=n=>Math.round(n).toLocaleString("zh-CN");
function ownedSettlements(owner=state.player){return state.settlements.filter(s=>s.owner===owner)}
function totals(owner=state.player){
  return ownedSettlements(owner).reduce((a,s)=>{a.clan+=s.pop.clan;a.slave+=s.pop.slave;a.grain+=s.grain;a.fodder+=s.fodder;return a},{clan:0,slave:0,grain:0,fodder:0});
}
function getSet(id){return state.settlements.find(s=>s.id===id)}
function getArmy(id){return state.armies.find(a=>a.id===id)}
function armyMen(a){return a.units.reduce((n,u)=>n+u.men,0)}
function armyPower(a){
  return a.units.reduce((sum,u)=>sum+(DATA.units[u.type].power*u.men/DATA.units[u.type].size),0)*(a.morale/65)*(a.supply?1:.72);
}
function addLog(t){state.log.unshift(`${seasons[state.season]} · ${t}`);state.log=state.log.slice(0,22)}
function isAdjacent(a,b){return getSet(a).roads.includes(b)}
function ownerName(o){return state.factions[o].name}

function render(){
  const t=totals();
  $("#hud-faction").textContent=state.factions[state.player].name;
  $("#hud-date").textContent=`约前${Math.abs(state.year)}年 · ${seasons[state.season]}`;
  $("#hud-shells").textContent=fmt(state.factions[state.player].shells);
  $("#hud-grain").textContent=fmt(t.grain)+" 石";
  $("#hud-fodder").textContent=fmt(t.fodder);
  $("#hud-clansmen").textContent=fmt(t.clan);
  $("#hud-slaves").textContent=fmt(t.slave);
  renderFaction();renderCharacters();renderMap();renderSettlement();renderArmies();renderLog();
}
function renderFaction(){
  const f=state.factions[state.player],t=totals();
  $("#faction-summary").innerHTML=`
  <div class="stats">
    <span>君主</span><b>${f.ruler}</b>
    <span>威望</span><b>${f.prestige}</b>
    <span>牲畜</span><b>${fmt(f.livestock)}</b>
    <span>聚落</span><b>${ownedSettlements().length}</b>
  </div>
  <p class="small muted">掌握技艺：${f.tech.join("、")}</p>
  <p class="small">人口结构：族人 ${Math.round(t.clan/(t.clan+t.slave)*100)}% · 奴隶 ${Math.round(t.slave/(t.clan+t.slave)*100)}%</p>`;
}
function renderCharacters(){
  const chars=DATA.characters.filter(c=>c.faction===state.player);
  $("#characters").innerHTML=chars.map(c=>`<div class="char-card"><b>${c.name}</b><span class="badge">${c.role}</span><div class="small muted">统御 ${c.command} · 治政 ${c.admin} · 威望 ${c.prestige}</div><div class="small">${c.trait}</div></div>`).join("");
}
function routeLine(a,b,map){
  const r=document.createElement("div"),dx=b.x-a.x,dy=b.y-a.y;
  r.className="route";r.style.left=a.x+"%";r.style.top=a.y+"%";
  r.style.width=Math.hypot(dx/100*map.clientWidth,dy/100*map.clientHeight)+"px";
  r.style.transform=`rotate(${Math.atan2(dy/100*map.clientHeight,dx/100*map.clientWidth)*180/Math.PI}deg)`;
  map.appendChild(r);
}
function renderMap(){
  const map=$("#map");map.innerHTML="";
  const seen=new Set();
  state.settlements.forEach(a=>a.roads.forEach(id=>{const b=getSet(id),k=[a.id,b.id].sort().join("-");if(!seen.has(k)){seen.add(k);routeLine(a,b,map)}}));
  state.settlements.forEach(s=>{
    const n=document.createElement("div");n.className=`node ${s.owner} ${s.capital?"capital":""} ${state.selectedSettlement===s.id?"selected":""}`;n.style.left=s.x+"%";n.style.top=s.y+"%";
    n.onclick=()=>selectSettlement(s.id);map.appendChild(n);
    const l=document.createElement("div");l.className="node-label";l.style.left=s.x+"%";l.style.top=s.y+"%";l.textContent=s.name;map.appendChild(l);
  });
  state.armies.forEach((a,i)=>{
    const s=getSet(a.at);const e=document.createElement("div");e.className=`army-token ${state.selectedArmy===a.id?"selected":""}`;e.style.left=(s.x+2+(i%2)*2)+"%";e.style.top=(s.y-3-(i%3)*2)+"%";
    e.textContent=`${ownerName(a.owner).slice(0,2)}军 ${armyMen(a)}`;e.onclick=(ev)=>{ev.stopPropagation();state.selectedArmy=a.id;state.selectedSettlement=a.at;render()};map.appendChild(e);
  });
}
function selectSettlement(id){
  if(state.selectedArmy){
    const a=getArmy(state.selectedArmy);
    if(a && a.owner===state.player && a.at!==id && isAdjacent(a.at,id)){moveArmy(a,id);return}
  }
  state.selectedSettlement=id;render();
}
function renderSettlement(){
  const s=getSet(state.selectedSettlement);
  if(!s){$("#settlement-detail").textContent="请选择一个聚落。";return}
  $("#settlement-title").textContent=s.name;
  const friendly=s.owner===state.player;
  $("#settlement-detail").innerHTML=`
   <div class="stats">
    <span>控制</span><b>${ownerName(s.owner)}</b>
    <span>族人</span><b>${fmt(s.pop.clan)}</b>
    <span>奴隶</span><b>${fmt(s.pop.slave)}</b>
    <span>粮仓</span><b>${fmt(s.grain)} 石</b>
    <span>草料</span><b>${fmt(s.fodder)}</b>
    <span>青铜料</span><b>${fmt(s.bronze)}</b>
    <span>耕作潜力</span><b>${s.farm}</b>
    <span>铸造</span><b>${s.forge}级</b>
   </div>
   <p class="small muted">库存：木骨兵器 ${s.weapons.wood} · 弓 ${s.weapons.bow} · 戈 ${s.weapons.ge} · 矛 ${s.weapons.spear} · 可用战车 ${s.weapons.chariot}</p>
   <p class="small ${friendly?"good":"warning"}">${friendly?"可在此征募、采买和训练。":"非我方聚落；需通过外交或战争取得控制。"}</p>`;
}
function renderArmies(){
  $("#armies").innerHTML=state.armies.filter(a=>a.owner===state.player).map(a=>`
   <div class="army-card">
    <b>${a.name}</b><span class="badge">${getSet(a.at).name}</span>
    <div>兵力 ${armyMen(a)} · 士气 ${Math.round(a.morale)} · 民夫 ${a.laborers}</div>
    <div class="small ${a.supply?"good":"bad"}">粮 ${Math.round(a.grain)} 石 · 草料 ${Math.round(a.fodder)} · ${a.supply?"粮道畅通":"粮道中断"}</div>
    <button onclick="selectArmy('${a.id}')">选中军队</button>
   </div>`).join("") || '<span class="muted">无军队</span>';
}
window.selectArmy=id=>{state.selectedArmy=id;state.selectedSettlement=getArmy(id).at;render()};
function renderLog(){$("#log").innerHTML=state.log.map(x=>`<div>• ${x}</div>`).join("")}

function recruit(type){
  const s=getSet(state.selectedSettlement),u=DATA.units[type],f=state.factions[state.player];
  if(!s||s.owner!==state.player)return alert("只能在己方聚落征募。");
  if(s.pop[u.population]<u.size)return alert("对应人口不足。");
  if(s.weapons[u.weapon]<u.weaponNeed)return alert("武器库存不足。");
  if(f.shells<u.shell)return alert("贝不足。");
  if(s.grain<u.grain)return alert("粮食不足。");
  if((u.fodder||0)>s.fodder)return alert("草料不足。");
  s.pop[u.population]-=u.size;s.weapons[u.weapon]-=u.weaponNeed;f.shells-=u.shell;s.grain-=u.grain;s.fodder-=u.fodder||0;
  if(u.train>0){
    state.training.push({type,at:s.id,turns:u.train});
    addLog(`${s.name}开始${u.name}训练，预计${u.train}季成军。`);
  }else{
    formUnitAt(type,s.id);addLog(`${s.name}立即征募${u.name}${u.size}人。`);
  }
  render();
}
function formUnitAt(type,at){
  let a=state.armies.find(x=>x.owner===state.player&&x.at===at);
  if(!a){a={id:"p"+Date.now()+Math.random(),owner:state.player,name:"新编军",at,units:[],grain:0,fodder:0,laborers:0,morale:58,supply:true};state.armies.push(a)}
  a.units.push({type,men:DATA.units[type].size});a.laborers+=DATA.units[type].labor;a.morale=Math.max(a.morale,DATA.units[type].morale);
}
function moveArmy(a,target){
  const origin=getSet(a.at),dest=getSet(target);
  const needed=Math.max(25,Math.round(armyMen(a)*.08));
  if(a.laborers<needed){addLog(`${a.name}民夫不足，至少需要${needed}人协助运输。`);render();return}
  const roadFriendly=origin.owner===a.owner && (dest.owner===a.owner || origin.roads.includes(dest.id));
  a.supply=roadFriendly && !state.armies.some(x=>x.owner!==a.owner&&x.at===origin.id);
  a.grain-=Math.max(20,armyMen(a)*.045);a.fodder-=a.units.filter(u=>u.type==="chariot").reduce((n,u)=>n+u.men*1.2,0);
  a.at=target;addLog(`${a.name}由${origin.name}行军至${dest.name}。${a.supply?"粮道尚通。":"粮道变得危险！"}`);
  const enemies=state.armies.filter(x=>x.owner!==a.owner&&x.at===target);
  if(enemies.length){battle(a,enemies[0]);}
  else if(dest.owner!==a.owner){addLog(`${a.name}进入${dest.name}外围，但聚落尚未正式屈服。`)}
  state.selectedSettlement=target;render();
}
function battle(a,b){
  const terrain=getSet(a.at).id==="gaodi"?.82:1;
  const pa=armyPower(a)*terrain*(.9+Math.random()*.2),pb=armyPower(b)*(1/terrain)*(.9+Math.random()*.2);
  const winner=pa>=pb?a:b,loser=winner===a?b:a,ratio=Math.max(pa,pb)/Math.max(1,Math.min(pa,pb));
  const loserLoss=Math.min(.56,.17+.12*ratio),winnerLoss=Math.min(.28,.08+.05/ratio);
  applyLoss(loser,loserLoss,true);applyLoss(winner,winnerLoss,false);
  winner.morale=Math.min(90,winner.morale+5);loser.morale=Math.max(18,loser.morale-22);
  addLog(`${winner.name}击溃${loser.name}。败军大量溃散而非全员战死。`);
  if(armyMen(loser)<80){state.armies=state.armies.filter(x=>x.id!==loser.id);addLog(`${loser.name}失去组织，残部四散。`)}
  if(winner.owner===a.owner && getSet(a.at).owner!==a.owner){
    const city=getSet(a.at);const capt=Math.round(city.pop.slave*.08+city.pop.clan*.015);city.pop.slave+=capt;city.pop.clan=Math.max(0,city.pop.clan-capt);city.owner=a.owner;
    addLog(`${city.name}屈服于${ownerName(a.owner)}，战后获得约${capt}名奴隶/俘口。`);
  }
}
function applyLoss(a,pct,routed){
  a.units.forEach(u=>{const killed=Math.round(u.men*pct*(routed?.62:.72));const scattered=Math.round(u.men*pct-killed);u.men=Math.max(0,u.men-killed-scattered);});
  a.units=a.units.filter(u=>u.men>0);a.laborers=Math.max(0,Math.round(a.laborers*(1-pct*.45)));
}

function processTraining(){
  state.training.forEach(t=>t.turns--);
  const done=state.training.filter(t=>t.turns<=0);state.training=state.training.filter(t=>t.turns>0);
  done.forEach(t=>{formUnitAt(t.type,t.at);addLog(`${getSet(t.at).name}的${DATA.units[t.type].name}训练完成。`)});
}
function consumeArmies(){
  state.armies.forEach(a=>{
    const men=armyMen(a),grainUse=men*.035,fodderUse=a.units.filter(u=>u.type==="chariot").reduce((n,u)=>n+u.men*.8,0);
    a.grain-=grainUse;a.fodder-=fodderUse;
    if(a.grain<0){a.grain=0;a.morale-=10;a.supply=false;addLog(`${a.name}军粮告急，士气下降。`)}
    if(a.fodder<0){a.fodder=0;a.morale-=4}
    const s=getSet(a.at);
    if(a.owner===s.owner && a.supply){
      const refill=Math.min(s.grain,Math.max(0,men*.18-a.grain));s.grain-=refill;a.grain+=refill;
      const fr=Math.min(s.fodder,Math.max(0,220-a.fodder));s.fodder-=fr;a.fodder+=fr;
    }
  });
}
function harvest(){
  state.settlements.forEach(s=>{
    const armies=state.armies.filter(a=>a.at===s.id),draw=armies.reduce((n,a)=>n+armyMen(a)+a.laborers,0);
    const laborPenalty=Math.min(.35,draw/Math.max(1000,s.pop.clan+s.pop.slave)*1.7);
    const crop=Math.round((s.pop.clan*.08+s.pop.slave*.045)*s.farm/100*(1-laborPenalty));
    s.grain+=crop;addLog(`${s.name}秋收 ${fmt(crop)} 石${laborPenalty>.12?"；征发劳力过多，收成受损。":""}`);
  });
}
function aiTurn(){
  ["zhou","gaodi"].forEach(owner=>{
    if(owner===state.player)return;
    const armies=state.armies.filter(a=>a.owner===owner);
    armies.forEach(a=>{
      const s=getSet(a.at);
      const hostile=s.roads.map(getSet).filter(n=>n.owner!==owner);
      if(hostile.length && a.grain>120 && Math.random()<.38){
        const target=hostile.sort((x,y)=>(x.pop.clan+x.pop.slave)-(y.pop.clan+y.pop.slave))[0];
        if(armyPower(a)>25){moveArmyAI(a,target.id)}
      }
    });
  });
}
function moveArmyAI(a,target){
  a.grain-=armyMen(a)*.04;a.at=target;
  const enemies=state.armies.filter(x=>x.owner!==a.owner&&x.at===target);
  if(enemies.length)battle(a,enemies[0]);
}
function endTurn(){
  processTraining();consumeArmies();
  if(state.season===2)harvest();
  aiTurn();
  state.season++;
  if(state.season>3){state.season=0;state.year++}
  populationTick();
  render();
}
function populationTick(){
  state.settlements.forEach(s=>{
    const foodRatio=s.grain/Math.max(1,(s.pop.clan+s.pop.slave)*.12);
    const r=foodRatio>1.2?.0015:foodRatio>.7?.0005:-.004;
    s.pop.clan=Math.max(0,Math.round(s.pop.clan*(1+r)));
    s.pop.slave=Math.max(0,Math.round(s.pop.slave*(1+r*.6)));
  })
}
function divine(){
  const f=state.factions[state.player];if(f.shells<35)return alert("需要35贝。");f.shells-=35;
  const options=["兆吉：利于谨慎出师，但不宜深入。","兆不明：西方道路与粮运值得警惕。","兆吉：若能先稳住军粮，可图一战。","兆有悔：不宜仓促攻坚，可先整军。"];
  state.omen=options[Math.floor(Math.random()*options.length)];addLog("王室完成占卜："+state.omen);showDialog("占卜",state.omen);render()
}
function sacrifice(){
  const f=state.factions[state.player];if(f.shells<80||f.livestock<12)return alert("需要80贝与12头牲畜。");
  f.shells-=80;f.livestock-=12;f.prestige+=3;state.armies.filter(a=>a.owner===state.player).forEach(a=>a.morale=Math.min(90,a.morale+4));
  addLog("举行祭祀，威望提高，诸军士气略振。");render();
}
function buyGrain(){
  const s=getSet(state.selectedSettlement),f=state.factions[state.player];if(!s||s.owner!==state.player)return alert("请选择己方聚落。");if(f.shells<120)return alert("贝不足。");
  f.shells-=120;s.grain+=300;addLog(`${s.name}以120贝采买300石粟米。`);render()
}
function freeSlaves(){
  const s=getSet(state.selectedSettlement),f=state.factions[state.player];if(!s||s.owner!==state.player||s.pop.slave<100)return alert("条件不足。");if(f.shells<70)return alert("需要70贝用于赎释与安置。");
  f.shells-=70;s.pop.slave-=100;s.pop.clan+=100;addLog(`${s.name}赎释100名奴隶并编入族人/附族人口。`);render()
}
function workshop(){
  const s=getSet(state.selectedSettlement),f=state.factions[state.player];if(!s||s.owner!==state.player)return alert("请选择己方聚落。");if(f.shells<260||s.pop.clan<700)return alert("需要260贝及足够族人工匠。");
  f.shells-=260;s.forge++;s.weapons.ge+=30;s.weapons.spear+=20;addLog(`${s.name}扩建铸造作坊，青铜武器产能提升。`);render()
}
function tradeTech(){
  const f=state.factions[state.player];if(f.shells<220)return alert("需要220贝。");
  f.shells-=220;const pool=["改良车轮维护","高地畜牧经验","外来陶范技法","远程粮运组织"];
  const tech=pool.find(x=>!f.tech.includes(x))||"工匠交流网络";
  if(!f.tech.includes(tech))f.tech.push(tech);
  addLog(`通过贝支付与礼物延请外来工匠，获得技艺：${tech}。`);render()
}
function showDialog(title,body){$("#dialog-content").innerHTML=`<h2>${title}</h2><p>${body}</p>`;$("#dialog").showModal()}
function archive(){
  showDialog("史实人物档案",DATA.archive.map(x=>`<p><b>${x.name}</b> <span class="badge">${x.era}</span><br><span class="muted">${x.note}</span></p>`).join(""))
}
function newGame(){
  const choose=confirm("确定从新局开始吗？点击“确定”扮演大邑商；点击“取消”扮演周。");
  state=freshState();state.player=choose?"shang":"zhou";state.selectedSettlement=choose?"yin":"zhouyuan";
  state.selectedArmy=state.armies.find(a=>a.owner===state.player)?.id||null;
  render();
}
document.querySelectorAll("[data-unit]").forEach(b=>b.onclick=()=>recruit(b.dataset.unit));
$("#btn-end-turn").onclick=endTurn;$("#btn-new").onclick=newGame;$("#btn-divine").onclick=divine;$("#btn-sacrifice").onclick=sacrifice;$("#btn-buy-grain").onclick=buyGrain;$("#btn-free-slaves").onclick=freeSlaves;$("#btn-workshop").onclick=workshop;$("#btn-trade-tech").onclick=tradeTech;$("#btn-archive").onclick=archive;
$("#recruit-help").innerHTML="奴隶征发兵与族兵即时成军；弓手、青铜正规军、战车需要1—3季训练。人口和武器库存都会真实扣除。";
state=freshState();render();