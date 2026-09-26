const DATA = window.GAME_DATA;
const $ = function(s){ return document.querySelector(s); };
const $$ = function(s){ return Array.from(document.querySelectorAll(s)); };
const fmt = function(n){ return Math.round(Number(n)||0).toLocaleString("zh-CN"); };
const terrainNames = {plain:"平原",hill:"丘陵",rolling:"缓丘",river:"河谷渡口",highland:"高地"};

let state = null;
let turnBusy = false;
let pendingEncounter = null;

function deepCopy(v){ return JSON.parse(JSON.stringify(v)); }
function getSet(id){ return state.settlements.find(function(s){return s.id===id;}); }
function getArmy(id){ return state.armies.find(function(a){return a.id===id;}); }
function getChar(id){ return state.characters.find(function(c){return c.id===id;}); }
function faction(id){ return state.factions[id]; }
function ownerName(id){ return faction(id) ? faction(id).name : id; }
function pairKey(a,b){ return [a,b].sort().join("|"); }
function isAtWar(a,b){ return !!state.wars[pairKey(a,b)]; }
function relation(a,b){
  if(a===b)return 100;
  const fa=faction(a);
  return fa&&typeof fa.relations[b]==="number"?fa.relations[b]:0;
}
function setRelation(a,b,v){
  if(a===b)return;
  v=Math.max(-100,Math.min(100,Math.round(v)));
  faction(a).relations[b]=v;
  faction(b).relations[a]=v;
}
function changeRelation(a,b,d){ setRelation(a,b,relation(a,b)+d); }
function baseIntelLevel(s){
  if(!s)return 0;
  if(s.owner===state.player)return 3;
  if(state.armies.some(function(a){return a.owner===state.player&&a.at===s.id;}))return 3;
  let level=0;
  if(state.tribute[s.owner]===state.player||state.tribute[state.player]===s.owner)level=Math.max(level,2);
  if(relation(state.player,s.owner)>=30)level=Math.max(level,1);
  const adjacentOwned=state.settlements.some(function(o){return o.owner===state.player&&o.roads.includes(s.id);});
  const adjacentArmy=state.armies.some(function(a){
    return a.owner===state.player&&getSet(a.at)&&getSet(a.at).roads.includes(s.id);
  });
  if(adjacentOwned||adjacentArmy)level=Math.max(level,1);
  return level;
}
function intelLevel(s){
  let level=baseIntelLevel(s);
  const rec=state.intel&&state.intel[s.id];
  if(rec&&rec.expires>=state.tick)level=Math.max(level,rec.level||0);
  return Math.min(3,level);
}
function setIntel(id,level,duration){
  state.intel=state.intel||{};
  state.intel[id]={level:Math.max(level,state.intel[id]?.level||0),expires:state.tick+(duration||4)};
}
function controlEfficiency(s){
  const control=typeof s.control==="number"?s.control:100;
  return .55+Math.max(0,Math.min(100,control))*.0045;
}
function controlBand(s){
  const control=typeof s.control==="number"?s.control:100;
  if(control<35)return "服从脆弱";
  if(control<60)return "尚未稳固";
  if(control<82)return "基本服从";
  return "统治稳定";
}
function populationBand(pop){
  if(pop<4000)return "小型聚落";
  if(pop<9000)return "中型聚落";
  if(pop<18000)return "大型聚落";
  return "区域中心";
}
function roughNumber(n,step){
  step=step||100;
  return Math.max(step,Math.round(n/step)*step);
}
function grainBand(s){
  const pop=s.pop.clan+s.pop.slave;
  const quarters=s.grain/Math.max(1,pop*.012);
  if(quarters<1.5)return "粮储紧张";
  if(quarters<3)return "粮储一般";
  if(quarters<5)return "粮储较足";
  return "粮储充裕";
}
function enemyArmyLabelAt(s){
  const armies=state.armies.filter(function(a){return a.owner!==state.player&&a.at===s.id&&armyMen(a)>0;});
  if(!armies.length)return "未发现成建制军队";
  const men=armies.reduce(function(n,a){return n+armyMen(a);},0);
  const lvl=intelLevel(s);
  if(lvl<=0)return "军势不明";
  if(lvl===1)return men<300?"似有数百以下兵力":men<900?"似有数百兵力":"似有上千兵力";
  if(lvl===2)return "约 "+fmt(roughNumber(men,100))+" 人";
  return fmt(men)+" 人";
}
function canScoutSettlement(s){
  if(!s||s.owner===state.player)return false;
  const a=getArmy(state.selectedArmy);
  if(!a||a.owner!==state.player)return false;
  const at=getSet(a.at);
  return !!at&&(a.at===s.id||at.roads.includes(s.id));
}
function declareWar(a,b,logIt){
  if(a===b||isAtWar(a,b))return;
  const key=pairKey(a,b);
  state.wars[key]=true;
  state.warTurns=state.warTurns||{};
  state.warTurns[key]=0;
  if(state.tribute[a]===b)delete state.tribute[a];
  if(state.tribute[b]===a)delete state.tribute[b];
  setRelation(a,b,Math.min(-45,relation(a,b)-35));
  if(logIt!==false)addLog(ownerName(a)+"与"+ownerName(b)+"进入战争状态。","bad");
}
function makePeace(a,b){
  const key=pairKey(a,b);
  delete state.wars[key];
  if(state.warTurns)delete state.warTurns[key];
  setRelation(a,b,Math.max(-5,relation(a,b)));
}
function armyMen(a){ return a.units.reduce(function(n,u){return n+Math.max(0,u.men);},0); }
function hasTech(owner,id){ return !!(faction(owner)&&faction(owner).tech.includes(id)); }
function playerOwnsSettlement(id){ const s=getSet(id); return s && s.owner===state.player; }
function seasonName(){ return DATA.seasons[state.season]; }
function addLog(text,type){
  state.log.unshift({text:seasonName()+" · "+text,type:type||"normal"});
  state.log=state.log.slice(0,35);
}
function ownedSettlements(owner){
  owner=owner||state.player;
  return state.settlements.filter(function(s){return s.owner===owner;});
}
function totals(owner){
  owner=owner||state.player;
  return ownedSettlements(owner).reduce(function(a,s){
    a.clan+=s.pop.clan;a.slave+=s.pop.slave;a.grain+=s.grain;a.fodder+=s.fodder;a.bronze+=s.bronze;
    return a;
  },{clan:0,slave:0,grain:0,fodder:0,bronze:0});
}
function nextId(prefix){
  state.idCounter=(state.idCounter||20)+1;
  return prefix+state.idCounter;
}
function charAssignedArmy(charId){
  return state.armies.find(function(a){return a.commander===charId;});
}
function charAssignedSettlement(charId){
  const id=Object.keys(state.governors||{}).find(function(k){return state.governors[k]===charId;});
  return id?getSet(id):null;
}
function removeGovernorAssignments(charId){
  Object.keys(state.governors||{}).forEach(function(id){if(state.governors[id]===charId)delete state.governors[id];});
}
function commanderBonus(a){
  const c=getChar(a.commander);
  return c ? 0.82+c.command/250 : 1;
}
function traitEffectText(c){
  if(!c)return "";
  const effects={
    "车战娴熟":"统领战车时战斗效率提高",
    "族兵凝聚":"统领族兵时士气与战斗效率提高",
    "西土开拓":"统军行军耗粮降低，进攻组织略有优势",
    "山地熟习":"丘陵与高地作战惩罚显著降低",
    "东土联结":"对服属与地方关系的外交更有优势",
    "舟陆并用":"河谷与渡口作战组织更好",
    "青铜工艺":"主政城邑时提高青铜作坊产出",
    "古蜀礼器传统":"祭祀与礼制威望收益更高",
    "善治仓廪":"主政城邑时提高秋收并改善经济",
    "谨慎占断":"参与王室事务时占卜可靠性略提高",
    "守成威权":"维持既有服属网络时威望损耗较低"
  };
  return effects[c.trait]||"人物特质将影响其最擅长的职责";
}
function factionRulerCharacter(owner){
  const f=faction(owner);
  return state.characters.find(function(c){return c.faction===owner&&c.name===f.ruler&&c.alive;})||null;
}
function terrainBattleFactor(army,settlement,attacking){
  const t=settlement.terrain;
  let f=1;
  const chariotMen=army.units.filter(function(u){return u.type==="chariot";}).reduce(function(n,u){return n+u.men;},0);
  const share=chariotMen/Math.max(1,armyMen(army));
  if(t==="highland"||t==="hill") f-=share*.65;
  if(t==="river"&&attacking) f*=.88;
  if(t==="plain") f+=share*.24;
  if(hasTech(army.owner,"hill_march")&&(t==="highland"||t==="hill"))f+=.08;
  const commander=getChar(army.commander);
  if(commander&&commander.trait==="山地熟习"&&(t==="highland"||t==="hill"))f+=.12;
  if(commander&&commander.trait==="舟陆并用"&&t==="river")f+=.10;
  if(commander&&commander.trait==="西土开拓"&&attacking)f+=.05;
  return Math.max(.55,f);
}
function unitPower(u,commander){
  const d=DATA.units[u.type];
  const quality=(d.melee+d.missile*.82+d.armor*.35+d.morale*.25)/65;
  let trait=1;
  if(commander&&commander.trait==="车战娴熟"&&u.type==="chariot")trait*=1.12;
  if(commander&&commander.trait==="族兵凝聚"&&u.type==="clan_levy")trait*=1.10;
  return u.men*quality*trait;
}
function armyPower(a,at,attacking){
  const s=at||getSet(a.at),commander=getChar(a.commander);
  let p=a.units.reduce(function(n,u){return n+unitPower(u,commander);},0);
  const supply=a.supplyState==="畅通"?1:a.supplyState==="危险"?.88:.68;
  return p*(a.morale/65)*commanderBonus(a)*supply*terrainBattleFactor(a,s,!!attacking);
}
function requiredLaborers(a){
  const hundreds=Math.ceil(armyMen(a)/100);
  const per100=hasTech(a.owner,"long_supply")?6:8;
  const carts=a.units.filter(function(u){return u.type==="chariot";}).reduce(function(n,u){return n+Math.ceil(u.men/4);},0);
  return Math.max(20,hundreds*per100+carts*2);
}
function chariotCount(a){
  return a.units.filter(function(u){return u.type==="chariot";}).reduce(function(n,u){return n+Math.ceil(u.men/4);},0);
}

function freshState(player){
  const chars=deepCopy(DATA.characters);
  const settlements=deepCopy(DATA.settlements);
  settlements.forEach(function(s){s.control=100;});
  return {
    version:DATA.version,player:player||"shang",year:-1115,season:0,turn:1,idCounter:30,
    factions:deepCopy(DATA.factions),
    settlements:settlements,
    characters:chars,
    armies:[
      {id:"a1",owner:"shang",name:"王师",at:"yin",previous:"yin",commander:"shang_general",
       units:[{type:"bronze_ge",men:160,morale:69},{type:"clan_levy",men:300,morale:52},{type:"archer",men:80,morale:57},{type:"chariot",men:24,morale:80}],
       grain:720,fodder:440,laborers:105,laborMix:{clan:35,slave:70},morale:72,supplyState:"畅通",supplyPath:["yin"]},
      {id:"a2",owner:"zhou",name:"周师",at:"zhouyuan",previous:"zhouyuan",commander:"zhou_general",
       units:[{type:"clan_levy",men:300,morale:52},{type:"archer",men:80,morale:57},{type:"bronze_spear",men:80,morale:67}],
       grain:560,fodder:180,laborers:72,laborMix:{clan:25,slave:47},morale:69,supplyState:"畅通",supplyPath:["zhouyuan"]},
      {id:"a3",owner:"gaodi",name:"高地战团",at:"gaodi",previous:"gaodi",commander:"gaodi_lord",
       units:[{type:"clan_levy",men:240,morale:54},{type:"archer",men:80,morale:58}],
       grain:390,fodder:170,laborers:50,laborMix:{clan:20,slave:30},morale:65,supplyState:"畅通",supplyPath:["gaodi"]},
      {id:"a4",owner:"dongfang",name:"东方联军",at:"qianzhangda",previous:"qianzhangda",commander:"east_lord",
       units:[{type:"clan_levy",men:300,morale:52},{type:"archer",men:80,morale:56},{type:"bronze_ge",men:80,morale:67},{type:"chariot",men:16,morale:76}],
       grain:570,fodder:260,laborers:72,laborMix:{clan:32,slave:40},morale:66,supplyState:"畅通",supplyPath:["qianzhangda"]},
      {id:"a5",owner:"jianghan",name:"江汉军",at:"jianghan",previous:"jianghan",commander:"jiang_lord",
       units:[{type:"clan_levy",men:260,morale:51},{type:"archer",men:80,morale:57}],
       grain:430,fodder:120,laborers:48,laborMix:{clan:18,slave:30},morale:61,supplyState:"畅通",supplyPath:["jianghan"]},
      {id:"a6",owner:"wucheng",name:"吴城军",at:"wucheng",previous:"wucheng",commander:"wu_lord",
       units:[{type:"clan_levy",men:220,morale:52},{type:"bronze_ge",men:80,morale:67},{type:"archer",men:80,morale:56}],
       grain:470,fodder:100,laborers:52,laborMix:{clan:22,slave:30},morale:63,supplyState:"畅通",supplyPath:["wucheng"]},
      {id:"a7",owner:"shu",name:"蜀地军",at:"shu",previous:"shu",commander:"shu_lord",
       units:[{type:"clan_levy",men:280,morale:53},{type:"bronze_spear",men:80,morale:66},{type:"archer",men:80,morale:57}],
       grain:620,fodder:150,laborers:65,laborMix:{clan:25,slave:40},morale:65,supplyState:"畅通",supplyPath:["shu"]}
    ],
    training:[],
    wars:{"gaodi|shang":true},
    warTurns:{"gaodi|shang":1},
    tribute:{},
    sieges:{},
    governors:{yin:"shang_steward",zhouyuan:"zhou_steward"},
    intel:{},
    tick:0,
    selectedSettlement:(DATA.settlements.find(function(s){return s.owner===player&&s.capital;})||DATA.settlements.find(function(s){return s.owner===player;})).id,
    selectedArmy:null,
    log:[{text:"春 · 局势初定：大邑商仍掌握最强的青铜与车战力量，周在西土渐强。",type:"normal"}],
    omen:null,
    omenTurn:-99,
    gameOver:false
  };
}

function startGame(player){
  state=freshState(player);
  const first=state.armies.find(function(a){return a.owner===player;});
  state.selectedArmy=first?first.id:null;
  refreshAllSupply();
  $("#newgame-overlay").classList.remove("show");
  render();
}

function render(){
  if(!state)return;
  refreshAllSupply();
  const t=totals();
  $("#hud-faction").textContent=faction(state.player).name;
  $("#hud-date").textContent="约前"+Math.abs(state.year)+"年 · "+seasonName();
  $("#hud-shells").textContent=fmt(faction(state.player).shells);
  $("#hud-grain").textContent=fmt(t.grain)+" 石";
  $("#hud-fodder").textContent=fmt(t.fodder);
  $("#hud-livestock").textContent=fmt(faction(state.player).livestock);
  $("#hud-clansmen").textContent=fmt(t.clan);
  $("#hud-slaves").textContent=fmt(t.slave);
  renderFaction();
  renderCharacters();
  renderMap();
  renderSettlement();
  renderDiplomacy();
  renderArmies();
  renderArmyDetail();
  renderTraining();
  renderLog();
}

function securedSettlementCount(owner){
  return ownedSettlements(owner).filter(function(s){return (s.control==null?100:s.control)>=50;}).length;
}
function campaignObjectiveHtml(){
  const f=faction(state.player),own=securedSettlementCount(state.player);
  const subjects=Object.keys(state.tribute).filter(function(k){return state.tribute[k]===state.player;}).length;
  if(state.player==="shang"){
    return '<b>霸权目标</b>：贡纳势力 '+subjects+'/3 · 威望 '+f.prestige+'/110；或控制周原且拥有 '+own+'/8 个聚落。';
  }
  if(state.player==="zhou"){
    return '<b>兴周目标</b>：控制大邑商·殷 '+(getSet("yin").owner===state.player?"✓":"✗")+' · 聚落 '+own+'/8。';
  }
  return '<b>区域霸权</b>：聚落 '+own+'/7 · 威望 '+f.prestige+'/90 · 臣属 '+subjects+'/1；或直接夺取大邑商·殷。';
}
function renderFaction(){
  const f=faction(state.player),t=totals();
  const techs=f.tech.map(function(id){
    const d=DATA.techs[id];
    return d?'<span class="badge '+String(d.confidence||"c").toLowerCase()+'" title="'+d.effect+'">'+d.name+'</span>':id;
  }).join(" ");
  $("#faction-summary").innerHTML=
    '<div class="stats">'+
      '<span>君主</span><b>'+f.ruler+'</b>'+
      '<span>威望</span><b>'+f.prestige+'</b>'+
      '<span>聚落</span><b>'+ownedSettlements().length+'</b>'+
      '<span>青铜储备</span><b>'+fmt(t.bronze)+'</b>'+
    '</div>'+
    '<p class="small">人口：族人 '+fmt(t.clan)+' · 奴隶 '+fmt(t.slave)+'</p>'+
    '<p class="small">'+campaignObjectiveHtml()+'</p>'+
    '<p class="small muted">技艺：'+(techs||"无")+'</p>';
}

function renderCharacters(){
  const chars=state.characters.filter(function(c){return c.faction===state.player&&c.alive;});
  $("#characters").innerHTML=chars.map(function(c){
    const army=charAssignedArmy(c.id),gov=charAssignedSettlement(c.id);
    return '<div class="char-card">'+
      '<b>'+c.name+'</b><span class="badge '+String(c.confidence||"c").toLowerCase()+'">'+c.role+'</span>'+
      '<div class="small muted">统御 '+c.command+' · 勇武 '+c.martial+' · 治政 '+c.admin+' · 外交 '+c.diplomacy+' · 祭祀 '+c.ritual+'</div>'+
      '<div class="small"><b>'+c.trait+'</b>：'+traitEffectText(c)+(army?' · <span class="good">统领 '+army.name+'</span>':gov?' · <span class="good">主政 '+gov.name+'</span>':'')+'</div>'+
    '</div>';
  }).join("");
}

function routeLine(a,b,map,blocked){
  const r=document.createElement("div"),dx=b.x-a.x,dy=b.y-a.y;
  r.className="route"+(blocked?" blocked":"");
  r.style.left=a.x+"%";r.style.top=a.y+"%";
  r.style.width=Math.hypot(dx/100*map.clientWidth,dy/100*map.clientHeight)+"px";
  r.style.transform="rotate("+Math.atan2(dy/100*map.clientHeight,dx/100*map.clientWidth)*180/Math.PI+"deg)";
  map.appendChild(r);
}
function nodeBlocked(id,owner){
  return state.armies.some(function(a){return a.owner!==owner&&a.at===id&&armyMen(a)>0;});
}
function renderTerrainBackdrop(map){
  const wrap=document.createElement("div");
  wrap.className="terrain-backdrop";
  wrap.innerHTML=
    '<svg viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">'+
      '<defs>'+
        '<linearGradient id="riverFade" x1="0" x2="1"><stop offset="0" stop-color="#668b91"/><stop offset="1" stop-color="#466f78"/></linearGradient>'+
        '<pattern id="ridge" width="22" height="14" patternUnits="userSpaceOnUse"><path d="M0 14 L11 2 L22 14" fill="none" stroke="rgba(164,143,102,.24)" stroke-width="2"/></pattern>'+
      '</defs>'+
      '<path class="river major" d="M40,304 C155,300 215,348 330,331 C430,315 452,278 535,292 C640,311 690,275 790,266 C875,258 920,279 990,292"/>'+
      '<path class="river" d="M92,338 C180,356 252,356 325,347 C378,340 410,325 454,315"/>'+
      '<path class="river" d="M754,423 C824,409 880,406 995,420"/>'+
      '<path class="river major" d="M515,520 C620,515 706,528 790,548 C866,565 932,561 995,552"/>'+
      '<path class="river" d="M682,438 C674,475 676,504 697,531"/>'+
      '<path class="mountain-area" d="M566,112 C610,126 642,163 650,221 C655,269 635,326 617,373 C603,408 590,438 570,458 L530,444 C552,390 558,343 565,288 C571,229 556,170 566,112 Z"/>'+
      '<path class="mountain-area qinling" d="M230,430 C330,416 430,425 548,444 C616,455 664,462 710,468 L694,501 C585,486 475,475 372,478 C304,480 252,471 214,459 Z"/>'+
      '<rect x="0" y="0" width="1000" height="600" fill="url(#ridge)" opacity=".15"/>'+
      '<text class="geo-label" x="515" y="270">黄河</text>'+
      '<text class="geo-label" x="245" y="345">渭水</text>'+
      '<text class="geo-label" x="820" y="408">淮水</text>'+
      '<text class="geo-label" x="835" y="548">大江</text>'+
      '<text class="geo-label land" x="598" y="218">太行</text>'+
      '<text class="geo-label land" x="435" y="465">秦岭</text>'+
      '<text class="region-label" x="745" y="215">王 畿</text>'+
      '<text class="region-label" x="260" y="250">西 土</text>'+
      '<text class="region-label" x="900" y="350">东 土</text>'+
      '<text class="region-label" x="690" y="565">南 土</text>'+
    '</svg>';
  map.appendChild(wrap);
}
function renderMap(){
  const map=$("#map");map.innerHTML="";
  renderTerrainBackdrop(map);
  const seen=new Set();
  state.settlements.forEach(function(a){
    a.roads.forEach(function(id){
      const b=getSet(id),key=[a.id,b.id].sort().join("-");
      if(!seen.has(key)){
        seen.add(key);
        routeLine(a,b,map,nodeBlocked(a.id,state.player)||nodeBlocked(b.id,state.player));
      }
    });
  });

  const supplyNodes=new Set();
  state.armies.filter(function(a){return a.owner===state.player;}).forEach(function(a){
    (a.supplyPath||[]).forEach(function(x){supplyNodes.add(x);});
  });

  state.settlements.forEach(function(s){
    const n=document.createElement("div");
    n.className="node "+s.owner+(s.capital?" capital":"")+(state.selectedSettlement===s.id?" selected":"")+(supplyNodes.has(s.id)?" supply":"");
    n.style.left=s.x+"%";n.style.top=s.y+"%";
    n.dataset.settlementId=s.id;
    n.setAttribute("aria-label",s.name);
    n.title=s.name+"｜"+terrainNames[s.terrain]+"｜史实级别 "+s.confidence;
    n.onclick=function(){selectSettlement(s.id);};
    map.appendChild(n);

    const l=document.createElement("div");
    l.className="node-label";l.style.left=s.x+"%";l.style.top=s.y+"%";l.textContent=s.name;map.appendChild(l);
    const meta=document.createElement("div");
    meta.className="node-meta";meta.style.left=s.x+"%";meta.style.top=s.y+"%";
    meta.textContent=ownerName(s.owner)+" · "+terrainNames[s.terrain];map.appendChild(meta);
  });

  state.armies.forEach(function(a,i){
    if(armyMen(a)<=0)return;
    const s=getSet(a.at);
    if(a.owner!==state.player&&intelLevel(s)<=0)return;
    const e=document.createElement("div");
    e.className="army-token "+(a.owner===state.player?"":"enemy")+(state.selectedArmy===a.id?" selected":"");
    e.style.left=(s.x+2+(i%2)*2)+"%";e.style.top=(s.y-4-(i%3)*2)+"%";
    if(a.owner===state.player){
      e.textContent=faction(a.owner).short+"军 "+armyMen(a);
      e.title=a.name+"｜粮道 "+a.supplyState;
      e.onclick=function(ev){ev.stopPropagation();selectArmy(a.id);};
    }else{
      const lvl=intelLevel(s);
      const shown=lvl>=3?fmt(armyMen(a)):lvl===2?"约"+fmt(roughNumber(armyMen(a),100)):"兵力不详";
      e.textContent=faction(a.owner).short+"军 "+shown;
      e.title=lvl>=2?a.name+"｜估计兵力 "+shown:"发现敌军活动";
      e.onclick=function(ev){ev.stopPropagation();state.selectedSettlement=s.id;render();};
    }
    map.appendChild(e);
  });
}

function selectSettlement(id){
  if(state.gameOver)return;
  state.selectedSettlement=id;
  render();
}
function marchSelectedArmy(){
  const a=getArmy(state.selectedArmy);
  const target=getSet(state.selectedSettlement);
  if(!a||a.owner!==state.player)return notice("请先选择一支我方军队。");
  if(!target||target.id===a.at)return notice("请先选择一个相邻目的地。");
  const at=getSet(a.at);
  if(!at.roads.includes(target.id))return notice("该聚落不与军队当前位置直接相邻。需要逐节点行军。");
  moveArmy(a,target.id);
}
function selectArmy(id){
  const a=getArmy(id);
  if(!a||a.owner!==state.player)return;
  state.selectedArmy=id;
  const target=getSet(state.selectedSettlement);
  const at=getSet(a.at);
  if(!target||(target.id!==a.at&&!at.roads.includes(target.id)))state.selectedSettlement=a.at;
  render();
}
window.selectArmy=selectArmy;

function forecastHarvest(s){
  const localArmies=state.armies.filter(function(a){return a.at===s.id;});
  const drawn=localArmies.reduce(function(n,a){return n+armyMen(a)+a.laborers;},0);
  const pop=s.pop.clan+s.pop.slave;
  const laborPenalty=Math.min(.38,drawn/Math.max(1000,pop)*1.55);
  let crop=(s.pop.clan*.105+s.pop.slave*.068)*s.farm/100*(1-laborPenalty);
  const gov=getChar(state.governors[s.id]);
  if(gov)crop*=Math.max(.88,1+(gov.admin-50)/300);
  if(gov&&gov.trait==="善治仓廪")crop*=1.08;
  if(hasTech(s.owner,"wei_farming"))crop*=1.08;
  crop*=controlEfficiency(s);
  return Math.max(0,Math.round(crop));
}
function renderSettlement(){
  const s=getSet(state.selectedSettlement);
  if(!s){$("#settlement-detail").innerHTML='<span class="muted">请选择一个聚落。</span>';return;}
  $("#settlement-title").textContent=s.name;
  const friendly=s.owner===state.player;
  const level=intelLevel(s);

  if(!friendly){
    const pop=s.pop.clan+s.pop.slave;
    let html='<div class="stats">'+
      '<span>控制</span><b>'+ownerName(s.owner)+'</b>'+
      '<span>地形</span><b>'+terrainNames[s.terrain]+'</b>'+
      '<span>情报</span><b>'+["未知","粗略","较详","确切"][level]+'</b>';

    if(level===0){
      html+='<span>规模</span><b>未知</b>'+
        '<span>守备</span><b>未知</b></div>'+
        '<p class="small muted">只有地理位置和大致政治归属可知。靠近、贸易、服属或派斥候可以提高情报。</p>';
    }else if(level===1){
      html+='<span>规模</span><b>'+populationBand(pop)+'</b>'+
        '<span>防御</span><b>'+(s.wall>0?"似有土垣/壕沟":"未见明显坚固城防")+'</b>'+
        '<span>军势</span><b>'+enemyArmyLabelAt(s)+'</b></div>'+
        '<p class="small muted">这是边境接触、使者或远望所得的粗略信息，不显示精确粮仓与装备。</p>';
    }else if(level===2){
      html+='<span>人口</span><b>约 '+fmt(roughNumber(pop,500))+'</b>'+
        '<span>粮情</span><b>'+grainBand(s)+'</b>'+
        '<span>铸造</span><b>'+ (s.forge>0?"有作坊":"未见明显作坊") +'</b>'+
        '<span>交换</span><b>'+ (s.market>=2?"较活跃":"一般") +'</b>'+
        '<span>地方态势</span><b>'+controlBand(s)+'</b>'+
        '<span>军势</span><b>'+enemyArmyLabelAt(s)+'</b></div>'+
        '<p class="small muted">贸易、臣属关系或较长期接触得到的较详细估计，仍可能存在误差。</p>';
    }else{
      const foodTurns=s.grain/Math.max(1,pop*.012);
      html+='<span>族人</span><b>'+fmt(s.pop.clan)+'</b>'+
        '<span>奴隶</span><b>'+fmt(s.pop.slave)+'</b>'+
        '<span>粮仓</span><b>'+fmt(s.grain)+' 石</b>'+
        '<span>草料</span><b>'+fmt(s.fodder)+'</b>'+
        '<span>青铜料</span><b>'+fmt(s.bronze)+'</b>'+
        '<span>地方服从</span><b>'+Math.round(s.control==null?100:s.control)+'/100</b>'+
        '<span>军势</span><b>'+enemyArmyLabelAt(s)+'</b></div>'+
        '<p class="small muted">库存：木骨兵器 '+s.weapons.wood+' · 弓 '+s.weapons.bow+' · 戈 '+s.weapons.ge+' · 矛 '+s.weapons.spear+' · 战车 '+s.weapons.chariot+'</p>'+
        '<p class="small">按当前观察，粮储约可覆盖本地 '+foodTurns.toFixed(1)+' 个季度基础口粮。</p>';
    }
    html+='<p class="small muted">史实置信度：'+s.confidence+'｜'+s.region+'</p>';
    $("#settlement-detail").innerHTML=html;
    return;
  }

  const pop=s.pop.clan+s.pop.slave;
  const foodTurns=s.grain/Math.max(1,pop*.012);
  const governor=getChar(state.governors[s.id]);
  const govOptions='<option value="">未任命</option>'+state.characters.filter(function(c){return c.faction===state.player&&c.alive;}).map(function(c){
    return '<option value="'+c.id+'" '+(state.governors[s.id]===c.id?"selected":"")+'>'+c.name+'（治政 '+c.admin+'）</option>';
  }).join("");
  $("#settlement-detail").innerHTML=
    '<div class="stats">'+
      '<span>控制</span><b>'+ownerName(s.owner)+'</b>'+
      '<span>地形</span><b>'+terrainNames[s.terrain]+'</b>'+
      '<span>族人</span><b>'+fmt(s.pop.clan)+'</b>'+
      '<span>奴隶</span><b>'+fmt(s.pop.slave)+'</b>'+
      '<span>粮仓</span><b>'+fmt(s.grain)+' 石</b>'+
      '<span>草料</span><b>'+fmt(s.fodder)+'</b>'+
      '<span>青铜料</span><b>'+fmt(s.bronze)+'</b>'+
      '<span>地方服从</span><b>'+Math.round(s.control==null?100:s.control)+'/100</b>'+
      '<span>秋收潜力</span><b>'+s.farm+'</b>'+
      '<span>铸造</span><b>'+s.forge+'级</b>'+
      '<span>交换场</span><b>'+s.market+'级</b>'+
    '</div>'+
    '<p class="small muted">库存：木骨兵器 '+s.weapons.wood+' · 弓 '+s.weapons.bow+' · 戈 '+s.weapons.ge+' · 矛 '+s.weapons.spear+' · 战车 '+s.weapons.chariot+'</p>'+
    '<p class="small">现存粮约可覆盖本地 '+foodTurns.toFixed(1)+' 个季度的基础口粮；按当前征发状态，预计秋收约 <b>'+fmt(forecastHarvest(s))+' 石</b>。</p>'+
    '<p class="small good">可在此征募、采买、训练并征调民夫。</p>'+
    '<div class="army-orders"><label>邑宰 / 主政者</label><select id="governor-select">'+govOptions+'</select></div>'+
    '<p class="small muted">史实置信度：'+s.confidence+'｜'+s.region+'</p>';
  $("#governor-select").onchange=function(){assignGovernor(s.id,this.value);};
}

function renderDiplomacy(){
  const s=getSet(state.selectedSettlement);
  const box=$("#diplomacy-detail");
  if(!box||!s){return;}
  if(s.owner===state.player){
    const subs=Object.keys(state.tribute).filter(function(k){return state.tribute[k]===state.player;});
    box.innerHTML='<div class="small">当前选择的是己方聚落。</div>'+
      '<p class="small muted">向我方贡纳：'+(subs.length?subs.map(ownerName).join("、"):"无")+'</p>';
    ["#btn-scout","#btn-gift","#btn-foreign-grain","#btn-demand-tribute","#btn-declare-war","#btn-peace"].forEach(function(id){$(id).disabled=true;});
    return;
  }
  const other=s.owner,rel=relation(state.player,other),war=isAtWar(state.player,other);
  const subject=state.tribute[other]===state.player;
  const ours=state.tribute[state.player]===other;
  const il=intelLevel(s);
  box.innerHTML=
    '<div class="stats"><span>对象</span><b>'+ownerName(other)+'</b>'+
    '<span>情报</span><b>'+["未知","粗略","较详","确切"][il]+'</b>'+
    '<span>关系</span><b class="'+(rel>=25?"good":rel<=-20?"bad":"warning")+'">'+rel+'</b>'+
    '<span>状态</span><b class="'+(war?"bad":"good")+'">'+(war?"交战":"和平")+'</b>'+
    '<span>服属</span><b>'+(subject?"向我贡纳":ours?"我方向其贡纳":"无")+'</b></div>'+
    '<p class="small muted">以贝进行礼物和交换是有意识的玩法简化；贡纳不等于直接吞并。</p>';
  $("#btn-scout").disabled=!canScoutSettlement(s);
  $("#btn-gift").disabled=war;
  $("#btn-foreign-grain").disabled=war||rel<-20;
  $("#btn-demand-tribute").disabled=war||subject;
  $("#btn-declare-war").disabled=war;
  $("#btn-peace").disabled=!war;
}

function renderArmies(){
  const list=state.armies.filter(function(a){return a.owner===state.player&&armyMen(a)>0;});
  $("#armies").innerHTML=list.map(function(a){
    const c=getChar(a.commander);
    const need=requiredLaborers(a);
    return '<div class="army-card '+(state.selectedArmy===a.id?"selected-card":"")+'">'+
      '<b>'+a.name+'</b><span class="badge">'+getSet(a.at).name+'</span>'+
      '<div>兵力 '+fmt(armyMen(a))+' · 将领 '+(c?c.name:"未任命")+' · 士气 '+Math.round(a.morale)+'</div>'+
      '<div class="small '+(a.supplyState==="畅通"?"good":a.supplyState==="危险"?"warning":"bad")+'">粮道 '+a.supplyState+' · 民夫 '+a.laborers+'/'+need+' · 随军粮 '+Math.round(a.grain)+' 石</div>'+
      '<button onclick="selectArmy(\''+a.id+'\')">选中</button>'+
    '</div>';
  }).join("")||'<span class="muted">当前没有可用军队。</span>';
}

function renderArmyDetail(){
  const a=getArmy(state.selectedArmy);
  if(!a||a.owner!==state.player){
    $("#army-detail").innerHTML='<span class="muted">请选择一支我方军队。</span>';
    $("#btn-march").disabled=true;
    $("#btn-march").textContent="行军至选中聚落";
    $("#btn-assault").disabled=true;
    return;
  }
  const available=state.characters.filter(function(c){return c.faction===state.player&&c.alive;});
  const options='<option value="">未任命</option>'+available.map(function(c){
    return '<option value="'+c.id+'" '+(a.commander===c.id?"selected":"")+'>'+c.name+'（统御 '+c.command+'）</option>';
  }).join("");
  const rows=a.units.map(function(u){
    return '<div class="unit-row"><span>'+DATA.units[u.type].name+'</span><b>'+fmt(u.men)+'</b></div>';
  }).join("");
  const path=(a.supplyPath||[]).map(function(id){return getSet(id).name;}).join(" → ");
  const quarterlyUse=Math.max(1,armyMen(a)*.022+a.laborers*.009);
  const endurance=a.grain/quarterlyUse;
  const siege=state.sieges[a.at]&&state.sieges[a.at].attackerArmyId===a.id?state.sieges[a.at]:null;
  $("#army-detail").innerHTML=
    '<div class="stats">'+
      '<span>兵力</span><b>'+fmt(armyMen(a))+'</b>'+
      '<span>士气</span><b>'+Math.round(a.morale)+'</b>'+
      '<span>民夫</span><b>'+a.laborers+' / '+requiredLaborers(a)+'</b>'+
      '<span>粮道</span><b class="'+(a.supplyState==="畅通"?"good":a.supplyState==="危险"?"warning":"bad")+'">'+a.supplyState+'</b>'+
      '<span>军粮</span><b>'+Math.round(a.grain)+' 石</b>'+
      '<span>草料</span><b>'+Math.round(a.fodder)+'</b>'+
    '</div>'+
    '<div class="army-orders"><label>统军将领</label><select id="commander-select">'+options+'</select></div>'+
    '<div class="unit-list">'+rows+'</div>'+
    '<p class="small">仅按随军粮估算可维持约 <b>'+endurance.toFixed(1)+' 季</b>（粮道补给未计入）。</p>'+
    '<p class="small muted">粮道：'+(path||"无可用路径")+'</p>'+
    (siege?'<p class="small warning">正在围困 '+getSet(a.at).name+' · 已持续 '+siege.turns+' 季。可等待其粮尽，或选择强攻。</p>':'');
  $("#commander-select").onchange=function(){assignCommander(a.id,this.value);};
  const marchTarget=getSet(state.selectedSettlement);
  const canMarch=!!(marchTarget&&marchTarget.id!==a.at&&getSet(a.at).roads.includes(marchTarget.id));
  $("#btn-march").disabled=!canMarch;
  $("#btn-march").textContent=canMarch?"行军至 "+marchTarget.name:"行军至选中聚落";
  $("#btn-assault").disabled=!siege;
}

function renderTraining(){
  const queue=state.training.filter(function(t){return t.owner===state.player;});
  $("#training-queue").innerHTML=queue.length?
    '<b>训练队列</b>'+queue.map(function(t){
      return '<div class="queue-card">'+getSet(t.at).name+' · '+DATA.units[t.type].name+' · 尚需 '+t.turns+' 季</div>';
    }).join(""):'<span class="muted">当前无训练队列。</span>';
}

function renderLog(){
  $("#log").innerHTML=state.log.map(function(x){
    const cls=x.type==="bad"?"bad":x.type==="good"?"good":x.type==="warning"?"warning":"";
    return '<div class="'+cls+'">• '+x.text+'</div>';
  }).join("");
}

function assignCommander(armyId,charId){
  const a=getArmy(armyId);
  if(!a)return;
  if(charId){
    const other=charAssignedArmy(charId);
    if(other&&other.id!==a.id)other.commander=null;
    removeGovernorAssignments(charId);
  }
  a.commander=charId||null;
  addLog(a.name+(charId?"任命 "+getChar(charId).name+" 为统军将领。":"暂不设主将。"));
  render();
}

function assignGovernor(settlementId,charId){
  const s=getSet(settlementId);
  if(!s||s.owner!==state.player)return;
  if(charId){
    const army=charAssignedArmy(charId);
    if(army)army.commander=null;
    removeGovernorAssignments(charId);
    state.governors[settlementId]=charId;
    addLog("任命 "+getChar(charId).name+" 主政 "+s.name+"。");
  }else{
    delete state.governors[settlementId];
    addLog(s.name+"暂不设专任主政者。");
  }
  render();
}

function recruit(type){
  const s=getSet(state.selectedSettlement),u=DATA.units[type],f=faction(state.player);
  if(!s||s.owner!==state.player)return notice("只能在己方聚落征募。");
  const cost=Math.round(u.shell*(type==="clan_levy"&&hasTech(state.player,"lineage_muster")?.85:1));
  if(s.pop[u.population]<u.size)return notice("对应人口不足。");
  if(s.weapons[u.weapon]<u.weaponNeed)return notice("武器库存不足，需要 "+u.weaponNeed+" 件/乘。");
  if(f.shells<cost)return notice("贝不足，需要 "+cost+" 贝。");
  if(s.grain<u.grain)return notice("粮食不足。");
  if((u.fodder||0)>s.fodder)return notice("草料不足。");

  s.pop[u.population]-=u.size;
  s.weapons[u.weapon]-=u.weaponNeed;
  f.shells-=cost;s.grain-=u.grain;s.fodder-=u.fodder||0;

  if(u.train>0){
    state.training.push({id:nextId("t"),type:type,at:s.id,owner:state.player,turns:u.train});
    addLog(s.name+"开始训练"+u.name+"，预计 "+u.train+" 季成军。");
  }else{
    formUnitAt(type,s.id,state.player);
    addLog(s.name+"立即征召"+u.name+" "+u.size+" 人。");
  }
  render();
}

function formUnitAt(type,at,owner){
  let a=state.armies.find(function(x){return x.owner===owner&&x.at===at&&x.name.indexOf("驻")>=0;});
  if(!a){
    a={id:nextId("a"),owner:owner,name:getSet(at).name+"驻军",at:at,previous:at,commander:null,
      units:[],grain:0,fodder:0,laborers:0,laborMix:{clan:0,slave:0},morale:55,supplyState:"畅通",supplyPath:[at]};
    state.armies.push(a);
  }
  const d=DATA.units[type];
  a.units.push({type:type,men:d.size,morale:d.morale});
  a.morale=Math.max(a.morale,d.morale-3);
}

function mobilizeLabor(amount){
  const a=getArmy(state.selectedArmy),s=a?getSet(a.at):null;
  if(!a||a.owner!==state.player)return notice("先选择我方军队。");
  if(!s||s.owner!==state.player)return notice("军队必须位于己方聚落才能征调民夫。");
  let left=amount;
  const slaves=Math.min(left,s.pop.slave);
  s.pop.slave-=slaves;left-=slaves;
  const clans=Math.min(left,s.pop.clan);
  s.pop.clan-=clans;left-=clans;
  const got=amount-left;
  a.laborers+=got;a.laborMix.slave=(a.laborMix.slave||0)+slaves;a.laborMix.clan=(a.laborMix.clan||0)+clans;
  addLog(a.name+"征调民夫 "+got+" 人。");
  render();
}
function releaseLabor(amount){
  const a=getArmy(state.selectedArmy),s=a?getSet(a.at):null;
  if(!a||a.owner!==state.player)return notice("先选择我方军队。");
  if(!s||s.owner!==state.player)return notice("军队必须位于己方聚落才能遣返民夫。");
  const n=Math.min(amount,a.laborers);
  const slave=Math.min(n,a.laborMix.slave||0),clan=n-slave;
  s.pop.slave+=slave;s.pop.clan+=clan;
  a.laborMix.slave=Math.max(0,(a.laborMix.slave||0)-slave);
  a.laborMix.clan=Math.max(0,(a.laborMix.clan||0)-clan);
  a.laborers-=n;
  addLog(a.name+"遣返民夫 "+n+" 人。");
  render();
}

function splitArmy(){
  const a=getArmy(state.selectedArmy);
  if(!a||a.owner!==state.player)return notice("请选择我方军队。");
  if(armyMen(a)<240)return notice("兵力太少，不适合继续分军。");
  const newUnits=[];
  a.units.forEach(function(u){
    if(u.men>=60){
      const n=Math.floor(u.men/2);
      u.men-=n;newUnits.push({type:u.type,men:n,morale:u.morale});
    }
  });
  if(!newUnits.length)return notice("没有足够完整的单位可拆分。");
  const labor=Math.floor(a.laborers/2),grain=a.grain/2,fodder=a.fodder/2;
  a.laborers-=labor;a.grain-=grain;a.fodder-=fodder;
  const slave=Math.floor((a.laborMix.slave||0)/2),clan=Math.floor((a.laborMix.clan||0)/2);
  a.laborMix.slave-=slave;a.laborMix.clan-=clan;
  const n={id:nextId("a"),owner:a.owner,name:a.name+"偏师",at:a.at,previous:a.previous,commander:null,
    units:newUnits,grain:grain,fodder:fodder,laborers:labor,laborMix:{slave:slave,clan:clan},
    morale:Math.max(45,a.morale-2),supplyState:a.supplyState,supplyPath:(a.supplyPath||[]).slice()};
  state.armies.push(n);
  state.selectedArmy=n.id;
  addLog(a.name+"分出 "+armyMen(n)+" 人组成偏师。","good");
  render();
}
function mergeArmies(){
  const a=getArmy(state.selectedArmy);
  if(!a||a.owner!==state.player)return notice("请选择我方军队。");
  const others=state.armies.filter(function(x){return x.id!==a.id&&x.owner===a.owner&&x.at===a.at;});
  if(!others.length)return notice("同一地点没有其他我方军队可合并。");
  others.forEach(function(o){
    o.units.forEach(function(u){
      const same=a.units.find(function(x){return x.type===u.type;});
      if(same){same.men+=u.men;same.morale=Math.round((same.morale+u.morale)/2);}
      else a.units.push(u);
    });
    a.grain+=o.grain;a.fodder+=o.fodder;a.laborers+=o.laborers;
    a.laborMix.clan=(a.laborMix.clan||0)+(o.laborMix.clan||0);
    a.laborMix.slave=(a.laborMix.slave||0)+(o.laborMix.slave||0);
    if(!a.commander&&o.commander)a.commander=o.commander;
  });
  const ids=new Set(others.map(function(x){return x.id;}));
  state.armies=state.armies.filter(function(x){return !ids.has(x.id);});
  addLog(a.name+"在"+getSet(a.at).name+"完成合军，现有 "+armyMen(a)+" 人。","good");
  render();
}

function supplyPathFor(a){
  const owner=a.owner;
  const q=[{id:a.at,path:[a.at]}],visited=new Set([a.at]);
  while(q.length){
    const cur=q.shift(),s=getSet(cur.id);
    if(cur.id!==a.at&&s.owner===owner&&!nodeBlocked(cur.id,owner))return cur.path;
    if(cur.id===a.at&&s.owner===owner&&!nodeBlocked(cur.id,owner))return cur.path;
    for(const nid of s.roads){
      if(visited.has(nid)||nodeBlocked(nid,owner))continue;
      const n=getSet(nid);
      if(n.owner!==owner&&nid!==a.at)continue;
      visited.add(nid);q.push({id:nid,path:cur.path.concat([nid])});
    }
  }
  return null;
}
function refreshAllSupply(){
  if(!state)return;
  state.armies.forEach(function(a){
    const path=supplyPathFor(a);
    a.supplyPath=path||[];
    if(!path)a.supplyState="中断";
    else if(path.length<=2)a.supplyState="畅通";
    else a.supplyState="危险";
  });
}

function marchCost(a,dest){
  const men=armyMen(a),rough=["hill","highland"].includes(dest.terrain)?1.22:dest.terrain==="river"?1.12:1;
  const tech=hasTech(a.owner,"long_supply")?.88:1;
  const commander=getChar(a.commander);
  const commandMarch=commander&&commander.trait==="西土开拓"?.90:commander&&commander.trait==="舟陆并用"&&dest.terrain==="river"?.92:1;
  const grain=Math.max(18,men*.04*rough*tech*commandMarch);
  const fodder=chariotCount(a)*8*(hasTech(a.owner,"wheel_maintenance")?.85:hasTech(a.owner,"chariot_craft")?.9:1);
  return {grain:grain,fodder:fodder};
}
function beginSiege(a,city){
  state.sieges[city.id]={attackerArmyId:a.id,owner:a.owner,turns:0};
  addLog(a.name+"开始围困"+city.name+"。若持续封锁，其粮储与守备会逐季恶化。","warning");
}
function estimateCityGarrisonPower(city){
  const pop=city.pop.clan+city.pop.slave;
  const men=Math.min(city.pop.clan,Math.max(160,Math.round(pop*.045)));
  const armed=Math.min(men,city.weapons.ge+city.weapons.spear+city.weapons.bow+Math.floor(city.weapons.wood*.8));
  const bronze=Math.min(1,(city.weapons.ge+city.weapons.spear)/Math.max(1,men));
  const missile=Math.min(1,city.weapons.bow/Math.max(1,men));
  const quality=.42+bronze*.55+missile*.24+(armed/Math.max(1,men))*.18;
  const fort=1+city.wall*.16+(hasTech(city.owner,"fortification")?.15:0);
  return men*quality*fort;
}
function processSieges(){
  Object.keys(state.sieges).forEach(function(cityId){
    const siege=state.sieges[cityId],city=getSet(cityId),army=getArmy(siege.attackerArmyId);
    if(!city||!army||army.at!==cityId||city.owner===army.owner){
      delete state.sieges[cityId];return;
    }
    siege.turns++;
    const pop=city.pop.clan+city.pop.slave;
    const pressure=Math.max(90,Math.round(pop*.018));
    city.grain=Math.max(0,city.grain-pressure);
    if(army.owner===state.player)addLog(city.name+"被围困：城内额外消耗 "+pressure+" 石粮。","warning");
    if(city.grain<=0&&siege.turns>=2){
      const chance=Math.min(.82,.32+siege.turns*.12+faction(army.owner).prestige/400);
      if(Math.random()<chance){
        addLog(city.name+"粮尽，守者开门屈服。","good");
        occupySettlement(army,city);
        delete state.sieges[cityId];
        return;
      }
    }

    // AI may assault other AI polities after establishing a siege, but never resolves a player's city assault invisibly.
    if(army.owner!==state.player&&city.owner!==state.player&&siege.turns>=2&&army.morale>=50){
      const laborNeed=requiredLaborers(army)+40;
      const advantage=armyPower(army,city,true)/Math.max(1,estimateCityGarrisonPower(city));
      const willingness=Math.min(.55,.12+(siege.turns-2)*.08+Math.max(0,advantage-1.15)*.25);
      if(army.laborers>=laborNeed&&army.grain>=80&&advantage>=1.18&&Math.random()<willingness){
        const garrison=createSiegeGarrison(city);
        if(!garrison.units.length||armyMen(garrison)<=0){
          occupySettlement(army,city);
        }else{
          addLog(ownerName(army.owner)+"对"+city.name+"发动强攻。");
          autoResolve(army,garrison,army.previous||city.id);
        }
        if(city.owner===army.owner||!getArmy(army.id)||army.at!==city.id)delete state.sieges[cityId];
      }
    }
  });
}
function createSiegeGarrison(city){
  const owner=city.owner;
  const maxClan=Math.min(city.pop.clan,Math.max(160,Math.round((city.pop.clan+city.pop.slave)*.045)));
  let remaining=maxClan;
  const units=[];
  if(city.weapons.spear>=80&&remaining>=80){
    units.push({type:"bronze_spear",men:80,morale:62});city.weapons.spear-=80;remaining-=80;
  }else if(city.weapons.ge>=80&&remaining>=80){
    units.push({type:"bronze_ge",men:80,morale:64});city.weapons.ge-=80;remaining-=80;
  }
  if(city.weapons.bow>=80&&remaining>=80){
    units.push({type:"archer",men:80,morale:54});city.weapons.bow-=80;remaining-=80;
  }
  while(remaining>=100&&city.weapons.wood>=80){
    units.push({type:"clan_levy",men:100,morale:48});city.weapons.wood-=80;remaining-=100;
  }
  const used=units.reduce(function(n,u){return n+u.men;},0);
  city.pop.clan=Math.max(0,city.pop.clan-used);
  if(!units.length){
    const emergency=Math.min(120,city.pop.slave);
    if(emergency>0){
      units.push({type:"slave_levy",men:emergency,morale:30});
      city.pop.slave-=emergency;
    }
  }
  const g={id:nextId("g"),owner:owner,name:city.name+"守军",at:city.id,previous:city.id,commander:null,
    units:units,grain:Math.min(220,city.grain*.08),fodder:0,laborers:25,laborMix:{clan:10,slave:15},
    morale:Math.min(78,54+city.wall*8+(hasTech(owner,"fortification")?6:0)),supplyState:"畅通",supplyPath:[city.id],temporaryGarrison:true};
  state.armies.push(g);
  return g;
}
function assaultCurrentSiege(){
  const a=getArmy(state.selectedArmy);
  if(!a)return notice("请选择正在围城的军队。");
  const siege=state.sieges[a.at];
  if(!siege||siege.attackerArmyId!==a.id)return notice("该军当前没有围困城邑。");
  const city=getSet(a.at);
  const assaultLabor=requiredLaborers(a)+40;
  if(a.laborers<assaultLabor)return notice("强攻需要至少 "+assaultLabor+" 名民夫，其中额外民夫负责填壕、梯具与土工作业。当前只有 "+a.laborers+" 人。");
  const garrison=createSiegeGarrison(city);
  if(!garrison.units.length||armyMen(garrison)<=0){
    occupySettlement(a,city);delete state.sieges[city.id];render();return;
  }
  addLog(a.name+"对"+city.name+"发动强攻。","warning");
  beginEncounter(a,garrison,a.previous||city.id,function(){
    if(city.owner===a.owner)delete state.sieges[city.id];
    else if(!getArmy(a.id)||a.at!==city.id)delete state.sieges[city.id];
    render();
  });
}

function moveArmy(a,targetId,after){
  if(turnBusy||state.gameOver)return;
  const origin=getSet(a.at),dest=getSet(targetId);
  if(!origin.roads.includes(targetId))return notice("只能沿相邻道路或通道行军。");
  const need=requiredLaborers(a);
  if(a.laborers<need)return notice(a.name+"民夫不足。当前 "+a.laborers+"，至少需要 "+need+" 人。");
  if(dest.owner!==a.owner&&!isAtWar(a.owner,dest.owner)){
    declareWar(a.owner,dest.owner,true);
  }
  const cost=marchCost(a,dest);
  if(a.grain<cost.grain)return notice("随军粮不足，至少需要约 "+Math.ceil(cost.grain)+" 石才能行军。");

  a.grain-=cost.grain;a.fodder=Math.max(0,a.fodder-cost.fodder);
  a.previous=origin.id;a.at=targetId;
  addLog(a.name+"由"+origin.name+"行军至"+dest.name+"，消耗军粮 "+Math.round(cost.grain)+" 石。");
  refreshAllSupply();

  const enemies=state.armies.filter(function(x){return x.owner!==a.owner&&x.at===targetId&&armyMen(x)>0;});
  if(enemies.length){
    beginEncounter(a,enemies[0],origin.id,after);
  }else{
    if(dest.owner!==a.owner){
      if(dest.wall>0)beginSiege(a,dest);
      else occupySettlement(a,dest);
    }
    render();
    if(after)after();
  }
}
function tryLearnTech(receiver,source,reason,chance){
  const rf=faction(receiver),sf=faction(source);
  if(!rf||!sf)return null;
  const candidates=sf.tech.filter(function(id){return !rf.tech.includes(id)&&DATA.techs[id];});
  if(!candidates.length||Math.random()>chance)return null;
  const id=candidates[Math.floor(Math.random()*candidates.length)];
  rf.tech.push(id);
  if(receiver===state.player)addLog(reason+"，我方吸收技艺："+DATA.techs[id].name+"。","good");
  return id;
}
function occupySettlement(a,city){
  const old=city.owner;
  const capt=Math.min(city.pop.clan,Math.max(20,Math.round(city.pop.clan*.018)));
  city.pop.clan-=capt;city.pop.slave+=capt;city.owner=a.owner;
  city.control=38;
  if(state.intel)delete state.intel[city.id];
  delete state.governors[city.id];
  delete state.sieges[city.id];
  faction(a.owner).prestige+=2;
  if(city.forge>0)tryLearnTech(a.owner,old,"接收"+city.name+"的作坊与工匠",Math.min(.48,.16+city.forge*.10));
  addLog(city.name+"在无成建制守军情况下屈服于"+ownerName(a.owner)+"；约 "+capt+" 人被编为奴隶/俘口。","good");
  if(old===state.player)addLog("失去聚落 "+city.name+"。","bad");
  checkVictory();
}

function encounterArmyHtml(a,side){
  const cmd=getChar(a.commander);
  const composition=a.units.map(function(u){return DATA.units[u.type].short+" "+fmt(u.men);}).join(" · ");
  return '<div class="encounter-force '+side+'">'+
    '<h3>'+a.name+'</h3>'+
    '<div class="stats">'+
      '<span>兵力</span><b>'+fmt(armyMen(a))+'</b>'+
      '<span>主将</span><b>'+(cmd?cmd.name:"未任命")+'</b>'+
      '<span>士气</span><b>'+Math.round(a.morale)+'</b>'+
      '<span>粮道</span><b>'+a.supplyState+'</b>'+
    '</div>'+
    '<p class="small muted">'+composition+'</p>'+
  '</div>';
}
function retreatNodeStrict(army,avoid){
  const s=getSet(army.at);
  if(!s)return null;
  return s.roads.map(getSet).find(function(n){
    return n&&n.id!==avoid&&n.owner===army.owner&&!nodeBlocked(n.id,army.owner);
  })||null;
}
function beginEncounter(attacker,defender,attackerFrom,after){
  const playerArmy=attacker.owner===state.player?attacker:defender;
  const enemyArmy=playerArmy===attacker?defender:attacker;
  const location=getSet(attacker.at);
  const pc=getChar(playerArmy.commander),ec=getChar(enemyArmy.commander);
  const siegeMode=!!(defender.temporaryGarrison&&state.sieges[location.id]);
  turnBusy=true;
  pendingEncounter={attacker:attacker,defender:defender,playerArmy:playerArmy,enemyArmy:enemyArmy,
    attackerFrom:attackerFrom,after:after,location:location,pc:pc,ec:ec,siegeMode:siegeMode};

  const playerIsAttacker=playerArmy===attacker;
  const retreatNode=playerIsAttacker?getSet(attackerFrom):retreatNodeStrict(playerArmy,attacker.at);
  pendingEncounter.retreatNode=retreatNode;

  $("#encounter-title").textContent=(siegeMode?"强攻 ":"遭遇 ")+location.name;
  $("#encounter-summary").innerHTML=
    '<div class="encounter-grid">'+encounterArmyHtml(playerArmy,"player")+
    '<div class="encounter-vs">VS</div>'+encounterArmyHtml(enemyArmy,"enemy")+'</div>'+
    '<div class="encounter-terrain"><b>战场：</b>'+(siegeMode?"土垣与壕沟":terrainNames[location.terrain])+
    '　·　<b>我方：</b>'+(playerIsAttacker?"进攻":"防守")+
    '　·　<b>地形判断：</b>'+(location.terrain==="plain"?"开阔地利于战车机动":location.terrain==="highland"||location.terrain==="hill"?"山地会显著限制战车":"需要留意道路、河谷与队形")+
    '</div>';
  $("#encounter-retreat").disabled=!retreatNode;
  $("#encounter-retreat").textContent=retreatNode?"撤退至 "+retreatNode.name:"无路可退";
  $("#encounter-overlay").classList.add("show");
}
function commandPendingEncounter(){
  const p=pendingEncounter;
  if(!p)return;
  $("#encounter-overlay").classList.remove("show");
  pendingEncounter=null;
  BATTLE_ENGINE.start({
    attacker:p.attacker,defender:p.defender,playerArmy:p.playerArmy,enemyArmy:p.enemyArmy,
    terrain:p.location.terrain,terrainName:p.siegeMode?"土垣聚落强攻":terrainNames[p.location.terrain],locationName:p.location.name,
    siege:p.siegeMode,
    commanders:{[p.playerArmy.id]:p.pc,[p.enemyArmy.id]:p.ec},
    onFinish:function(result){
      resolveTacticalResult(result,p.attacker,p.defender,p.playerArmy,p.enemyArmy,p.attackerFrom,p.after);
    }
  });
}
function autoPendingEncounter(){
  const p=pendingEncounter;
  if(!p)return;
  $("#encounter-overlay").classList.remove("show");
  pendingEncounter=null;
  autoResolve(p.attacker,p.defender,p.attackerFrom);
  turnBusy=false;
  refreshAllSupply();
  checkVictory();
  render();
  if(p.after)p.after();
}
function retreatPendingEncounter(){
  const p=pendingEncounter;
  if(!p||!p.retreatNode)return;
  $("#encounter-overlay").classList.remove("show");
  pendingEncounter=null;
  const a=p.playerArmy;
  damageArmy(a,.025);
  a.morale=Math.max(20,a.morale-5);
  a.at=p.retreatNode.id;a.previous=p.retreatNode.id;
  addLog(a.name+"主动脱离接触，退往"+p.retreatNode.name+"；撤退中有少量失散。","warning");

  if(a===p.defender){
    const city=p.location;
    if(city.owner!==p.attacker.owner){
      if(city.wall>0)beginSiege(p.attacker,city);
      else occupySettlement(p.attacker,city);
    }
  }
  turnBusy=false;
  refreshAllSupply();
  render();
  if(p.after)p.after();
}
function syncFromBattle(a,pack){
  pack.forEach(function(p){
    if(a.units[p.sourceIndex]){
      a.units[p.sourceIndex].men=p.men;
      a.units[p.sourceIndex].morale=p.morale;
    }
  });
  a.units=a.units.filter(function(u){return u.men>0;});
  const remaining=armyMen(a);
  if(remaining>0){
    const weighted=a.units.reduce(function(n,u){return n+(u.morale||DATA.units[u.type].morale)*u.men;},0);
    a.morale=Math.max(12,Math.min(90,weighted/remaining));
  }else a.morale=0;
}
function pursuitLoss(loser,winner){
  const carts=chariotCount(winner);
  const terrain=getSet(loser.at).terrain;
  const open=["plain","rolling"].includes(terrain);
  let pct=.035+(open?Math.min(.13,carts*.005):Math.min(.05,carts*.002));
  loser.units.forEach(function(u){u.men=Math.max(0,Math.round(u.men*(1-pct)));});
  loser.units=loser.units.filter(function(u){return u.men>0;});
}
function findRetreatNode(army,avoid){
  const s=getSet(army.at);
  const candidates=s.roads.map(getSet).filter(function(n){return n.id!==avoid&&n.owner===army.owner&&!nodeBlocked(n.id,army.owner);});
  return candidates[0]||getSet(army.previous||s.id);
}
function resolveTacticalResult(result,attacker,defender,playerArmy,enemyArmy,attackerFrom,after){
  syncFromBattle(playerArmy,result.player);
  syncFromBattle(enemyArmy,result.enemy);
  const winner=result.winnerSide==="player"?playerArmy:enemyArmy;
  const loser=winner===playerArmy?enemyArmy:playerArmy;
  pursuitLoss(loser,winner);

  addLog(winner.name+"在"+getSet(attacker.at).name+"取得战场优势；"+loser.name+"发生溃退。",winner.owner===state.player?"good":"bad");

  if(loser.temporaryGarrison){
    addLog(loser.name+"守备体系瓦解，幸存者逃散、被俘或退回民间。","bad");
    state.armies=state.armies.filter(function(x){return x.id!==loser.id;});
  }else if(armyMen(loser)<45){
    addLog(loser.name+"已无法维持成建制军队，残部失散或被俘。","bad");
    state.armies=state.armies.filter(function(x){return x.id!==loser.id;});
  }else{
    const avoid=winner.at;
    const retreat=findRetreatNode(loser,avoid);
    if(retreat){loser.at=retreat.id;loser.previous=retreat.id;}
    loser.morale=Math.max(18,loser.morale-8);
  }

  if(winner===attacker&&getSet(attacker.at).owner!==attacker.owner)occupySettlement(attacker,getSet(attacker.at));
  if(loser===attacker&&getArmy(attacker.id)){attacker.at=attackerFrom;attacker.previous=attackerFrom;}

  turnBusy=false;
  refreshAllSupply();
  checkVictory();
  render();
  if(after)after();
}

function autoResolve(attacker,defender,attackerFrom){
  const s=getSet(attacker.at);
  const pa=armyPower(attacker,s,true)*(.9+Math.random()*.2);
  const fort=s.wall?1+s.wall*.08+(hasTech(defender.owner,"fortification")?.15:0):1;
  const pd=armyPower(defender,s,false)*(.9+Math.random()*.2)*fort;
  const winner=pa>=pd?attacker:defender,loser=winner===attacker?defender:attacker;
  const ratio=Math.max(pa,pd)/Math.max(1,Math.min(pa,pd));
  damageArmy(winner,Math.min(.22,.07+.035/ratio));
  damageArmy(loser,Math.min(.48,.16+.105*ratio));
  pursuitLoss(loser,winner);
  winner.morale=Math.min(88,winner.morale+4);loser.morale=Math.max(18,loser.morale-16);
  addLog(winner.name+"击溃"+loser.name+"。","warning");
  if(loser.temporaryGarrison){
    state.armies=state.armies.filter(function(x){return x.id!==loser.id;});
  }else if(armyMen(loser)<45){
    state.armies=state.armies.filter(function(x){return x.id!==loser.id;});
  }else{
    const ret=findRetreatNode(loser,winner.at);if(ret)loser.at=ret.id;
  }
  if(winner===attacker&&s.owner!==attacker.owner)occupySettlement(attacker,s);
  if(loser===attacker&&getArmy(attacker.id)){attacker.at=attackerFrom;attacker.previous=attackerFrom;}
}
function damageArmy(a,pct){
  a.units.forEach(function(u){u.men=Math.max(0,Math.round(u.men*(1-pct)));});
  a.units=a.units.filter(function(u){return u.men>0;});
}

function processTraining(){
  state.training.forEach(function(t){t.turns--;});
  const done=state.training.filter(function(t){return t.turns<=0;});
  state.training=state.training.filter(function(t){return t.turns>0;});
  done.forEach(function(t){
    formUnitAt(t.type,t.at,t.owner);
    addLog(getSet(t.at).name+"的"+DATA.units[t.type].name+"训练完成。",t.owner===state.player?"good":"normal");
  });
}

function settlementEconomy(){
  state.settlements.forEach(function(s){
    const pop=s.pop.clan+s.pop.slave;
    const food=Math.round(pop*.012);
    s.grain-=food;
    if(s.grain<0){
      const shortage=Math.abs(s.grain);s.grain=0;
      const loss=Math.min(.012,.002+shortage/Math.max(1,pop)/20);
      s.pop.clan=Math.max(0,Math.round(s.pop.clan*(1-loss)));
      s.pop.slave=Math.max(0,Math.round(s.pop.slave*(1-loss*1.25)));
      if(s.owner===state.player)addLog(s.name+"发生缺粮，人口开始逃亡或死亡。","bad");
    }

    const owner=faction(s.owner);
    const gov=getChar(state.governors[s.id]);
    let govEco=gov?Math.max(.82,1+(gov.admin-50)/260):1;
    if(gov&&gov.trait==="善治仓廪")govEco*=1.08;
    owner.shells+=Math.round(pop*.00055*(1+s.market*.32)*govEco*controlEfficiency(s));

    const woodGain=Math.round(pop*.0025*(hasTech(s.owner,"local_craft")?1.10:1));
    s.weapons.wood+=woodGain;
    s.weapons.bow+=Math.round(pop*.00022);

    if(s.forge>0&&s.bronze>5){
      const craftGov=getChar(state.governors[s.id]);
      const mult=(hasTech(s.owner,"piece_mold")?1.2:1)*(hasTech(s.owner,"improved_mold")?1.15:1)*(craftGov&&craftGov.trait==="青铜工艺"?1.15:1);
      const use=Math.min(s.bronze,Math.round(s.forge*12));
      s.bronze-=use;
      s.weapons.ge+=Math.round(use*.52*mult);
      s.weapons.spear+=Math.round(use*.36*mult);
    }

    const fodderMult=hasTech(s.owner,"highland_stock")?1.15:1;
    s.fodder+=Math.round(pop*.004*s.farm/100*fodderMult);
  });
}

function harvest(){
  state.settlements.forEach(function(s){
    const localArmies=state.armies.filter(function(a){return a.at===s.id;});
    const drawn=localArmies.reduce(function(n,a){return n+armyMen(a)+a.laborers;},0);
    const pop=s.pop.clan+s.pop.slave;
    const laborPenalty=Math.min(.38,drawn/Math.max(1000,pop)*1.55);
    const crop=forecastHarvest(s);
    s.grain+=crop;
    if(s.owner===state.player)addLog(s.name+"秋收 "+fmt(crop)+" 石"+(laborPenalty>.12?"；军役抽走过多劳力，收成受损。":""),laborPenalty>.12?"warning":"good");
  });
}

function consumeArmies(){
  state.armies.forEach(function(a){
    refreshAllSupply();
    const men=armyMen(a);
    let grainUse=men*.022+a.laborers*.009;
    if(a.supplyState==="危险")grainUse*=1.12;
    if(a.supplyState==="中断")grainUse*=1.22;
    const tech=hasTech(a.owner,"long_supply")?.88:1;
    grainUse*=tech;
    const fodderUse=chariotCount(a)*4*(hasTech(a.owner,"wheel_maintenance")?.85:hasTech(a.owner,"chariot_craft")?.9:1);
    a.grain-=grainUse;a.fodder-=fodderUse;

    const s=getSet(a.at);
    if(a.supplyState!=="中断"){
      const source=(a.supplyPath||[]).map(getSet).find(function(x){return x&&x.owner===a.owner&&x.grain>0;})||s;
      if(source&&source.owner===a.owner){
        const need=Math.max(0,men*.22-a.grain);
        const take=Math.min(source.grain,need);
        source.grain-=take;a.grain+=take;
        const fn=Math.max(0,220-a.fodder),ft=Math.min(source.fodder,fn);
        source.fodder-=ft;a.fodder+=ft;
      }
    }

    if(a.grain<0){
      a.grain=0;a.morale=Math.max(10,a.morale-10);
      damageArmy(a,.015);
      if(a.owner===state.player)addLog(a.name+"军粮断绝，出现逃亡与体力崩溃。","bad");
    }
    if(a.fodder<0){
      a.fodder=0;a.morale=Math.max(10,a.morale-3);
    }
  });
}

function processLocalControl(){
  state.settlements.forEach(function(s){
    if(typeof s.control!=="number")s.control=100;
    if(s.control>=100)return;
    if(state.sieges[s.id])return;
    const gov=getChar(state.governors[s.id]);
    const garrison=state.armies.some(function(a){return a.owner===s.owner&&a.at===s.id&&armyMen(a)>=80;});
    let gain=1.5;
    if(gov)gain+=1.5+Math.max(0,(gov.admin-55)/30);
    if(garrison)gain+=2.5;
    gain+=Math.max(0,(faction(s.owner).prestige-50)/80);
    s.control=Math.min(100,s.control+gain);
  });
}

function populationTick(){
  state.settlements.forEach(function(s){
    const pop=s.pop.clan+s.pop.slave;
    const foodRatio=s.grain/Math.max(1,pop*.05);
    let r=foodRatio>1.2?.0014:foodRatio>.55?.0005:-.0035;
    s.pop.clan=Math.max(0,Math.round(s.pop.clan*(1+r)));
    s.pop.slave=Math.max(0,Math.round(s.pop.slave*(1+r*.6)));
  });
}

function aiRecruit(owner){
  const f=faction(owner);
  const capital=state.settlements.find(function(s){return s.owner===owner&&s.capital;})||ownedSettlements(owner)[0];
  if(!capital)return;
  const armies=state.armies.filter(function(a){return a.owner===owner;});
  const troops=armies.reduce(function(n,a){return n+armyMen(a);},0);
  const pop=ownedSettlements(owner).reduce(function(n,s){return n+s.pop.clan+s.pop.slave;},0);
  if(troops>pop*.055||f.shells<70)return;

  const preferred=capital.weapons.ge>=80&&f.shells>180?"bronze_ge":capital.weapons.wood>=80?"clan_levy":null;
  if(!preferred)return;
  const u=DATA.units[preferred],cost=u.shell;
  if(capital.pop[u.population]<u.size||capital.weapons[u.weapon]<u.weaponNeed||capital.grain<u.grain||f.shells<cost)return;
  capital.pop[u.population]-=u.size;capital.weapons[u.weapon]-=u.weaponNeed;capital.grain-=u.grain;f.shells-=cost;
  if(u.train)state.training.push({id:nextId("t"),type:preferred,at:capital.id,owner:owner,turns:u.train});
  else formUnitAt(preferred,capital.id,owner);
}

function aiPrepareArmy(a){
  const s=getSet(a.at);
  if(!s||s.owner!==a.owner)return;
  const need=Math.max(0,requiredLaborers(a)-a.laborers);
  if(need>0){
    let left=need;
    const slaves=Math.min(left,s.pop.slave);s.pop.slave-=slaves;left-=slaves;
    const clans=Math.min(left,s.pop.clan);s.pop.clan-=clans;left-=clans;
    const got=need-left;
    a.laborers+=got;
    a.laborMix.slave=(a.laborMix.slave||0)+slaves;
    a.laborMix.clan=(a.laborMix.clan||0)+clans;
  }
  if(!a.commander){
    const c=state.characters.find(function(ch){
      return ch.faction===a.owner&&ch.alive&&!charAssignedArmy(ch.id)&&!charAssignedSettlement(ch.id);
    });
    if(c)a.commander=c.id;
  }
}
function chooseAiAction(owner){
  const armies=state.armies.filter(function(a){return a.owner===owner&&armyMen(a)>100;});
  if(!armies.length)return null;
  let a=armies.sort(function(x,y){return armyPower(y)-armyPower(x);})[0];
  aiPrepareArmy(a);
  const s=getSet(a.at);
  const targets=s.roads.map(getSet).filter(function(n){
    if(n.owner===owner)return false;
    if(isAtWar(owner,n.owner))return true;
    if(n.owner==="neutral"&&relation(owner,n.owner)<=5)return true;
    return relation(owner,n.owner)<-20;
  });
  if(!targets.length)return null;
  targets.sort(function(x,y){
    const xp=(x.owner===state.player?0:250)+(x.capital?-300:0)+(x.pop.clan+x.pop.slave)*.01;
    const yp=(y.owner===state.player?0:250)+(y.capital?-300:0)+(y.pop.clan+y.pop.slave)*.01;
    return xp-yp;
  });
  const target=targets[0];
  if(!isAtWar(owner,target.owner))declareWar(owner,target.owner,true);
  const defender=state.armies.find(function(x){return x.owner!==owner&&x.at===target.id&&armyMen(x)>0;});
  if(defender&&armyPower(a,target,true)<armyPower(defender,target,false)*1.12)return null;
  if(a.laborers<requiredLaborers(a)||a.grain<marchCost(a,target).grain)return null;
  return {armyId:a.id,targetId:target.id};
}

function runAiActions(actions,index,done){
  if(index>=actions.length){done();return;}
  const act=actions[index],a=getArmy(act.armyId);
  if(!a){runAiActions(actions,index+1,done);return;}
  const origin=a.at,dest=getSet(act.targetId),cost=marchCost(a,dest);
  a.grain-=cost.grain;a.fodder=Math.max(0,a.fodder-cost.fodder);a.previous=origin;a.at=dest.id;
  const defender=state.armies.find(function(x){return x.owner!==a.owner&&x.at===dest.id&&armyMen(x)>0;});
  if(defender){
    if(defender.owner===state.player){
      beginEncounter(a,defender,origin,function(){runAiActions(actions,index+1,done);});
    }else{
      autoResolve(a,defender,origin);
      runAiActions(actions,index+1,done);
    }
  }else{
    if(dest.owner!==a.owner){
      if(dest.wall>0)beginSiege(a,dest);
      else occupySettlement(a,dest);
    }
    runAiActions(actions,index+1,done);
  }
}

function factionPower(owner){
  const armies=state.armies.filter(function(a){return a.owner===owner;});
  const military=armies.reduce(function(n,a){return n+armyPower(a);},0);
  const pop=ownedSettlements(owner).reduce(function(n,s){return n+s.pop.clan+s.pop.slave;},0);
  return military+pop*.12+faction(owner).prestige*9;
}
function shareBorder(a,b){
  return state.settlements.some(function(s){
    return s.owner===a&&s.roads.some(function(id){const n=getSet(id);return n&&n.owner===b;});
  });
}
function aiDiplomaticPulse(){
  state.warTurns=state.warTurns||{};
  Object.keys(state.wars).forEach(function(key){state.warTurns[key]=(state.warTurns[key]||0)+1;});
  // Only make structural diplomatic choices at the start of a new year.
  if(state.season!==0)return;
  const majors=Object.keys(state.factions).filter(function(x){return x!=="neutral";});
  for(let i=0;i<majors.length;i++){
    for(let j=i+1;j<majors.length;j++){
      const a=majors[i],b=majors[j],key=pairKey(a,b);
      if(!shareBorder(a,b))continue;

      // Player wars are never ended or begun silently; the player keeps agency.
      if(a===state.player||b===state.player){
        if(!isAtWar(a,b)){
          const other=a===state.player?b:a;
          // Expanding powers make neighbors more wary, but this is gradual.
          const expansion=Math.max(0,ownedSettlements(other).length-2);
          if(expansion>1 && relation(a,b)>-30 && Math.random()<.45){
            changeRelation(a,b,-Math.min(5,1+expansion));
            addLog("邻近的"+ownerName(other)+"势力扩张，引起边境戒备。","warning");
          }
        }
        continue;
      }

      if(isAtWar(a,b)){
        const duration=state.warTurns[key]||0;
        const pa=factionPower(a),pb=factionPower(b);
        const exhausted=duration>=6;
        const lopsided=Math.max(pa,pb)/Math.max(1,Math.min(pa,pb))>1.8;
        if(duration>=4 && Math.random()<(exhausted?.30:.10)+(lopsided?.12:0)){
          makePeace(a,b);
          changeRelation(a,b,10);
          addLog(ownerName(a)+"与"+ownerName(b)+"停止战争。");
        }
      }else{
        // Border friction, rivalry and relative power can turn into war, but positive relations strongly suppress it.
        const rel=relation(a,b);
        const pa=factionPower(a),pb=factionPower(b);
        const ratio=Math.max(pa,pb)/Math.max(1,Math.min(pa,pb));
        let tension=(-rel)/120 + (ratio<1.55?.08:0);
        if(rel>15)tension-=.20;
        if(rel>30)tension-=.20;
        if(rel<-25)tension+=.16;
        if(Math.random()<Math.max(0,Math.min(.34,tension))){
          declareWar(a,b,true);
        }else if(Math.random()<.28){
          changeRelation(a,b,Math.random()<.55?2:-2);
        }
      }
    }
  }

  // A stronger Zhou next to Shang creates strategic concern without forcing a scripted war.
  if(!isAtWar("shang","zhou")&&shareBorder("shang","zhou")){
    const zhouGrowth=Math.max(0,ownedSettlements("zhou").length-2);
    if(zhouGrowth>=2&&faction("zhou").prestige>=52){
      changeRelation("shang","zhou",-Math.min(4,zhouGrowth));
      if(state.player==="shang"||state.player==="zhou")addLog("周在西土的扩张开始改变商周之间的力量判断。","warning");
    }
  }
}

function processTribute(){
  Object.keys(state.tribute).forEach(function(subject){
    const overlord=state.tribute[subject];
    if(!faction(subject)||!faction(overlord)||isAtWar(subject,overlord)){delete state.tribute[subject];return;}
    const subSets=ownedSettlements(subject);
    const overSets=ownedSettlements(overlord);
    if(!subSets.length||!overSets.length)return;
    const shells=Math.min(faction(subject).shells,35+subSets.length*12);
    faction(subject).shells-=shells;faction(overlord).shells+=shells;
    const source=subSets.sort(function(a,b){return b.grain-a.grain;})[0];
    const dest=overSets.sort(function(a,b){return a.grain-b.grain;})[0];
    const grain=Math.min(source.grain,80+subSets.length*25);
    source.grain-=grain;dest.grain+=grain;
    if(overlord===state.player)addLog(ownerName(subject)+"按季贡纳 "+shells+" 贝、"+Math.round(grain)+" 石粮。","good");
    if(subject===state.player)addLog("向"+ownerName(overlord)+"贡纳 "+shells+" 贝、"+Math.round(grain)+" 石粮。","warning");
  });
}

function endTurn(){
  if(turnBusy||state.gameOver)return;
  turnBusy=true;
  processTraining();
  settlementEconomy();
  processTribute();
  processSieges();
  processLocalControl();
  aiDiplomaticPulse();
  consumeArmies();
  if(state.season===2)harvest();
  const activeFactions=Object.keys(state.factions).filter(function(owner){return owner!=="neutral";});
  activeFactions.forEach(function(owner){if(owner!==state.player)aiRecruit(owner);});
  const actions=activeFactions.filter(function(o){return o!==state.player;}).map(chooseAiAction).filter(Boolean);

  runAiActions(actions,0,function(){
    if(state.gameOver){turnBusy=false;render();return;}
    state.tick=(state.tick||0)+1;
    state.season++;
    if(state.season>3){state.season=0;state.year++;state.turn++;}
    populationTick();
    ageCharacters();
    refreshAllSupply();
    randomEvent();
    checkVictory();
    turnBusy=false;
    render();
  });
}

function ageCharacters(){
  if(state.season!==0)return;
  state.characters.forEach(function(c){if(c.alive)c.age++;});
}
function randomEvent(){
  if(Math.random()>.22)return;
  const own=ownedSettlements();
  if(!own.length)return;
  const s=own[Math.floor(Math.random()*own.length)];
  const roll=Math.random();
  if(roll<.33){
    const gain=120+Math.round(Math.random()*180);s.grain+=gain;addLog(s.name+"地方收获较好，额外入仓 "+gain+" 石。","good");
  }else if(roll<.66){
    const loss=80+Math.round(Math.random()*120);s.fodder=Math.max(0,s.fodder-loss);addLog(s.name+"牲畜疫病，损失部分草料与畜力准备。","warning");
  }else{
    const shells=50+Math.round(Math.random()*80);faction(state.player).shells+=shells;addLog("交换与贡纳增加，入贝 "+shells+"。","good");
  }
}

function divine(){
  const f=faction(state.player);
  if(f.shells<35)return notice("占卜需要 35 贝。");
  f.shells-=35;
  const a=getArmy(state.selectedArmy);
  let truth="兆平：暂未见明显凶险。";
  if(a){
    refreshAllSupply();
    const enemies=getSet(a.at).roads.map(function(id){return state.armies.find(function(x){return x.owner!==a.owner&&x.at===id;});}).filter(Boolean);
    if(a.supplyState==="中断")truth="兆凶：行粮不继，不宜久留。";
    else if(enemies.some(function(e){return armyPower(e)>armyPower(a)*1.15;}))truth="兆有悔：邻近敌势强，不宜轻进。";
    else if(enemies.length)truth="兆吉：整军持粮，可与邻敌争胜。";
    else truth="兆平：近境无大敌，可整顿内政。";
  }
  const cautious=state.characters.some(function(c){return c.faction===state.player&&c.alive&&c.trait==="谨慎占断";});
  const reliable=hasTech(state.player,"royal_divination")||Math.random()>(cautious?.18:.28);
  const falseOmens=["兆吉：宜速进。","兆不明：可战可守。","兆忧：道路或有阻。"];
  state.omen=reliable?truth:falseOmens[Math.floor(Math.random()*falseOmens.length)];
  state.omenTurn=state.turn;
  addLog("卜问军国："+state.omen);
  notice(state.omen,"占卜");
  render();
}
function sacrifice(){
  const f=faction(state.player);
  if(f.shells<80||f.livestock<12)return notice("祭祀需要 80 贝与 12 头牲畜。");
  f.shells-=80;f.livestock-=12;
  const ruler=factionRulerCharacter(state.player);
  f.prestige+=(hasTech(state.player,"royal_divination")?4:3)+(ruler&&ruler.trait==="古蜀礼器传统"?1:0);
  state.armies.filter(function(a){return a.owner===state.player;}).forEach(function(a){a.morale=Math.min(90,a.morale+4);});
  addLog("举行祭祀，王权威望提高，诸军军心略振。","good");
  render();
}

function buyGrain(){
  const s=getSet(state.selectedSettlement),f=faction(state.player);
  if(!s||s.owner!==state.player)return notice("请选择己方聚落。");
  const price=Math.max(70,125-s.market*10);
  if(f.shells<price)return notice("贝不足，需要 "+price+" 贝。");
  f.shells-=price;s.grain+=300;addLog(s.name+"以 "+price+" 贝采买 300 石粟米。");render();
}
function buyFodder(){
  const s=getSet(state.selectedSettlement),f=faction(state.player);
  if(!s||s.owner!==state.player)return notice("请选择己方聚落。");
  let price=Math.max(45,90-s.market*8);
  if(hasTech(state.player,"pastoral_trade"))price=Math.round(price*.86);
  if(f.shells<price)return notice("贝不足，需要 "+price+" 贝。");
  f.shells-=price;s.fodder+=300;addLog(s.name+"以 "+price+" 贝采买 300 草料。");render();
}
function freeSlaves(){
  const s=getSet(state.selectedSettlement),f=faction(state.player);
  if(!s||s.owner!==state.player||s.pop.slave<100)return notice("需要己方聚落至少有 100 名奴隶。");
  if(f.shells<70)return notice("赎释与安置需要 70 贝。");
  f.shells-=70;s.pop.slave-=100;s.pop.clan+=100;
  addLog(s.name+"赎释 100 名奴隶并编入族人/附族人口。","good");render();
}
function workshop(){
  const s=getSet(state.selectedSettlement),f=faction(state.player);
  if(!s||s.owner!==state.player)return notice("请选择己方聚落。");
  const cost=220+s.forge*100;
  if(f.shells<cost||s.pop.clan<700)return notice("扩建需要 "+cost+" 贝及足够族人工匠。");
  f.shells-=cost;s.forge++;addLog(s.name+"扩建铸造作坊至 "+s.forge+" 级。","good");render();
}
function market(){
  const s=getSet(state.selectedSettlement),f=faction(state.player);
  if(!s||s.owner!==state.player)return notice("请选择己方聚落。");
  const cost=180+s.market*90;
  if(f.shells<cost)return notice("扩建交换场需要 "+cost+" 贝。");
  f.shells-=cost;s.market++;addLog(s.name+"扩建交换场，贝收入与采买条件改善。","good");render();
}
function tradeTech(){
  const f=faction(state.player);
  if(f.shells<240)return notice("延请外来工匠需要 240 贝。");
  const pool=["wheel_maintenance","long_supply","improved_mold","highland_stock","fortification"];
  const id=pool.find(function(x){return !f.tech.includes(x);});
  if(!id)return notice("当前可传播的主要技艺已全部掌握。");
  f.shells-=240;f.tech.push(id);
  addLog("通过贸易、礼物与工匠迁徙获得技艺："+DATA.techs[id].name+"。","good");
  notice("<b>"+DATA.techs[id].name+"</b><br>"+DATA.techs[id].effect+"<br><span class='muted'>史实等级 "+DATA.techs[id].confidence+"；这是“技艺传播”而非现代科技树。</span>","技艺传播");
  render();
}

function selectedForeignFaction(){
  const s=getSet(state.selectedSettlement);
  return s&&s.owner!==state.player?s.owner:null;
}
function scoutForeign(){
  const s=getSet(state.selectedSettlement),f=faction(state.player);
  if(!s||s.owner===state.player)return notice("请选择外国聚落。");
  if(!canScoutSettlement(s))return notice("需要选中一支位于该聚落相邻节点的我方军队，才能派出斥候。");
  if(f.shells<20)return notice("派遣向导、斥候和收买消息需要 20 贝。");
  f.shells-=20;
  setIntel(s.id,3,4);
  addLog("斥候返回，获得"+s.name+"的较确切情报；情报会随时间逐渐失效。","good");
  render();
}
function giftForeign(){
  const other=selectedForeignFaction(),f=faction(state.player);
  if(!other)return notice("请选择外国聚落。");
  if(isAtWar(state.player,other))return notice("交战状态下不能普通赠礼。");
  if(f.shells<80)return notice("需要 80 贝。");
  f.shells-=80;faction(other).shells+=80;changeRelation(state.player,other,10);
  addLog("向"+ownerName(other)+"赠送 80 贝，关系改善。","good");render();
}
function foreignGrainTrade(){
  const other=selectedForeignFaction(),f=faction(state.player),src=getSet(state.selectedSettlement);
  if(!other)return notice("请选择外国聚落。");
  if(isAtWar(state.player,other)||relation(state.player,other)<-20)return notice("当前关系不足以进行正常贸易。");
  const amount=Math.min(300,src.grain);
  if(amount<80)return notice("对方此地没有足够余粮可供交易。");
  const price=Math.round((95-src.market*6)*(1-Math.max(-.15,Math.min(.18,relation(state.player,other)/300))));
  if(f.shells<price)return notice("需要 "+price+" 贝。");
  const dest=ownedSettlements().sort(function(a,b){return a.grain-b.grain;})[0];
  f.shells-=price;faction(other).shells+=price;src.grain-=amount;dest.grain+=amount;
  changeRelation(state.player,other,2);
  setIntel(src.id,2,6);
  tryLearnTech(state.player,other,"商旅与随行工匠往来",.10);
  addLog("与"+ownerName(other)+"交易，以 "+price+" 贝购得 "+amount+" 石粮，运往"+dest.name+"。","good");render();
}
function demandTribute(){
  const other=selectedForeignFaction();
  if(!other)return notice("请选择外国聚落。");
  if(isAtWar(state.player,other))return notice("交战时应通过战争迫使其屈服，而不是普通外交要求。");
  const rel=relation(state.player,other);
  const pDiff=faction(state.player).prestige-faction(other).prestige;
  const military=state.armies.filter(function(a){return a.owner===state.player;}).reduce(function(n,a){return n+armyPower(a);},0)/
    Math.max(1,state.armies.filter(function(a){return a.owner===other;}).reduce(function(n,a){return n+armyPower(a);},0));
  const diplomat=factionRulerCharacter(state.player);
  const traitBonus=diplomat&&diplomat.trait==="东土联结"?8:0;
  const score=rel*.6+pDiff*.9+(military-1)*22+traitBonus+Math.random()*24;
  if(score>=38){
    state.tribute[other]=state.player;changeRelation(state.player,other,8);
    faction(state.player).prestige+=3;
    addLog(ownerName(other)+"接受服属关系，开始向我方贡纳。","good");
    notice(ownerName(other)+"同意保持自身统治，但承认服属并按季贡纳。","服属达成");
  }else{
    changeRelation(state.player,other,-7);
    addLog(ownerName(other)+"拒绝贡纳要求，双方关系恶化。","warning");
    notice(ownerName(other)+"拒绝了要求。提高威望、军力或先改善关系，会增加成功机会。","要求被拒");
  }
  render();
}
function offerPeace(){
  const other=selectedForeignFaction(),f=faction(state.player);
  if(!other)return notice("请选择正在交战的外国聚落。");
  if(!isAtWar(state.player,other))return notice("双方并未交战。");
  if(f.shells<120)return notice("派遣使者、奉送礼物需要 120 贝。");
  const ourPower=state.armies.filter(function(a){return a.owner===state.player;}).reduce(function(n,a){return n+armyPower(a);},0);
  const theirPower=state.armies.filter(function(a){return a.owner===other;}).reduce(function(n,a){return n+armyPower(a);},0);
  const chance=Math.max(.35,Math.min(.9,.60+(theirPower-ourPower)/Math.max(1,ourPower+theirPower)*.30+relation(state.player,other)/500));
  f.shells-=120;faction(other).shells+=120;
  if(Math.random()<chance){
    makePeace(state.player,other);changeRelation(state.player,other,12);
    addLog("与"+ownerName(other)+"议和，战争结束。","good");
    notice("对方接受贝与礼物，双方停止战争。","议和达成");
  }else{
    changeRelation(state.player,other,3);
    addLog(ownerName(other)+"暂拒议和，但收下使者礼物。","warning");
    notice("对方尚不愿停战。若战局或双方力量发生变化，可再次尝试。","议和未成");
  }
  render();
}
function playerDeclareWar(){
  const other=selectedForeignFaction();
  if(!other)return notice("请选择外国聚落。");
  if(isAtWar(state.player,other))return notice("双方已经处于战争状态。");
  declareWar(state.player,other,true);render();
}

function checkVictory(){
  if(state.gameOver)return;
  const own=ownedSettlements(state.player);
  const secured=securedSettlementCount(state.player);
  const playerCapital=DATA.settlements.find(function(s){return s.owner===state.player&&s.capital;});
  const capNow=playerCapital?getSet(playerCapital.id):null;
  if(capNow&&capNow.owner!==state.player){
    state.gameOver=true;
    notice("你的核心都邑已经失守。当前测试局结束。","战役失败");
    return;
  }
  const tributeCount=Object.keys(state.tribute).filter(function(k){return state.tribute[k]===state.player;}).length;
  if(state.player==="shang"){
    const zhouCap=getSet("zhouyuan");
    if((tributeCount>=3&&faction(state.player).prestige>=110)||(zhouCap&&zhouCap.owner===state.player&&secured>=8)){
      state.gameOver=true;
      notice("大邑商重新建立了足以覆盖四方的霸权网络。","战役胜利");
    }
  }else if(state.player==="zhou"){
    const yin=getSet("yin");
    if(yin&&yin.owner===state.player&&secured>=8){
      state.gameOver=true;
      notice("周已夺取大邑商核心，并形成新的区域统治网络。","战役胜利");
    }
  }else{
    const yin=getSet("yin");
    if((yin&&yin.owner===state.player)||(secured>=7&&faction(state.player).prestige>=90&&tributeCount>=1)){
      state.gameOver=true;
      notice("你的政体已经成长为足以改变四方秩序的区域霸权。","战役胜利");
    }
  }
}

function showHelp(){
  notice(
    '<b>一局的核心循环</b><br>'+
    '经营人口、粮仓、贝与兵器 → 选择何时征发劳力和军队 → 保持民夫与粮道 → 通过贸易、贡纳或战争扩张影响。<br><br>'+
    '<b>地图与情报</b><br>点击聚落查看；行军时先选中我方军队，再点相邻目的地检查情报，最后点击“行军至选中聚落”确认。外国城邑默认不会显示精确人口、粮仓和军队；靠近、贸易、服属或派斥候可提升情报。关键渡口和道路被敌军占据时粮道可能中断。<br><br>'+
    '<b>统治</b><br>新征服聚落不会立刻贡献全部产能；地方服从度会在驻军、邑宰、威望和时间作用下逐步恢复。<br><br>'+
    '<b>军队</b><br>奴隶兵和族兵可快速征召；青铜正规军、弓手和战车需要装备与训练。军队可以分军、合军。<br><br>'+
    '<b>战斗</b><br>实时战场中左键选单位，右键移动或攻击。胜负主要来自士气、队形、疲劳、侧击和溃败，而不是把所有人杀光。<br><br>'+
    '<b>围城</b><br>设防聚落需要围困。等待可消耗城粮，也可强攻土垣和壕沟。<br><br>'+
    '<b>历史标签</b><br>A=直接证据；B=较强推定；C=合理玩法复原。贝作为通用货币等属于明确的可玩性简化。',
    '玩法概要'
  );
}

function archive(){
  const html=DATA.archive.map(function(x){
    return '<p><b>'+x.name+'</b> <span class="badge '+x.confidence.toLowerCase()+'">'+x.era+'</span><br><span class="muted">'+x.note+'</span></p>';
  }).join("");
  notice(html,"历代史实人物档案");
}
function saveGame(){
  if(pendingEncounter)return notice("请先处理当前两军接触，再保存战局。");
  try{
    localStorage.setItem("shangzhou-save",JSON.stringify(state));
    addLog("战局已保存到本机浏览器。","good");render();
  }catch(e){notice("保存失败："+e.message);}
}
function loadGame(){
  try{
    const raw=localStorage.getItem("shangzhou-save");
    if(!raw)return notice("没有找到本机存档。");
    const loaded=JSON.parse(raw);
    if(loaded.version!==DATA.version){
      return notice("该存档来自 "+(loaded.version||"旧版本")+"，当前版本为 "+DATA.version+"。地图和规则已经变化，请开始新局。","存档版本不兼容");
    }
    state=loaded;
    state.governors=state.governors||{};
    state.sieges=state.sieges||{};
    state.tribute=state.tribute||{};
    state.wars=state.wars||{};
    state.warTurns=state.warTurns||{};
    state.intel=state.intel||{};
    state.tick=state.tick||0;
    state.settlements.forEach(function(s){if(typeof s.control!=="number")s.control=100;});
    $("#newgame-overlay").classList.remove("show");
    refreshAllSupply();addLog("已读取本机存档。","good");render();
  }catch(e){notice("读取失败："+e.message);}
}
function notice(body,title){
  $("#dialog-content").innerHTML="<h2>"+(title||"提示")+"</h2><p>"+body+"</p>";
  $("#dialog").showModal();
}
function showNewGame(){
  if(turnBusy)return;
  $("#newgame-overlay").classList.add("show");
}

$$("[data-unit]").forEach(function(b){
  const u=DATA.units[b.dataset.unit];
  if(u){
    b.textContent=u.name+" "+u.size;
    b.title="需要 "+u.shell+" 贝、"+u.grain+" 石粮、"+u.weaponNeed+" "+({wood:"件木骨兵器",bow:"张弓",ge:"件青铜戈",spear:"件青铜矛",chariot:"乘战车"}[u.weapon]||u.weapon)+(u.fodder?"、"+u.fodder+" 草料":"")+"；训练 "+u.train+" 季";
  }
  b.onclick=function(){recruit(b.dataset.unit);};
});
$$("[data-faction-choice]").forEach(function(b){b.onclick=function(){startGame(b.dataset.factionChoice);};});
$("#btn-end-turn").onclick=endTurn;
$("#btn-new").onclick=showNewGame;
$("#btn-help").onclick=showHelp;
$("#btn-save").onclick=saveGame;
$("#btn-load").onclick=loadGame;
$("#btn-clear-army").onclick=function(){state.selectedArmy=null;render();};
$("#btn-divine").onclick=divine;
$("#btn-sacrifice").onclick=sacrifice;
$("#btn-archive").onclick=archive;
$("#btn-buy-grain").onclick=buyGrain;
$("#btn-buy-fodder").onclick=buyFodder;
$("#btn-free-slaves").onclick=freeSlaves;
$("#btn-workshop").onclick=workshop;
$("#btn-market").onclick=market;
$("#btn-trade-tech").onclick=tradeTech;
$("#btn-scout").onclick=scoutForeign;
$("#btn-gift").onclick=giftForeign;
$("#btn-foreign-grain").onclick=foreignGrainTrade;
$("#btn-demand-tribute").onclick=demandTribute;
$("#btn-declare-war").onclick=playerDeclareWar;
$("#btn-peace").onclick=offerPeace;
$("#encounter-command").onclick=commandPendingEncounter;
$("#encounter-auto").onclick=autoPendingEncounter;
$("#encounter-retreat").onclick=retreatPendingEncounter;
$("#btn-march").onclick=marchSelectedArmy;
$("#btn-labor").onclick=function(){mobilizeLabor(50);};
$("#btn-disband-labor").onclick=function(){releaseLabor(50);};
$("#btn-assault").onclick=assaultCurrentSiege;
$("#btn-split-army").onclick=splitArmy;
$("#btn-merge-armies").onclick=mergeArmies;
$("#recruit-help").innerHTML="奴隶征发兵、族兵即时集结；弓手、青铜正规军和战车需训练。人口、兵器、贝、粮食都真实扣除。";

window.SHANGZHOU_DEBUG={
  getState:function(){return deepCopy(state);},
  startGame:startGame,
  endTurn:endTurn,
  intelLevel:function(id){return intelLevel(getSet(id));},
  hasPendingEncounter:function(){return !!pendingEncounter;},
  autoPendingEncounter:autoPendingEncounter
};

state=freshState("shang");
refreshAllSupply();
render();
