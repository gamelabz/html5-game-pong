(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const aiEl = document.getElementById('ai');
  const bestEl = document.getElementById('best');
  const messageEl = document.getElementById('message');
  const startBtn = document.getElementById('start');

  const W = canvas.width;
  const H = canvas.height;
  const BEST_KEY = 'pong-best-score';
  const WIN = 11;

  const STATE = { READY: 'ready', PLAYING: 'playing', PAUSED: 'paused', OVER: 'over' };
  let state = STATE.READY;

  const PW = 14, PH = 92;
  const player = { x: 26, y: H / 2 - PH / 2, vy: 0 };
  const ai = { x: W - 26 - PW, y: H / 2 - PH / 2 };
  const ball = { x: W / 2, y: H / 2, vx: 0, vy: 0, size: 14 };

  let you = 0, aiScore = 0;
  let best = Number(localStorage.getItem(BEST_KEY) || 0);
  let speed = 6;
  const keys = { up: false, down: false };
  let mouseY = null;
  let targetDir = 1; // direction ball serves toward a player

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function updateHud() {
    scoreEl.textContent = String(you);
    aiEl.textContent = String(aiScore);
    bestEl.textContent = String(best);
  }

  function resetBall(towardAI) {
    ball.x = W / 2; ball.y = H / 2;
    speed = 6;
    const angle = (Math.random() * 0.5 - 0.25) * Math.PI; // -45..45 deg
    const dir = towardAI ? 1 : -1;
    ball.vx = Math.cos(angle) * speed * dir;
    ball.vy = Math.sin(angle) * speed;
  }

  function serve() { resetBall(targetDir); }

  function startGame() {
    you = 0; aiScore = 0;
    player.y = H / 2 - PH / 2; ai.y = H / 2 - PH / 2;
    targetDir = Math.random() < 0.5 ? 1 : -1;
    serve();
    state = STATE.PLAYING;
    startBtn.disabled = true;
    messageEl.textContent = '';
    updateHud();
  }

  function endGame(playerWon) {
    state = STATE.OVER;
    if (you > best) { best = you; localStorage.setItem(BEST_KEY, String(best)); }
    updateHud();
    messageEl.textContent = playerWon
      ? `You Win! ${you} – ${aiScore} — Best: ${best}.`
      : `AI Wins! ${you} – ${aiScore} — Best: ${best}.`;
    startBtn.disabled = false;
    startBtn.textContent = 'Play Again';
  }

  function bounceOffPaddle(p, dir) {
    const rel = (ball.y - (p.y + PH / 2)) / (PH / 2); // -1..1
    const clamped = Math.max(-1, Math.min(1, rel));
    speed = Math.min(speed + 0.35, 11);
    const maxAngle = Math.PI / 3.2;
    const angle = clamped * maxAngle;
    ball.vx = Math.cos(angle) * speed * dir;
    ball.vy = Math.sin(angle) * speed;
    ball.x = dir > 0 ? p.x + PW + ball.size / 2 : p.x - ball.size / 2;
  }

  function update() {
    if (state !== STATE.PLAYING) return;

    // player movement
    const pspeed = 9;
    if (mouseY !== null) {
      player.y = mouseY - PH / 2;
    } else {
      if (keys.up) player.y -= pspeed;
      if (keys.down) player.y += pspeed;
    }
    player.y = Math.max(0, Math.min(H - PH, player.y));

    // ai movement (tracks ball with capped speed + slight lag)
    const aiCenter = ai.y + PH / 2;
    const diff = ball.y - aiCenter;
    const aiSpeed = 6.2;
    if (Math.abs(diff) > 8) ai.y += Math.sign(diff) * Math.min(aiSpeed, Math.abs(diff));
    ai.y = Math.max(0, Math.min(H - PH, ai.y));

    // ball
    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.y - ball.size / 2 < 0) { ball.y = ball.size / 2; ball.vy = Math.abs(ball.vy); }
    if (ball.y + ball.size / 2 > H) { ball.y = H - ball.size / 2; ball.vy = -Math.abs(ball.vy); }

    // player paddle
    if (ball.vx < 0 &&
        ball.x - ball.size / 2 <= player.x + PW &&
        ball.x - ball.size / 2 >= player.x &&
        ball.y >= player.y && ball.y <= player.y + PH) {
      bounceOffPaddle(player, 1);
    }
    // ai paddle
    if (ball.vx > 0 &&
        ball.x + ball.size / 2 >= ai.x &&
        ball.x + ball.size / 2 <= ai.x + PW &&
        ball.y >= ai.y && ball.y <= ai.y + PH) {
      bounceOffPaddle(ai, -1);
    }

    // scoring
    if (ball.x + ball.size / 2 < 0) {
      aiScore++;
      updateHud();
      if (aiScore >= WIN) { endGame(false); return; }
      targetDir = -1; serve();
    } else if (ball.x - ball.size / 2 > W) {
      you++;
      updateHud();
      if (you > best) { best = you; localStorage.setItem(BEST_KEY, String(best)); }
      if (you >= WIN) { endGame(true); return; }
      targetDir = 1; serve();
    }
  }

  function draw() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#10142e');
    g.addColorStop(1, '#0a0c1d');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // center net
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 14]);
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);

    const pg = ctx.createLinearGradient(player.x, 0, player.x + PW, 0);
    pg.addColorStop(0, '#4cc9f0');
    pg.addColorStop(1, '#80ed99');
    ctx.fillStyle = pg;
    roundRect(ctx, player.x, player.y, PW, PH, 7); ctx.fill();

    const ag = ctx.createLinearGradient(ai.x, 0, ai.x + PW, 0);
    ag.addColorStop(0, '#ff5a5f');
    ag.addColorStop(1, '#ffb703');
    ctx.fillStyle = ag;
    roundRect(ctx, ai.x, ai.y, PW, PH, 7); ctx.fill();

    ctx.save();
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, ball.x - ball.size / 2, ball.y - ball.size / 2, ball.size, ball.size, 4);
    ctx.fill();
    ctx.restore();
  }

  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'arrowup' || k === 'w') { keys.up = true; mouseY = null; }
    if (k === 'arrowdown' || k === 's') { keys.down = true; mouseY = null; }
    if (k === 'p' && (state === STATE.PLAYING || state === STATE.PAUSED)) {
      if (state === STATE.PLAYING) { state = STATE.PAUSED; messageEl.textContent = 'Paused — press P to resume.'; }
      else { state = STATE.PLAYING; messageEl.textContent = ''; }
    }
    if (k === 'r') startGame();
    if ((k === ' ' || k === 'enter') && state === STATE.READY) startGame();
  });
  document.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'arrowup' || k === 'w') keys.up = false;
    if (k === 'arrowdown' || k === 's') keys.down = false;
  });
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseY = ((e.clientY - rect.top) * (H / rect.height));
  });
  canvas.addEventListener('mouseleave', () => { mouseY = null; });
  startBtn.addEventListener('click', startGame);

  updateHud();
  requestAnimationFrame(loop);
})();
