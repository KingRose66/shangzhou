import fs from "node:fs";
import { JSDOM } from "jsdom";

const html=fs.readFileSync("index.html","utf8");
const dom=new JSDOM(html,{url:"https://battle.test/",runScripts:"outside-only",pretendToBeVisual:true});
const {window}=dom;
window.requestAnimationFrame=()=>0;
window.HTMLCanvasElement.prototype.getContext=function(){
  const noop=()=>{};
  return new Proxy({}, {get(_t,p){if(p==="measureText")return ()=>({width:10});return noop;},set(){return true;}});
};
window.eval(fs.readFileSync("data.js","utf8"));
window.eval(fs.readFileSync("battle.js","utf8"));

const engine=window.BATTLE_ENGINE;
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};

const defender={x:0,y:0,facing:0};
assert(engine.attackDirection({x:100,y:0},defender)==="front","east-facing unit should treat east attacker as front");
assert(engine.attackDirection({x:0,y:100},defender)==="flank","east-facing unit should treat south attacker as flank");
assert(engine.attackDirection({x:-100,y:0},defender)==="rear","east-facing unit should treat west attacker as rear");

engine.terrainZones=[];
const oldRandom=window.Math.random;
window.Math.random=()=>0.5;

const makeChariot=(x,y)=>({
  x,y,facing:Math.PI,side:"player",type:"chariot",men:24,maxMen:24,
  morale:78,order:76,fatigue:5,melee:64,missile:24,armor:24,speed:82,lastMoveSpeed:65,routed:false
});
const makeSpear=()=>({
  x:0,y:0,facing:0,side:"enemy",type:"bronze_spear",men:80,maxMen:80,
  morale:66,order:72,fatigue:5,melee:54,missile:0,armor:17,speed:42,lastMoveSpeed:0,routed:false
});

const frontChariot=makeChariot(30,0),frontSpear=makeSpear();
engine.meleeAttack(frontChariot,frontSpear);
assert(frontChariot.men<24||frontChariot.order<72,"frontal spear defense should punish a charging chariot");

const flankChariot=makeChariot(0,30),flankSpear=makeSpear();
engine.meleeAttack(flankChariot,flankSpear);
assert(flankChariot.men===24,"flank charge should avoid frontal spear counter-loss");

const frontAttacker={...makeChariot(30,0),type:"bronze_ge",men:80,maxMen:80,melee:57,lastMoveSpeed:20};
const frontTarget=makeSpear();
const rearAttacker={...frontAttacker,x:-30,y:0};
const rearTarget=makeSpear();
engine.meleeAttack(frontAttacker,frontTarget);
engine.meleeAttack(rearAttacker,rearTarget);
assert(rearTarget.morale<frontTarget.morale,"rear attack should cause more morale damage than frontal attack");
assert(rearTarget.order<frontTarget.order,"rear attack should cause more order damage than frontal attack");

window.Math.random=oldRandom;
console.log("Battle facing/flank logic test passed.");
