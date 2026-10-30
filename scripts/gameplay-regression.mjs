import fs from "node:fs";
import { JSDOM } from "jsdom";

const dom=new JSDOM(fs.readFileSync("index.html","utf8"),{
  url:"https://gameplay.test/",runScripts:"outside-only",pretendToBeVisual:true
});
const {window}=dom;
window.confirm=()=>true;
window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
window.HTMLDialogElement.prototype.close=function(){this.open=false;};
window.requestAnimationFrame=()=>0;
window.HTMLCanvasElement.prototype.getContext=function(){
  const fn=()=>{};
  return new Proxy({}, {get(_t,k){return k==="measureText"?()=>({width:10}):fn},set(){return true}});
};
for(const name of ["data.js","battle.js","game.js"]){
  window.eval(fs.readFileSync(name,"utf8"));
}
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};
const $=selector=>window.document.querySelector(selector);

window.SHANGZHOU_DEBUG.startGame("shang");
assert($("#turn-outlook").textContent.includes("本季粮食预测"),"missing actionable seasonal outlook");
assert($('[data-unit="clan_levy"]').textContent.includes("贝"),"recruitment costs must be visible");

$('[data-settlement-id="jinnan"]').click();
assert(!$("#btn-march").disabled,"march should be available to adjacent friendly city");
$("#btn-march").click();
assert(window.SHANGZHOU_DEBUG.getState().armies.find(a=>a.id==="a1").at==="jinnan","march to Jinnan failed");

// If marching cannot be paid for, a war must NOT be declared as a side effect.
window.eval('state.armies.find(a=>a.id==="a1").grain=0; render();');
$('[data-settlement-id="crossing"]').click();
$("#btn-march").click();
let state=window.SHANGZHOU_DEBUG.getState();
assert(!state.wars["neutral|shang"],"an impossible march declared war on a neutral polity");
assert(state.armies.find(a=>a.id==="a1").at==="jinnan","unfunded army moved anyway");

// Local stocks can be physically transferred to the field army without ending a season.
const grainBefore=state.settlements.find(s=>s.id==="jinnan").grain;
$("#btn-load-supply").click();
state=window.SHANGZHOU_DEBUG.getState();
assert(state.armies.find(a=>a.id==="a1").grain>0,"loading did not provision army");
assert(state.settlements.find(s=>s.id==="jinnan").grain<grainBefore,"loading conjured grain rather than using local stores");

// Labor is drawn from population and the dedicated button reaches exactly the required amount.
window.eval('state.armies.find(a=>a.id==="a1").laborers=0; state.armies.find(a=>a.id==="a1").laborMix={clan:0,slave:0}; render();');
const popBefore=window.SHANGZHOU_DEBUG.getState().settlements.find(s=>s.id==="jinnan").pop;
$("#btn-ready-labor").click();
state=window.SHANGZHOU_DEBUG.getState();
const army=state.armies.find(a=>a.id==="a1");
const population=state.settlements.find(s=>s.id==="jinnan").pop;
assert(army.laborers>0,"labor preparation did not muster laborers");
assert(population.clan+population.slave<popBefore.clan+popBefore.slave,"laborers were created without population cost");

// Foreign cities must not permit recruiting from their stocks.
$('[data-settlement-id="crossing"]').click();
assert($('[data-unit="clan_levy"]').disabled,"foreign-city recruitment is not disabled");
$('[data-settlement-id="yin"]').click();
assert(!$('[data-unit="clan_levy"]').disabled,"home-city levy should remain accessible");

// Tactical units must not need constant micro: default hold engages a nearby threat.
const engine=window.BATTLE_ENGINE;
const unit=(side,x)=>({
  side,x,y:150,guardX:x,guardY:150,orderMode:"hold",targetEnemy:null,tx:null,ty:null,
  men:80,maxMen:80,morale:70,order:65,fatigue:0,attackCd:0,missileCd:1,
  melee:56,missile:0,range:0,armor:17,speed:42,chargeMomentum:0,
  lastMoveSpeed:0,facing:side==="player"?0:Math.PI,routed:false,engaged:false,moving:false,
  type:"bronze_ge",width:42,height:30,sourceIndex:0
});
const ours=unit("player",130),theirs=unit("enemy",165);
engine.w=980;engine.h=600;engine.units=[ours,theirs];
engine.config={locationName:"战斗回归",terrain:"plain"};
engine.terrainZones=[];engine.running=true;
engine.playerOrders();
assert(ours.targetEnemy===theirs,"holding infantry did not acquire approaching enemy");
const before=theirs.men;
engine.update(.2);
assert(theirs.men<before,"holding infantry failed to fight back");
engine.orderAll("advance");
assert(ours.orderMode==="advance"&&ours.targetEnemy===theirs,"advance order failed");
engine.orderAll("hold");
assert(ours.orderMode==="hold"&&ours.targetEnemy===null,"hold order failed");
engine.running=false;

console.log("Gameplay regression passed: marching, physical logistics, recruitment and autonomous defense.");
