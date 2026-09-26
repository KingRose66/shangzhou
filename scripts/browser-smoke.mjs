import fs from "node:fs";
import { JSDOM } from "jsdom";

const html=fs.readFileSync("index.html","utf8");
const dom=new JSDOM(html,{url:"https://example.test/",runScripts:"outside-only",pretendToBeVisual:true});
const {window}=dom;

window.alert=()=>{};
window.confirm=()=>true;
window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
window.HTMLDialogElement.prototype.close=function(){this.open=false;};
window.requestAnimationFrame=(cb)=>setTimeout(()=>cb(Date.now()),16);
window.cancelAnimationFrame=(id)=>clearTimeout(id);
window.HTMLCanvasElement.prototype.getContext=function(){
  const noop=()=>{};
  return new Proxy({},{
    get(_t,p){
      if(p==="measureText")return ()=>({width:10});
      if(["fillStyle","strokeStyle","lineWidth","font","globalAlpha"].includes(String(p)))return "";
      return noop;
    },
    set(){return true;}
  });
};

for(const file of ["data.js","battle.js","game.js"]){
  window.eval(fs.readFileSync(file,"utf8"));
}

const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};

window.document.querySelector('[data-faction-choice="shang"]').click();
assert(window.document.querySelector("#hud-faction").textContent.includes("商"),"failed to start Shang game");
assert(window.document.querySelectorAll(".node").length===window.GAME_DATA.settlements.length,"map node count mismatch");

const before=window.document.querySelector("#hud-clansmen").textContent;
window.document.querySelector('[data-unit="clan_levy"]').click();
const after=window.document.querySelector("#hud-clansmen").textContent;
assert(before!==after,"recruitment did not change population");

window.document.querySelector("#btn-save").click();
assert(window.localStorage.getItem("shangzhou-save"),"save not written");
window.document.querySelector("#btn-load").click();

const dateBefore=window.document.querySelector("#hud-date").textContent;
window.document.querySelector("#btn-end-turn").click();
const dateAfter=window.document.querySelector("#hud-date").textContent;
assert(dateBefore!==dateAfter,"end turn did not advance date");

assert(window.document.querySelector("#diplomacy-detail"),"diplomacy UI missing");
assert(window.document.querySelector("#battle-canvas"),"battle canvas missing");
console.log("Browser smoke test passed.");
