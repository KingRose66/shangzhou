import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { chromium } from "playwright";

const root=process.cwd();
const mime={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",
 ".js":"text/javascript; charset=utf-8",".webp":"image/webp"};
const server=http.createServer((req,res)=>{
 const route=decodeURIComponent((req.url||"/").split("?")[0]);
 const file=path.resolve(root,"."+(route==="/"?"/index.html":route));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 try{const body=fs.readFileSync(file);res.writeHead(200,{"Content-Type":mime[path.extname(file)]||"application/octet-stream"});res.end(body);}
 catch(_){res.writeHead(404).end("Not found");}
});
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
let browser;
try{
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1580,height:1010},deviceScaleFactor:1});
 const errors=[];
 page.on("pageerror",err=>errors.push(String(err)));
 await page.goto("http://127.0.0.1:"+server.address().port+"/");
 await page.locator('[data-faction-choice="shang"]').click();
 if(await page.locator("#event-overlay.show").count())
   await page.locator("#event-actions button").first().click();
 const markers=page.locator(".geo-node.city-sprite");
 assert(await markers.count()===21,"Missing illustrated settlement markers");
 const geometry=await page.evaluate(()=>[...document.querySelectorAll(".geo-node.city-sprite")].map(el=>{
   const r=el.getBoundingClientRect(),map=document.querySelector("#map").getBoundingClientRect();
   const target=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
   return {id:el.dataset.settlementId,width:r.width,height:r.height,
     hit:target===el||el.contains(target),
     inside:r.left>=map.left&&r.right<=map.right&&r.top>=map.top&&r.bottom<=map.bottom,
     art:!!el.querySelector("svg.settlement-art")};
 }));
 for(const row of geometry){
   assert(row.width>=52&&row.height>=52,"City hit area too small: "+JSON.stringify(row));
   assert(row.art,"No rendered settlement building: "+row.id);
   assert(row.inside,"City partially outside map: "+JSON.stringify(row));
   assert(row.hit,"City center obstructed by another token or label: "+JSON.stringify(row));
 }
 const typeExpectations={capital:7,city:2,ford:2,pass:3,fort:3,village:4};
 for(const [type,count] of Object.entries(typeExpectations))
   assert(await page.locator(".geo-node.city-type-"+type).count()===count,
     "Settlement visual type count mismatch for "+type);
 const names=page.locator(".geo-city-label");
 assert(await names.count()>=12,"Most city name labels should have clickable destinations");
 for(const id of ["yin","zhouyuan","jinnan","crossing"]){
   const marker=page.locator('[data-settlement-id="'+id+'"]');
   await marker.click();
   const selected=await page.evaluate(()=>window.SHANGZHOU_DEBUG.getState().selectedSettlement);
   assert(selected===id,"City icon failed selection: "+id+" => "+selected);
 }
 for(const id of ["yin","zhouyuan"]){
   const label=page.locator('[data-settlement-label="'+id+'"]');
   assert(await label.count()===1,"Major city needs clickable nameplate: "+id);
   await label.click();
   const selected=await page.evaluate(()=>window.SHANGZHOU_DEBUG.getState().selectedSettlement);
   assert(selected===id,"City nameplate failed selection: "+id);
 }
 // Map finder must work even for a city with a hidden or crowded label.
 assert(await page.locator("#map-city-jump option").count()===21,"Quick city finder does not list all locations");
 await page.locator("#map-city-jump").selectOption("shu");
 assert((await page.evaluate(()=>window.SHANGZHOU_DEBUG.getState().selectedSettlement))==="shu",
   "City finder failed to select distant Shu city");
 const finderCenter=await page.locator('[data-settlement-id="shu"]').boundingBox();
 const newBounds=await page.locator("#map").boundingBox();
 assert(finderCenter&&finderCenter.x>newBounds.x&&finderCenter.x<newBounds.x+newBounds.width,
   "City finder failed to bring destination into view");
 await page.locator("#map-city-jump").selectOption("yin");
 // The selected royal army can leave the city anchor and establish a road-side camp.
 await page.locator("#map-city-jump").selectOption("taihang");
 await page.locator("#btn-field-camp").click();
 const camp=await page.evaluate(()=>{
   const a=window.SHANGZHOU_DEBUG.getState().armies.find(x=>x.id==="a1");
   return a&&a.fieldPosition;
 });
 assert(camp&&camp.from==="yin"&&camp.to==="taihang","Road-side field camp was not persisted");
 assert(await page.locator(".map-army.field-camp").count()===1,"Field camp marker was not drawn on the map");
 await page.locator("#btn-toggle-ambush").click();
 const ambush=await page.evaluate(()=>{
   const a=window.SHANGZHOU_DEBUG.getState().armies.find(x=>x.id==="a1");
   return a&&a.fieldPosition&&a.fieldPosition.ambush;
 });
 assert(ambush,"Road camp did not enter ambush stance");
 assert(await page.locator(".map-army.field-ambush").count()===1,"Ambush marker was not distinguished on the map");
 await page.locator("#btn-toggle-ambush").click();
 const noAmbush=await page.evaluate(()=>{
   const a=window.SHANGZHOU_DEBUG.getState().armies.find(x=>x.id==="a1");
   return a&&a.fieldPosition&&!a.fieldPosition.ambush;
 });
 assert(noAmbush,"Ambush could not be cancelled");
 await page.locator("#btn-withdraw-field-camp").click();
 const withdrawn=await page.evaluate(()=>{
   const a=window.SHANGZHOU_DEBUG.getState().armies.find(x=>x.id==="a1");
   return !a.fieldPosition;
 });
 assert(withdrawn,"Field camp could not be withdrawn");
 await page.locator("#map-city-jump").selectOption("yin");
  // Army and person buttons remain available without covering city icon centers.
 assert(await page.locator(".map-army").count()>0,"Army flags disappeared");
 assert(await page.locator(".map-person").count()>0,"Character marker disappeared");
 // Capture the real playable terrain and city graphics BEFORE the battle dialog.
 fs.mkdirSync("artifacts",{recursive:true});
 await page.locator("#map").screenshot({path:"artifacts/illustrated-city-map.png"});
  // Independent live battle rehearsal should not mutate the campaign in any way.
 const snapshot=await page.evaluate(()=>JSON.stringify(window.SHANGZHOU_DEBUG.getState()));
 await page.locator("#skirmish-terrain").selectOption("highland");
 await page.locator("#btn-skirmish").click();
 await page.locator("#battle-overlay.show").waitFor({timeout:8000});
 assert((await page.locator("#battle-status").innerText()).includes("野战演练"),
   "Battle engine didn't begin a realtime practice encounter");
 assert(await page.locator("#battle-player-roster [data-battle-unit]").count()>0,"Player tactical roster was not rendered");
 assert(await page.locator("#battle-enemy-roster [data-battle-unit]").count()>0,"Enemy tactical roster was not rendered");
 assert(await page.locator("#battle-minimap").count()===1,"Tactical minimap is missing");
 await page.locator("#battle-player-roster [data-battle-unit]").first().click();
 assert(!(await page.locator("#battle-selected-title").innerText()).includes("未选择"),"Roster selection did not select a unit");
 await page.locator("#battle-reform").click();
 assert(await page.evaluate(()=>window.BATTLE_ENGINE.selected.orderMode==="hold"),"Reform command did not hold the unit");
 await page.locator("#battle-flank").click();
 assert(await page.evaluate(()=>window.BATTLE_ENGINE.selected.orderMode==="move"&&window.BATTLE_ENGINE.selected.tx!==null),"Flanking command did not create a manoeuvre order");
 await page.locator("#battle-charge").click();
 assert(await page.evaluate(()=>window.BATTLE_ENGINE.selected.orderMode==="manual"&&!!window.BATTLE_ENGINE.selected.targetEnemy),"Charge command did not acquire an enemy");
 await page.locator("#battle-zoom-in").click();
 assert(await page.evaluate(()=>window.BATTLE_ENGINE.camera.zoom>1),"Battle camera zoom control failed");
 await page.locator("#battle-retreat").click();
 await page.locator("#battle-overlay.show").waitFor({state:"hidden",timeout:5000});
 await page.locator("#dialog[open]").waitFor({timeout:4000});
 assert((await page.locator("#dialog-content").innerText()).includes("未消耗实际粮草"),
   "Practice result fails to disclose no impact on campaign");
 const after=await page.evaluate(()=>JSON.stringify(window.SHANGZHOU_DEBUG.getState()));
 assert(snapshot===after,"Practice unexpectedly altered the real campaign");
 assert(!errors.length,"Runtime errors: "+errors.join(" | "));
 console.log("Tactical test passed: 21 typed settlements, road ambush controls, unit rosters, battle commands, minimap and camera.");
}finally{
 if(browser)await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
