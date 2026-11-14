'use strict';

const game = new Game(el('space'));

window.addEventListener('keydown', event => {
  const { code } = event;
  if (game.state === 'settings' && game.ui.binding) {
    event.preventDefault();
    if (event.repeat) return;
    if (code === 'Escape') game.ui.cancelBinding();
    else if (/^(Key[A-Z]|Digit[0-9]|Arrow(Up|Down|Left|Right)|Space|Shift(Left|Right)|Control(Left|Right)|Alt(Left|Right))$/.test(code)) {
      game.ui.assignBinding(code);
    }
    return;
  }
  if (code === 'Escape' && !event.repeat) {
    if (game.state === 'settings') game.menu();
    else game.pause();
    return;
  }
  if (game.state !== 'playing' || !Object.values(game.bindings).includes(code)) return;
  event.preventDefault();
  game.keys.add(code);
  if (code === game.bindings.gadget && !event.repeat) game.useGadget();
});
window.addEventListener('keyup', event => game.keys.delete(event.code));

function aim(event) {
  game.pointer = { x: event.clientX, y: event.clientY };
}

window.addEventListener('pointermove', aim);
window.addEventListener('pointerdown', event => {
  if (event.button !== 0 || event.target.closest('button, summary, #lesson')) return;
  if (game.state === 'settings' && game.ui.binding && !event.target.closest('#settingsPanel')) {
    game.ui.assignBinding('Mouse0');
    return;
  }
  if (game.state !== 'playing') return;
  aim(event);
  game.keys.add('Mouse0');
  if (game.bindings.gadget === 'Mouse0') game.useGadget();
});
window.addEventListener('pointerup', event => {
  if (event.button === 0) game.keys.delete('Mouse0');
});
window.addEventListener('pointercancel', () => game.keys.delete('Mouse0'));

function suspend() {
  game.keys.clear();
  if (game.state === 'playing') game.pause();
}

window.addEventListener('blur', suspend);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) suspend();
});
window.addEventListener('resize', () => game.resize());

let previous = performance.now();
function frame(now) {
  const dt = Math.min((now - previous) / 1000, .04);
  previous = now;
  game.update(dt);
  game.draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
