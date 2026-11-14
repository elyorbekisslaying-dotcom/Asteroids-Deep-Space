const el = id => document.getElementById(id);
const fmt = n => String(n).padStart(6, '0');
const bindingLabels = { up:'Move up', left:'Move left', down:'Move down', right:'Move right', fire: 'Fire', gadget: 'Homing missiles' };
const bindingName = code => ({ Mouse0: 'Left mouse', Space: 'Space', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' })[code] || code.replace(/^(Key|Digit)/, '');

class UI {
  constructor(game) {
    this.game = game;
    el('play').onclick = () => game.start('endless');
    el('tutorial').onclick = () => game.start('tutorial');
    el('launchEndless').onclick = () => game.start('endless');
    el('restart').onclick = () => game.start(game.mode);
    el('resume').onclick = () => game.pause();
    el('pause').onclick = () => game.pause();
    el('home').onclick = () => game.menu();
    el('settings').onclick = () => {
      game.state = 'settings';
      this.show();
    };
    el('closeSettings').onclick = () => game.menu();
    el('resetBindings').onclick = () => {
      game.bindings = { ...defaultBindings };
      writeSave('deepSpaceBindings', game.bindings);
      this.cancelBinding();
    };
    el('mute').onclick = () => {
      game.sound.init();
      game.sound.muted = !game.sound.muted;
      writeSave('deepSpaceMuted', game.sound.muted);
      this.renderBindings();
    };
    for (const [action, label] of Object.entries(bindingLabels)) {
      const row = document.createElement('div');
      row.className = 'binding-row';
      const title = document.createElement('span');
      title.textContent = label;
      const button = document.createElement('button');
      button.className = 'quiet';
      button.id = 'bind-' + action;
      button.onclick = () => {
        this.binding = action;
        this.renderBindings();
      };
      row.append(title, button);
      el('bindings').append(row);
    }
    for (const spec of Object.values(droneTypes)) {
      const title = document.createElement('dt');
      const detail = document.createElement('dd');
      title.textContent = spec.name;
      detail.textContent = spec.description;
      el('droneManual').append(title, detail);
    }
  }

  cancelBinding() {
    this.binding = null;
    this.renderBindings();
  }

  assignBinding(code) {
    const action = this.binding;
    if (!action) return;
    const bindings = this.game.bindings;
    const conflict = Object.keys(bindings).find(key => key !== action && bindings[key] === code);
    if (conflict) bindings[conflict] = bindings[action];
    bindings[action] = code;
    writeSave('deepSpaceBindings', bindings);
    this.cancelBinding();
    el('bind-' + action).focus();
  }

  renderBindings() {
    for (const action of Object.keys(bindingLabels)) {
      const button = el('bind-' + action);
      button.textContent = this.binding === action ? 'Waiting…' : bindingName(this.game.bindings[action]);
      button.setAttribute('aria-label', bindingLabels[action] + ': ' + button.textContent);
    }
    el('bindingHint').textContent = this.binding ? 'Press a key or click the arena. Escape cancels.' : 'Select a control to rebind it.';
    el('mute').textContent = this.game.sound.muted ? 'Sound off' : 'Sound on';
    el('mute').setAttribute('aria-pressed', String(this.game.sound.muted));
  }

  update() {
    const g = this.game;
    el('score').textContent = fmt(g.score);
    el('best').textContent = fmt(g.best);
    el('wave').textContent = String(g.wave).padStart(2, '0');
    el('hullCount').textContent = g.health + '/' + g.maxHealth;
    el('health').replaceChildren(...Array.from({ length: g.maxHealth }, (_, i) => {
      const segment = document.createElement('span');
      if (i >= g.health) segment.className = 'off';
      return segment;
    }));
    el('level').textContent = 'LEVEL ' + g.level;
    el('experience').max = g.goal;
    el('experience').value = g.xp;
    el('xpCount').textContent = Math.min(g.xp, g.goal) + ' / ' + g.goal + ' XP';
    if (g.mode === 'tutorial') {
      const steps = ['thrust', 'shoot', 'gadget', 'practice'];
      const messages = [
        'Move independently of aim: ' + ['up','left','down','right'].map(k=>bindingName(g.bindings[k])).join(' / ') + '. Hold a direction to begin.',
        'Aim at the asteroid and hold ' + bindingName(g.bindings.fire) + ' to fire. Destroying targets fills the XP bar.',
        'Your drone flies with you. Press ' + bindingName(g.bindings.gadget) + ' to launch homing missiles at the raider.',
        'Destroy the raider to finish training. Use your primary fire while the missiles reload.'
      ];
      const step = steps.indexOf(g.tutorialStep);
      const label = 'FLIGHT TRAINING / ' + (step + 1) + ' OF 4';
      if (el('lessonStep').textContent !== label) el('lessonStep').textContent = label;
      if (el('lessonText').textContent !== messages[step]) el('lessonText').textContent = messages[step];
      el('droneGuide').hidden = step < 2;
      document.querySelector('.key-diagram').innerHTML='<kbd>'+bindingName(g.bindings.up)+'</kbd><br>'+['left','down','right'].map(k=>'<kbd>'+bindingName(g.bindings[k])+'</kbd>').join('')+' · '+bindingName(g.bindings.fire);
    }
    this.updateCombat();
  }

  updateCombat() {
    const g = this.game;
    el('fleetCount').textContent=g.drones.length;
    el('missileCooldown').max=g.build?.gadgetInterval||9;
    el('missileCooldown').value=g.build?(g.build.gadgetInterval-g.gadgetCooldown):0;
    const active = g.mode === 'endless' || ['gadget', 'practice'].includes(g.tutorialStep);
    const status = active ? '➤ [' + bindingName(g.bindings.gadget).toUpperCase() + '] / ' +
      (g.gadgetCooldown > 0 ? Math.ceil(g.gadgetCooldown) + 's' : 'READY') : '';
    if (el('gadgetStatus').textContent !== status) el('gadgetStatus').textContent = status;
    const boss = g.enemies.find(enemy => enemy.type === 'carrier');
    el('boss').hidden = !boss || g.state !== 'playing';
    if (boss) {
      el('bossHealth').max = boss.maxHp;
      el('bossHealth').value = boss.hp;
    }
  }

  renderRewards() {
    const g = this.game;
    const cards = el('rewardCards');
    el('rewardLevel').textContent = 'LEVEL ' + (g.level + 1);
    cards.replaceChildren(...g.rewards.map((reward, i) => {
      const button = document.createElement('button');
      button.className = 'reward-card';
      const name = document.createElement('strong');
      name.textContent = reward.name;
      const details = document.createElement('span');
      const info=rewardVisual(reward.name);
      const icon=document.createElement('span');icon.className='reward-icon';icon.innerHTML=info.icon;
      details.textContent=info.effect;
      const tip=document.createElement('span');tip.className='reward-tip';tip.textContent=reward.description;
      button.title=reward.description;button.setAttribute('aria-label',reward.name+': '+reward.description);
      button.append(icon,name,details,tip);
      button.onclick = () => g.chooseReward(i);
      return button;
    }));
    cards.firstElementChild.focus();
  }

  show() {
    const g = this.game;
    const { state } = g;
    document.body.classList.toggle('in-flight',state==='playing');
    if(state!=='playing')g.keys.clear();
    const flight = !['menu', 'settings'].includes(state);
    document.body.classList.toggle('has-flight',flight);
    const modal = ['paused', 'over', 'complete'].includes(state);
    el('menu').hidden = state !== 'menu';
    el('settingsPanel').hidden = state !== 'settings';
    el('play').disabled = !g.tutorialComplete;
    el('playHint').textContent = g.tutorialComplete ? 'Endless Mode' : 'Complete Tutorial to unlock Endless.';
    el('hud').hidden = !flight;
    el('flightProgress').hidden = !flight;
    el('bestStat').hidden = g.mode !== 'endless';
    el('lesson').hidden = g.mode !== 'tutorial' || state !== 'playing';
    el('overlay').hidden = !modal;
    el('reward').hidden = state !== 'reward';
    el('pause').disabled = state !== 'playing';
    el('resume').hidden = state !== 'paused';
    el('restart').hidden = state !== 'over';
    el('launchEndless').hidden = state !== 'complete';
    el('stats').hidden = state !== 'over' || g.mode !== 'endless';
    if (modal) {
      const content = {
        paused: ['Flight paused', 'Resume when ready.'],
        over: ['Signal lost', g.mode === 'tutorial' ? 'Try the training flight again.' : 'Your flight has ended.'],
        complete: ['Training complete', 'Endless Mode is unlocked.']
      }[state];
      el('overlayTitle').textContent = content[0];
      el('overlayText').textContent = content[1];
      el('stats').textContent = 'SCORE ' + fmt(g.score) + '  /  WAVE ' + g.wave;
      el({ paused: 'resume', over: 'restart', complete: 'launchEndless' }[state]).focus();
    }
    if (state === 'settings') {
      this.cancelBinding();
      el('bind-up').focus();
    }
    if (state === 'reward') this.renderRewards();
    if (state === 'playing' && document.activeElement instanceof HTMLButtonElement) document.activeElement.blur();
    this.update();
  }
}

class Sound{
 constructor(){this.muted=false;try{this.muted=localStorage.getItem('deepSpaceMuted')==='true';}catch(e){}}
 init(){try{if(!this.ctx){this.ctx=new (window.AudioContext||window.webkitAudioContext)();this.master=this.ctx.createGain();this.master.gain.value=.22;this.master.connect(this.ctx.destination);this.engine=this.ctx.createOscillator();this.engine.type='sawtooth';this.engine.frequency.value=48;this.engineGain=this.ctx.createGain();this.engineGain.gain.value=0;this.engine.connect(this.engineGain);this.engineGain.connect(this.master);this.engine.start();}if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});}catch(e){}}
 setEngine(on){if(this.ctx)this.engineGain.gain.setTargetAtTime(on&&!this.muted?.075:0,this.ctx.currentTime,.07);}
 play(kind){if(!this.ctx||this.muted)return;const t=this.ctx.currentTime,o=this.ctx.createOscillator(),v=this.ctx.createGain();o.connect(v);v.connect(this.master);const laser=kind==='laser',boom=kind==='boom';const tones={raider:330,sniper:1450,rammer:75,interceptor:760,miner:230,warning:900};o.type=laser?'sawtooth':boom?'triangle':'sine';o.frequency.setValueAtTime(tones[kind]|| (laser?1000:boom?110:420),t);o.frequency.exponentialRampToValueAtTime(laser?200:boom?25:660,t+.18);v.gain.setValueAtTime(laser?.08:boom?.55:.18,t);v.gain.exponentialRampToValueAtTime(.001,t+.25);o.start(t);o.stop(t+.26);o.onended=()=>{o.disconnect();v.disconnect();};}
}
function rewardVisual(name){
 const paths={
  'Hull Plating':['M5 4H19V13L12 21 5 13Z M8 11H16 M12 7V15','+1 max HP'],
  'Ion Thrusters':['M8 15V6L12 2 16 6V15Z M9 18L12 23 15 18','+55 thrust · +35 speed'],
  'Rapid Fire':['M3 6H14 M6 12H20 M3 18H14','15% faster fire'],
  'Heavy Rounds':['M8 20V7L12 2 16 7V20Z M8 16H16','+1 shot damage'],
  'Missile Rack':['M4 19V9L7 5 10 9V19Z M14 16V6L17 2 20 6V16Z','+2 missiles'],
  'Quick Reload':['M19 8A8 8 0 1 0 20 16 M19 2V8H13','20% faster reload'],
  'Seeker Warheads':['M12 2V6 M2 12H6 M18 12H22 M12 18V22 M8 8L16 16 M16 8L8 16','+1 missile damage'],
  'Gunner Drone':['M21 12L3 3 7 12 3 21Z','+1 Gunner'],
  'Scout Drone':['M23 12L2 7 7 12 2 17Z','+1 Scout'],
  'Tank Drone':['M20 7L15 3H5L2 12 5 21H15L20 17Z M8 12H23','+1 Tank'],
  'Support Drone':['M9 3H15V9H21V15H15V21H9V15H3V9H9Z','+1 Support'],
  'Drone Targeting':['M3 7V3H7 M17 3H21V7 M21 17V21H17 M7 21H3V17 M8 12H16 M12 8V16','Fleet +1 damage'],
  'Drone Overclock':['M13 2L5 13H11L10 22 20 9H14Z','Fleet 20% faster']
 };
 const [path,effect]=paths[name]||['M12 2L22 12 12 22 2 12Z','Restore flight systems'];
 return {effect,icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+path+'" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>'};
}
