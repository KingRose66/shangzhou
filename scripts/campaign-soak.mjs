import fs from "node:fs";
import { JSDOM } from "jsdom";

const html=fs.readFileSync("index.html","utf8");
const dom=new JSDOM(html,{url:"https://balance.test/",runScripts:"outside-only",pretendToBeVisual:true});
const {window}=dom;

window.alert=()=>{};
window.confirm=()=>true;
window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
window.HTMLDialogElement.prototype.close=function(){this.open=false;};
window.requestAnimationFrame=()=>0;
window.cancelAnimationFrame=()=>{};
window.HTMLCanvasElement.prototype.getContext=function(){
  const noop=()=>{};
  return new Proxy({},{
    get(_t,p){if(p==="measureText")return ()=>({width:10});return noop;},
    set(){return true;}
  });
};

for(const file of ["data.js","battle.js","game.js"]) window.eval(fs.readFileSync(file,"utf8"));

const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};
const men=a=>a.units.reduce((n,u)=>n+u.men,0);

// Deterministic tactical substitute for campaign soak tests.
// The real battle engine has separate tests/static checks; this keeps multi-year campaign simulation synchronous.
window.BATTLE_ENGINE.start=(cfg)=>{
  const pMen=men(cfg.playerArmy),eMen=men(cfg.enemyArmy);
  const pCmd=cfg.commanders?.[cfg.playerArmy.id]?.command||55;
  const eCmd=cfg.commanders?.[cfg.enemyArmy.id]?.command||55;
  const pScore=pMen*(.85+pCmd/300);
  const eScore=eMen*(.85+eCmd/300);
  const playerWins=pScore>=eScore;
  const pack=(army,winner)=>army.units.map((u,i)=>({
    type:u.type,sourceIndex:i,
    men:Math.max(1,Math.round(u.men*(winner?.88:.64))),
    routed:!winner,morale:winner?64:24,order:winner?58:25
  }));
  cfg.onFinish({
    winnerSide:playerWins?"player":"enemy",
    voluntaryRetreat:false,
    player:pack(cfg.playerArmy,playerWins),
    enemy:pack(cfg.enemyArmy,!playerWins)
  });
};

const playable=["shang","zhou","gaodi","dongfang","jianghan","wucheng","shu"];
const summaries=[];

for(const factionId of playable){
  window.SHANGZHOU_DEBUG.startGame(factionId);
  let survived=0;
  for(let q=0;q<24;q++){
    window.SHANGZHOU_DEBUG.endTurn();
    const s=window.SHANGZHOU_DEBUG.getState();
    survived=q+1;

    for(const city of s.settlements){
      for(const v of [city.pop.clan,city.pop.slave,city.grain,city.fodder,city.bronze]){
        assert(Number.isFinite(v), factionId+" non-finite city value at "+city.id);
        assert(v>=0, factionId+" negative city value at "+city.id);
      }
    }
    for(const [id,f] of Object.entries(s.factions)){
      assert(Number.isFinite(f.shells)&&f.shells>=0, factionId+" invalid shells for "+id);
      assert(Number.isFinite(f.prestige), factionId+" invalid prestige for "+id);
    }
    for(const army of s.armies){
      assert(Number.isFinite(army.grain)&&army.grain>=0, factionId+" invalid army grain "+army.id);
      assert(Number.isFinite(army.fodder)&&army.fodder>=0, factionId+" invalid army fodder "+army.id);
      assert(army.units.every(u=>Number.isFinite(u.men)&&u.men>=0), factionId+" invalid army men "+army.id);
    }
    if(s.gameOver)break;
  }

  const final=window.SHANGZHOU_DEBUG.getState();
  const capital=window.GAME_DATA.settlements.find(x=>x.owner===factionId&&x.capital);
  const currentCapital=capital?final.settlements.find(x=>x.id===capital.id):null;
  summaries.push({
    faction:factionId,
    quarters:survived,
    gameOver:final.gameOver,
    capitalOwner:currentCapital?.owner,
    settlements:final.settlements.filter(x=>x.owner===factionId).length,
    shells:Math.round(final.factions[factionId].shells)
  });

  // An idle player can eventually lose, but no faction should be structurally doomed in its first year.
  assert(survived>=4, factionId+" collapses before completing one year");
}

console.log("Campaign soak test passed.");
console.table(summaries);
