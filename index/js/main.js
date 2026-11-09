/* App bootstrap: onboarding with live 3D avatar preview, world wiring and station actions. */
(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);

  const Preview = {
    init(canvas) {
      this.canvas = canvas;
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
      this.camera.position.set(0, 1.7, 5.4);
      this.camera.lookAt(0, 1.1, 0);
      this.scene.add(new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 1));
      const key = new THREE.DirectionalLight(0xffffff, 0.8);
      key.position.set(3, 5, 4);
      this.scene.add(key);
      const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.2, 0.12, 40), new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.4, roughness: 0.4 }));
      pedestal.position.y = -0.06;
      this.scene.add(pedestal);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.025, 8, 64), new THREE.MeshBasicMaterial({ color: 0x2dd4bf }));
      ring.rotation.x = Math.PI / 2;
      this.scene.add(ring);
      this.holder = new THREE.Group();
      this.scene.add(this.holder);
      this.running = true;
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(canvas.parentElement);
      this.resize();
      const tick = () => {
        if (!this.running) return;
        this.holder.rotation.y += 0.01;
        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame(tick);
      };
      tick();
    },
    resize() {
      const el = this.canvas.parentElement;
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return;
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    },
    set(cfg) {
      this.holder.clear();
      this.holder.add(window.Avatar.build(cfg).root);
    },
    dispose() {
      this.running = false;
      if (this.ro) this.ro.disconnect();
      if (this.renderer) this.renderer.dispose();
    },
  };

  function deptById(id) {
    return window.CONTENT.departments.find((d) => d.id === id) || window.CONTENT.departments[0];
  }

  function readForm() {
    const form = $('#ob-form');
    return {
      name: $('#ob-name').value.trim(),
      gender: form.querySelector('input[name="gender"]:checked').value,
      preset: Number(form.querySelector('input[name="preset"]:checked').value),
      dept: $('#ob-dept').value,
    };
  }

  function updateOnboardingPreview() {
    const cfg = readForm();
    const dept = deptById(cfg.dept);
    const badge = $('#ob-badge');
    badge.style.setProperty('--dept', dept.color);
    badge.innerHTML = `<i class="bi ${dept.icon}" aria-hidden="true"></i> ${window.Util.esc(dept.label)}`;
    $('#ob-preview-name').textContent = cfg.name || 'Tu nombre';
    Preview.set({ gender: cfg.gender, preset: cfg.preset, deptColor: dept.color, equipped: GameState.data.equipped });
  }

  function setupOnboarding() {
    $('#preset-grid').innerHTML = window.CONTENT.presets.map((p) => `
      <div class="col-4">
        <input type="radio" class="btn-check" name="preset" id="preset-${p.id}" value="${p.id}" ${p.id === 0 ? 'checked' : ''}>
        <label class="preset-card" for="preset-${p.id}">
          <span class="swatches" aria-hidden="true"><span style="background:${p.skin}"></span><span style="background:${p.top}"></span><span style="background:${p.bottom}"></span></span>
          <span class="preset-name">${p.name}</span>
          <span class="preset-desc">${p.desc}</span>
        </label>
      </div>`).join('');
    $('#ob-dept').innerHTML = window.CONTENT.departments.map((d) => `<option value="${d.id}">${d.label}</option>`).join('');

    const saved = GameState.data.player;
    if (saved) {
      $('#ob-name').value = saved.name;
      const g = document.getElementById(saved.gender === 'female' ? 'g-f' : 'g-m');
      if (g) g.checked = true;
      const p = document.getElementById(`preset-${saved.preset}`);
      if (p) p.checked = true;
      $('#ob-dept').value = saved.dept;
      $('#ob-saved').classList.remove('d-none');
      $('#ob-saved-name').textContent = saved.name;
      $('#ob-submit').textContent = 'Continuar en la Academia';
    }

    Preview.init($('#preview-canvas'));
    updateOnboardingPreview();

    const form = $('#ob-form');
    form.addEventListener('input', updateOnboardingPreview);
    form.addEventListener('change', updateOnboardingPreview);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const cfg = readForm();
      const nameInput = $('#ob-name');
      if (cfg.name.length < 2) {
        nameInput.classList.add('is-invalid');
        nameInput.setAttribute('aria-invalid', 'true');
        nameInput.focus();
        return;
      }
      nameInput.classList.remove('is-invalid');
      nameInput.removeAttribute('aria-invalid');
      GameState.data.player = cfg;
      GameState.commit();
      startGame();
    });
    $('#ob-name').addEventListener('input', () => {
      if ($('#ob-name').value.trim().length >= 2) $('#ob-name').classList.remove('is-invalid');
    });
  }

  const App = {
    avatarConfig() {
      const d = GameState.data;
      return { gender: d.player.gender, preset: d.player.preset, deptColor: deptById(d.player.dept).color, equipped: d.equipped };
    },

    refreshAvatar() {
      if (World.ready) World.setAvatar(this.avatarConfig());
    },

    sitDown() {
      World.sit();
      UI.showRest(true);
      UI.setPrompt(null);
    },

    standUp() {
      if (!World.player.sitting) return;
      World.stand();
      UI.showRest(false);
    },

    handleStation(st) {
      switch (st.id) {
        case 'aria': UI.openAria(); break;
        case 'lounge': World.player.sitting ? this.standUp() : this.sitDown(); break;
        case 'kiosk': UI.openShop(); break;
        case 'leaderboard': UI.openLeaderboard(); break;
        case 'elevator-up':
        case 'stairs-up':
          UI.fade(() => World.teleport('upper'));
          break;
        case 'elevator-down':
          UI.fade(() => World.teleport('hubFromUpper'));
          break;
        case 'tech-syllabus': Academy.openTrack('tech'); break;
        case 'tech-day1': Academy.openDay1(); break;
        case 'english': Academy.openTrack('english'); break;
        case 'soft': Academy.openTrack('soft'); break;
        case 'game-pingpong':
        case 'game-memory':
        case 'game-toss':
          Minigames.open(st.id);
          break;
        default: break;
      }
    },
  };
  window.App = App;

  function setupTouch() {
    const map = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    document.querySelectorAll('[data-dpad]').forEach((btn) => {
      const [x, z] = map[btn.dataset.dpad];
      const press = (e) => { e.preventDefault(); World.setVirtual(x, z); btn.classList.add('active'); };
      const release = () => { World.setVirtual(0, 0); btn.classList.remove('active'); };
      btn.addEventListener('pointerdown', press);
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointerleave', release);
      btn.addEventListener('pointercancel', release);
    });
    $('#touch-interact').addEventListener('click', () => {
      if (World.player.sitting) App.standUp();
      else World.interactNear();
    });
  }

  function startGame() {
    Preview.dispose();
    $('#onboarding').classList.add('d-none');
    $('#hud').classList.remove('d-none');

    World.isBlocked = () => UI.isBlocking();
    World.on.interact = (st) => App.handleStation(st);
    World.on.near = (st) => UI.setPrompt(st);
    World.on.zone = (z) => UI.setZone(z);
    World.on.stand = () => App.standUp();
    World.init($('#world'));
    App.refreshAvatar();

    GameState.touchStreak();
    GameState.ensureDaily();
    GameState.commit();
    UI.renderHUD();
    UI.toast(`Bienvenido/a, <strong>${window.Util.esc(GameState.data.player.name)}</strong>. Racha: ${GameState.data.streak.count} ${GameState.data.streak.count === 1 ? 'día' : 'días'}.`, { icon: 'bi-building' });
    if (!GameState.data.seenIntro) setTimeout(() => UI.openAria(), 700);
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!window.THREE) {
      document.body.innerHTML = '<p class="p-4">No se pudo cargar el motor 3D. Revisa tu conexión e inténtalo de nuevo.</p>';
      return;
    }
    GameState.load();
    UI.init();
    Academy.init();
    Minigames.init();
    setupOnboarding();
    setupTouch();
  });
})();
