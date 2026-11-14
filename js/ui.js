const el = id => document.getElementById(id);
const fmt = n => String(n).padStart(6, '0');
const bindingLabels = { thrust: 'Thrust', fire: 'Fire', gadget: 'Homing missiles' };
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
        'Aim with the mouse. Hold ' + bindingName(g.bindings.thrust) + ' to thrust toward it. Your ship keeps drifting after you release.',
        'Aim at the asteroid and hold ' + bindingName(g.bindings.fire) + ' to fire. Destroying targets fills the XP bar.',
        'Your drone flies with you. Press ' + bindingName(g.bindings.gadget) + ' to launch homing missiles at the raider.',
        'Destroy the raider to finish training. Use your primary fire while the missiles reload.'
      ];
      const step = steps.indexOf(g.tutorialStep);
      const label = 'FLIGHT TRAINING / ' + (step + 1) + ' OF 4';
      if (el('lessonStep').textContent !== label) el('lessonStep').textContent = label;
      if (el('lessonText').textContent !== messages[step]) el('lessonText').textContent = messages[step];
      el('droneGuide').hidden = step < 2;
    }
    this.updateCombat();
  }

  updateCombat() {
    const g = this.game;
    const active = g.mode === 'endless' || ['gadget', 'practice'].includes(g.tutorialStep);
    const status = active ? 'MISSILES [' + bindingName(g.bindings.gadget).toUpperCase() + '] / ' +
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
      details.textContent = reward.description;
      button.append(name, details);
      button.onclick = () => g.chooseReward(i);
      return button;
    }));
    cards.firstElementChild.focus();
  }

  show() {
    const g = this.game;
    const { state } = g;
    const flight = !['menu', 'settings'].includes(state);
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
      el('bind-thrust').focus();
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
 play(kind){if(!this.ctx||this.muted)return;const t=this.ctx.currentTime,o=this.ctx.createOscillator(),v=this.ctx.createGain();o.connect(v);v.connect(this.master);const laser=kind==='laser',boom=kind==='boom';o.type=laser?'sawtooth':boom?'triangle':'sine';o.frequency.setValueAtTime(laser?1000:boom?110:420,t);o.frequency.exponentialRampToValueAtTime(laser?200:boom?25:660,t+.18);v.gain.setValueAtTime(laser?.08:boom?.55:.18,t);v.gain.exponentialRampToValueAtTime(.001,t+.25);o.start(t);o.stop(t+.26);o.onended=()=>{o.disconnect();v.disconnect();};}
}