import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { chromium } from "playwright";

const root=process.cwd();
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",
  ".css":"text/css; charset=utf-8",".webp":"image/webp"};
const server=http.createServer((req,res)=>{
  const route=decodeURIComponent((req.url||"/").split("?")[0]);
  const resolved=path.resolve(root,"."+ (route==="/"?"/index.html":route));
  if(!resolved.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{
    const file=fs.readFileSync(resolved);
    res.setHeader("Content-Type",mime[path.extname(resolved)]||"application/octet-stream");
    res.writeHead(200).end(file);
  }catch(e){res.writeHead(404).end("Not found: "+route);}
});
const assert=(ok,message)=>{if(!ok)throw new Error(message);};
await new Promise(done=>server.listen(0,"127.0.0.1",done));
const url="http://127.0.0.1:"+server.address().port+"/";
let browser;
try{
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1500,height:1000},deviceScaleFactor:1});
  const errors=[];
  page.on("pageerror",e=>errors.push(String(e)));
  await page.goto(url,{waitUntil:"domcontentloaded"});
  await page.locator('[data-faction-choice="shang"]').click();
  await page.locator("#event-actions button").first().click();
  await page.waitForFunction(()=>document.querySelector(".local-geography")?.complete&&
    document.querySelector(".local-geography")?.naturalWidth===1800,{timeout:15000});
  const imageValid=await page.evaluate(()=>{
    const img=document.querySelector(".local-geography");
    const cn=document.createElement("canvas");cn.width=32;cn.height=32;
    const ctx=cn.getContext("2d",{willReadFrequently:true});
    ctx.drawImage(img,0,0,32,32);
    const px=ctx.getImageData(0,0,32,32).data;
    const unique=new Set();
    for(let i=0;i<px.length;i+=4)unique.add(Math.round(px[i]/16)+":"+
      Math.round(px[i+1]/16)+":"+Math.round(px[i+2]/16));
    return {w:img.naturalWidth,h:img.naturalHeight,colors:unique.size};
  });
  assert(imageValid.colors>24,"Terrain image decoded but is blank/near-monochrome: "+JSON.stringify(imageValid));
  const nodes=page.locator(".geo-node");
  assert(await nodes.count()===21,"Not all settlements render on geographic map");
  async function assertFit(){
    return await page.evaluate(()=>{
      const map=document.querySelector("#map").getBoundingClientRect();
      const els=[...document.querySelectorAll(".geo-node")];
      const out=els.filter(e=>{
        const r=e.getBoundingClientRect();
        return r.left<map.left+1||r.right>map.right-1||r.top<map.top+1||r.bottom>map.bottom-1;
      });
      return {out:out.map(x=>x.dataset.settlementId),count:els.length};
    });
  }
  const initial=await assertFit();
  assert(initial.out.length===0,"Initial full map clips cities: "+JSON.stringify(initial));
  const yin=page.locator('[data-settlement-id="yin"]');
  const before=await yin.boundingBox();
  const mapBounds=await page.locator("#map").boundingBox();
  const sx=mapBounds.x+mapBounds.width*.57,sy=mapBounds.y+mapBounds.height*.26;
  await page.mouse.move(sx,sy);
  await page.mouse.down();
  await page.mouse.move(sx+120,sy+75,{steps:9});
  await page.mouse.up();
  const after=await yin.boundingBox();
  assert(Math.abs(after.x-before.x)>40||Math.abs(after.y-before.y)>40,
    "Dragging did not pan actual map; before="+JSON.stringify(before)+" after="+JSON.stringify(after));
  await page.locator(".geo-map-controls button").filter({hasText:"全图"}).click();
  const restored=await assertFit();
  assert(restored.out.length===0,"Full map still clips nodes: "+JSON.stringify(restored));
  const reset=await yin.boundingBox();
  assert(Math.abs(reset.x-before.x)<3&&Math.abs(reset.y-before.y)<3,
    "Full map failed to restore center after drag.");
  await page.locator(".geo-map-controls button").filter({hasText:"地形"}).click();
  await page.waitForFunction(()=>document.querySelector(".local-geography")?.src.includes("china-relief.webp")&&
    document.querySelector(".local-geography")?.complete&&document.querySelector(".local-geography")?.naturalWidth===1800);
  await page.locator(".geo-map-controls button").filter({hasText:"卫星"}).click();
  await page.waitForFunction(()=>document.querySelector(".local-geography")?.src.includes("china-satellite.webp")&&
    document.querySelector(".local-geography")?.complete&&document.querySelector(".local-geography")?.naturalWidth===1800);
  fs.mkdirSync("artifacts",{recursive:true});
  await page.locator("#map").screenshot({path:"artifacts/real-map-verified.png"});
  assert(!errors.length,"Page execution errors: "+errors.join(" | "));
  console.log("Real browser map verified: self-hosted imagery decoded",imageValid,
    "dragging moves nodes; full view restores all 21 cities; both map modes load.");
}finally{
  if(browser)await browser.close();
  await new Promise(done=>server.close(done));
}
