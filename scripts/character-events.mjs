import fs from "node:fs";
import { JSDOM } from "jsdom";

const html=fs.readFileSync("index.html","utf8");
const dom=new JSDOM(html,{url:"https://characters.test/",runScripts:"outside-only",pretendToBeVisual:true});
const {window}=dom;

window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
window.HTMLDialogElement.prototype.close=function(){this.open=false;};
window.requestAnimationFrame=()=>0;
window.cancelAnimationFrame=()=>{};
window.HTMLCanvasElement.prototype.getContext=function(){
  const noop=()=>{};
  return new Proxy({}, {get(_t,p){if(p==="measureText")return ()=>({width:10});return noop;},set(){return true;}});
};

for(const file of ["data.js","battle.js","game.js"]) window.eval(fs.readFileSync(file,"utf8"));
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};

window.SHANGZHOU_DEBUG.startGame("shang");
let state=window.SHANGZHOU_DEBUG.getState();
assert(state.factions.shang.ruler==="文丁","Shang should begin under Wen Ding");
assert(window.SHANGZHOU_DEBUG.loyalty("di_yi")>60,"heir should begin loyal");
window.SHANGZHOU_DEBUG.killCharacter("wen_ding");
state=window.SHANGZHOU_DEBUG.getState();
assert(state.factions.shang.ruler==="帝乙","Di Yi should succeed Wen Ding");
assert(state.characters.find(c=>c.id==="wen_ding").alive===false,"Wen Ding should be marked dead");

window.SHANGZHOU_DEBUG.startGame("zhou");
window.SHANGZHOU_DEBUG.killCharacter("jili");
state=window.SHANGZHOU_DEBUG.getState();
assert(state.factions.zhou.ruler==="姬昌","Ji Chang should succeed Ji Li");

window.SHANGZHOU_DEBUG.startGame("shang");
const beforeShells=window.SHANGZHOU_DEBUG.getState().factions.shang.shells;
assert(window.SHANGZHOU_DEBUG.forceEvent("craftsmen"),"craftsmen event should be forceable for Shang");
assert(window.SHANGZHOU_DEBUG.hasPendingWorldEvent(),"event overlay state should be pending");
assert(window.document.querySelector("#event-overlay").classList.contains("show"),"event overlay should be visible");
window.SHANGZHOU_DEBUG.resolveWorldEvent(1);
state=window.SHANGZHOU_DEBUG.getState();
assert(!window.SHANGZHOU_DEBUG.hasPendingWorldEvent(),"event should resolve");
assert(state.factions.shang.shells<beforeShells,"craftsmen choice should cost shells");

console.log("Character succession and world event test passed.");
