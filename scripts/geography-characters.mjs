import fs from "node:fs";
import {JSDOM} from "jsdom";

const dom=new JSDOM(fs.readFileSync("index.html","utf8"),{
  url:"https://geography.test/",runScripts:"outside-only",pretendToBeVisual:true
});
const w=dom.window;
w.confirm=()=>true;
w.requestAnimationFrame=()=>0;
w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
w.HTMLDialogElement.prototype.close=function(){this.open=false;};
w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{
  get(_t,p){return p==="measureText"?()=>({width:10}):()=>{};},
  set(){return true;}
});
const errors=[];
w.addEventListener("error",e=>errors.push(String(e.error||e.message)));
for(const name of ["data.js","battle.js","game.js"]){
  let source=fs.readFileSync(name,"utf8");
  if(name==="game.js"){
    source=source.replace("window.SHANGZHOU_DEBUG={",
      "window.SHANGZHOU_DEBUG={\n"+
      "advanceCharacterTravelForTest:function(){processCharacterTravel();render();},\n"+
      "positionForTest:function(id){return characterPosition(getChar(id));},\n"+
      "captureForTest:function(id,owner){const old=Math.random;Math.random=()=>0;try{occupySettlement({owner},getSet(id));}finally{Math.random=old;}render();},\n");
  }
  w.eval(source);
}
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
const $=sel=>w.document.querySelector(sel);
const s=()=>w.SHANGZHOU_DEBUG.getState();

assert(w.GAME_DATA.settlements.length===21,"all 21 nodes should exist");
for(const node of w.GAME_DATA.settlements){
  assert(Number.isFinite(node.lat)&&Number.isFinite(node.lon),"missing real coordinates: "+node.id);
  assert(node.lat>=27&&node.lat<=40,"bad latitude: "+node.id);
  assert(node.lon>=102&&node.lon<=120,"bad longitude: "+node.id);
  assert(["A","B","C"].includes(node.geographyConfidence),"missing accuracy grade: "+node.id);
}

w.SHANGZHOU_DEBUG.startGame("shang");
assert($(".geographic-map"),"real geography map not mounted");
assert(w.document.querySelectorAll(".geo-node").length===w.GAME_DATA.settlements.length,"all settlement markers must be visible at fit");
assert(w.document.querySelectorAll(".geographic-tile").length===1,"packaged terrain raster missing");
assert($(".geographic-tile").src.includes("assets/china-satellite.webp"),"local NASA image not mounted");
const controls=w.document.querySelectorAll(".geo-map-controls button");
assert(controls.length===5,"zoom/full-view/terrain/input-mode controls missing");
controls[3].click();
assert($(".geographic-tile").src.includes("assets/china-relief.webp"),"local relief toggle failed");
w.document.querySelectorAll(".geo-map-controls button")[3].click();
assert($(".geographic-tile").src.includes("assets/china-satellite.webp"),"return to imagery failed");

assert(w.SHANGZHOU_DEBUG.positionForTest("wen_ding").id==="yin","Wen Ding should start in the Shang capital");
assert(w.SHANGZHOU_DEBUG.positionForTest("shang_general").kind==="army","field commander should start with field army");
assert(s().characters.find(c=>c.id==="shang_steward").location.id==="yin","steward should begin in Yin");
assert($(".map-person"),"characters should appear as city map markers");

$('[data-settlement-id="daxinzhuang"]').click();
assert(!$('#governor-select').querySelector('option[value="wen_ding"]'),
  "remote person cannot be appointed governor immediately");
$('[data-char-transfer="wen_ding"]').click();
let ruler=s().characters.find(c=>c.id==="wen_ding");
assert(ruler.location.id==="yin","transfer must not teleport instantly");
assert(ruler.travel?.destination==="daxinzhuang"&&ruler.travel.path.length===1,"road route not queued");
w.SHANGZHOU_DEBUG.advanceCharacterTravelForTest();
ruler=s().characters.find(c=>c.id==="wen_ding");
assert(ruler.location.id==="daxinzhuang"&&!ruler.travel,"character failed to arrive");
const select=$('#governor-select');
assert(select.querySelector('option[value="wen_ding"]'),"arrived character absent from appointment options");
select.value="wen_ding";
select.dispatchEvent(new w.Event("change",{bubbles:true}));
assert(s().governors.daxinzhuang==="wen_ding","local appointment failed");
assert($('#settlement-detail').textContent.includes("文丁"),"city detail did not show posted person");

$('[data-settlement-id="jinnan"]').click();
$('#btn-march').click();
assert(w.SHANGZHOU_DEBUG.positionForTest("shang_general").settlement==="jinnan",
  "commander did not follow moving army");

w.SHANGZHOU_DEBUG.captureForTest("yin","zhou");
assert(s().characterStatus.shang_steward==="detained",
  "garrisoned character should be exposed to detention when city falls");
assert(w.SHANGZHOU_DEBUG.positionForTest("shang_steward").kind==="detained",
  "detained character must have a concrete position");

assert(!errors.length,"browser script errors: "+errors.join(" | "));
console.log("Geographic map and spatial character regression passed.");
