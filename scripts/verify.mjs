import fs from "node:fs";
import vm from "node:vm";

const files = ["data.js","battle.js","game.js"];
for (const file of files) {
  const code = fs.readFileSync(file,"utf8");
  new vm.Script(code,{filename:file});
}

const sandbox = { window:{} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync("data.js","utf8"),sandbox);
const D = sandbox.window.GAME_DATA;

if (!D || !D.settlements || !D.units) throw new Error("GAME_DATA missing");

const settlements = new Map(D.settlements.map(s=>[s.id,s]));
for (const s of D.settlements) {
  if (!D.factions[s.owner]) throw new Error(`Unknown owner ${s.owner} at ${s.id}`);
  for (const road of s.roads) {
    const n=settlements.get(road);
    if(!n) throw new Error(`Unknown road target ${road} from ${s.id}`);
    if(!n.roads.includes(s.id)) throw new Error(`Road is not reciprocal: ${s.id} -> ${road}`);
  }
  for (const key of ["wood","bow","ge","spear","chariot"]) {
    if (typeof s.weapons[key] !== "number") throw new Error(`Missing weapon pool ${key} at ${s.id}`);
  }
}

for (const [id,u] of Object.entries(D.units)) {
  if(!["clan","slave"].includes(u.population)) throw new Error(`Bad population type for ${id}`);
  if(!["wood","bow","ge","spear","chariot"].includes(u.weapon)) throw new Error(`Bad weapon type for ${id}`);
  if(u.size<=0||u.weaponNeed<0||u.morale<=0) throw new Error(`Bad unit values for ${id}`);
}

const html=fs.readFileSync("index.html","utf8");
for (const id of [
  "map","armies","army-detail","diplomacy-detail","battle-overlay","battle-canvas",
  "btn-end-turn","btn-assault","btn-demand-tribute"
]) {
  if(!html.includes(`id="${id}"`)) throw new Error(`Missing DOM id ${id}`);
}
for(const src of ["data.js","battle.js","game.js"]){
  if(!html.includes(`src="${src}"`)) throw new Error(`Missing script reference ${src}`);
}

console.log("Shangzhou static verification passed.");
