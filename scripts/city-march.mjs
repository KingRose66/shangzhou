import fs from "node:fs";
import {JSDOM} from "jsdom";
const html=fs.readFileSync("index.html","utf8");
const dom=new JSDOM(html,{url:"https://policy.test/",runScripts:"outside-only",pretendToBeVisual:true});
const {window:w}=dom;
w.confirm=()=>true;w.alert=()=>{};
w.requestAnimationFrame=()=>0;w.cancelAnimationFrame=()=>{};
w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
w.HTMLDialogElement.prototype.close=function(){this.open=false;};
w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{
  get(_t,p){return p==="measureText"?()=>({width:10}):()=>{};},
  set(){return true;}
});
for(const file of ["data.js","battle.js","game.js"]){
  let js=fs.readFileSync(file,"utf8");
  if(file==="game.js")js=js.replace("window.SHANGZHOU_DEBUG={",
  "window.SHANGZHOU_DEBUG={"+
  "harvestForTest:function(id){return forecastHarvest(getSet(id));},"+
  "mutateCity:function(id,patch){Object.assign(getSet(id),patch);render();},"+
  "processPoliciesForTest:function(){processCityPolicies();render();},"+
  "plannedMarchForTest:function(){advancePlannedArmies();render();},");
  w.eval(js);
}
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};
const $=selector=>w.document.querySelector(selector);
const st=()=>w.SHANGZHOU_DEBUG.getState();
const click=selector=>{const el=$(selector);assert(el,"Missing "+selector);el.click();};
const select=(selector,value)=>{
  const el=$(selector);assert(el,"Missing "+selector);
  el.value=value;el.dispatchEvent(new w.Event("change",{bubbles:true}));
};
w.SHANGZHOU_DEBUG.startGame("shang");
assert(w.GAME_DATA.characters.length>=38,"Expanded character cast missing");
assert(st().characters.length===w.GAME_DATA.characters.length,"New characters not in campaign");
assert(w.GAME_DATA.characters.filter(c=>c.confidence==="C").length>=26,"Reconstruction grade missing");
const startShells=st().factions.shang.shells;
const initialHarvest=w.SHANGZHOU_DEBUG.harvestForTest("yin");
select("#city-policy-select","farm");
assert(st().settlements.find(s=>s.id==="yin").policy==="farm","Policy not changed");
assert(st().factions.shang.shells===startShells-60,"City policy must cost shells");
assert(w.SHANGZHOU_DEBUG.harvestForTest("yin")>initialHarvest*1.15,"Farm policy must increase harvest");
select("#city-policy-select","trade");
assert(st().settlements.find(s=>s.id==="yin").policy==="farm","Policy cooldown must apply");

click("#city-delegate");
assert(st().settlements.find(s=>s.id==="yin").delegated===true,"Governor delegation not enabled");
w.SHANGZHOU_DEBUG.mutateCity("yin",{grain:15000,policy:"balanced",policyTick:-5});
w.SHANGZHOU_DEBUG.processPoliciesForTest();
assert(st().settlements.find(s=>s.id==="yin").policy==="trade","Governor should prefer trade when abundant grain and market");
assert(st().factions.shang.shells<startShells,"Delegation must not create shells");
click("#city-delegate");

click('[data-settlement-id="daxinzhuang"]');
click("#btn-march");
assert(st().armies.find(a=>a.id==="a1").at==="daxinzhuang","Army not moved to staging city");
click('[data-settlement-id="jinnan"]');
const army0=st().armies.find(a=>a.id==="a1");
select("#army-stance","forced");
click("#btn-plan-march");
const plan=st().armies.find(a=>a.id==="a1");
assert(plan.route?.join(",")==="yin,jinnan","Multi-hop friendly route not constructed: "+plan.route);
assert($(".geographic-route.planned-route"),"Planned route is not highlighted on map");
w.SHANGZHOU_DEBUG.plannedMarchForTest();
const army=st().armies.find(a=>a.id==="a1");
assert(army.at==="jinnan"&&army.route.length===0,"Forced march failed to traverse two friendly nodes");
assert(army.grain<army0.grain,"Forced march must consume actual grain");
assert(army.morale<army0.morale,"Forced march must have a morale cost");

// Legacy save migration should keep existing cities and graft new C-grade characters.
const snapshot=st();
const data=JSON.parse(JSON.stringify(snapshot));
data.version="1.6.0";
data.characters=data.characters.filter(c=>!["shang_ya_yin","zhou_ji_jue","shu_bai"].includes(c.id));
data.settlements.forEach(s=>{delete s.policy;delete s.delegated;delete s.policyTick;});
w.localStorage.setItem("shangzhou-save",JSON.stringify(data));
click("#btn-load");
const migrated=st();
assert(migrated.version===w.GAME_DATA.version,"Legacy save version wasn't migrated");
assert(migrated.characters.length===w.GAME_DATA.characters.length,"Legacy save didn't receive new characters");
assert(migrated.settlements.every(s=>typeof s.policy==="string"&&typeof s.delegated==="boolean"),"Policy migration failed");
assert(migrated.armies.find(a=>a.id==="a1").at==="jinnan","Legacy save erased march position");
console.log("City policy, delegated governance, marching, cast and legacy-save tests passed.");
