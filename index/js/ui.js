/* Bootstrap UI overlay: HUD, toasts, ARIA onboarding, shop, leaderboards, analytics and rest zone. */
(function () {
  'use strict';

  const { esc, fmtEnergy, clamp } = window.Util;
  const $ = (sel) => document.querySelector(sel);

  const UI = {
    resting: false,
    ariaPage: 0,

    init() {
      this.modals = {
        aria: bootstrap.Modal.getOrCreateInstance('#ariaModal'),
        shop: bootstrap.Modal.getOrCreateInstance('#shopModal'),
        leader: bootstrap.Modal.getOrCreateInstance('#leaderModal'),
        help: bootstrap.Modal.getOrCreateInstance('#helpModal'),
      };
      this.progress = bootstrap.Offcanvas.getOrCreateInstance('#progressPanel');

      $('#btn-progress').addEventListener('click', () => { this.renderProgress(); this.progress.toggle(); });
      $('#btn-leader').addEventListener('click', () => this.openLeaderboard());
      $('#btn-help').addEventListener('click', () => this.modals.help.show());
      $('#btn-reset').addEventListener('click', () => {
        if (window.confirm('¿Seguro que quieres borrar todo tu progreso? Esta acción no se puede deshacer.')) {
          GameState.reset();
          window.location.reload();
        }
      });

      $('#aria-prev').addEventListener('click', () => this.renderAria(this.ariaPage - 1));
      $('#aria-next').addEventListener('click', () => {
        if (this.ariaPage >= this.ariaPages().length - 1) this.modals.aria.hide();
        else this.renderAria(this.ariaPage + 1);
      });
      $('#ariaModal').addEventListener('hidden.bs.modal', () => {
        if (!GameState.data.seenIntro) {
          GameState.data.seenIntro = true;
          GameState.commit();
        }
      });

      $('#shop-body').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-shop]');
        if (!btn || btn.disabled) return;
        this.shopAction(btn.dataset.shop, btn.dataset.id);
      });
      document.querySelectorAll('#leaderModal [data-board]').forEach((b) => b.addEventListener('click', () => this.renderLeaderboard(b.dataset.board)));

      $('#rest-stand').addEventListener('click', () => window.App.standUp());
      $('#hud-prompt').addEventListener('click', () => World.interactNear());

      GameState.onChange(() => {
        this.renderHUD();
        if ($('#progressPanel').classList.contains('show')) this.renderProgress();
      });
    },

    isBlocking() {
      return !!document.querySelector('.modal.show, .modal-backdrop') || !$('#onboarding').classList.contains('d-none');
    },

    // ---------- HUD ----------
    renderHUD() {
      const d = GameState.data;
      if (!d.player) return;
      const dept = window.CONTENT.departments.find((x) => x.id === d.player.dept) || window.CONTENT.departments[0];
      const preset = window.CONTENT.presets[d.player.preset];
      $('#hud-name').textContent = d.player.name;
      const badge = $('#hud-dept');
      badge.innerHTML = `<i class="bi ${dept.icon}" aria-hidden="true"></i> ${esc(dept.label)}`;
      badge.style.setProperty('--dept', dept.color);
      $('#hud-avatar').style.setProperty('--dept', dept.color);
      $('#hud-avatar').style.background = preset.top;
      $('#hud-avatar').textContent = d.player.name.trim().charAt(0).toUpperCase();

      const bar = $('#hud-energy');
      bar.innerHTML = Array.from({ length: d.maxEnergy }, (_, i) => {
        const fill = clamp(d.energy - i, 0, 1) * 100;
        return `<span class="energy-seg"><span style="width:${fill}%"></span></span>`;
      }).join('');
      bar.setAttribute('aria-valuenow', String(d.energy));
      bar.setAttribute('aria-valuetext', `${fmtEnergy(d.energy)} de ${d.maxEnergy}`);
      $('#hud-energy-text').textContent = `${fmtEnergy(d.energy)} / ${d.maxEnergy}`;
      $('#hud-tokens').textContent = d.tokens;
    },

    setZone(name) {
      const el = $('#hud-zone');
      el.textContent = name;
      el.classList.remove('pulse');
      void el.offsetWidth;
      el.classList.add('pulse');
    },

    setPrompt(station) {
      const el = $('#hud-prompt');
      if (!station) {
        el.classList.add('d-none');
        return;
      }
      el.innerHTML = `<kbd>E</kbd><span>${esc(station.prompt)}</span>`;
      el.classList.remove('d-none');
    },

    toast(message, opts) {
      const { variant = 'info', icon = 'bi-info-circle-fill' } = opts || {};
      const wrap = $('#toasts');
      const el = document.createElement('div');
      el.className = `toast hud-toast toast-${variant}`;
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      el.setAttribute('aria-atomic', 'true');
      el.innerHTML = `<div class="d-flex align-items-start gap-2 py-2 px-3"><i class="bi ${icon} mt-1" aria-hidden="true"></i><div class="small flex-grow-1">${message}</div></div>`;
      wrap.appendChild(el);
      el.addEventListener('hidden.bs.toast', () => el.remove());
      bootstrap.Toast.getOrCreateInstance(el, { delay: 3400 }).show();
    },

    fade(midway) {
      const f = $('#fade');
      f.classList.add('on');
      setTimeout(() => {
        midway();
        setTimeout(() => f.classList.remove('on'), 120);
      }, 320);
    },

    // ---------- Rest zone ----------
    showRest(on) {
      this.resting = on;
      const el = $('#rest-overlay');
      el.classList.toggle('d-none', !on);
      clearInterval(this.restTimer);
      if (on) {
        const lines = ['Inhala profundamente…', 'Mantén el aire…', 'Exhala despacio…', 'Relaja los hombros…'];
        let i = 0;
        $('#rest-text').textContent = lines[0];
        this.restTimer = setInterval(() => {
          i = (i + 1) % lines.length;
          $('#rest-text').textContent = lines[i];
        }, 3000);
      }
    },

    // ---------- ARIA ----------
    ariaPages() {
      const d = GameState.data;
      const name = esc(d.player ? d.player.name : '');
      const task = (done, label) => `<li class="task-row ${done ? 'done' : ''}"><i class="bi ${done ? 'bi-check-circle-fill' : 'bi-circle'}" aria-hidden="true"></i><span>${label}</span><span class="visually-hidden">${done ? '(completada)' : '(pendiente)'}</span></li>`;
      return [
        { title: `¡Hola, ${name}! Soy ARIA`, html: `<p>Soy tu asistente de formación. Esta academia convierte tu desarrollo profesional en una experiencia de juego: aprendes, ganas recompensas y desbloqueas nuevos contenidos.</p><ul class="list-unstyled d-grid gap-2"><li class="info-row"><i class="bi bi-cpu" style="color:#3b82f6" aria-hidden="true"></i> <span><strong>Ala derecha:</strong> Academia Técnica Full-Stack.</span></li><li class="info-row"><i class="bi bi-translate" style="color:#a855f7" aria-hidden="true"></i> <span><strong>Ala izquierda:</strong> Cámara de Inglés y Cámara de Habilidades Blandas.</span></li><li class="info-row"><i class="bi bi-controller" style="color:#f59e0b" aria-hidden="true"></i> <span><strong>Planta superior:</strong> Zona de Ocio, accesible por el ascensor o las escaleras.</span></li></ul>` },
        { title: 'Cómo moverte', html: `<ul class="list-unstyled d-grid gap-2"><li class="info-row"><kbd>W A S D</kbd> <span>o las flechas para caminar.</span></li><li class="info-row"><i class="bi bi-mouse" aria-hidden="true"></i> <span>Haz clic en el suelo para desplazarte o en un punto de interés para ir hacia él.</span></li><li class="info-row"><kbd>E</kbd> <span>para interactuar cuando aparezca el aviso en pantalla.</span></li><li class="info-row"><i class="bi bi-phone" aria-hidden="true"></i> <span>En móvil, usa la cruceta táctil y el botón de interacción.</span></li></ul>` },
        { title: 'Economía y energía', html: `<p><i class="bi bi-coin text-warning" aria-hidden="true"></i> <strong>Monedas de Talento:</strong> las ganas superando bloques y fases. Gástalas en el Kiosco de Talento para personalizar tu avatar.</p><p><i class="bi bi-lightning-charge-fill text-info" aria-hidden="true"></i> <strong>Barra de Energía (máx. 5):</strong> cada minijuego cuesta 2,5 puntos. La energía <strong>no se puede comprar</strong>: solo se recupera aprendiendo en las academias.</p><p class="mb-0"><i class="bi bi-lock-fill" aria-hidden="true"></i> Las fases avanzadas permanecen bloqueadas hasta que superas la anterior.</p>` },
        { title: 'Tus tareas de hoy', html: `<ul class="list-unstyled d-grid gap-2 mb-3">${task(d.daily.tech, 'Supera un bloque en la Academia Técnica')}${task(d.daily.language, 'Resuelve un bloque en la Cámara de Inglés')}${task(d.daily.soft, 'Completa un escenario de Habilidades Blandas')}${task(d.daily.game, 'Tómate un descanso activo en la Zona de Ocio')}</ul><p class="mb-0 text-secondary small"><i class="bi bi-fire text-warning" aria-hidden="true"></i> Racha actual: <strong class="text-light">${d.streak.count} ${d.streak.count === 1 ? 'día' : 'días'}</strong>. Vuelve mañana para mantenerla.</p>` },
      ];
    },

    openAria() {
      this.renderAria(0);
      this.modals.aria.show();
    },

    renderAria(page) {
      const pages = this.ariaPages();
      this.ariaPage = clamp(page, 0, pages.length - 1);
      const p = pages[this.ariaPage];
      $('#ariaModalLabel').textContent = p.title;
      $('#aria-body').innerHTML = p.html;
      $('#aria-steps').innerHTML = pages.map((_, i) => `<span class="${i === this.ariaPage ? 'on' : ''}"></span>`).join('');
      $('#aria-steps').setAttribute('aria-label', `Paso ${this.ariaPage + 1} de ${pages.length}`);
      $('#aria-prev').disabled = this.ariaPage === 0;
      $('#aria-next').textContent = this.ariaPage === pages.length - 1 ? '¡Empezar!' : 'Siguiente';
    },

    // ---------- Shop ----------
    openShop() {
      this.renderShop();
      this.modals.shop.show();
    },

    renderShop() {
      const d = GameState.data;
      const slotNames = { hat: 'Sombrero', outfit: 'Prenda', aura: 'Efecto' };
      $('#shop-tokens').textContent = d.tokens;
      $('#shop-body').innerHTML = window.CONTENT.shop.map((item) => {
        const owned = d.owned.includes(item.id);
        const equipped = d.equipped[item.slot] === item.id;
        let btn;
        if (equipped) btn = `<button type="button" class="btn btn-sm btn-outline-light w-100" data-shop="unequip" data-id="${item.id}">Quitar</button>`;
        else if (owned) btn = `<button type="button" class="btn btn-sm btn-accent w-100" data-shop="equip" data-id="${item.id}">Equipar</button>`;
        else if (d.tokens >= item.price) btn = `<button type="button" class="btn btn-sm btn-warning w-100" data-shop="buy" data-id="${item.id}"><i class="bi bi-coin" aria-hidden="true"></i> Comprar · ${item.price}</button>`;
        else btn = `<button type="button" class="btn btn-sm btn-outline-secondary w-100" disabled aria-disabled="true">Faltan ${item.price - d.tokens} monedas</button>`;
        return `
          <div class="col-6 col-md-4">
            <div class="shop-card ${equipped ? 'is-equipped' : ''}">
              <span class="shop-icon" aria-hidden="true" style="${item.color ? `color:${item.color}` : ''}"><i class="bi ${item.icon}"></i></span>
              <span class="badge text-bg-dark border border-secondary-subtle">${slotNames[item.slot]}</span>
              <h3 class="shop-name">${esc(item.name)}</h3>
              <p class="shop-desc">${esc(item.desc)}</p>
              ${btn}
            </div>
          </div>`;
      }).join('');
    },

    shopAction(action, id) {
      const d = GameState.data;
      const item = window.CONTENT.shop.find((i) => i.id === id);
      if (!item) return;
      if (action === 'buy') {
        if (d.tokens < item.price || d.owned.includes(id)) return;
        d.tokens -= item.price;
        d.owned.push(id);
        d.equipped[item.slot] = id;
        this.toast(`Has desbloqueado <strong>${esc(item.name)}</strong>`, { variant: 'success', icon: 'bi-bag-check-fill' });
      } else if (action === 'equip') {
        d.equipped[item.slot] = id;
      } else if (action === 'unequip') {
        d.equipped[item.slot] = null;
      }
      GameState.commit();
      window.App.refreshAvatar();
      this.renderShop();
    },

    // ---------- Leaderboards ----------
    leaderEntries(kind) {
      const d = GameState.data;
      const entries = window.CONTENT.seedLeaders[kind].map(([name, score]) => ({ name, score, me: false }));
      const score = kind === 'tech' ? d.techPoints + d.day1Best : d.commPoints;
      entries.push({ name: d.player ? d.player.name : 'Tú', score, me: true });
      return entries.sort((a, b) => b.score - a.score || (a.me ? -1 : 1));
    },

    openLeaderboard() {
      this.renderLeaderboard('tech');
      this.modals.leader.show();
    },

    renderLeaderboard(kind) {
      document.querySelectorAll('#leaderModal [data-board]').forEach((b) => {
        const on = b.dataset.board === kind;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', String(on));
      });
      const rows = this.leaderEntries(kind).map((e, i) => `
        <li class="leader-row ${e.me ? 'is-me' : ''}">
          <span class="leader-rank rank-${i + 1}">${i + 1}</span>
          <span class="flex-grow-1 text-truncate">${esc(e.name)}${e.me ? ' <span class="badge text-bg-info ms-1">Tú</span>' : ''}</span>
          <span class="fw-semibold">${e.score} <span class="small text-secondary">pts</span></span>
        </li>`).join('');
      const note = kind === 'tech'
        ? 'Puntos de la Academia Técnica + mejor resultado de la Evaluación Día 1.'
        : 'Puntos de la Cámara de Inglés + Habilidades Blandas.';
      $('#leader-body').innerHTML = `<p class="small text-secondary">${note}</p><ol class="leader-list">${rows}</ol>`;
    },

    // ---------- Analytics ----------
    skillCoverage() {
      return {
        front: GameState.solvedCount('tech', ['p1', 'p2']) / 6,
        back: GameState.solvedCount('tech', ['p3', 'p4']) / 6,
        soft: GameState.solvedCount('soft', ['s1', 's2']) / 6,
        english: GameState.solvedCount('english', ['a1', 'a2', 'b1']) / 9,
      };
    },

    renderProgress() {
      const d = GameState.data;
      const cov = this.skillCoverage();
      const eff = d.energySpent > 0 ? `${Math.round((d.energyEarned / d.energySpent) * 100)}%` : '—';
      const skills = [
        ['Front-End', cov.front, '#3b82f6'],
        ['Back-End', cov.back, '#22d3ee'],
        ['Habilidades Blandas', cov.soft, '#10b981'],
        ['Inglés', cov.english, '#a855f7'],
      ];
      const tracks = Object.values(window.CONTENT.tracks).map((t) => `
        <div class="mb-2"><p class="small fw-semibold mb-1">${esc(t.title)}</p>
          <div class="d-flex flex-wrap gap-1">${t.levels.map((l, i) => {
            const passed = GameState.isLevelPassed(t.key, l.id);
            const open = GameState.isUnlocked(t.key, i);
            return `<span class="phase-pill ${passed ? 'passed' : open ? 'open' : 'locked'}" title="${esc(l.title)}"><i class="bi ${passed ? 'bi-check-lg' : open ? 'bi-unlock' : 'bi-lock-fill'}" aria-hidden="true"></i> ${esc(l.title.split(' · ')[0])}<span class="visually-hidden"> ${passed ? 'superada' : open ? 'disponible' : 'bloqueada'}</span></span>`;
          }).join('')}</div>
        </div>`).join('');

      $('#progress-body').innerHTML = `
        <section aria-labelledby="radar-title">
          <h3 class="panel-title" id="radar-title">Cobertura de competencias</h3>
          <canvas id="radar" width="300" height="300" class="radar" role="img" aria-label="Gráfico radar: Front-End ${Math.round(cov.front * 100)}%, Back-End ${Math.round(cov.back * 100)}%, Habilidades Blandas ${Math.round(cov.soft * 100)}%, Inglés ${Math.round(cov.english * 100)}%"></canvas>
          <div class="d-grid gap-2 mt-2">${skills.map(([n, v, c]) => `
            <div><div class="d-flex justify-content-between small"><span>${n}</span><span>${Math.round(v * 100)}%</span></div>
            <div class="progress" role="progressbar" aria-label="${n}" aria-valuenow="${Math.round(v * 100)}" aria-valuemin="0" aria-valuemax="100" style="height:6px"><div class="progress-bar" style="width:${v * 100}%;background:${c}"></div></div></div>`).join('')}
          </div>
        </section>
        <section class="mt-4" aria-labelledby="metrics-title">
          <h3 class="panel-title" id="metrics-title">Métricas</h3>
          <div class="row g-2">
            <div class="col-6"><div class="metric"><i class="bi bi-fire text-warning" aria-hidden="true"></i><span class="metric-val">${d.streak.count}</span><span class="metric-lbl">Racha diaria (días)</span></div></div>
            <div class="col-6"><div class="metric"><i class="bi bi-speedometer2 text-info" aria-hidden="true"></i><span class="metric-val">${eff}</span><span class="metric-lbl">Eficiencia energética</span></div></div>
            <div class="col-6"><div class="metric"><i class="bi bi-battery-charging text-success" aria-hidden="true"></i><span class="metric-val">${fmtEnergy(d.energyEarned)}</span><span class="metric-lbl">Energía ganada</span></div></div>
            <div class="col-6"><div class="metric"><i class="bi bi-battery-half text-danger" aria-hidden="true"></i><span class="metric-val">${fmtEnergy(d.energySpent)}</span><span class="metric-lbl">Energía invertida</span></div></div>
            <div class="col-6"><div class="metric"><i class="bi bi-check2-square text-info" aria-hidden="true"></i><span class="metric-val">${d.stats.blocksSolved}</span><span class="metric-lbl">Bloques superados</span></div></div>
            <div class="col-6"><div class="metric"><i class="bi bi-controller text-warning" aria-hidden="true"></i><span class="metric-val">${d.stats.gamesPlayed}</span><span class="metric-lbl">Partidas jugadas</span></div></div>
          </div>
          <p class="small text-secondary mt-2 mb-0">La eficiencia compara la energía obtenida aprendiendo con la invertida en ocio.</p>
        </section>
        <section class="mt-4" aria-labelledby="curr-title">
          <h3 class="panel-title" id="curr-title">Estado del temario</h3>
          ${tracks}
        </section>`;
      this.drawRadar($('#radar'), cov);
    },

    drawRadar(canvas, cov) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const size = 300;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      const g = canvas.getContext('2d');
      g.scale(dpr, dpr);
      const cx = size / 2;
      const cy = size / 2;
      const R = 100;
      const axes = [['Front-End', cov.front], ['Back-End', cov.back], ['Hab. Blandas', cov.soft], ['Inglés', cov.english]];
      const angle = (i) => -Math.PI / 2 + (i * Math.PI * 2) / axes.length;
      g.strokeStyle = 'rgba(148,163,184,0.25)';
      g.lineWidth = 1;
      [0.25, 0.5, 0.75, 1].forEach((f) => {
        g.beginPath();
        axes.forEach((_, i) => {
          const x = cx + Math.cos(angle(i)) * R * f;
          const y = cy + Math.sin(angle(i)) * R * f;
          if (i === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        });
        g.closePath();
        g.stroke();
      });
      axes.forEach((_, i) => {
        g.beginPath();
        g.moveTo(cx, cy);
        g.lineTo(cx + Math.cos(angle(i)) * R, cy + Math.sin(angle(i)) * R);
        g.stroke();
      });
      g.beginPath();
      axes.forEach(([, v], i) => {
        const r = R * Math.max(0.04, v);
        const x = cx + Math.cos(angle(i)) * r;
        const y = cy + Math.sin(angle(i)) * r;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      });
      g.closePath();
      g.fillStyle = 'rgba(45,212,191,0.28)';
      g.fill();
      g.strokeStyle = '#2dd4bf';
      g.lineWidth = 2;
      g.stroke();
      g.fillStyle = '#e2e8f0';
      g.font = '600 12px Geist, system-ui, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      axes.forEach(([label, v], i) => {
        const x = cx + Math.cos(angle(i)) * (R + 30);
        const y = cy + Math.sin(angle(i)) * (R + 22);
        g.fillText(label, x, y - 6);
        g.fillStyle = '#94a3b8';
        g.fillText(`${Math.round(v * 100)}%`, x, y + 9);
        g.fillStyle = '#e2e8f0';
      });
    },
  };

  window.UI = UI;
})();
