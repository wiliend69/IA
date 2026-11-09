/* Academy engine: syllabus with strict prerequisite locking, challenge blocks, rewards and Day 1 evaluation. */
(function () {
  'use strict';

  const { esc, shuffle, fmtEnergy } = window.Util;
  const REWARD = { blockTokens: 5, blockEnergy: 1, blockPoints: 10, levelTokens: 15, levelEnergy: 2, levelPoints: 30, day1Tokens: 10, day1Energy: 1 };

  function normalize(v) {
    return String(v || '').toLowerCase().trim().replace(/[<>/\s:;"']/g, '');
  }

  const Academy = {
    init() {
      this.el = document.getElementById('academyModal');
      this.modal = bootstrap.Modal.getOrCreateInstance(this.el);
      this.body = document.getElementById('academy-body');
      this.titleEl = document.getElementById('academyModalLabel');
      this.ctx = null;

      this.body.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn || btn.disabled) return;
        this.handle(btn.dataset.action, btn.dataset.value);
      });
      this.body.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' || !e.target.matches('[data-role="answer"]')) return;
        if (e.isComposing || e.keyCode === 229) return;
        e.preventDefault();
        if (this.ctx && !this.ctx.solvedNow) this.check();
      });
    },

    handle(action, value) {
      const ctx = this.ctx;
      switch (action) {
        case 'start-level': this.startLevel(Number(value)); break;
        case 'back': this.renderSyllabus(); break;
        case 'select':
          if (ctx.solvedNow) return;
          ctx.selection = Number(value);
          this.body.querySelectorAll('.option-btn').forEach((b) => {
            const on = Number(b.dataset.value) === ctx.selection;
            b.classList.toggle('is-selected', on);
            b.setAttribute('aria-checked', String(on));
          });
          break;
        case 'place':
          if (ctx.solvedNow) return;
          ctx.order.push(Number(value));
          this.renderOrderArea();
          break;
        case 'unplace':
          if (ctx.solvedNow) return;
          ctx.order = ctx.order.filter((i) => i !== Number(value));
          this.renderOrderArea();
          break;
        case 'check': this.check(); break;
        case 'next': this.next(); break;
        case 'next-level': this.startLevel(ctx.levelIndex + 1); break;
        case 'day1-start': this.startDay1(); break;
        case 'close': this.modal.hide(); break;
        default: break;
      }
    },

    // ---------- Track syllabus ----------
    openTrack(trackKey) {
      this.ctx = { mode: 'track', track: trackKey };
      this.renderSyllabus();
      this.modal.show();
    },

    renderSyllabus() {
      const track = window.CONTENT.tracks[this.ctx.track];
      this.ctx = { mode: 'track', track: this.ctx.track };
      this.titleEl.innerHTML = `<i class="bi ${track.icon} me-2" aria-hidden="true" style="color:${track.color}"></i>${esc(track.title)}`;
      const cards = track.levels.map((lvl, i) => {
        const unlocked = GameState.isUnlocked(track.key, i);
        const prog = GameState.data.progress[track.key][lvl.id];
        const solved = prog ? prog.solved : [false, false, false];
        const passed = !!(prog && prog.passed);
        const state = passed ? 'passed' : unlocked ? 'open' : 'locked';
        const icon = passed ? 'bi-check-circle-fill' : unlocked ? 'bi-play-circle-fill' : 'bi-lock-fill';
        const btn = passed ? 'Repasar' : unlocked ? (solved.some(Boolean) ? 'Continuar' : 'Comenzar') : 'Bloqueado';
        const prev = i > 0 ? track.levels[i - 1].title : '';
        return `
          <li class="level-card is-${state}">
            <span class="level-icon" aria-hidden="true"><i class="bi ${icon}"></i></span>
            <div class="flex-grow-1 min-w-0">
              <h3 class="level-title">${esc(lvl.title)}</h3>
              <p class="level-sub">${esc(lvl.subtitle)}</p>
              ${state === 'locked'
                ? `<p class="level-lock"><i class="bi bi-lock" aria-hidden="true"></i> Requiere superar: ${esc(prev)}</p>`
                : `<div class="block-dots" aria-label="${solved.filter(Boolean).length} de 3 bloques superados">${solved.map((s) => `<span class="${s ? 'on' : ''}"></span>`).join('')}</div>`}
            </div>
            <button type="button" class="btn btn-sm ${state === 'locked' ? 'btn-outline-secondary' : state === 'passed' ? 'btn-outline-light' : 'btn-accent'}"
              data-action="start-level" data-value="${i}" ${state === 'locked' ? 'disabled aria-disabled="true"' : ''}>${btn}</button>
          </li>`;
      }).join('');
      this.body.innerHTML = `
        <p class="text-secondary mb-3">${esc(track.subtitle)}</p>
        <div class="reward-legend mb-3">
          <span><i class="bi bi-coin" aria-hidden="true"></i> +${REWARD.blockTokens} monedas por bloque</span>
          <span><i class="bi bi-lightning-charge-fill" aria-hidden="true"></i> +${REWARD.blockEnergy} energía por bloque</span>
          <span><i class="bi bi-trophy-fill" aria-hidden="true"></i> +${REWARD.levelTokens} monedas y +${REWARD.levelEnergy} energía al superar la fase</span>
        </div>
        <ol class="level-list">${cards}</ol>`;
    },

    startLevel(index) {
      const track = window.CONTENT.tracks[this.ctx.track];
      if (!track.levels[index] || !GameState.isUnlocked(track.key, index)) return;
      const level = track.levels[index];
      const prog = GameState.levelProgress(track.key, level.id);
      const firstUnsolved = prog.solved.findIndex((s) => !s);
      this.ctx = { mode: 'track', track: track.key, levelIndex: index, block: prog.passed || firstUnsolved < 0 ? 0 : firstUnsolved };
      this.resetBlockState();
      this.renderBlock();
    },

    resetBlockState() {
      const ch = this.current();
      this.ctx.selection = null;
      this.ctx.order = [];
      this.ctx.solvedNow = false;
      this.ctx.pool = ch && ch.type === 'order' ? shuffle(ch.items.map((_, i) => i)) : [];
    },

    current() {
      const ctx = this.ctx;
      if (ctx.mode === 'day1') return window.CONTENT.day1[ctx.index];
      return window.CONTENT.tracks[ctx.track].levels[ctx.levelIndex].challenges[ctx.block];
    },

    englishMode() {
      if (this.ctx.mode !== 'track') return false;
      return !!window.CONTENT.tracks[this.ctx.track].levels[this.ctx.levelIndex].englishOnly;
    },

    renderBlock() {
      const ctx = this.ctx;
      const track = window.CONTENT.tracks[ctx.track];
      const level = track.levels[ctx.levelIndex];
      const prog = GameState.levelProgress(track.key, level.id);
      this.titleEl.innerHTML = `<i class="bi ${track.icon} me-2" aria-hidden="true" style="color:${track.color}"></i>${esc(level.title)}`;
      const header = `
        <div class="challenge-head">
          <button type="button" class="btn btn-sm btn-link text-decoration-none px-0" data-action="back"><i class="bi bi-arrow-left" aria-hidden="true"></i> Temario</button>
          <div class="d-flex align-items-center gap-2">
            <span class="small text-secondary">Bloque ${ctx.block + 1} de 3</span>
            <div class="block-dots" aria-hidden="true">${prog.solved.map((s, i) => `<span class="${s ? 'on' : ''} ${i === ctx.block ? 'cur' : ''}"></span>`).join('')}</div>
          </div>
        </div>`;
      this.renderChallenge(header, level.instruction);
    },

    renderChallenge(headerHtml, instruction) {
      const ch = this.current();
      const english = this.englishMode();
      let answer = '';
      if (ch.type === 'choice') {
        answer = `<div class="option-list" role="radiogroup" aria-label="${english ? 'Options' : 'Opciones'}">
          ${ch.options.map((o, i) => `<button type="button" role="radio" aria-checked="false" class="option-btn ${ch.mono ? 'mono' : ''}" data-action="select" data-value="${i}"><span class="option-key">${String.fromCharCode(65 + i)}</span><span>${esc(o)}</span></button>`).join('')}
        </div>`;
      } else if (ch.type === 'order') {
        answer = '<div id="order-area"></div>';
      } else if (ch.type === 'input') {
        answer = `<label class="form-label small text-secondary" for="answer-input">Tu respuesta</label>
          <input id="answer-input" data-role="answer" class="form-control code-input" autocomplete="off" spellcheck="false" placeholder="${esc(ch.placeholder || '')}">`;
      }

      this.body.innerHTML = `
        ${headerHtml}
        <p class="instruction"><i class="bi bi-info-circle" aria-hidden="true"></i> ${esc(instruction)}</p>
        <h3 class="challenge-title">${esc(ch.title)}</h3>
        ${ch.passage ? `<blockquote class="passage">${esc(ch.passage)}</blockquote>` : ''}
        ${ch.code ? `<pre class="code-block"><code>${esc(ch.code)}</code></pre>` : ''}
        ${ch.visual === 'flex' ? '<div class="flex-source"><span class="small text-secondary">Orden en el HTML:</span><span class="fbox a">Caja A</span><span class="fbox b">Caja B</span><span class="fbox c">Caja C</span></div>' : ''}
        <p class="challenge-prompt">${esc(ch.prompt)}</p>
        ${answer}
        <div id="feedback" class="mt-3" aria-live="polite"></div>
        <div class="d-flex justify-content-end gap-2 mt-3" id="challenge-actions">
          <button type="button" class="btn btn-accent" data-action="check">Comprobar</button>
        </div>`;
      if (ch.type === 'order') this.renderOrderArea();
      const input = this.body.querySelector('#answer-input');
      if (input) setTimeout(() => input.focus(), 50);
    },

    renderOrderArea() {
      const ch = this.current();
      const ctx = this.ctx;
      const area = this.body.querySelector('#order-area');
      if (!area) return;
      const english = this.englishMode();
      const conn = ch.connector || 'row';
      const placed = ctx.order.map((idx, i) => {
        const chip = `<button type="button" class="chip placed ${ch.mono ? 'mono' : ''}" data-action="unplace" data-value="${idx}" ${ctx.solvedNow ? 'disabled' : ''} aria-label="${esc(ch.items[idx])}, ${english ? 'remove' : 'quitar'}" style="${conn === 'nest' ? `margin-left:${i * 1.25}rem` : ''}"><span class="chip-num">${i + 1}</span>${esc(ch.items[idx])}</button>`;
        return conn === 'arrow' && i > 0 ? `<i class="bi bi-arrow-right connector" aria-hidden="true"></i>${chip}` : chip;
      }).join('');
      const pool = ctx.pool.filter((i) => !ctx.order.includes(i)).map((idx) =>
        `<button type="button" class="chip ${ch.mono ? 'mono' : ''}" data-action="place" data-value="${idx}" ${ctx.solvedNow ? 'disabled' : ''}>${esc(ch.items[idx])}</button>`
      ).join('');
      const vertical = conn === 'nest' || conn === 'sql' || conn === 'stack';
      area.innerHTML = `
        <p class="small text-secondary mb-1">${english ? 'Your sequence' : 'Tu secuencia'} <span class="opacity-75">(${english ? 'click a piece to remove it' : 'haz clic en una pieza para quitarla'})</span></p>
        <div class="order-target ${vertical ? 'vertical' : ''}" aria-live="polite">${placed || `<span class="order-empty">${english ? 'Select the pieces below in the correct order' : 'Selecciona las piezas de abajo en el orden correcto'}</span>`}</div>
        <p class="small text-secondary mb-1 mt-3">${english ? 'Available pieces' : 'Piezas disponibles'}</p>
        <div class="order-pool ${vertical ? 'vertical' : ''}">${pool || `<span class="order-empty">${english ? 'All pieces placed' : 'Todas las piezas colocadas'}</span>`}</div>`;
    },

    feedback(variant, html) {
      const el = this.body.querySelector('#feedback');
      if (el) el.innerHTML = `<div class="feedback feedback-${variant}">${html}</div>`;
    },

    check() {
      const ch = this.current();
      const ctx = this.ctx;
      if (ctx.solvedNow) return;
      const english = this.englishMode();
      let ok = false;
      if (ch.type === 'choice') {
        if (ctx.selection == null) return this.feedback('warning', english ? 'Select an option first.' : 'Selecciona una opción antes de comprobar.');
        ok = ctx.selection === ch.answer;
      } else if (ch.type === 'order') {
        if (ctx.order.length < ch.items.length) return this.feedback('warning', english ? 'Place every piece in the sequence.' : 'Coloca todas las piezas en la secuencia.');
        ok = ctx.order.every((idx, i) => ch.items[idx] === ch.answer[i]);
      } else if (ch.type === 'input') {
        const input = this.body.querySelector('#answer-input');
        const v = normalize(input.value);
        if (!v) return this.feedback('warning', 'Escribe una respuesta antes de comprobar.');
        ok = ch.answers.includes(v);
        input.classList.toggle('is-valid', ok);
        input.classList.toggle('is-invalid', !ok);
      }
      if (ok) this.onCorrect(ch);
      else this.onWrong(ch);
    },

    onWrong(ch) {
      const ctx = this.ctx;
      const english = this.englishMode();
      GameState.data.stats.attempts += 1;
      if (ctx.mode === 'day1') ctx.attempts[ctx.index] += 1;
      GameState.commit();
      let msg = english ? 'Not quite. Read the text again and try once more.' : 'No es correcto todavía. Revisa el enunciado e inténtalo de nuevo.';
      if (ch.feedback && ctx.selection != null) msg = `<strong>Consecuencia:</strong> ${esc(ch.feedback[ctx.selection])} Prueba otra opción.`;
      if (ctx.mode === 'day1') msg += ' <span class="opacity-75">(−25 puntos en este reto)</span>';
      this.feedback('danger', `<i class="bi bi-x-circle-fill" aria-hidden="true"></i> ${msg}`);
    },

    onCorrect(ch) {
      const ctx = this.ctx;
      ctx.solvedNow = true;
      const english = this.englishMode();
      this.body.querySelectorAll('[data-action="select"], [data-action="place"], [data-action="unplace"]').forEach((b) => { b.disabled = true; });
      const input = this.body.querySelector('#answer-input');
      if (input) input.readOnly = true;
      if (ch.type === 'choice') {
        const btn = this.body.querySelector(`.option-btn[data-value="${ch.answer}"]`);
        if (btn) btn.classList.add('is-correct');
      }

      let rewardHtml = '';
      let lastBlock;
      if (ctx.mode === 'track') {
        const track = window.CONTENT.tracks[ctx.track];
        const level = track.levels[ctx.levelIndex];
        const prog = GameState.levelProgress(track.key, level.id);
        if (!prog.solved[ctx.block]) {
          prog.solved[ctx.block] = true;
          GameState.addTokens(REWARD.blockTokens);
          const gained = GameState.addEnergy(REWARD.blockEnergy);
          GameState.data[track.pointsField] += REWARD.blockPoints;
          GameState.data.stats.blocksSolved += 1;
          GameState.markDaily(track.dailyKey);
          rewardHtml = this.rewardText(REWARD.blockTokens, gained);
          UI.toast(`Bloque superado · ${rewardHtml}`, { variant: 'success', icon: 'bi-check2-circle' });
        }
        GameState.commit();
        lastBlock = ctx.block >= 2;
      } else {
        const score = Math.max(25, 100 - 25 * ctx.attempts[ctx.index]);
        ctx.scores[ctx.index] = score;
        rewardHtml = `+${score} puntos`;
        if (!GameState.data.day1Solved[ctx.index]) {
          GameState.data.day1Solved[ctx.index] = true;
          GameState.addTokens(REWARD.day1Tokens);
          const gained = GameState.addEnergy(REWARD.day1Energy);
          GameState.markDaily('tech');
          rewardHtml += ` · ${this.rewardText(REWARD.day1Tokens, gained)}`;
        }
        GameState.commit();
        lastBlock = ctx.index >= 2;
      }

      const explain = ch.feedback ? ch.feedback[ch.answer] : ch.explain;
      this.feedback('success', `<i class="bi bi-check-circle-fill" aria-hidden="true"></i> <strong>${english ? 'Correct!' : '¡Correcto!'}</strong> ${esc(explain || '')}${rewardHtml ? `<div class="reward-line">${rewardHtml}</div>` : ''}`);
      const label = ctx.mode === 'day1'
        ? (lastBlock ? 'Ver resultado' : 'Siguiente reto')
        : (lastBlock ? 'Finalizar fase' : 'Siguiente bloque');
      this.body.querySelector('#challenge-actions').innerHTML = `<button type="button" class="btn btn-accent" data-action="next">${label} <i class="bi bi-arrow-right" aria-hidden="true"></i></button>`;
      this.body.querySelector('[data-action="next"]').focus();
    },

    rewardText(tokens, gainedEnergy) {
      const energy = gainedEnergy > 0 ? `+${fmtEnergy(gainedEnergy)} energía` : 'energía al máximo';
      return `<i class="bi bi-coin" aria-hidden="true"></i> +${tokens} monedas · <i class="bi bi-lightning-charge-fill" aria-hidden="true"></i> ${energy}`;
    },

    next() {
      const ctx = this.ctx;
      if (ctx.mode === 'day1') {
        if (ctx.index < 2) {
          ctx.index += 1;
          this.resetBlockState();
          this.renderDay1Block();
        } else {
          this.finishDay1();
        }
        return;
      }
      const track = window.CONTENT.tracks[ctx.track];
      const level = track.levels[ctx.levelIndex];
      const prog = GameState.levelProgress(track.key, level.id);
      if (ctx.block < 2) {
        ctx.block += 1;
        this.resetBlockState();
        this.renderBlock();
        return;
      }
      const missing = prog.solved.findIndex((s) => !s);
      if (missing >= 0) {
        ctx.block = missing;
        this.resetBlockState();
        this.renderBlock();
        return;
      }
      this.completeLevel(track, level, prog);
    },

    completeLevel(track, level, prog) {
      const ctx = this.ctx;
      const firstPass = !prog.passed;
      let rewardHtml = '';
      if (firstPass) {
        prog.passed = true;
        GameState.addTokens(REWARD.levelTokens);
        const gained = GameState.addEnergy(REWARD.levelEnergy);
        GameState.data[track.pointsField] += REWARD.levelPoints;
        rewardHtml = this.rewardText(REWARD.levelTokens, gained);
        GameState.commit();
      }
      const nextLevel = track.levels[ctx.levelIndex + 1];
      if (firstPass) {
        UI.toast(`<strong>¡Fase superada!</strong> ${nextLevel ? `Desbloqueado: ${esc(nextLevel.title)}` : 'Has completado todo el temario.'}`, { variant: 'success', icon: 'bi-trophy-fill' });
      }
      this.body.innerHTML = `
        <div class="text-center py-3">
          <div class="complete-badge" aria-hidden="true"><i class="bi bi-trophy-fill"></i></div>
          <h3 class="h4 mt-3">${firstPass ? '¡Fase superada!' : 'Repaso completado'}</h3>
          <p class="text-secondary">${esc(level.title)} · estado: <strong class="text-success">Superada</strong></p>
          ${rewardHtml ? `<p class="reward-line justify-content-center">${rewardHtml}</p>` : ''}
          ${nextLevel ? `<p class="mb-0"><i class="bi bi-unlock-fill text-info" aria-hidden="true"></i> Desbloqueado: <strong>${esc(nextLevel.title)}</strong></p>` : '<p class="mb-0">Has completado todas las fases de esta academia.</p>'}
          <div class="d-flex flex-wrap justify-content-center gap-2 mt-4">
            <button type="button" class="btn btn-outline-light" data-action="back">Volver al temario</button>
            ${nextLevel ? '<button type="button" class="btn btn-accent" data-action="next-level">Siguiente fase <i class="bi bi-arrow-right" aria-hidden="true"></i></button>' : '<button type="button" class="btn btn-accent" data-action="close">Cerrar</button>'}
          </div>
        </div>`;
    },

    // ---------- Day 1 evaluation ----------
    openDay1() {
      this.ctx = { mode: 'day1' };
      this.titleEl.innerHTML = '<i class="bi bi-terminal-fill me-2 text-info" aria-hidden="true"></i>Evaluación Día 1 · Sandbox de Código';
      const best = GameState.data.day1Best;
      this.body.innerHTML = `
        <p>Tres micro-retos de programación en un entorno sandbox. Escribe la respuesta exacta en cada uno.</p>
        <ul class="list-unstyled d-grid gap-2 mb-3">
          <li class="info-row"><i class="bi bi-1-circle-fill" aria-hidden="true"></i> Cada reto vale hasta <strong>100 puntos</strong>.</li>
          <li class="info-row"><i class="bi bi-2-circle-fill" aria-hidden="true"></i> Cada intento fallido resta 25 puntos (mínimo 25).</li>
          <li class="info-row"><i class="bi bi-3-circle-fill" aria-hidden="true"></i> Tu mejor resultado se publica en la <strong>Tabla de Clasificación Técnica</strong>.</li>
        </ul>
        <p class="text-secondary small">Mejor puntuación actual: <strong class="text-light">${best} / 300</strong></p>
        <div class="d-flex justify-content-end"><button type="button" class="btn btn-accent" data-action="day1-start">Comenzar evaluación</button></div>`;
      this.modal.show();
    },

    startDay1() {
      this.ctx = { mode: 'day1', index: 0, attempts: [0, 0, 0], scores: [] };
      this.resetBlockState();
      this.renderDay1Block();
    },

    renderDay1Block() {
      const ctx = this.ctx;
      const total = ctx.scores.reduce((a, b) => a + (b || 0), 0);
      const header = `
        <div class="challenge-head">
          <span class="small text-secondary">Reto ${ctx.index + 1} de 3</span>
          <span class="small">Puntuación: <strong>${total}</strong></span>
        </div>`;
      this.renderChallenge(header, 'Instrucción: completa el código del sandbox.');
    },

    finishDay1() {
      const ctx = this.ctx;
      const total = ctx.scores.reduce((a, b) => a + (b || 0), 0);
      const d = GameState.data;
      const record = total > d.day1Best;
      if (record) d.day1Best = total;
      GameState.commit();
      const board = UI.leaderEntries('tech');
      const rank = board.findIndex((e) => e.me) + 1;
      if (record) UI.toast(`Nuevo récord: ${total} puntos publicados en la Tabla de Clasificación Técnica`, { variant: 'success', icon: 'bi-bar-chart-fill' });
      this.body.innerHTML = `
        <div class="text-center py-3">
          <div class="complete-badge" aria-hidden="true"><i class="bi bi-clipboard2-check-fill"></i></div>
          <h3 class="h4 mt-3">Evaluación completada</h3>
          <p class="display-6 fw-semibold mb-1">${total} <span class="fs-5 text-secondary">/ 300</span></p>
          <p class="text-secondary">${record ? '¡Nuevo récord personal!' : `Tu mejor marca sigue siendo ${d.day1Best} puntos.`} Posición actual en la clasificación técnica: <strong class="text-light">#${rank}</strong></p>
          <div class="d-flex flex-wrap justify-content-center gap-2 mt-4">
            <button type="button" class="btn btn-outline-light" data-action="day1-start">Repetir evaluación</button>
            <button type="button" class="btn btn-accent" data-action="close">Cerrar</button>
          </div>
        </div>`;
    },
  };

  window.Academy = Academy;
})();
