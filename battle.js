(() => {
  class BattleEngine {
    constructor(){
      this.overlay = document.getElementById("battle-overlay");
      this.canvas = document.getElementById("battle-canvas");
      this.ctx = this.canvas.getContext("2d");
      this.status = document.getElementById("battle-status");
      this.detail = document.getElementById("battle-unit-detail");
      this.advanceBtn = document.getElementById("battle-advance");
      this.holdBtn = document.getElementById("battle-hold");
      this.pauseBtn = document.getElementById("battle-pause");
      this.speedBtn = document.getElementById("battle-speed");
      this.retreatBtn = document.getElementById("battle-retreat");
      this.running = false;
      this.paused = false;
      this.speed = 1;
      this.last = 0;
      this.aiClock = 0;
      this.selected = null;
      this.units = [];
      this.terrainZones = [];
      this.config = null;
      this.bind();
    }

    bind(){
      this.canvas.addEventListener("click", e => this.handleClick(e));
      this.canvas.addEventListener("contextmenu", e => { e.preventDefault(); this.handleOrder(e); });
      this.advanceBtn.onclick = () => this.orderAll("advance");
      this.holdBtn.onclick = () => this.orderAll("hold");
      this.pauseBtn.onclick = () => {
        this.paused = !this.paused;
        this.pauseBtn.textContent = this.paused ? "继续" : "暂停";
      };
      this.speedBtn.onclick = () => {
        this.speed = this.speed === 1 ? 1.75 : this.speed === 1.75 ? 2.5 : 1;
        this.speedBtn.textContent = "速度 ×" + this.speed;
      };
      this.retreatBtn.onclick = () => {
        if(!this.running) return;
        this.units.filter(u => u.side === "player" && !u.routed).forEach(u => {
          u.routed = true;
          u.morale = Math.min(u.morale, 12);
        });
        this.finish("enemy", true);
      };
      window.addEventListener("resize", () => this.resize());
    }

    start(config){
      this.config = config;
      this.overlay.classList.add("show");
      this.resize();
      this.running = true;
      this.paused = false;
      this.speed = 1;
      this.speedBtn.textContent = "速度 ×1";
      this.pauseBtn.textContent = "暂停";
      this.last = performance.now();
      this.aiClock = 0;
      this.selected = null;
      this.units = [];
      this.buildTerrain(config.terrain,config.siege);
      this.buildArmy(config.playerArmy, "player", config.playerArmy.owner === config.attacker.owner);
      this.buildArmy(config.enemyArmy, "enemy", config.enemyArmy.owner === config.attacker.owner);
      this.status.textContent = `${config.locationName} · ${config.terrainName} · 右键下达移动/攻击命令`;
      this.detail.innerHTML = "部队默认坚守并会自主迎击近敌；也可下达全军推进或单队指令。";
      requestAnimationFrame(t => this.loop(t));
    }

    resize(){
      const box = this.canvas.getBoundingClientRect();
      const ratio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      this.canvas.width = Math.floor(box.width * ratio);
      this.canvas.height = Math.floor(box.height * ratio);
      this.ctx.setTransform(ratio,0,0,ratio,0,0);
      this.w = box.width;
      this.h = box.height;
    }

    buildTerrain(kind,siege){
      const w = this.w || 1000, h = this.h || 620;
      const zones = [];
      if(["hill","highland","rolling"].includes(kind)){
        zones.push({type:"hill",x:w*.36,y:h*.16,w:w*.26,h:h*.24});
      }
      if(["river","plain"].includes(kind)){
        zones.push({type:"field",x:w*.14,y:h*.52,w:w*.25,h:h*.25});
      }
      if(kind === "highland"){
        zones.push({type:"forest",x:w*.58,y:h*.46,w:w*.22,h:h*.3});
      } else {
        zones.push({type:"forest",x:w*.66,y:h*.18,w:w*.18,h:h*.22});
      }
      if(kind === "river"){
        // A continuous river is a defensible obstacle, not an invisible
        // full-height mud strip. The central ford is slower but passable.
        zones.push({type:"river",x:w*.46,y:0,w:w*.075,h:h});
        zones.push({type:"ford",x:w*.46,y:h*.40,w:w*.075,h:h*.20});
        zones.push({type:"mud",x:w*.40,y:h*.07,w:w*.055,h:h*.86});
        zones.push({type:"mud",x:w*.54,y:h*.07,w:w*.055,h:h*.86});
      }
      if(siege){
        zones.push({type:"rampart",x:w*.67,y:h*.08,w:w*.045,h:h*.84,gateY:h*.50,gateHalf:58});
        zones.push({type:"ditch",x:w*.625,y:h*.08,w:w*.028,h:h*.84,gateY:h*.50,gateHalf:64});
      }
      this.terrainZones = zones;
    }

    buildArmy(army, side, isAttacker){
      const baseX = this.config.siege ? (isAttacker ? this.w*.17 : this.w*.82) : (side === "player" ? this.w*.18 : this.w*.82);
      const dir = this.config.siege ? (isAttacker ? 1 : -1) : (side === "player" ? 1 : -1);
      let row = 0, col = 0;
      const commander = this.config.commanders?.[army.id];
      army.units.forEach((u, idx) => {
        const def = GAME_DATA.units[u.type];
        const bw = u.type === "chariot" ? 54 : 42;
        const bh = u.type === "chariot" ? 25 : 30;
        let traitMorale=0,traitOrder=0,traitMelee=1,traitMissile=1,traitSpeed=1;
        if(commander){
          if(commander.trait==="车战娴熟"&&u.type==="chariot"){traitMorale+=4;traitOrder+=5;traitMelee*=1.08;}
          if(commander.trait==="族兵凝聚"&&u.type==="clan_levy"){traitMorale+=6;traitOrder+=6;traitMelee*=1.05;}
          if(commander.trait==="山地熟习"&&["hill","highland"].includes(this.config.terrain)){traitMorale+=3;traitOrder+=5;traitSpeed*=1.06;}
          if(commander.trait==="舟陆并用"&&this.config.terrain==="river"){traitMorale+=3;traitOrder+=4;traitSpeed*=1.05;}
          if(commander.trait==="西土开拓"&&isAttacker){traitMorale+=2;traitOrder+=3;}
        }
        const unit = {
          uid: `${side}-${idx}`, sourceIndex:idx, armyId:army.id, type:u.type,
          name:def.name, side, x:baseX + dir*(col*54), y:this.h*.25 + row*72,
          tx:null,ty:null,targetEnemy:null,orderMode:"hold",guardX:baseX + dir*(col*54),guardY:this.h*.25 + row*72,chargeMomentum:0,
          men:u.men,maxMen:u.men,
          morale:Math.min(95,(u.morale || def.morale) + (commander ? Math.round((commander.command-50)*.18) : 0)+traitMorale),
          order:Math.min(95,def.order+traitOrder), fatigue:4,
          melee:def.melee*traitMelee, missile:def.missile*traitMissile, range:def.range||0, armor:def.armor, speed:def.speed*traitSpeed,
          width:bw,height:bh, routed:false, engaged:false,
          attackCd:Math.random()*.8, missileCd:Math.random()*1.5,
          moving:false, lastMoveSpeed:0, facing:dir>0?0:Math.PI, aiFlankSign:idx%2===0?1:-1, isAttacker
        };
        this.units.push(unit);
        row++;
        if(row >= 5){ row=0; col++; }
      });
    }

    terrainAt(u){
      for(const z of [...this.terrainZones].reverse()){
        if(u.x>=z.x && u.x<=z.x+z.w && u.y>=z.y && u.y<=z.y+z.h){
          if((z.type==="rampart"||z.type==="ditch") && Math.abs(u.y-z.gateY)<=z.gateHalf) continue;
          return z.type;
        }
      }
      return "open";
    }

    terrainFactor(u){
      const t=this.terrainAt(u);
      if(u.type==="chariot"){
        if(t==="rampart") return .06;
        if(t==="ditch") return .08;
        if(t==="forest") return .28;
        if(t==="river") return .10;
        if(t==="ford") return .32;
        if(t==="mud") return .22;
        if(t==="hill") return .52;
        if(t==="field") return .82;
      }
      if(t==="rampart") return .30;
      if(t==="ditch") return .36;
      if(u.type==="hunter" && (t==="forest"||t==="hill")) return .95;
      if(t==="hill") return .83;
      if(t==="forest") return .72;
      if(t==="river") return .20;
      if(t==="ford") return .55;
      if(t==="mud") return .68;
      return 1;
    }

    handleClick(e){
      if(!this.running) return;
      const p=this.point(e);
      let pick=null,dist=Infinity;
      for(const u of this.units.filter(x=>x.side==="player"&&!x.routed&&x.men>0)){
        const d=Math.hypot(u.x-p.x,u.y-p.y);
        if(d<34 && d<dist){pick=u;dist=d}
      }
      this.selected=pick;
      this.units.forEach(u=>u.selected=(u===pick));
      this.updateDetail();
    }

    handleOrder(e){
      if(!this.running || !this.selected || this.selected.routed) return;
      const p=this.point(e);
      let enemy=null,dist=Infinity;
      for(const u of this.units.filter(x=>x.side==="enemy"&&!x.routed&&x.men>0)){
        const d=Math.hypot(u.x-p.x,u.y-p.y);
        if(d<42&&d<dist){enemy=u;dist=d}
      }
      if(enemy){
        this.selected.orderMode="manual";
        this.selected.targetEnemy=enemy;
        this.selected.tx=null;this.selected.ty=null;
      }else{
        this.selected.orderMode="move";
        this.selected.targetEnemy=null;
        this.selected.tx=p.x;this.selected.ty=p.y;
        this.selected.guardX=p.x;this.selected.guardY=p.y;
      }
    }

    orderAll(mode){
      if(!this.running)return;
      const enemies=this.units.filter(x=>x.side==="enemy"&&x.men>0&&!x.routed);
      for(const u of this.units.filter(x=>x.side==="player"&&x.men>0&&!x.routed)){
        u.orderMode=mode;
        u.tx=null;u.ty=null;u.targetEnemy=null;
        if(mode==="advance"&&enemies.length){
          u.targetEnemy=enemies.reduce((a,b)=>
            Math.hypot(a.x-u.x,a.y-u.y)<=Math.hypot(b.x-u.x,b.y-u.y)?a:b);
        }
      }
      this.status.textContent=this.config.locationName+" · "+(mode==="advance"?"全军推进，仍可单独命令侧击":"全军坚守，接近阵线的敌军将被自动迎击");
    }

    playerOrders(){
      const enemies=this.units.filter(x=>x.side==="enemy"&&x.men>0&&!x.routed);
      for(const u of this.units.filter(x=>x.side==="player"&&x.men>0&&!x.routed)){
        if(u.orderMode==="manual"){
          if(!u.targetEnemy||u.targetEnemy.men<=0||u.targetEnemy.routed)u.orderMode="hold";
          else continue;
        }
        if(u.orderMode==="move")continue;
        if(!enemies.length){u.targetEnemy=null;continue;}
        const nearest=enemies.reduce((a,b)=>
          Math.hypot(a.x-u.x,a.y-u.y)<=Math.hypot(b.x-u.x,b.y-u.y)?a:b);
        if(u.orderMode==="advance"){
          u.targetEnemy=nearest;u.tx=null;u.ty=null;
          continue;
        }
        const distance=Math.hypot(nearest.x-u.x,nearest.y-u.y);
        const guardDistance=Math.hypot(nearest.x-u.guardX,nearest.y-u.guardY);
        const engageRadius=u.missile>0?Math.min(u.range,200):115;
        if(distance<=engageRadius && guardDistance<=engageRadius+25){
          u.targetEnemy=nearest;u.tx=null;u.ty=null;
        }else{
          u.targetEnemy=null;
          if(Math.hypot(u.x-u.guardX,u.y-u.guardY)>18){
            u.tx=u.guardX;u.ty=u.guardY;
          }else{u.tx=null;u.ty=null;}
        }
      }
    }

    point(e){
      const r=this.canvas.getBoundingClientRect();
      return {x:e.clientX-r.left,y:e.clientY-r.top};
    }

    loop(t){
      if(!this.running) return;
      const raw=Math.min(.05,(t-this.last)/1000||.016);
      this.last=t;
      if(!this.paused){
        const dt=raw*this.speed;
        this.update(dt);
        this.aiClock+=dt;
        if(this.aiClock>.7){this.aiClock=0;this.aiOrders();this.playerOrders()}
      }
      this.draw();
      requestAnimationFrame(x=>this.loop(x));
    }

    aiOrders(){
      const enemyUnits=this.units.filter(x=>x.side==="enemy"&&!x.routed&&x.men>0);
      const playerUnits=this.units.filter(x=>x.side==="player"&&!x.routed&&x.men>0);
      for(const u of enemyUnits){
        if(!playerUnits.length) continue;
        let target=playerUnits[0],best=Infinity;
        for(const e of playerUnits){
          let d=Math.hypot(e.x-u.x,e.y-u.y);
          if(u.type==="chariot"){
            if(e.type==="archer"||e.type==="hunter")d*=.62;
            if(e.type==="bronze_spear")d*=1.22;
            if(e.order<35)d*=.72;
          }else if(u.type==="bronze_spear"&&e.type==="chariot"){
            d*=.55;
          }else if((u.type==="bronze_ge"||u.type==="royal_guard")&&e.morale<35){
            d*=.72;
          }
          if(d<best){best=d;target=e}
        }

        if(u.missile>0 && u.type!=="chariot" && best<Math.max(80,u.range-5) && best>Math.min(72,u.range*.42)){
          u.targetEnemy=null;u.tx=null;u.ty=null;
          continue;
        }

        const badChariotGround=["forest","mud","river","ford","hill","rampart","ditch"].includes(this.terrainAt(u));
        if(u.type==="chariot"&&!badChariotGround&&!u.engaged&&!target.routed){
          const rearX=target.x-Math.cos(target.facing)*58;
          const rearY=target.y-Math.sin(target.facing)*58;
          const flankX=rearX-Math.sin(target.facing)*82*u.aiFlankSign;
          const flankY=rearY+Math.cos(target.facing)*82*u.aiFlankSign;
          const toFlank=Math.hypot(flankX-u.x,flankY-u.y);
          const attackDir=this.attackDirection(u,target);
          if(toFlank>38 && attackDir==="front"){
            u.targetEnemy=null;
            u.tx=Math.max(25,Math.min(this.w-25,flankX));
            u.ty=Math.max(25,Math.min(this.h-25,flankY));
            continue;
          }
        }

        u.tx=null;u.ty=null;
        u.targetEnemy=target;
      }
    }

    update(dt){
      const alive=this.units.filter(u=>u.men>0);
      alive.forEach(u=>{
        u.engaged=false;u.moving=false;
        u.chargeMomentum=Math.max(0,(u.chargeMomentum||0)-dt);
        u.attackCd-=dt;u.missileCd-=dt;
        if(u.routed){
          const fleeX=u.side==="player"?-80:this.w+80;
          this.moveToward(u,fleeX,u.y,dt,true);
          u.morale=Math.max(0,u.morale-dt*1.5);
          return;
        }
        const enemies=alive.filter(e=>e.side!==u.side&&!e.routed);
        if(!enemies.length) return;
        let target=u.targetEnemy;
        if(!target || target.men<=0 || target.routed) target=null;

        if(u.missile>0){
          let ranged=target;
          if(!ranged){
            ranged=enemies.reduce((a,b)=>Math.hypot(a.x-u.x,a.y-u.y)<Math.hypot(b.x-u.x,b.y-u.y)?a:b);
          }
          const d=Math.hypot(ranged.x-u.x,ranged.y-u.y);
          if(d<u.range && d>Math.min(65,u.range*.48)){
            if(u.missileCd<=0){this.rangedAttack(u,ranged);u.missileCd=2.1+Math.random()*.8}
            return;
          }
        }

        if(target){
          const d=Math.hypot(target.x-u.x,target.y-u.y);
          if(d<42){
            u.engaged=true;target.engaged=true;
            if(u.attackCd<=0){this.meleeAttack(u,target);u.attackCd=.85+Math.random()*.65}
          } else {
            this.moveToward(u,target.x,target.y,dt,false);
          }
        }else if(u.tx!==null){
          if(Math.hypot(u.tx-u.x,u.ty-u.y)>9)this.moveToward(u,u.tx,u.ty,dt,false);
          else {
            u.tx=null;u.ty=null;u.moving=false;
            if(u.orderMode==="move")u.orderMode="hold";
          }
        }
        if(u.engaged) u.fatigue=Math.min(100,u.fatigue+dt*2.6);
        else if(u.moving) u.fatigue=Math.min(100,u.fatigue+dt*.5);
        else u.fatigue=Math.max(0,u.fatigue-dt*.45);

        if(u.morale<16 && !u.routed){
          u.routed=true;u.targetEnemy=null;u.tx=null;u.ty=null;
          this.panicNearby(u);
        }
      });
      this.checkEnd();
      this.updateDetail();
    }

    moveToward(u,x,y,dt,flee){
      const dx=x-u.x,dy=y-u.y,d=Math.max(1,Math.hypot(dx,dy));
      let speed=u.speed*this.terrainFactor(u)*(1-u.fatigue*.0042);
      if(flee)speed*=1.15;
      u.x+=dx/d*speed*dt;u.y+=dy/d*speed*dt;
      u.facing=Math.atan2(dy,dx);
      u.moving=true;u.lastMoveSpeed=speed;
      if(speed>43)u.chargeMomentum=.65;
      u.x=Math.max(-100,Math.min(this.w+100,u.x));u.y=Math.max(20,Math.min(this.h-20,u.y));
      if(u.type==="chariot" && this.terrainAt(u)==="forest")u.order=Math.max(15,u.order-dt*2.4);
    }

    rangedAttack(a,d){
      const cover=this.terrainAt(d)==="forest"?.62:1;
      const fatigue=1-a.fatigue*.006;
      const raw=(a.missile/14)*(a.men/a.maxMen)*fatigue*cover*(.7+Math.random()*.6);
      const loss=Math.max(0,Math.round(raw*(1-d.armor/150)));
      d.men=Math.max(0,d.men-loss);
      d.morale-=loss*.42 + (a.type==="chariot"?1.2:.3);
      d.order=Math.max(0,d.order-loss*.18);
    }

    attackDirection(a,d){
      const incoming=Math.atan2(a.y-d.y,a.x-d.x);
      let diff=Math.abs(incoming-d.facing);
      while(diff>Math.PI)diff=Math.abs(diff-Math.PI*2);
      if(diff>2.18)return "rear";
      if(diff>1.05)return "flank";
      return "front";
    }

    meleeAttack(a,d){
      const fatigue=1-a.fatigue*.0065;
      const order=.45+a.order/130;
      const direction=this.attackDirection(a,d);
      const dirDamage=direction==="rear"?1.30:direction==="flank"?1.15:1;
      const dirMorale=direction==="rear"?7:direction==="flank"?3:0;
      const dirOrder=direction==="rear"?6:direction==="flank"?3:0;
      let charge=1;

      const goodChariotGround=!["forest","mud","river","ford","hill","rampart","ditch"].includes(this.terrainAt(a));
      const charged=(a.chargeMomentum===undefined?a.lastMoveSpeed>45:a.chargeMomentum>.12);
      if(a.type==="chariot" && charged && goodChariotGround){
        if(d.type==="bronze_spear" && direction==="front"){
          charge=.92;
          const counterLoss=Math.max(0,Math.round((d.men/d.maxMen)*1.3));
          a.men=Math.max(1,a.men-counterLoss);
          a.order=Math.max(8,a.order-4);
          a.morale-=2;
        }else{
          charge=direction==="rear"?1.72:direction==="flank"?1.62:1.48;
          d.morale-=direction==="front"?4:6;
        }
      }

      const raw=(a.melee/12)*(a.men/a.maxMen)*fatigue*order*charge*dirDamage*(.72+Math.random()*.55);
      const loss=Math.max(1,Math.round(raw*(1-d.armor/145)));
      d.men=Math.max(0,d.men-loss);
      d.order=Math.max(0,d.order-loss*.55-1.1-dirOrder);
      d.morale-=loss*.62 + dirMorale + Math.max(0,(a.morale-d.morale)*.012);
      a.order=Math.max(10,a.order-.18);
      if(d.men<=0){d.routed=true;d.morale=0}
    }

    panicNearby(source){
      this.units.filter(u=>u.side===source.side&&!u.routed&&u!==source).forEach(u=>{
        const d=Math.hypot(u.x-source.x,u.y-source.y);
        if(d<150)u.morale-=Math.max(1,7-d/28);
      });
    }

    checkEnd(){
      const assess=side=>{
        const all=this.units.filter(u=>u.side===side);
        const active=all.filter(u=>u.men>0&&!u.routed);
        const start=all.reduce((s,u)=>s+u.maxMen,0);
        const organized=active.reduce((s,u)=>s+u.men,0);
        return {all,active,start,organized,ratio:organized/Math.max(1,start)};
      };
      const p=assess("player"),e=assess("enemy");
      if(p.active.length===0 || p.ratio<.14){this.finish("enemy",false);return}
      if(e.active.length===0 || e.ratio<.14){this.finish("player",false);return}
    }

    finish(winnerSide,voluntaryRetreat){
      if(!this.running)return;
      this.running=false;
      const pack=side=>this.units.filter(u=>u.side===side).map(u=>({
        type:u.type,sourceIndex:u.sourceIndex,men:Math.max(0,Math.round(u.men)),
        routed:u.routed,morale:Math.max(8,Math.round(u.morale)),order:Math.max(5,Math.round(u.order))
      }));
      const result={winnerSide,voluntaryRetreat,player:pack("player"),enemy:pack("enemy")};
      this.status.textContent=winnerSide==="player"?"战斗结束：我军保持战场":"战斗结束：我军退出战场";
      setTimeout(()=>{
        this.overlay.classList.remove("show");
        if(this.config?.onFinish)this.config.onFinish(result);
      },650);
    }

    updateDetail(){
      if(!this.selected || !this.running){
        if(!this.running)this.detail.textContent="";
        return;
      }
      const u=this.selected;
      this.detail.innerHTML=`<b>${u.name}</b> · ${u.men}/${u.maxMen}人　
      士气 ${Math.round(u.morale)}　队形 ${Math.round(u.order)}　疲劳 ${Math.round(u.fatigue)}
      <span class="${u.routed?"bad":"good"}">${u.routed?"溃逃":u.engaged?"交战":"受命"}</span>`;
    }

    draw(){
      const c=this.ctx,w=this.w,h=this.h;
      c.clearRect(0,0,w,h);
      c.fillStyle="#8b7652";c.fillRect(0,0,w,h);
      this.drawTerrain(c);
      c.strokeStyle="rgba(72,48,30,.25)";c.lineWidth=1;
      for(let x=0;x<w;x+=80){c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke()}
      for(let y=0;y<h;y+=80){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke()}

      this.units.forEach(u=>{
        if(u.men<=0)return;
        const frac=u.men/u.maxMen;
        const color=u.side==="player"?"#e0c57b":"#7b342b";
        c.save();c.translate(u.x,u.y);
        c.globalAlpha=u.routed?.5:1;
        c.fillStyle=color;
        if(u.type==="chariot"){
          // Stylized two-horse chariot: readable at tactical zoom without pretending to be archaeological reconstruction.
          c.fillRect(-18,-8,36,16);
          c.strokeStyle="#2a2118";c.lineWidth=2.4;
          c.beginPath();c.arc(-12,11,6,0,Math.PI*2);c.arc(12,11,6,0,Math.PI*2);c.stroke();
          c.fillStyle=u.side==="player"?"#c8b276":"#693028";
          c.beginPath();c.moveTo(18,-7);c.lineTo(31,-13);c.lineTo(29,-2);c.closePath();c.fill();
          c.beginPath();c.moveTo(18,5);c.lineTo(32,1);c.lineTo(29,11);c.closePath();c.fill();
          c.strokeStyle="#39291b";c.lineWidth=1.4;
          c.beginPath();c.moveTo(14,-3);c.lineTo(30,-8);c.moveTo(14,3);c.lineTo(30,6);c.stroke();
        }else{
          c.fillStyle="rgba(35,28,20,.42)";
          c.fillRect(-u.width/2,-u.height/2,u.width,u.height);
          c.strokeStyle="#2d251d";c.lineWidth=1;c.strokeRect(-u.width/2,-u.height/2,u.width,u.height);
          const cols=5,rows=3,total=Math.max(1,Math.round(cols*rows*frac));
          let drawn=0;
          for(let ry=0;ry<rows;ry++){
            for(let rx=0;rx<cols;rx++){
              if(drawn++>=total)break;
              const sx=-u.width/2+6+rx*7.3,sy=-u.height/2+6+ry*8.5;
              c.fillStyle=color;c.beginPath();c.arc(sx,sy,2.5,0,Math.PI*2);c.fill();
              c.strokeStyle=u.side==="player"?"#f0dfac":"#d8a49a";c.lineWidth=.8;
              if(u.type==="archer"){
                c.beginPath();c.arc(sx+2,sy+3,4,-1.4,1.4);c.stroke();
              }else if(u.type==="bronze_spear"){
                c.beginPath();c.moveTo(sx+2,sy+3);c.lineTo(sx+8,sy-4);c.stroke();
              }else if(u.type==="bronze_ge"||u.type==="royal_guard"){
                c.beginPath();c.moveTo(sx+1,sy+3);c.lineTo(sx+6,sy-4);c.moveTo(sx+4,sy-2);c.lineTo(sx+8,sy);c.stroke();
              }else{
                c.beginPath();c.moveTo(sx+1,sy+3);c.lineTo(sx+5,sy-2);c.stroke();
              }
            }
          }
        }
        if(u.selected){c.strokeStyle="#fff1b5";c.lineWidth=3;c.strokeRect(-u.width/2-4,-u.height/2-4,u.width+8,u.height+8)}
        c.fillStyle="rgba(25,18,12,.85)";c.font="10px sans-serif";c.textAlign="center";
        c.fillText(GAME_DATA.units[u.type].short,u.type==="chariot"?0:0,u.height/2+14);
        c.textAlign="start";
        if(!u.routed){
          c.strokeStyle="rgba(255,239,190,.7)";c.lineWidth=1.2;
          c.beginPath();c.moveTo(0,0);c.lineTo(Math.cos(u.facing)*18,Math.sin(u.facing)*18);c.stroke();
        }
        if(u.routed){c.fillStyle="#2b1d17";c.font="bold 13px sans-serif";c.fillText("溃", -5,4)}
        c.restore();

        c.fillStyle="#241a12";c.fillRect(u.x-22,u.y-24,44,4);
        c.fillStyle=u.morale>45?"#d9c16e":u.morale>20?"#bd824c":"#8a4039";
        c.fillRect(u.x-22,u.y-24,44*Math.max(0,u.morale)/100,4);
      });
    }

    drawTerrain(c){
      for(const z of this.terrainZones){
        if(z.type==="forest"){
          c.fillStyle="rgba(45,73,44,.7)";c.fillRect(z.x,z.y,z.w,z.h);
          c.fillStyle="rgba(28,50,29,.8)";
          for(let i=0;i<18;i++){const x=z.x+(i*37%z.w),y=z.y+(i*61%z.h);c.beginPath();c.arc(x,y,9,0,Math.PI*2);c.fill()}
        } else if(z.type==="hill"){
          c.fillStyle="rgba(116,88,52,.45)";c.beginPath();c.ellipse(z.x+z.w/2,z.y+z.h/2,z.w/2,z.h/2,0,0,Math.PI*2);c.fill();
        } else if(z.type==="river"){
          c.fillStyle="rgba(45,103,123,.88)";
          c.fillRect(z.x,z.y,z.w,z.h);
          c.strokeStyle="rgba(163,206,208,.8)";c.lineWidth=3;
          c.beginPath();c.moveTo(z.x+3,z.y);c.lineTo(z.x+3,z.y+z.h);
          c.moveTo(z.x+z.w-3,z.y);c.lineTo(z.x+z.w-3,z.y+z.h);c.stroke();
        } else if(z.type==="ford"){
          c.fillStyle="rgba(161,151,103,.75)";c.fillRect(z.x,z.y,z.w,z.h);
          c.strokeStyle="rgba(222,204,150,.85)";c.lineWidth=2;
          for(let yy=z.y+12;yy<z.y+z.h;yy+=18){
            c.beginPath();c.moveTo(z.x+4,yy);c.lineTo(z.x+z.w-4,yy);c.stroke();
          }
          c.fillStyle="#f6e7bd";c.font="bold 13px sans-serif";
          c.fillText("渡口",z.x+4,z.y+18);
        } else if(z.type==="mud"){
          c.fillStyle="rgba(75,68,52,.58)";c.fillRect(z.x,z.y,z.w,z.h);
        } else if(z.type==="field"){
          c.fillStyle="rgba(164,139,73,.3)";c.fillRect(z.x,z.y,z.w,z.h);
          c.strokeStyle="rgba(82,63,35,.25)";
          for(let y=z.y;y<z.y+z.h;y+=13){c.beginPath();c.moveTo(z.x,y);c.lineTo(z.x+z.w,y);c.stroke()}
        } else if(z.type==="ditch"){
          c.fillStyle="rgba(49,45,34,.7)";
          c.fillRect(z.x,z.y,z.w,z.gateY-z.gateHalf-z.y);
          c.fillRect(z.x,z.gateY+z.gateHalf,z.w,(z.y+z.h)-(z.gateY+z.gateHalf));
        } else if(z.type==="rampart"){
          c.fillStyle="rgba(103,72,42,.88)";
          c.fillRect(z.x,z.y,z.w,z.gateY-z.gateHalf-z.y);
          c.fillRect(z.x,z.gateY+z.gateHalf,z.w,(z.y+z.h)-(z.gateY+z.gateHalf));
          c.strokeStyle="rgba(222,190,130,.45)";c.lineWidth=2;
          c.strokeRect(z.x,z.y,z.w,z.gateY-z.gateHalf-z.y);
          c.strokeRect(z.x,z.gateY+z.gateHalf,z.w,(z.y+z.h)-(z.gateY+z.gateHalf));
          c.fillStyle="rgba(61,39,24,.92)";c.fillRect(z.x-4,z.gateY-z.gateHalf, z.w+8,z.gateHalf*2);
          c.fillStyle="rgba(238,214,164,.6)";c.font="12px sans-serif";c.fillText("门",z.x+z.w/2-6,z.gateY+4);
        }
      }
    }
  }


  // Tactical presentation layer v1.11: battlefield atlas, readable formations,
  // command roster, minimap, camera controls and combat effects.
  const _baseBattle = {
    start:BattleEngine.prototype.start,
    resize:BattleEngine.prototype.resize,
    buildArmy:BattleEngine.prototype.buildArmy,
    draw:BattleEngine.prototype.draw,
    drawTerrain:BattleEngine.prototype.drawTerrain,
    update:BattleEngine.prototype.update,
    point:BattleEngine.prototype.point,
    handleClick:BattleEngine.prototype.handleClick,
    handleOrder:BattleEngine.prototype.handleOrder,
    rangedAttack:BattleEngine.prototype.rangedAttack,
    meleeAttack:BattleEngine.prototype.meleeAttack,
    updateDetail:BattleEngine.prototype.updateDetail
  };

  BattleEngine.prototype.start=function(config){
    this.camera={zoom:1,panX:0,panY:0};
    this.effects=[];
    this.projectiles=[];
    this.clock=0;
    this.hudClock=0;
    this.commandNotice="";
    this.suppressClick=false;
    _baseBattle.start.call(this,config);
    this.renderBattleHud(true);
  };

  BattleEngine.prototype.resize=function(){
    _baseBattle.resize.call(this);
    if(this.config&&this.terrainZones&&this.terrainZones.length){
      this.terrainZones.forEach(z=>{
        if(z.type==="rampart"||z.type==="ditch"){
          z.gateY=this.h*.5;
        }
      });
    }
  };

  BattleEngine.prototype.buildArmy=function(army,side,isAttacker){
    const first=this.units.length;
    _baseBattle.buildArmy.call(this,army,side,isAttacker);
    const created=this.units.slice(first);
    const direction=side==="player"?1:-1;
    const spacingX=Math.min(92,this.w*.061);
    const spacingY=Math.min(84,this.h*.115);
    const baseX=side==="player"?this.w*.225:this.w*.775;
    const baseY=this.h*.235;
    created.forEach((u,i)=>{
      const row=i%5;
      const col=Math.floor(i/5);
      u.x=baseX+direction*col*spacingX;
      u.y=baseY+row*spacingY+(col%2)*9;
      u.guardX=u.x;u.guardY=u.y;
      u.width=u.type==="chariot"?94:82;
      u.height=u.type==="chariot"?58:56;
      u.formation="line";
      u.reforming=false;
      if(this.config.ambushArmyId){
        if(army.id===this.config.ambushArmyId){
          u.morale=Math.min(95,u.morale+10);
          u.order=Math.min(95,u.order+8);
        }else{
          u.morale=Math.max(18,u.morale-12);
          u.order=Math.max(15,u.order-9);
        }
      }
    });
  };

  BattleEngine.prototype.buildTerrain=function(kind,siege){
    const w=this.w||1200,h=this.h||720;
    const zones=[];
    if(kind==="plain"){
      zones.push({type:"field",x:w*.10,y:h*.50,w:w*.31,h:h*.30});
      zones.push({type:"forest",x:w*.65,y:h*.13,w:w*.20,h:h*.30});
      zones.push({type:"hill",x:w*.38,y:h*.12,w:w*.17,h:h*.19});
      zones.push({type:"scrub",x:w*.48,y:h*.66,w:w*.17,h:h*.16});
    }else if(kind==="rolling"){
      zones.push({type:"hill",x:w*.27,y:h*.12,w:w*.24,h:h*.25});
      zones.push({type:"hill",x:w*.57,y:h*.48,w:w*.23,h:h*.25});
      zones.push({type:"forest",x:w*.70,y:h*.10,w:w*.16,h:h*.24});
      zones.push({type:"field",x:w*.12,y:h*.55,w:w*.25,h:h*.23});
    }else if(kind==="hill"||kind==="highland"){
      zones.push({type:"hill",x:w*.26,y:h*.10,w:w*.29,h:h*.31});
      zones.push({type:"hill",x:w*.54,y:h*.45,w:w*.28,h:h*.30});
      zones.push({type:"forest",x:w*.59,y:h*.12,w:w*.24,h:h*.28});
      zones.push({type:"forest",x:w*.10,y:h*.59,w:w*.20,h:h*.23});
      zones.push({type:"scrub",x:w*.40,y:h*.68,w:w*.19,h:h*.14});
    }else if(kind==="river"){
      zones.push({type:"field",x:w*.10,y:h*.12,w:w*.27,h:h*.25});
      zones.push({type:"field",x:w*.63,y:h*.60,w:w*.24,h:h*.23});
      zones.push({type:"river",x:w*.455,y:0,w:w*.09,h:h});
      zones.push({type:"ford",x:w*.455,y:h*.40,w:w*.09,h:h*.20});
      zones.push({type:"mud",x:w*.395,y:h*.07,w:w*.06,h:h*.86});
      zones.push({type:"mud",x:w*.545,y:h*.07,w:w*.06,h:h*.86});
      zones.push({type:"forest",x:w*.72,y:h*.10,w:w*.15,h:h*.22});
    }else{
      zones.push({type:"field",x:w*.18,y:h*.28,w:w*.26,h:h*.32});
      zones.push({type:"forest",x:w*.68,y:h*.18,w:w*.17,h:h*.24});
    }
    if(siege){
      zones.push({type:"ditch",x:w*.625,y:h*.08,w:w*.035,h:h*.84,gateY:h*.50,gateHalf:70});
      zones.push({type:"rampart",x:w*.67,y:h*.08,w:w*.055,h:h*.84,gateY:h*.50,gateHalf:62});
      zones.push({type:"scrub",x:w*.40,y:h*.70,w:w*.18,h:h*.12});
    }
    this.terrainZones=zones;
  };

  BattleEngine.prototype.renderBattleHud=function(force){
    if(!this.config)return;
    const player=this.units.filter(u=>u.side==="player");
    const enemy=this.units.filter(u=>u.side==="enemy");
    const alive=list=>list.filter(u=>u.men>0&&!u.routed);
    const total=list=>list.reduce((n,u)=>n+Math.max(0,u.men),0);
    const playerRoster=document.getElementById("battle-player-roster");
    const enemyRoster=document.getElementById("battle-enemy-roster");
    const title=document.getElementById("battle-location-title");
    const clock=document.getElementById("battle-clock");
    const field=document.getElementById("battle-field-label");
    if(title)title.textContent=this.config.locationName||"野外战场";
    if(field)field.textContent=this.config.terrainName||"地形未明";
    if(clock){
      const mins=Math.floor(this.clock/60),secs=Math.floor(this.clock%60);
      clock.textContent="战斗时间 "+String(mins).padStart(2,"0")+":"+String(secs).padStart(2,"0");
    }
    if(this.status){
      this.status.textContent=(this.config.locationName||"野外战场")+" · "+(this.config.terrainName||"地形")+
        " · 我军 "+fmtBattle(total(player))+" / 敌军 "+fmtBattle(total(enemy))+" · "+
        (this.paused?"战场暂停":"实时交战")+(this.commandNotice?" · "+this.commandNotice:"");
    }
    const rosterHtml=(list,side)=>list.map(u=>{
      const morale=Math.max(0,Math.min(100,u.morale));
      const selected=u===this.selected;
      const state=u.men<=0?"全灭":u.routed?"溃逃":u.engaged?"接战":u.moving?"机动":u.orderMode==="hold"?"固守":"待命";
      return '<button type="button" class="battle-roster-card '+side+(selected?" selected":"")+(u.routed?" routed":"")+
        '" data-battle-unit="'+u.uid+'"><span class="battle-roster-symbol">'+(u.type==="chariot"?"车":u.type==="archer"?"弓":u.type==="bronze_spear"?"矛":"兵")+
        '</span><span class="battle-roster-copy"><b>'+u.name+'</b><small>'+fmtBattle(u.men)+' / '+fmtBattle(u.maxMen)+' 人 · '+state+
        '</small><i class="battle-roster-bar"><em style="width:'+morale+'%"></em></i></span></button>';
    }).join("");
    if(playerRoster&& (force||!playerRoster.dataset.ready)){
      playerRoster.innerHTML=rosterHtml(player,"player");
      playerRoster.dataset.ready="1";
    }else if(playerRoster){
      const selectedId=this.selected&&this.selected.uid;
      playerRoster.innerHTML=rosterHtml(player,"player");
      playerRoster.dataset.ready="1";
      if(selectedId)this.selected=this.units.find(u=>u.uid===selectedId)||null;
    }
    if(enemyRoster){
      enemyRoster.innerHTML=rosterHtml(enemy,"enemy");
      enemyRoster.dataset.ready="1";
    }
    const playerCount=document.getElementById("battle-player-strength");
    const enemyCount=document.getElementById("battle-enemy-strength");
    if(playerCount)playerCount.textContent=fmtBattle(total(player))+" 人";
    if(enemyCount)enemyCount.textContent=fmtBattle(total(enemy))+" 人";
    this.updateDetail();
  };

  function fmtBattle(n){
    return Math.max(0,Math.round(n)).toLocaleString("zh-CN");
  }

  BattleEngine.prototype.selectBattleUnit=function(unit){
    if(!unit||unit.side!=="player"||unit.men<=0)return;
    this.selected=unit;
    this.units.forEach(u=>u.selected=u===unit);
    this.updateDetail();
    this.renderBattleHud(true);
  };

  BattleEngine.prototype.commandSelected=function(command){
    const u=this.selected;
    if(!this.running||!u||u.routed||u.men<=0){
      if(this.status)this.status.textContent="先选择一支尚能作战的我方部队。";
      return;
    }
    const enemies=this.units.filter(x=>x.side==="enemy"&&x.men>0&&!x.routed);
    if(command==="charge"){
      if(!enemies.length)return;
      const target=enemies.reduce((a,b)=>
        Math.hypot(a.x-u.x,a.y-u.y)<=Math.hypot(b.x-u.x,b.y-u.y)?a:b);
      u.orderMode="manual";u.targetEnemy=target;u.tx=null;u.ty=null;u.reforming=false;
      this.status.textContent=u.name+"：冲锋接敌，目标 "+target.name;
    }else if(command==="flank"){
      if(!enemies.length)return;
      const target=enemies.reduce((a,b)=>
        Math.hypot(a.x-u.x,a.y-u.y)<=Math.hypot(b.x-u.x,b.y-u.y)?a:b);
      const side=u.aiFlankSign||1;
      u.tx=Math.max(35,Math.min(this.w-35,target.x-Math.cos(target.facing)*66-Math.sin(target.facing)*88*side));
      u.ty=Math.max(35,Math.min(this.h-35,target.y-Math.sin(target.facing)*66+Math.cos(target.facing)*88*side));
      u.targetEnemy=null;u.orderMode="move";u.guardX=u.tx;u.guardY=u.ty;u.reforming=false;
      this.status.textContent=u.name+"：向 "+target.name+" 侧翼迂回。";
    }else if(command==="hold"){
      u.orderMode="hold";u.targetEnemy=null;u.tx=null;u.ty=null;u.guardX=u.x;u.guardY=u.y;u.reforming=false;
      this.status.textContent=u.name+"：原地坚守阵线。";
    }else if(command==="reform"){
      u.orderMode="hold";u.targetEnemy=null;u.tx=null;u.ty=null;u.guardX=u.x;u.guardY=u.y;
      u.reforming=true;u.formation="line";
      this.status.textContent=u.name+"：整队重整，暂缓主动接战。";
    }
    this.commandNotice=this.status?this.status.textContent:"";
    this.renderBattleHud(true);
  };

  BattleEngine.prototype.point=function(e){
    const r=this.canvas.getBoundingClientRect();
    const sx=e.clientX-r.left,sy=e.clientY-r.top;
    const cam=this.camera||{zoom:1,panX:0,panY:0};
    return {
      x:(sx-this.w/2-cam.panX)/cam.zoom+this.w/2,
      y:(sy-this.h/2-cam.panY)/cam.zoom+this.h/2
    };
  };

  BattleEngine.prototype.handleClick=function(e){
    if(this.suppressClick){this.suppressClick=false;return;}
    _baseBattle.handleClick.call(this,e);
    this.renderBattleHud(true);
  };

  BattleEngine.prototype.handleOrder=function(e){
    _baseBattle.handleOrder.call(this,e);
    this.commandNotice=this.selected?this.selected.name+"：已下达战术命令。":"已下达战术命令。";
    this.renderBattleHud(true);
  };

  BattleEngine.prototype.updateDetail=function(){
    const title=document.getElementById("battle-selected-title");
    if(!this.selected||!this.running){
      if(title)title.textContent="未选择部队";
      if(this.detail)this.detail.innerHTML="左键选择军阵；右键地面移动，右键敌军攻击。可用下方命令进行冲锋、迂回和整队。";
      return;
    }
    const u=this.selected;
    if(title)title.textContent=u.name+" · "+(GAME_DATA.units[u.type]?.name||u.type);
    if(this.detail){
      const state=u.routed?"溃逃":u.engaged?"近战接触":u.moving?"正在机动":u.reforming?"整队中":"保持阵线";
      this.detail.innerHTML='<b>'+fmtBattle(u.men)+' / '+fmtBattle(u.maxMen)+' 人</b>'+
        '<span class="battle-stat-chip">士气 '+Math.round(u.morale)+'</span>'+
        '<span class="battle-stat-chip">队形 '+Math.round(u.order)+'</span>'+
        '<span class="battle-stat-chip">疲劳 '+Math.round(u.fatigue)+'</span>'+
        '<span class="battle-stat-chip '+(u.routed?"bad":u.engaged?"warning":"good")+'">'+state+'</span>';
    }
  };

  BattleEngine.prototype.update=function(dt){
    _baseBattle.update.call(this,dt);
    this.clock=(this.clock||0)+dt;
    (this.projectiles||[]).forEach(p=>p.t+=dt*2.4);
    this.projectiles=(this.projectiles||[]).filter(p=>p.t<1);
    (this.effects||[]).forEach(e=>e.life-=dt);
    this.effects=(this.effects||[]).filter(e=>e.life>0);
    this.units.forEach(u=>{
      if(u.reforming&&!u.engaged&&!u.moving&&!u.routed){
        u.order=Math.min(95,u.order+dt*5.5);
        if(u.order>=88)u.reforming=false;
      }
    });
    this.hudClock=(this.hudClock||0)+dt;
    if(this.hudClock>.45){this.hudClock=0;this.renderBattleHud(false);}
  };

  BattleEngine.prototype.rangedAttack=function(a,d){
    _baseBattle.rangedAttack.call(this,a,d);
    this.projectiles=this.projectiles||[];
    this.projectiles.push({x:a.x,y:a.y,tx:d.x,ty:d.y,t:0,side:a.side});
    this.addBattleEffect(d.x,d.y,"impact",.42);
  };

  BattleEngine.prototype.meleeAttack=function(a,d){
    const before=d.men;
    _baseBattle.meleeAttack.call(this,a,d);
    if(d.men<before)this.addBattleEffect((a.x+d.x)/2,(a.y+d.y)/2,"clash",.32);
    if(d.men<=0)this.addBattleEffect(d.x,d.y,"rout",.9);
  };

  BattleEngine.prototype.addBattleEffect=function(x,y,type,life){
    this.effects=this.effects||[];
    this.effects.push({x,y,type,life,maxLife:life,seed:this.effects.length*17+Math.round(x+y)});
  };

  BattleEngine.prototype.drawTerrain=function(c){
    const w=this.w,h=this.h;
    const ground=c.createLinearGradient(0,0,w,h);
    ground.addColorStop(0,"#9a916b");
    ground.addColorStop(.48,"#8c805c");
    ground.addColorStop(1,"#6d7050");
    c.fillStyle=ground;c.fillRect(0,0,w,h);

    // Deterministic ground texture: grass, stones, wheel ruts and subtle elevation contours.
    for(let i=0;i<680;i++){
      const x=(i*97+31)%w,y=(i*173+19)%h;
      const len=2+(i%5);
      c.strokeStyle=i%4===0?"rgba(40,55,33,.20)":"rgba(225,210,161,.15)";
      c.lineWidth=i%7===0?1.4:.8;
      c.beginPath();c.moveTo(x,y);c.lineTo(x+len,y-1.8);c.stroke();
      if(i%13===0){
        c.fillStyle="rgba(50,43,31,.17)";
        c.beginPath();c.ellipse(x+9,y+4,2.6,1.4,.3,0,Math.PI*2);c.fill();
      }
    }
    for(let i=0;i<13;i++){
      const x=(i*211+65)%w,y=(i*137+48)%h,rx=70+(i%4)*32,ry=16+(i%3)*9;
      c.strokeStyle="rgba(226,211,164,.12)";c.lineWidth=1.1;
      c.beginPath();c.ellipse(x,y,rx,ry,(i%5)*.17,0,Math.PI*2);c.stroke();
    }

    for(const z of this.terrainZones){
      if(z.type==="forest"){
        c.save();
        c.fillStyle="rgba(35,55,35,.50)";
        c.beginPath();c.ellipse(z.x+z.w*.52,z.y+z.h*.52,z.w*.54,z.h*.52,-.15,0,Math.PI*2);c.fill();
        for(let i=0;i<54;i++){
          const x=z.x+((i*43+17)%Math.max(1,z.w)),y=z.y+((i*67+9)%Math.max(1,z.h));
          const r=7+(i%5)*2.2;
          c.fillStyle="rgba(20,37,25,.28)";c.beginPath();c.ellipse(x+3,y+5,r*1.15,r*.56,0,0,Math.PI*2);c.fill();
          c.fillStyle=i%3===0?"#3f5a38":i%3===1?"#526c43":"#344d34";
          c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();
          c.fillStyle="rgba(159,159,103,.25)";c.beginPath();c.arc(x-r*.25,y-r*.3,r*.45,0,Math.PI*2);c.fill();
          c.fillStyle="#4b3b27";c.fillRect(x-1.2,y+r*.35,2.4,5);
        }
        c.restore();
      }else if(z.type==="hill"){
        c.save();
        const hx=z.x+z.w*.5,hy=z.y+z.h*.5;
        c.fillStyle="rgba(53,48,34,.19)";c.beginPath();c.ellipse(hx+10,hy+13,z.w*.52,z.h*.48,-.18,0,Math.PI*2);c.fill();
        c.fillStyle="#95875f";c.beginPath();c.ellipse(hx,hy,z.w*.5,z.h*.48,-.18,0,Math.PI*2);c.fill();
        c.fillStyle="rgba(184,166,116,.46)";c.beginPath();c.ellipse(hx-z.w*.06,hy-z.h*.10,z.w*.37,z.h*.32,-.18,0,Math.PI*2);c.fill();
        for(let k=0;k<4;k++){
          c.strokeStyle="rgba(67,68,47,.26)";c.lineWidth=1.2;
          c.beginPath();c.ellipse(hx,hy,z.w*(.43-k*.075),z.h*(.40-k*.065),-.18,0,Math.PI*2);c.stroke();
        }
        c.restore();
      }else if(z.type==="river"){
        const cx=z.x+z.w*.5;
        c.save();
        c.lineCap="round";c.lineJoin="round";
        c.beginPath();c.moveTo(cx,0);c.bezierCurveTo(cx+z.w*.9,h*.22,cx-z.w*.55,h*.48,cx+z.w*.32,h*.72);c.bezierCurveTo(cx+z.w*.75,h*.88,cx-z.w*.12,h*.94,cx,h);
        c.strokeStyle="rgba(91,70,43,.40)";c.lineWidth=z.w*1.5;c.stroke();
        c.strokeStyle="#477e87";c.lineWidth=z.w*1.05;c.stroke();
        c.strokeStyle="rgba(161,204,199,.55)";c.lineWidth=3;c.stroke();
        for(let i=0;i<20;i++){
          const yy=(i*47)%h,xx=cx+Math.sin(i*.7)*z.w*.35;
          c.strokeStyle="rgba(220,230,205,.28)";c.lineWidth=1.2;
          c.beginPath();c.moveTo(xx-8,yy);c.lineTo(xx+9,yy+2);c.stroke();
        }
        c.restore();
      }else if(z.type==="ford"){
        c.save();
        c.fillStyle="rgba(178,159,105,.82)";
        c.beginPath();c.ellipse(z.x+z.w*.5,z.y+z.h*.5,z.w*.75,z.h*.55,0,0,Math.PI*2);c.fill();
        for(let i=0;i<18;i++){
          const x=z.x+((i*13)%Math.max(1,z.w)),y=z.y+((i*19)%Math.max(1,z.h));
          c.fillStyle=i%2?"#c4b384":"#897f5d";
          c.beginPath();c.ellipse(x,y,3+(i%3),2+(i%2),.2,0,Math.PI*2);c.fill();
        }
        c.fillStyle="#f2e2bc";c.font="bold 12px sans-serif";c.fillText("浅滩 · 可涉渡",z.x+z.w+8,z.y+z.h*.52);
        c.restore();
      }else if(z.type==="mud"){
        c.fillStyle="rgba(64,61,46,.28)";
        c.beginPath();c.ellipse(z.x+z.w*.5,z.y+z.h*.5,z.w*.72,z.h*.5,0,0,Math.PI*2);c.fill();
        for(let i=0;i<35;i++){
          const x=z.x+((i*29)%Math.max(1,z.w)),y=z.y+((i*53)%Math.max(1,z.h));
          c.fillStyle="rgba(42,39,30,.18)";c.beginPath();c.ellipse(x,y,5+(i%4)*2,2+(i%3),.3,0,Math.PI*2);c.fill();
        }
      }else if(z.type==="field"){
        c.save();
        c.fillStyle="rgba(178,157,91,.20)";
        c.beginPath();c.ellipse(z.x+z.w*.5,z.y+z.h*.5,z.w*.56,z.h*.55,-.1,0,Math.PI*2);c.fill();
        c.strokeStyle="rgba(83,68,38,.27)";c.lineWidth=1.1;
        for(let y=z.y+8;y<z.y+z.h;y+=14){
          c.beginPath();c.moveTo(z.x+5,y);c.quadraticCurveTo(z.x+z.w*.5,y-7,z.x+z.w-5,y+2);c.stroke();
        }
        c.restore();
      }else if(z.type==="scrub"){
        for(let i=0;i<40;i++){
          const x=z.x+((i*31)%Math.max(1,z.w)),y=z.y+((i*47)%Math.max(1,z.h));
          c.fillStyle=i%2?"rgba(55,72,42,.55)":"rgba(100,105,63,.45)";
          c.beginPath();c.ellipse(x,y,5+(i%4)*2,3+(i%3),.3,0,Math.PI*2);c.fill();
        }
      }else if(z.type==="ditch"){
        c.fillStyle="rgba(48,42,31,.78)";
        c.fillRect(z.x,z.y,z.w,z.gateY-z.gateHalf-z.y);
        c.fillRect(z.x,z.gateY+z.gateHalf,z.w,(z.y+z.h)-(z.gateY+z.gateHalf));
        c.strokeStyle="rgba(203,183,137,.45)";c.lineWidth=2;
        c.beginPath();c.moveTo(z.x,z.y);c.lineTo(z.x,z.gateY-z.gateHalf);c.moveTo(z.x,z.gateY+z.gateHalf);c.lineTo(z.x,z.y+z.h);c.stroke();
      }else if(z.type==="rampart"){
        const top=z.y,bottom=z.y+z.h;
        c.fillStyle="#735638";
        c.fillRect(z.x,top,z.w,z.gateY-z.gateHalf-top);
        c.fillRect(z.x,z.gateY+z.gateHalf,z.w,bottom-(z.gateY+z.gateHalf));
        c.fillStyle="#b18a55";
        c.fillRect(z.x-3,top,z.w+6,8);
        c.fillRect(z.x-3,z.gateY+z.gateHalf,z.w+6,8);
        c.strokeStyle="rgba(225,199,148,.6)";c.lineWidth=1.4;
        for(let y=top+12;y<z.gateY-z.gateHalf;y+=17){
          c.beginPath();c.moveTo(z.x,y);c.lineTo(z.x+z.w,y);c.stroke();
        }
        for(let y=z.gateY+z.gateHalf+12;y<bottom;y+=17){
          c.beginPath();c.moveTo(z.x,y);c.lineTo(z.x+z.w,y);c.stroke();
        }
        c.fillStyle="#39291c";c.fillRect(z.x-5,z.gateY-z.gateHalf,z.w+10,z.gateHalf*2);
        c.fillStyle="#d6b67c";c.font="bold 13px sans-serif";c.fillText("城门",z.x-4,z.gateY+5);
      }
    }
    // Faint wheel ruts and footpaths add scale and give the field a lived-in feel.
    c.save();
    c.strokeStyle="rgba(65,53,35,.19)";c.lineWidth=4;
    c.beginPath();c.moveTo(w*.06,h*.79);c.bezierCurveTo(w*.29,h*.64,w*.52,h*.81,w*.93,h*.32);c.stroke();
    c.strokeStyle="rgba(220,203,155,.17)";c.lineWidth=1.2;
    c.beginPath();c.moveTo(w*.06,h*.79);c.bezierCurveTo(w*.29,h*.64,w*.52,h*.81,w*.93,h*.32);c.stroke();
    c.restore();
  };

  function drawBattleSoldier(c,x,y,color,metal,weapon){
    c.save();
    c.fillStyle="rgba(24,20,14,.28)";
    c.beginPath();c.ellipse(x+1.4,y+3.2,4.8,3.1,.15,0,Math.PI*2);c.fill();
    c.fillStyle=color;c.beginPath();c.ellipse(x,y,3.1,4.6,.15,0,Math.PI*2);c.fill();
    c.fillStyle=metal;c.beginPath();c.arc(x+1.4,y-3.2,2.6,0,Math.PI*2);c.fill();
    c.strokeStyle="rgba(235,216,169,.8)";c.lineWidth=.85;
    c.beginPath();c.moveTo(x+2,y-5);c.lineTo(x+4,y-7);c.stroke();
    if(weapon==="bow"){
      c.strokeStyle="#dfc99a";c.lineWidth=1.1;c.beginPath();c.arc(x+5,y+1,4,-1.3,1.3);c.stroke();
    }else{
      c.fillStyle=color;c.beginPath();c.roundRect?c.roundRect(x+1,y-1,3.2,6,1):c.rect(x+1,y-1,3.2,6);c.fill();
      c.strokeStyle=weapon==="ge"?"#c6b27e":"#d8d0b9";c.lineWidth=1;
      c.beginPath();c.moveTo(x+4,y-2);c.lineTo(x+12,y-10);c.stroke();
      c.fillStyle="#d8d0b9";c.beginPath();c.arc(x+12,y-10,1.2,0,Math.PI*2);c.fill();
    }
    c.restore();
  }

  function drawBattleChariot(c,u,color){
    c.save();
    c.translate(u.x,u.y);c.rotate(u.facing);
    c.fillStyle="rgba(18,16,12,.35)";
    c.beginPath();c.ellipse(1,9,47,23,0,0,Math.PI*2);c.fill();
    // Pair of horses with articulated legs, necks and heads.
    [-12,12].forEach(y=>{
      c.fillStyle=u.side==="player"?"#9a7449":"#5e4035";
      c.beginPath();c.ellipse(28,y,18,6.5,-.1,0,Math.PI*2);c.fill();
      c.beginPath();c.moveTo(39,y-3);c.lineTo(48,y-8);c.lineTo(51,y-5);c.lineTo(45,y+1);c.closePath();c.fill();
      c.fillStyle="#2b241b";c.beginPath();c.arc(50,y-6,1.3,0,Math.PI*2);c.fill();
      c.strokeStyle="#392c20";c.lineWidth=2;
      c.beginPath();c.moveTo(20,y+4);c.lineTo(18,y+12);c.moveTo(33,y+4);c.lineTo(35,y+12);c.stroke();
      c.strokeStyle="#c7a77a";c.lineWidth=1.3;
      c.beginPath();c.moveTo(12,y-2);c.lineTo(42,y-3);c.stroke();
    });
    c.strokeStyle="#3c2c1c";c.lineWidth=3;c.beginPath();c.moveTo(5,-12);c.lineTo(23,-12);c.moveTo(5,12);c.lineTo(23,12);c.stroke();
    c.fillStyle=color;c.strokeStyle="#e3c995";c.lineWidth=1.8;
    c.beginPath();c.roundRect?c.roundRect(-24,-17,32,34,4):c.rect(-24,-17,32,34);c.fill();c.stroke();
    [-17,1].forEach(x=>{
      c.strokeStyle="#34271b";c.lineWidth=3;c.beginPath();c.arc(x,20,8,0,Math.PI*2);c.stroke();
      c.strokeStyle="#d4b77f";c.lineWidth=1.2;c.beginPath();c.arc(x,20,4,0,Math.PI*2);c.stroke();
      c.beginPath();c.moveTo(x-7,20);c.lineTo(x+7,20);c.moveTo(x,13);c.lineTo(x,27);c.stroke();
    });
    c.fillStyle="#d7c08a";c.beginPath();c.arc(-8,-2,4,0,Math.PI*2);c.fill();
    c.strokeStyle="#ead8ad";c.lineWidth=2;c.beginPath();c.moveTo(-8,-4);c.lineTo(1,-18);c.stroke();
    c.restore();
  }

  function drawBattleFormation(c,u){
    if(u.men<=0)return;
    const color=u.side==="player"?"#b18c50":"#833f35";
    const metal=u.side==="player"?"#d5bd82":"#b77b69";
    if(u.type==="chariot"){
      drawBattleChariot(c,u,color);
    }else{
      c.save();
      c.translate(u.x,u.y);c.rotate(u.facing);
      c.globalAlpha=u.routed?.48:1;
      c.fillStyle="rgba(24,19,13,.25)";
      c.beginPath();c.ellipse(0,2,39,31,0,0,Math.PI*2);c.fill();
      c.fillStyle=u.side==="player"?"rgba(183,151,88,.28)":"rgba(133,61,51,.30)";
      c.strokeStyle=u.selected?"#fff0b2":"rgba(40,31,22,.8)";
      c.lineWidth=u.selected?2.5:1.2;
      c.beginPath();c.roundRect?c.roundRect(-23,-29,47,58,7):c.rect(-23,-29,47,58);c.fill();c.stroke();
      const cols=7,rows=4,total=Math.max(1,Math.ceil(cols*rows*(u.men/u.maxMen)));
      let n=0;
      for(let row=0;row<rows;row++){
        for(let col=0;col<cols;col++){
          if(n++>=total)break;
          const x=-15+col*7.1,y=-22+row*14.2;
          const weapon=u.type==="archer"?"bow":u.type==="bronze_ge"||u.type==="royal_guard"?"ge":"spear";
          drawBattleSoldier(c,x,y,color,metal,weapon);
        }
      }
      // Command pennant and unit banner.
      c.strokeStyle="#3c2c1b";c.lineWidth=2;
      c.beginPath();c.moveTo(-20,-24);c.lineTo(-20,-48);c.stroke();
      c.fillStyle=u.side==="player"?"#d5b56e":"#963f32";
      c.beginPath();c.moveTo(-20,-48);c.lineTo(-3,-43);c.lineTo(-20,-36);c.closePath();c.fill();
      c.fillStyle="#f4e3bf";c.font="bold 8px serif";c.textAlign="center";
      c.fillText(u.side==="player"?"商":"方",-13,-39);
      if(u.routed){
        c.fillStyle="#2b1d17";c.font="bold 12px sans-serif";c.fillText("溃",-2,4);
      }
      c.restore();
    }
    // Morale and strength bars float over each formation.
    c.save();
    c.translate(u.x,u.y);
    c.fillStyle="rgba(22,17,12,.78)";c.fillRect(-34,-43,68,5);
    c.fillStyle=u.side==="player"?"#d6bd79":"#a45445";c.fillRect(-34,-43,68*Math.max(0,u.men/u.maxMen),5);
    c.fillStyle="rgba(22,17,12,.82)";c.fillRect(-34,-36,68,3);
    c.fillStyle=u.morale>45?"#c9b56d":u.morale>20?"#c0834c":"#8d3e38";
    c.fillRect(-34,-36,68*Math.max(0,u.morale)/100,3);
    c.fillStyle="#f4e8c9";c.font="bold 10px sans-serif";c.textAlign="center";
    c.fillText(u.name,-1,45);
    if(u.selected){
      c.strokeStyle="#ffe7a0";c.lineWidth=2.2;c.setLineDash([5,3]);
      c.beginPath();c.ellipse(0,0,u.width*.62,u.height*.67,0,0,Math.PI*2);c.stroke();c.setLineDash([]);
    }
    if(u.engaged){
      c.fillStyle="#e7b56d";c.beginPath();c.arc(31,-42,4,0,Math.PI*2);c.fill();
    }
    c.restore();
  }

  BattleEngine.prototype.drawBattleEffects=function(c){
    (this.projectiles||[]).forEach(p=>{
      const x=p.x+(p.tx-p.x)*p.t,y=p.y+(p.ty-p.y)*p.t;
      const dx=p.tx-p.x,dy=p.ty-p.y,len=Math.max(1,Math.hypot(dx,dy));
      c.strokeStyle=p.side==="player"?"#f0dfad":"#d69b8c";c.lineWidth=1.8;
      c.beginPath();c.moveTo(x-dx/len*9,y-dy/len*9);c.lineTo(x+dx/len*2,y+dy/len*2);c.stroke();
      c.fillStyle="#eee0bd";c.beginPath();c.arc(x+dx/len*2,y+dy/len*2,1.6,0,Math.PI*2);c.fill();
    });
    (this.effects||[]).forEach(e=>{
      const q=Math.max(0,e.life/e.maxLife);
      c.save();c.globalAlpha=q;
      if(e.type==="clash"||e.type==="impact"){
        c.strokeStyle=e.type==="clash"?"#f5d48a":"#d9c99b";c.lineWidth=2;
        c.beginPath();c.arc(e.x,e.y,(1-q)*18+3,0,Math.PI*2);c.stroke();
        for(let i=0;i<5;i++){
          const a=i*1.256+e.seed*.01,r=(1-q)*13;
          c.fillStyle="#e8d5a4";c.fillRect(e.x+Math.cos(a)*r-1,e.y+Math.sin(a)*r-1,2,2);
        }
      }else{
        c.fillStyle="rgba(178,151,104,.65)";
        c.beginPath();c.ellipse(e.x,e.y,(1-q)*20+3,(1-q)*9+2,0,0,Math.PI*2);c.fill();
      }
      c.restore();
    });
  };

  BattleEngine.prototype.drawMinimap=function(){
    const map=document.getElementById("battle-minimap");
    if(!map)return;
    const c=map.getContext("2d"),w=map.width,h=map.height;
    c.clearRect(0,0,w,h);c.fillStyle="#7c795b";c.fillRect(0,0,w,h);
    this.terrainZones.forEach(z=>{
      const x=z.x/this.w*w,y=z.y/this.h*h,zw=z.w/this.w*w,zh=z.h/this.h*h;
      c.fillStyle=z.type==="river"?"#477d87":z.type==="forest"?"#355039":z.type==="hill"?"#a08c61":z.type==="mud"?"#5c5845":"rgba(197,174,116,.45)";
      c.fillRect(x,y,zw,zh);
    });
    this.units.forEach(u=>{
      if(u.men<=0)return;
      c.fillStyle=u.side==="player"?"#f0d48a":"#b65d4e";
      c.beginPath();c.arc(u.x/this.w*w,u.y/this.h*h,u.type==="chariot"?3.5:2.5,0,Math.PI*2);c.fill();
      if(u.selected){c.strokeStyle="#fff";c.lineWidth=1;c.beginPath();c.arc(u.x/this.w*w,u.y/this.h*h,5,0,Math.PI*2);c.stroke();}
    });
    c.strokeStyle="rgba(255,239,195,.7)";c.lineWidth=1;c.strokeRect(1,1,w-2,h-2);
  };

  BattleEngine.prototype.draw=function(){
    const c=this.ctx,w=this.w,h=this.h,cam=this.camera||{zoom:1,panX:0,panY:0};
    c.clearRect(0,0,w,h);
    c.save();
    c.translate(w/2+cam.panX,h/2+cam.panY);
    c.scale(cam.zoom,cam.zoom);
    c.translate(-w/2,-h/2);
    this.drawTerrain(c);
    // Deployment zones and battle direction marks.
    c.fillStyle="rgba(191,160,91,.08)";c.fillRect(0,0,w*.18,h);
    c.fillStyle="rgba(145,64,54,.08)";c.fillRect(w*.82,0,w*.18,h);
    c.strokeStyle="rgba(244,224,179,.15)";c.lineWidth=1;
    c.setLineDash([8,9]);c.beginPath();c.moveTo(w*.5,18);c.lineTo(w*.5,h-18);c.stroke();c.setLineDash([]);
    if(this.selected&&(this.selected.tx!==null||this.selected.targetEnemy)){
      const u=this.selected;
      const tx=u.targetEnemy?u.targetEnemy.x:u.tx,ty=u.targetEnemy?u.targetEnemy.y:u.ty;
      if(tx!==null&&ty!==null){
        c.strokeStyle="rgba(255,231,160,.78)";c.lineWidth=2;c.setLineDash([7,6]);
        c.beginPath();c.moveTo(u.x,u.y);c.lineTo(tx,ty);c.stroke();c.setLineDash([]);
      }
    }
    this.units.slice().sort((a,b)=>a.y-b.y).forEach(u=>drawBattleFormation(c,u));
    this.drawBattleEffects(c);
    // Soft edge vignette gives the field depth without obscuring units.
    const vignette=c.createRadialGradient(w*.5,h*.48,Math.min(w,h)*.18,w*.5,h*.48,Math.max(w,h)*.72);
    vignette.addColorStop(0,"rgba(12,15,11,0)");
    vignette.addColorStop(1,"rgba(12,15,11,.28)");
    c.fillStyle=vignette;c.fillRect(0,0,w,h);
    c.restore();
    this.drawMinimap();
  };

  // Camera: left-drag to pan, wheel to zoom around the cursor, minimap to recenter.
  const tacticalCanvas=document.getElementById("battle-canvas");
  tacticalCanvas.addEventListener("pointerdown",e=>{
    if(e.button!==0)return;
    const cam=window.BATTLE_ENGINE.camera;
    window.BATTLE_ENGINE.dragState={x:e.clientX,y:e.clientY,panX:cam.panX,panY:cam.panY};
    window.BATTLE_ENGINE.dragged=false;
  });
  tacticalCanvas.addEventListener("pointermove",e=>{
    const engine=window.BATTLE_ENGINE,drag=engine.dragState;
    if(!drag||!(e.buttons&1))return;
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    if(Math.hypot(dx,dy)>5)engine.dragged=true;
    if(engine.dragged){
      engine.camera.panX=drag.panX+dx;
      engine.camera.panY=drag.panY+dy;
    }
  });
  tacticalCanvas.addEventListener("pointerup",e=>{
    const engine=window.BATTLE_ENGINE;
    if(engine.dragged)engine.suppressClick=true;
    engine.dragState=null;
  });
  tacticalCanvas.addEventListener("pointercancel",()=>{
    const engine=window.BATTLE_ENGINE;engine.dragState=null;engine.suppressClick=false;
  });
  tacticalCanvas.addEventListener("wheel",e=>{
    e.preventDefault();
    const engine=window.BATTLE_ENGINE,rect=tacticalCanvas.getBoundingClientRect(),cam=engine.camera;
    const sx=e.clientX-rect.left,sy=e.clientY-rect.top;
    const before=engine.point(e),next=Math.max(.72,Math.min(1.75,cam.zoom*(e.deltaY<0?1.12:.89)));
    cam.zoom=next;
    const afterX=engine.w/2+(before.x-engine.w/2)*next;
    const afterY=engine.h/2+(before.y-engine.h/2)*next;
    cam.panX=sx-afterX;cam.panY=sy-afterY;
  },{passive:false});

  const playerRosterEl=document.getElementById("battle-player-roster");
  const enemyRosterEl=document.getElementById("battle-enemy-roster");
  [playerRosterEl,enemyRosterEl].forEach(el=>{
    if(!el)return;
    el.addEventListener("click",e=>{
      const card=e.target.closest("[data-battle-unit]");
      if(!card)return;
      const unit=window.BATTLE_ENGINE.units.find(u=>u.uid===card.dataset.battleUnit);
      if(unit&&unit.side==="player")window.BATTLE_ENGINE.selectBattleUnit(unit);
    });
  });

  const engine=()=>window.BATTLE_ENGINE;
  const byId=id=>document.getElementById(id);
  if(byId("battle-charge"))byId("battle-charge").onclick=()=>engine().commandSelected("charge");
  if(byId("battle-flank"))byId("battle-flank").onclick=()=>engine().commandSelected("flank");
  if(byId("battle-hold-selected"))byId("battle-hold-selected").onclick=()=>engine().commandSelected("hold");
  if(byId("battle-reform"))byId("battle-reform").onclick=()=>engine().commandSelected("reform");
  if(byId("battle-zoom-in"))byId("battle-zoom-in").onclick=()=>{engine().camera.zoom=Math.min(1.75,engine().camera.zoom*1.12);};
  if(byId("battle-zoom-out"))byId("battle-zoom-out").onclick=()=>{engine().camera.zoom=Math.max(.72,engine().camera.zoom*.89);};
  if(byId("battle-camera-reset"))byId("battle-camera-reset").onclick=()=>{engine().camera={zoom:1,panX:0,panY:0};};
  const mini=byId("battle-minimap");
  if(mini)mini.addEventListener("click",e=>{
    const r=mini.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*engine().w,y=(e.clientY-r.top)/r.height*engine().h;
    engine().camera.panX=-(x-engine().w/2)*engine().camera.zoom;
    engine().camera.panY=-(y-engine().h/2)*engine().camera.zoom;
  });

  window.BATTLE_ENGINE = new BattleEngine();
})();