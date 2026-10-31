import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import {chromium} from "playwright";

const root=process.cwd();
const mime={".html":"text/html",".css":"text/css",".js":"text/javascript",".webp":"image/webp"};
const server=http.createServer((req,res)=>{
  const url=decodeURIComponent((req.url||"/").split("?")[0]);
  const file=path.resolve(root,"."+(url==="/"?"/index.html":url));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{
    res.writeHead(200,{"Content-Type":mime[path.extname(file)]||"application/octet-stream"});
    res.end(fs.readFileSync(file));
  }catch(_){res.writeHead(404).end();}
});
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
const center=box=>({x:box.x+box.width/2,y:box.y+box.height/2});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
let browser;
try{
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1500,height:1000},hasTouch:true});
  const errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.goto("http://127.0.0.1:"+server.address().port+"/");
  await page.locator('[data-faction-choice="shang"]').click();
  await page.locator("#event-actions button").first().click();
  const yin=page.locator('[data-settlement-id="yin"]');
  const map=page.locator("#map");
  await page.waitForFunction(()=>document.querySelector(".local-geography")?.naturalWidth===1800);

  // Mouse dragging starts even on a city: stationary clicks remain interactive.
  const original=center(await yin.boundingBox());
  await page.mouse.move(original.x,original.y);
  await page.mouse.down();
  await page.mouse.move(original.x+95,original.y+48,{steps:12});
  await page.mouse.up();
  const afterMouse=center(await yin.boundingBox());
  assert(afterMouse.x-original.x>65&&afterMouse.y-original.y>30,
    "mouse pan starting on settlement marker did not work: "+JSON.stringify({original,afterMouse}));
  await page.locator(".geo-map-controls button").filter({hasText:"全图"}).click();
  const reset=center(await yin.boundingBox());
  assert(Math.abs(reset.x-original.x)<4,"reset after mouse pan failed");

  const cdp=await page.context().newCDPSession(page);
  const send=async(type,points)=>{
    await cdp.send("Input.dispatchTouchEvent",{
      type,touchPoints:points.map((point,i)=>({x:point.x,y:point.y,id:i+1,radiusX:2,radiusY:2,force:1}))
    });
    await page.waitForTimeout(50);
  };
  const mapRect=await map.boundingBox();
  const mx=mapRect.x+mapRect.width*.57,my=mapRect.y+mapRect.height*.51;
  const pair=(distance,dx=0,dy=0)=>[
    {x:mx-distance/2+dx,y:my+dy},
    {x:mx+distance/2+dx,y:my+dy}
  ];
  const initial=center(await yin.boundingBox());
  await send("touchStart",pair(140));
  await send("touchMove",pair(140,120,65));
  await send("touchEnd",[]);
  const panned=center(await yin.boundingBox());
  assert(panned.x-initial.x>65&&panned.y-initial.y>35,
    "two-finger parallel movement failed to pan map: "+JSON.stringify({initial,panned}));

  const zhou=page.locator('[data-settlement-id="zhouyuan"]');
  const distanceBetween=async()=>{
    const a=center(await yin.boundingBox()),b=center(await zhou.boundingBox());
    return Math.hypot(a.x-b.x,a.y-b.y);
  };
  const sizeBefore=await distanceBetween();
  await send("touchStart",pair(130));
  await send("touchMove",pair(245));
  await send("touchEnd",[]);
  const sizeZoomedIn=await distanceBetween();
  assert(sizeZoomedIn>sizeBefore*1.3,
    "two-finger spread did not zoom in: "+sizeBefore+" => "+sizeZoomedIn);

  await send("touchStart",pair(245));
  await send("touchMove",pair(135));
  await send("touchEnd",[]);
  const sizeZoomedOut=await distanceBetween();
  assert(sizeZoomedOut<sizeZoomedIn*.8,
    "two-finger pinch did not zoom out: "+sizeZoomedIn+" => "+sizeZoomedOut);

  // Simultaneous diagonal two-finger movement and spreading should change
  // both the projected city position and the distances between cities.
  const beforeCombined=center(await yin.boundingBox());
  const beforeCombinedDistance=await distanceBetween();
  await send("touchStart",pair(140));
  await send("touchMove",pair(195,-65,45));
  await send("touchEnd",[]);
  const afterCombined=center(await yin.boundingBox());
  const afterCombinedDistance=await distanceBetween();
  assert(afterCombinedDistance>beforeCombinedDistance*1.18,
    "combined pan/pinch failed to change scale");
  // Scale can offset the apparent movement of an individual city marker.
  // Compare against a zoom-only transform to isolate the midpoint translation.
  const gestureScale=afterCombinedDistance/beforeCombinedDistance;
  const zoomOnlyX=mx+(beforeCombined.x-mx)*gestureScale;
  const zoomOnlyY=my+(beforeCombined.y-my)*gestureScale;
  const recoveredPan={x:afterCombined.x-zoomOnlyX,y:afterCombined.y-zoomOnlyY};
  assert(Math.abs(recoveredPan.x-(-65))<20&&Math.abs(recoveredPan.y-45)<20,
    "combined pan/pinch should preserve centroid translation: "+JSON.stringify(recoveredPan));
  assert(errors.length===0,"Browser errors during gestures: "+errors.join(" | "));
  console.log("Real mouse/touch gestures passed: city-origin mouse drag, two-finger pan, pinch-in, pinch-out, simultaneous pan+zoom.");
}finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
