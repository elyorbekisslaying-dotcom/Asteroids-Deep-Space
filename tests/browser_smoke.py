"""Run: python3 tests/browser_smoke.py (requires Playwright + system Chromium).
Serve the repository on port 8000 first. No app runtime dependencies.
"""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width':1280, 'height':800})
    errors=[]
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto('http://127.0.0.1:8000/')
    assert page.locator('#play').is_disabled()
    page.click('#tutorial')
    page.keyboard.down('d'); page.wait_for_timeout(650); page.keyboard.up('d')
    page.wait_for_function("game.tutorialStep==='shoot'")
    def shoot_target(expression):
        for _ in range(100):
            point=page.evaluate(f"""(()=>{{const t={expression};return t?{{x:t.x-game.camera.x,y:t.y-game.camera.y}}:null;}})()""")
            if not point: break
            page.mouse.move(point['x'],point['y']);page.mouse.down();page.wait_for_timeout(70)
            if page.evaluate("game.state!=='playing'"):break
        page.mouse.up()
    shoot_target('game.asteroids[0]')
    page.wait_for_function("game.state==='reward'")
    assert page.locator('.reward-card').count()==3
    page.locator('.reward-card').first.click()
    assert page.evaluate('game.drones.length')==1
    page.keyboard.press('e')
    shoot_target('game.enemies[0]')
    page.wait_for_function("game.state==='complete'",timeout=12000)
    page.reload()
    assert page.locator('#play').is_enabled()
    page.click('#play')
    assert page.evaluate('game.goal')==18
    # Natural first-wave combat: follow and shoot enemies, keeping ship invulnerable
    # only in this automated aim driver to avoid random damage influencing progression.
    page.evaluate('game.player.invincible=1000')
    for _ in range(900):
        state=page.evaluate('game.state')
        if state=='reward':break
        point=page.evaluate("""(()=>{const t=closest(game.player,[...game.enemies,...game.asteroids]);if(!t)return null;const a=interceptAngle(game.player,t,690,1.25,29);return {x:game.player.x-game.camera.x+Math.cos(a)*220,y:game.player.y-game.camera.y+Math.sin(a)*220}})()""")
        if point:
            page.mouse.move(point['x'],point['y']);page.mouse.down()
        page.wait_for_timeout(35)
    page.mouse.up()
    assert page.evaluate('game.state')=='reward',page.evaluate('({state:game.state,xp:game.xp,spawned:game.spawned,enemies:game.enemies.length,rocks:game.asteroids.length})')
    assert len(set(page.locator('.reward-card strong').all_text_contents()))==3
    page.locator('.reward-card').first.click()
    print('PASS clean profile: Tutorial → reload → Endless → first combat-earned reward')
    for _ in range(2):
        page.evaluate("game.xp=game.goal;game.offerReward();game.rewards=[droneRewards[1],droneRewards[0],droneRewards[2]];game.ui.renderRewards()")
        page.locator('.reward-card').first.click()
        assert page.evaluate("!game.keys.has('Mouse0')")
    assert page.evaluate("game.drones.filter(d=>d.type==='scout').length")>=2
    print('PASS repeated Scout reward-card hire; no leaked fire input')
    # Deterministic mechanics scenarios, separated from UI walkthrough.
    result=page.evaluate("""()=>{
      const check=(condition,label)=>{if(!condition)throw Error(label)};
      game.start('endless');game.spawned=game.quota;game.spawnTimer=100;
      const hire=droneRewards.find(r=>r.name==='Scout Drone');hire.apply(game);hire.apply(game);
      check(game.drones.length===2&&hire.available(game),'repeat hire');
      game.xp=200;game.offerReward();game.chooseReward(0);const remaining=game.xp;
      game.update(.01);check(game.state==='reward'&&remaining===182,'XP overflow');
      check(CONFIG.xp(12)>CONFIG.xp(8)&&CONFIG.xp(8)>58,'XP growth');
      game.start('endless');game.asteroids=[];game.enemies=[];
      for(const [x,y,key]of [[28,1800,'left'],[4772,1800,'right'],[2400,28,'up'],[2400,3572,'down']]){
       game.player.x=x;game.player.y=y;game.player.vx=game.player.vy=0;game.keys=new Set([game.bindings[key]]);
       for(let i=0;i<60;i++)game.player.update(1/60,game);
       check(Math.abs(game.player.x-x)<.01&&Math.abs(game.player.y-y)<.01,'world edge '+key);
       game.updateCamera(1,true);const point=game.edgePoint(90);
       check(point.x>=0&&point.x<=4800&&point.y>=0&&point.y<=3600&&distance(point,game.player)>450,'safe edge spawn');
       check(point.x<game.camera.x||point.x>game.camera.x+game.w||point.y<game.camera.y||point.y>game.camera.y+game.h,'offscreen spawn');
      }
      game.keys.clear();game.player.invincible=0;game.health=5;game.damage({damage:2});check(game.health===3,'sniper damage');
      game.player.invincible=0;game.health=5;const sniper=new Enemy('sniper',game.player.x-200,game.player.y,2);
      game.hostile=[];game.enemyShot(sniper,0,1000);game.updateProjectiles(.2,[]);check(game.health===3,'actual sniper projectile damage');
      const tank=new Enemy('rammer',2000,1600,1);check(tank.hp>3,'tank survives upgraded shot');
      game.player.invincible=0;game.damage(tank);check(game.health===1,'rammer damage');
      game.start('endless');game.spawnTimer=1e9;game.drones=Array.from({length:3},()=>new Drone('support',game.player));game.health=2;
      for(let i=0;i<6*60;i++)game.update(1/60);check(game.health===2,'no fast stacked repair');
      for(let i=0;i<4*60;i++)game.update(1/60);check(game.health===3,'three Support repair');
      game.player.invincible=0;game.damage({damage:1});check(game.healTimer===0,'damage resets heal');
      const origin={x:1000,y:1000,vx:50,vy:0,r:11};const rock=new Asteroid(1400,850,0);rock.vx=0;rock.vy=280;
      origin.angle=interceptAngle(origin,rock,690,1.25,11);const bullet=new Bullet(origin,{offset:11});let hit=false;
      for(let i=0;i<150;i++){bullet.update(1/120);rock.update(1/120,4800,3600);if(segmentHit(bullet,rock)){hit=true;break;}}
      check(hit,'transverse asteroid intercept');
      game.start('endless');game.spawnTimer=1e9;
      const large=new Asteroid(1000,1000,2);game.asteroids=[large];
      while(game.asteroids.length)game.destroy(game.asteroids[0]);
      check(game.xp===11&&game.xp<game.goal,'one full asteroid below first XP level');
      const mine=new Enemy('mine',game.player.x,game.player.y);game.player.invincible=0;game.health=5;
      mine.update(.5,game);check(game.health===5,'mine arm delay');mine.update(1.1,game);check(game.health===4&&mine.hp===0,'armed mine');
      const distantMine=new Enemy('mine',100,100);distantMine.update(19,game);check(distantMine.hp===0,'mine expiry');
      const sniper2=new Enemy('sniper',game.player.x-500,game.player.y);sniper2.timer=0;sniper2.update(.01,game);
      const locked=sniper2.angle;game.player.y+=200;sniper2.update(.5,game);check(sniper2.angle===locked,'sniper lock warning');
      for(const role of CONFIG.roles){const enemy=new Enemy(role.type,100,100,5);const before=distance(enemy,game.player);for(let i=0;i<300;i++)enemy.update(1/60,game);check(distance(enemy,game.player)<before-300,'pursuit '+role.type);}
      return {xp:[1,2,5,10,20].map(CONFIG.xp),tankHP:tank.hp,intercept:hit};
    }""")
    print('PASS mechanics:',json.dumps(result))
    # Verify migration and remapping persistence, plus no leaked fire on reward click.
    page.evaluate("localStorage.setItem('deepSpaceBindings',JSON.stringify({thrust:'KeyF',fire:'Space',gadget:'KeyQ'}))")
    page.reload();page.click('#settings')
    assert page.locator('#bind-up').inner_text()=='W'
    assert page.locator('#bind-fire').inner_text()=='Space'
    page.click('#bind-down');page.keyboard.press('x');page.reload();page.click('#settings')
    assert page.locator('#bind-down').inner_text()=='X'
    page.click('#closeSettings');page.click('#play')
    page.keyboard.down('f');page.wait_for_timeout(100);page.keyboard.up('f')
    assert page.evaluate('Math.hypot(game.player.vx,game.player.vy)')==0
    page.evaluate("game.bindings={...defaultBindings}")
    page.mouse.move(900,400);page.keyboard.down('d');page.mouse.down();page.wait_for_timeout(300)
    page.mouse.up();page.keyboard.up('d')
    assert page.evaluate('game.bullets.length>0 && game.camera.x>0')
    page.keyboard.press('Escape');assert page.evaluate('game.keys.size')==0
    page.click('#resume')
    page.set_viewport_size({'width':1000,'height':700});page.wait_for_function('game.w===1000')
    page.mouse.move(700,300);page.mouse.down();page.mouse.up()
    assert page.evaluate('Math.abs(game.player.angle-bearing(game.player,game.worldPointer()))<.001')
    page.evaluate("game.keys.add('Mouse0');window.dispatchEvent(new Event('blur'))")
    assert page.evaluate("game.state==='paused'&&game.keys.size===0")
    print('PASS settings migration, rebind persistence, moving aim, pause/focus reset, resize aim')
    for count in [50,100,150]:
        perf=page.evaluate("""count=>{
         game.start('endless');game.player.invincible=1e6;game.spawnTimer=1e6;
         game.drones=Array.from({length:count},(_,i)=>new Drone(['gunner','scout','tank','support'][i%4],game.player));
         game.enemies=Array.from({length:20},(_,i)=>new Enemy(CONFIG.roles[i%5].type,game.player.x+350*Math.cos(i),game.player.y+350*Math.sin(i),8));
         const begin=performance.now();
         for(let i=0;i<180;i++){if(game.state==='reward')game.chooseReward(0);game.update(1/60);game.draw();}
         return {msPerFrame:(performance.now()-begin)/180,drones:game.drones.length,bullets:game.bullets.length,state:game.state};
        }""",count)
        assert perf['drones']>=count
        print('FLEET',count,json.dumps(perf))
    assert not errors,errors
    page.screenshot(path='/tmp/deep-space-combat.png')
    browser.close()
