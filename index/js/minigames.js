/* Upper-floor minigames gated by the Energy Bar. Energy cannot be bought — only earned by learning. */
(function () {
  'use strict';

  const { esc, shuffle, clamp, fmtEnergy } = window.Util;
  const COST = 2.5;

  // ---------- Ping Pong vs CPU ----------
  function createPingPong(host, difficulty, onEnd) {
    const W = 800;
    const H = 480;
    const PW = 12;
    const PH = 90;
    const R = 8;
    const PX = 28;
    const CX = W - 28 - PW;
    const WIN = 5;
    const cfg = {
      easy: { speed: 250, err: 70, react: 0.28 },
      normal: { speed: 370, err: 38, react: 0.16 },
      hard: { speed: 540, err: 14, react: 0.07 },
    }[difficulty] || { speed: 370, err: 38, react: 0.16 };

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    canvas.className = 'game-canvas';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Mesa de ping pong. Mueve tu pala con el ratón, el dedo o las teclas W y S.');
    host.appendChild(canvas);
    const g = canvas.getContext('2d');

    const st = { py: H / 2, cy: H / 2, bx: W / 2, by: H / 2, vx: 0, vy: 0, ps: 0, cs: 0, serveT: 1.1, serveDir: 1, cpuTarget: H / 2, reactT: 0, running: true };
    const keys = {};
    let raf = 0;
    let last = performance.now();

    const onKey = (e) => {
      if (['KeyW', 'KeyS', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
        keys[e.code] = e.type === 'keydown';
        e.preventDefault();
      }
    };
    const onPointer = (e) => {
      const r = canvas.getBoundingClientRect();
      st.py = ((e.clientY - r.top) / r.height) * H;
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    canvas.addEventListener('pointermove', onPointer);
    canvas.addEventListener('pointerdown', onPointer);

    function serve(dir) {
      st.bx = W / 2;
      st.by = H / 2;
      const ang = Math.random() * 0.7 - 0.35;
      const sp = 360;
      st.vx = dir * sp * Math.cos(ang);
      st.vy = sp * Math.sin(ang);
    }

    function point(scorer) {
      if (scorer === 'player') st.ps += 1;
      else st.cs += 1;
      st.serveDir = scorer === 'player' ? 1 : -1;
      st.serveT = 0.9;
      st.vx = 0;
      st.vy = 0;
      st.bx = W / 2;
      st.by = H / 2;
      if (st.ps >= WIN || st.cs >= WIN) {
        st.running = false;
        draw();
        setTimeout(() => onEnd({ won: st.ps > st.cs, summary: `${st.ps} – ${st.cs}` }), 700);
      }
    }

    function bounce(fromPaddleY, dir) {
      const off = clamp((st.by - fromPaddleY) / (PH / 2), -1, 1);
      const sp = Math.min(Math.hypot(st.vx, st.vy) * 1.06, 920);
      const ang = off * 1.0;
      st.vx = dir * sp * Math.cos(ang);
      st.vy = sp * Math.sin(ang);
    }

    function update(dt) {
      if (keys.KeyW || keys.ArrowUp) st.py -= 460 * dt;
      if (keys.KeyS || keys.ArrowDown) st.py += 460 * dt;
      st.py = clamp(st.py, PH / 2, H - PH / 2);

      st.reactT -= dt;
      if (st.reactT <= 0) {
        st.reactT = cfg.react;
        st.cpuTarget = st.vx > 0 ? st.by + (Math.random() * 2 - 1) * cfg.err : H / 2;
      }
      const diff = st.cpuTarget - st.cy;
      st.cy += clamp(diff, -cfg.speed * dt, cfg.speed * dt);
      st.cy = clamp(st.cy, PH / 2, H - PH / 2);

      if (st.serveT > 0) {
        st.serveT -= dt;
        if (st.serveT <= 0) serve(st.serveDir);
        return;
      }
      st.bx += st.vx * dt;
      st.by += st.vy * dt;
      if (st.by < R) { st.by = R; st.vy = Math.abs(st.vy); }
      if (st.by > H - R) { st.by = H - R; st.vy = -Math.abs(st.vy); }

      if (st.vx < 0 && st.bx - R <= PX + PW && st.bx - R >= PX - 14 && Math.abs(st.by - st.py) <= PH / 2 + R) {
        st.bx = PX + PW + R;
        bounce(st.py, 1);
      }
      if (st.vx > 0 && st.bx + R >= CX && st.bx + R <= CX + PW + 14 && Math.abs(st.by - st.cy) <= PH / 2 + R) {
        st.bx = CX - R;
        bounce(st.cy, -1);
      }
      if (st.bx < -R * 2) point('cpu');
      else if (st.bx > W + R * 2) point('player');
    }

    function draw() {
      g.fillStyle = '#0b3b37';
      g.fillRect(0, 0, W, H);
      g.strokeStyle = 'rgba(255,255,255,0.65)';
      g.lineWidth = 4;
      g.strokeRect(6, 6, W - 12, H - 12);
      g.setLineDash([12, 14]);
      g.beginPath();
      g.moveTo(W / 2, 10);
      g.lineTo(W / 2, H - 10);
      g.stroke();
      g.setLineDash([]);
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.font = '600 56px Geist, system-ui, sans-serif';
      g.textAlign = 'center';
      g.fillText(String(st.ps), W / 2 - 80, 76);
      g.fillText(String(st.cs), W / 2 + 80, 76);
      g.font = '500 16px Geist, system-ui, sans-serif';
      g.fillStyle = 'rgba(255,255,255,0.6)';
      g.fillText('TÚ', W / 2 - 80, 100);
      g.fillText('CPU', W / 2 + 80, 100);
      g.fillStyle = '#2dd4bf';
      g.fillRect(PX, st.py - PH / 2, PW, PH);
      g.fillStyle = '#fbbf24';
      g.fillRect(CX, st.cy - PH / 2, PW, PH);
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(st.bx, st.by, R, 0, Math.PI * 2);
      g.fill();
      if (st.serveT > 0 && st.running) {
        g.font = '600 24px Geist, system-ui, sans-serif';
        g.fillStyle = '#e2e8f0';
        g.fillText('¡Saque!', W / 2, H / 2 + 46);
      }
      if (!st.running) {
        g.fillStyle = 'rgba(0,0,0,0.5)';
        g.fillRect(0, 0, W, H);
        g.font = '700 44px Geist, system-ui, sans-serif';
        g.fillStyle = '#ffffff';
        g.fillText(st.ps > st.cs ? '¡Victoria!' : 'Gana la CPU', W / 2, H / 2);
      }
    }

    function loop(now) {
      const dt = Math.min((now - last) / 1000, 0.033);
      last = now;
      if (st.running) update(dt);
      draw();
      if (st.running) raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return {
      stop() {
        st.running = false;
        cancelAnimationFrame(raf);
        window.removeEventListener('keydown', onKey);
        window.removeEventListener('keyup', onKey);
      },
    };
  }

  // ---------- Corporate Memory ----------
  function createMemory(host, onEnd) {
    const cards = [['bi-filetype-html', 'HTML'], ['bi-filetype-css', 'CSS'], ['bi-filetype-js', 'JavaScript'], ['bi-database-fill', 'SQL'], ['bi-hdd-network-fill', 'API'], ['bi-palette-fill', 'UX']];
    const deck = shuffle(cards.concat(cards).map(([icon, label], i) => ({ icon, label, id: i })));
    let first = null;
    let lock = false;
    let moves = 0;
    let matched = 0;
    let stopped = false;
    const start = performance.now();

    host.innerHTML = `
      <div class="d-flex justify-content-between small mb-2" aria-live="polite"><span>Movimientos: <strong id="mem-moves">0</strong></span><span>Parejas: <strong id="mem-pairs">0</strong> / 6</span></div>
      <div class="memory-grid">${deck.map((c, i) => `<button type="button" class="mem-card" data-i="${i}" aria-label="Carta oculta ${i + 1}"><span class="mem-face"><i class="bi ${c.icon}" aria-hidden="true"></i><span>${c.label}</span></span></button>`).join('')}</div>`;
    const btns = host.querySelectorAll('.mem-card');

    const onClick = (e) => {
      const b = e.target.closest('.mem-card');
      if (!b || lock || stopped || b.classList.contains('is-open')) return;
      const i = Number(b.dataset.i);
      b.classList.add('is-open');
      b.setAttribute('aria-label', deck[i].label);
      if (first === null) {
        first = i;
        return;
      }
      moves += 1;
      host.querySelector('#mem-moves').textContent = moves;
      const a = first;
      first = null;
      if (deck[a].label === deck[i].label) {
        matched += 1;
        btns[a].classList.add('is-matched');
        b.classList.add('is-matched');
        host.querySelector('#mem-pairs').textContent = matched;
        if (matched === 6) {
          const secs = Math.round((performance.now() - start) / 1000);
          setTimeout(() => onEnd({ won: true, summary: `${moves} movimientos · ${secs} s` }), 600);
        }
      } else {
        lock = true;
        setTimeout(() => {
          [btns[a], b].forEach((el, idx) => {
            el.classList.remove('is-open');
            el.setAttribute('aria-label', `Carta oculta ${(idx === 0 ? a : i) + 1}`);
          });
          lock = false;
        }, 750);
      }
    };
    host.addEventListener('click', onClick);
    return { stop() { stopped = true; host.removeEventListener('click', onClick); } };
  }

  // ---------- Paper Toss ----------
  function createPaperToss(host, onEnd) {
    const W = 800;
    const H = 400;
    const THROWS = 5;
    const START = { x: 110, y: 320 };
    const BIN = { x: 640, w: 70, top: 290 };
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    canvas.className = 'game-canvas';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Lanzamiento de papel. Pulsa clic o Espacio para detener la barra de potencia.');
    host.appendChild(canvas);
    const hint = document.createElement('p');
    hint.className = 'small text-secondary text-center mt-2 mb-0';
    hint.textContent = 'Pulsa clic o la barra espaciadora para lanzar.';
    host.appendChild(hint);
    const g = canvas.getContext('2d');

    const st = { power: 0, dir: 1, wind: 0, throwsLeft: THROWS, hits: 0, anim: null, msg: '', msgT: 0, running: true };
    const newWind = () => { st.wind = Math.round((Math.random() * 2 - 1) * 10) / 10; };
    newWind();
    let raf = 0;
    let last = performance.now();

    function launch() {
      if (!st.running || st.anim || st.throwsLeft <= 0) return;
      const landX = START.x + st.power * 640 + st.wind * 70;
      st.anim = { t: 0, landX, hit: Math.abs(landX - BIN.x) < BIN.w / 2 };
    }
    const onKey = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (e.type === 'keydown' && !e.repeat) launch();
      }
    };
    window.addEventListener('keydown', onKey);
    canvas.addEventListener('pointerdown', launch);

    function update(dt) {
      if (!st.anim) {
        st.power += st.dir * dt * 0.9;
        if (st.power > 1) { st.power = 1; st.dir = -1; }
        if (st.power < 0) { st.power = 0; st.dir = 1; }
      } else {
        st.anim.t += dt / 0.9;
        if (st.anim.t >= 1) {
          st.throwsLeft -= 1;
          if (st.anim.hit) st.hits += 1;
          st.msg = st.anim.hit ? '¡Canasta!' : st.anim.landX < BIN.x ? 'Corto…' : 'Largo…';
          st.msgT = 1.1;
          st.anim = null;
          newWind();
          if (st.throwsLeft <= 0) {
            st.running = false;
            setTimeout(() => onEnd({ won: st.hits >= 3, summary: `${st.hits} de ${THROWS} canastas` }), 900);
          }
        }
      }
      if (st.msgT > 0) st.msgT -= dt;
    }

    function draw() {
      g.fillStyle = '#1c1917';
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#292524';
      g.fillRect(0, 340, W, 60);
      g.fillStyle = '#64748b';
      g.beginPath();
      g.moveTo(BIN.x - BIN.w / 2, BIN.top);
      g.lineTo(BIN.x + BIN.w / 2, BIN.top);
      g.lineTo(BIN.x + BIN.w / 2 - 8, 345);
      g.lineTo(BIN.x - BIN.w / 2 + 8, 345);
      g.closePath();
      g.fill();
      g.fillStyle = '#94a3b8';
      g.fillRect(BIN.x - BIN.w / 2 - 4, BIN.top - 4, BIN.w + 8, 8);

      g.fillStyle = '#e2e8f0';
      g.font = '600 18px Geist, system-ui, sans-serif';
      g.textAlign = 'left';
      g.fillText(`Lanzamientos: ${st.throwsLeft}   ·   Canastas: ${st.hits}`, 24, 36);
      g.textAlign = 'right';
      const windTxt = st.wind === 0 ? 'Sin viento' : `Viento ${st.wind > 0 ? '→' : '←'} ${Math.abs(st.wind).toFixed(1)}`;
      g.fillText(windTxt, W - 24, 36);

      const bx = 24;
      const by = 60;
      const bw = 260;
      g.fillStyle = '#0f172a';
      g.fillRect(bx, by, bw, 16);
      const grad = g.createLinearGradient(bx, 0, bx + bw, 0);
      grad.addColorStop(0, '#22c55e');
      grad.addColorStop(0.6, '#fbbf24');
      grad.addColorStop(1, '#ef4444');
      g.fillStyle = grad;
      g.fillRect(bx, by, bw * st.power, 16);
      g.strokeStyle = 'rgba(255,255,255,0.4)';
      g.strokeRect(bx, by, bw, 16);
      g.textAlign = 'left';
      g.font = '500 13px Geist, system-ui, sans-serif';
      g.fillStyle = '#94a3b8';
      g.fillText('Potencia', bx, by + 34);

      let px = START.x;
      let py = START.y;
      if (st.anim) {
        const t = st.anim.t;
        const endY = st.anim.hit ? BIN.top + 20 : 335;
        px = START.x + (st.anim.landX - START.x) * t;
        py = START.y + (endY - START.y) * t - Math.sin(Math.PI * t) * 210;
      }
      g.fillStyle = '#f8fafc';
      g.beginPath();
      g.arc(px, py, 11, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#cbd5e1';
      g.beginPath();
      g.moveTo(px - 6, py - 3);
      g.lineTo(px + 5, py + 4);
      g.stroke();

      if (st.msgT > 0) {
        g.textAlign = 'center';
        g.font = '700 34px Geist, system-ui, sans-serif';
        g.fillStyle = st.msg === '¡Canasta!' ? '#4ade80' : '#fca5a5';
        g.fillText(st.msg, W / 2, 180);
      }
    }

    function loop(now) {
      const dt = Math.min((now - last) / 1000, 0.033);
      last = now;
      update(dt);
      draw();
      if (st.running || st.msgT > 0) raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return {
      stop() {
        st.running = false;
        cancelAnimationFrame(raf);
        window.removeEventListener('keydown', onKey);
      },
    };
  }

  const DEFS = {
    'game-pingpong': { title: 'Ping Pong vs CPU', icon: 'bi-record-circle', desc: 'Mueve tu pala con el ratón, el dedo o las teclas W/S (↑/↓). Gana quien llegue primero a 5 puntos.', factory: (host, mg, done) => createPingPong(host, mg.difficulty, done) },
    'game-memory': { title: 'Memoria Corporativa', icon: 'bi-grid-3x3-gap-fill', desc: 'Encuentra las 6 parejas de tecnologías con el menor número de movimientos.', factory: (host, mg, done) => createMemory(host, done) },
    'game-toss': { title: 'Lanzamiento de Papel', icon: 'bi-trash3-fill', desc: 'Detén la barra de potencia (clic o Espacio) para encestar en la papelera. El viento cambia en cada lanzamiento. 5 intentos.', factory: (host, mg, done) => createPaperToss(host, done) },
  };

  const Minigames = {
    COST,
    difficulty: 'normal',

    init() {
      this.el = document.getElementById('gameModal');
      this.modal = bootstrap.Modal.getOrCreateInstance(this.el);
      this.body = document.getElementById('game-body');
      this.titleEl = document.getElementById('gameModalLabel');
      this.el.addEventListener('hidden.bs.modal', () => this.stop());
      this.body.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn || btn.disabled) return;
        if (btn.dataset.action === 'play') this.start();
        if (btn.dataset.action === 'intro') this.renderIntro();
        if (btn.dataset.action === 'close') this.modal.hide();
      });
      this.body.addEventListener('change', (e) => {
        if (e.target.name === 'difficulty') this.difficulty = e.target.value;
      });
    },

    open(id) {
      this.current = id;
      this.renderIntro();
      this.modal.show();
    },

    energyBlock() {
      const d = GameState.data;
      const can = d.energy + 1e-9 >= COST;
      return {
        can,
        html: `
          <div class="energy-cost ${can ? '' : 'is-blocked'}">
            <div><span class="small text-secondary d-block">Coste por partida</span><strong><i class="bi bi-lightning-charge-fill" aria-hidden="true"></i> ${fmtEnergy(COST)} de energía</strong></div>
            <div class="text-end"><span class="small text-secondary d-block">Tu energía</span><strong>${fmtEnergy(d.energy)} / ${d.maxEnergy}</strong></div>
          </div>
          ${can ? '' : '<div class="feedback feedback-warning mt-3"><i class="bi bi-lock-fill" aria-hidden="true"></i> <strong>Energía insuficiente.</strong> Completa bloques en la Academia Técnica, la Cámara de Inglés o Habilidades Blandas para recargarla. La energía no se puede comprar con monedas.</div>'}`,
      };
    },

    renderIntro() {
      this.stop();
      const def = DEFS[this.current];
      this.titleEl.innerHTML = `<i class="bi ${def.icon} me-2 text-warning" aria-hidden="true"></i>${esc(def.title)}`;
      const energy = this.energyBlock();
      const diff = this.current === 'game-pingpong' ? `
        <fieldset class="mt-3">
          <legend class="form-label small text-secondary mb-2">Dificultad de la CPU</legend>
          <div class="btn-group w-100" role="group">
            ${[['easy', 'Fácil'], ['normal', 'Normal'], ['hard', 'Difícil']].map(([v, l]) => `
              <input type="radio" class="btn-check" name="difficulty" id="diff-${v}" value="${v}" ${this.difficulty === v ? 'checked' : ''}>
              <label class="btn btn-outline-light" for="diff-${v}">${l}</label>`).join('')}
          </div>
        </fieldset>` : '';
      this.body.innerHTML = `
        <p>${esc(def.desc)}</p>
        ${energy.html}
        ${diff}
        <div class="d-flex justify-content-end gap-2 mt-4">
          <button type="button" class="btn btn-outline-light" data-action="close">Volver</button>
          <button type="button" class="btn btn-accent" data-action="play" ${energy.can ? '' : 'disabled aria-disabled="true"'}>Jugar (−${fmtEnergy(COST)} energía)</button>
        </div>`;
    },

    start() {
      this.stop();
      if (!GameState.spendEnergy(COST)) {
        this.renderIntro();
        return;
      }
      GameState.data.stats.gamesPlayed += 1;
      GameState.markDaily('game');
      GameState.commit();
      UI.toast(`−${fmtEnergy(COST)} energía · ¡Disfruta de tu descanso activo!`, { variant: 'warning', icon: 'bi-lightning-charge' });
      this.body.innerHTML = '<div id="game-host" class="game-host"></div>';
      const host = this.body.querySelector('#game-host');
      this.instance = DEFS[this.current].factory(host, this, (result) => this.renderResult(result));
    },

    renderResult(result) {
      this.stop();
      if (!this.el.classList.contains('show')) return;
      const energy = this.energyBlock();
      this.body.innerHTML = `
        <div class="text-center py-2">
          <div class="complete-badge ${result.won ? '' : 'is-muted'}" aria-hidden="true"><i class="bi ${result.won ? 'bi-emoji-smile-fill' : 'bi-arrow-repeat'}"></i></div>
          <h3 class="h4 mt-3">${result.won ? '¡Buena partida!' : 'Partida terminada'}</h3>
          <p class="text-secondary">${esc(result.summary)}</p>
        </div>
        ${energy.html}
        <div class="d-flex justify-content-end gap-2 mt-4">
          <button type="button" class="btn btn-outline-light" data-action="close">Salir</button>
          <button type="button" class="btn btn-accent" data-action="play" ${energy.can ? '' : 'disabled aria-disabled="true"'}>Jugar otra vez (−${fmtEnergy(COST)})</button>
        </div>`;
    },

    stop() {
      if (this.instance) {
        this.instance.stop();
        this.instance = null;
      }
    },
  };

  window.Minigames = Minigames;
})();
