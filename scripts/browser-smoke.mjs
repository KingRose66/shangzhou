import fs from "node:fs";
import { JSDOM } from "jsdom";

const html=fs.readFileSync("index.html","utf8");
const dom=new JSDOM(html,{url:"https://example.test/",runScripts:"outside-only",pretendToBeVisual:true});
const {window}=dom;
const runtimeErrors=[];
window.addEventListener("error",e=>runtimeErrors.push(String(e.error||e.message||"window error")));

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

const playable=["shang","zhou","gaodi","dongfang","jianghan","wucheng","shu"];
for (const factionId of playable) {
  window.document.querySelector('[data-faction-choice="'+factionId+'"]').click();
  assert(window.document.querySelector("#hud-faction").textContent.trim().length>0,"failed to start "+factionId);
  assert(window.document.querySelectorAll(".node").length===window.GAME_DATA.settlements.length,"map node count mismatch for "+factionId);
  const ownArmyCards=window.document.querySelectorAll(".army-card").length;
  assert(ownArmyCards>=1,"no starting army rendered for "+factionId);
  window.document.querySelector("#btn-new").click();
}

window.document.querySelector('[data-faction-choice="shang"]').click();

// Remote foreign settlements should not expose omniscient information.
assert(window.SHANGZHOU_DEBUG.intelLevel("wucheng")===0,"remote intelligence should begin unknown for Shang");
window.document.querySelector('[data-settlement-id="wucheng"]').click();
assert(window.document.querySelector("#settlement-detail").textContent.includes("未知"),"unknown foreign settlement exposes too much information");

// Move near the active Shang-highland frontier, then scout without accidentally marching into battle.
window.document.querySelector('[data-settlement-id="jinnan"]').click();
window.document.querySelector("#btn-march").click();
window.document.querySelector('[data-settlement-id="gaodi"]').click();
assert(!window.document.querySelector("#btn-scout").disabled,"scouting should be available from an adjacent field army");
window.document.querySelector("#btn-scout").click();
assert(window.SHANGZHOU_DEBUG.intelLevel("gaodi")===3,"scouting did not reveal exact short-term intelligence");

window.document.querySelector('[data-settlement-id="yin"]').click();
const before=window.document.querySelector("#hud-clansmen").textContent;
window.document.querySelector('[data-unit="clan_levy"]').click();
const after=window.document.querySelector("#hud-clansmen").textContent;
assert(before!==after,"recruitment did not change population");

window.document.querySelector("#btn-save").click();
assert(window.localStorage.getItem("shangzhou-save"),"save not written");
window.document.querySelector("#btn-load").click();

const dateBefore=window.document.querySelector("#hud-date").textContent;
window.document.querySelector("#btn-end-turn").click();
let guard=0;
while(window.SHANGZHOU_DEBUG.hasPendingEncounter()&&guard++<12)window.SHANGZHOU_DEBUG.autoPendingEncounter();
const dateAfter=window.document.querySelector("#hud-date").textContent;
assert(dateBefore!==dateAfter,"end turn did not advance date");

assert(window.document.querySelector("#diplomacy-detail"),"diplomacy UI missing");
assert(window.document.querySelector("#battle-canvas"),"battle canvas missing");
assert(runtimeErrors.length===0,"browser runtime errors: "+runtimeErrors.join(" | "));
console.log("Browser smoke test passed.");
