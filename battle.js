(() => {
  class BattleEngine {
    constructor(){
      this.overlay = document.getElementById("battle-overlay");
      this.canvas = document.getElementById("battle-canvas");
      this.ctx = this.canvas.getContext("2d");
      this.status = document.getElementById("battle-status");
      this.detail = document.getElementById("battle-unit-detail");
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
      this.detail.innerHTML = "点击己方单位查看状态。";
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
        zones.push({type:"mud",x:w*.46,y:0,w:w*.09,h:h});
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
          tx:null,ty:null,targetEnemy:null,
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
      for(const z of this.terrainZones){
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
        if(t==="mud") return .22;
        if(t==="hill") return .52;
        if(t==="field") return .82;
      }
      if(t==="rampart") return .30;
      if(t==="ditch") return .36;
      if(u.type==="hunter" && (t==="forest"||t==="hill")) return .95;
      if(t==="hill") return .83;
      if(t==="forest") return .72;
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
        this.selected.targetEnemy=enemy;
        this.selected.tx=null;this.selected.ty=null;
      }else{
        this.selected.targetEnemy=null;
        this.selected.tx=p.x;this.selected.ty=p.y;
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
        if(this.aiClock>.7){this.aiClock=0;this.aiOrders()}
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

        const badChariotGround=["forest","mud","hill","rampart","ditch"].includes(this.terrainAt(u));
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
        u.engaged=false;
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
          else {u.tx=null;u.ty=null;u.moving=false}
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

      const goodChariotGround=!["forest","mud","hill","rampart","ditch"].includes(this.terrainAt(a));
      if(a.type==="chariot" && a.lastMoveSpeed>45 && goodChariotGround){
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

  window.BATTLE_ENGINE = new BattleEngine();
})();