/* 3D world: scene construction, AABB collisions, stations, top-down camera and player control. */
(function () {
  'use strict';

  const WALL_HEIGHT = 1.6;
  const WALL_T = 0.4;
  const PLAYER_RADIUS = 0.45;
  const UPPER_FLOOR_Z = -60;
  const CAMERA_OFFSET = new THREE.Vector3(0, 30, 20);
  const VIEW_SPAN = 24;
  const SPAWNS = {
    hub: { x: 0, z: 6, facing: Math.PI },
    hubFromUpper: { x: 0, z: -6.5, facing: 0 },
    upper: { x: 0, z: -74, facing: Math.PI },
  };
  const SEAT = { x: -7, z: 9.3, facing: Math.PI };

  function std(color, extra) {
    return new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.75, metalness: 0.05 }, extra || {}));
  }
  function glow(color, intensity) {
    return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity == null ? 0.8 : intensity, roughness: 0.4 });
  }

  function gridTexture(base, line, repeatX, repeatY) {
    const size = 256;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    g.fillStyle = base;
    g.fillRect(0, 0, size, size);
    g.strokeStyle = line;
    g.lineWidth = 3;
    g.strokeRect(0, 0, size, size);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeatX, repeatY);
    t.anisotropy = 4;
    return t;
  }

  function makeLabel(text, accent) {
    const c = document.createElement('canvas');
    const g = c.getContext('2d');
    const fs = 40;
    const font = `600 ${fs}px Geist, system-ui, -apple-system, Segoe UI, sans-serif`;
    g.font = font;
    const w = Math.ceil(g.measureText(text).width) + 56;
    const h = fs + 30;
    c.width = w;
    c.height = h;
    g.font = font;
    const r = 18;
    g.beginPath();
    g.moveTo(r, 0);
    g.lineTo(w - r, 0);
    g.quadraticCurveTo(w, 0, w, r);
    g.lineTo(w, h - r);
    g.quadraticCurveTo(w, h, w - r, h);
    g.lineTo(r, h);
    g.quadraticCurveTo(0, h, 0, h - r);
    g.lineTo(0, r);
    g.quadraticCurveTo(0, 0, r, 0);
    g.closePath();
    g.fillStyle = 'rgba(10, 15, 30, 0.88)';
    g.fill();
    g.lineWidth = 4;
    g.strokeStyle = accent || '#2dd4bf';
    g.stroke();
    g.fillStyle = '#f1f5f9';
    g.textBaseline = 'middle';
    g.fillText(text, 28, h / 2 + 2);
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    const scale = 0.02;
    sprite.scale.set(w * scale, h * scale, 1);
    sprite.renderOrder = 10;
    return sprite;
  }

  function splitSegments(from, to, gaps) {
    const out = [];
    let cur = from;
    (gaps || []).slice().sort((a, b) => a[0] - b[0]).forEach(([a, b]) => {
      if (a > cur) out.push([cur, a]);
      cur = Math.max(cur, b);
    });
    if (cur < to) out.push([cur, to]);
    return out;
  }

  const World = {
    ready: false,
    isBlocked: () => false,
    on: { interact() {}, near() {}, zone() {}, stand() {} },

    init(container) {
      if (this.ready) return;
      this.container = container;

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      container.appendChild(renderer.domElement);
      renderer.domElement.setAttribute('aria-label', 'Mundo 3D de la Academia Corporativa');
      renderer.domElement.setAttribute('role', 'img');
      this.renderer = renderer;

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x070b16);
      this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
      this.camFocus = new THREE.Vector3(SPAWNS.hub.x, 0, SPAWNS.hub.z);
      this.clock = new THREE.Clock();
      this.elapsed = 0;
      this.raycaster = new THREE.Raycaster();
      this.pointer = new THREE.Vector2();

      this.player = {
        pos: new THREE.Vector3(SPAWNS.hub.x, 0, SPAWNS.hub.z),
        facing: SPAWNS.hub.facing,
        sitting: false,
        moving: false,
        speed: 6.5,
        walkT: 0,
        stuckT: 0,
        rig: null,
      };
      this.keys = {};
      this.virtual = { x: 0, z: 0 };
      this.colliders = [];
      this.stations = [];
      this.pickables = [];
      this.floors = [];
      this.animators = [];
      this.moveTarget = null;
      this.pendingStation = null;
      this.nearStation = null;
      this.zone = null;

      this.setupLights();
      this.build();
      this.createMarker();
      this.bindInput();
      this.resize();
      window.addEventListener('resize', () => this.resize());
      this.ready = true;
      this.loop();
    },

    setupLights() {
      this.scene.add(new THREE.HemisphereLight(0xc7d7ff, 0x1a1f2e, 0.85));
      const sun = new THREE.DirectionalLight(0xffffff, 0.75);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      const sc = sun.shadow.camera;
      sc.left = -30; sc.right = 30; sc.top = 30; sc.bottom = -30; sc.near = 1; sc.far = 90;
      sun.shadow.bias = -0.0008;
      this.scene.add(sun);
      this.scene.add(sun.target);
      this.sun = sun;
    },

    // ---------- Construction helpers ----------
    addCollider(cx, cz, w, d) {
      this.colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });
    },

    box(parent, w, h, d, x, y, z, material) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      parent.add(m);
      return m;
    },

    cyl(parent, rt, rb, h, x, y, z, material, seg) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 20), material);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      parent.add(m);
      return m;
    },

    addFloor(x1, z1, x2, z2, base, line) {
      const w = x2 - x1;
      const d = z2 - z1;
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(w, d),
        new THREE.MeshStandardMaterial({ map: gridTexture(base, line, w / 2, d / 2), roughness: 0.9 })
      );
      m.rotation.x = -Math.PI / 2;
      m.position.set(x1 + w / 2, 0, z1 + d / 2);
      m.receiveShadow = true;
      this.scene.add(m);
      this.floors.push(m);
    },

    wallSeg(x1, z1, x2, z2) {
      const horizontal = z1 === z2;
      const w = horizontal ? Math.abs(x2 - x1) + WALL_T : WALL_T;
      const d = horizontal ? WALL_T : Math.abs(z2 - z1) + WALL_T;
      const cx = (x1 + x2) / 2;
      const cz = (z1 + z2) / 2;
      this.box(this.scene, w, WALL_HEIGHT, d, cx, WALL_HEIGHT / 2, cz, this.wallMat);
      this.box(this.scene, w, 0.06, d, cx, WALL_HEIGHT + 0.03, cz, this.trimMat);
      this.addCollider(cx, cz, w, d);
    },

    wallH(z, x1, x2, gaps) {
      splitSegments(x1, x2, gaps).forEach(([a, b]) => this.wallSeg(a, z, b, z));
    },

    wallV(x, z1, z2, gaps) {
      splitSegments(z1, z2, gaps).forEach(([a, b]) => this.wallSeg(x, a, x, b));
    },

    label(text, color, x, y, z) {
      const l = makeLabel(text, color);
      l.position.set(x, y, z);
      this.scene.add(l);
      return l;
    },

    addStation(def) {
      const st = Object.assign({ radius: 2.6, labelY: 3.3 }, def);
      st.floor = st.z < UPPER_FLOOR_Z ? 'upper' : 'ground';
      st.group = new THREE.Group();
      st.group.position.set(st.x, 0, st.z);
      st.group.userData.stationId = st.id;
      this.scene.add(st.group);
      if (st.label) this.label(st.label, st.color, st.x, st.labelY, st.z);
      this.stations.push(st);
      this.pickables.push(st.group);
      return st;
    },

    plant(x, z) {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      this.cyl(g, 0.35, 0.28, 0.55, 0, 0.28, 0, std('#78350f'));
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 0), std('#16a34a', { flatShading: true }));
      leaf.position.y = 1.05;
      leaf.castShadow = true;
      g.add(leaf);
      this.scene.add(g);
      this.addCollider(x, z, 0.8, 0.8);
    },

    doorStrip(x, z1, z2, color) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, z2 - z1), glow(color, 0.9));
      m.position.set(x, 0.02, (z1 + z2) / 2);
      this.scene.add(m);
    },

    // ---------- World layout ----------
    build() {
      const s = this.scene;
      this.wallMat = std('#3d4864', { roughness: 0.6 });
      this.trimMat = glow('#2dd4bf', 0.5);

      const base = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), std('#050811', { roughness: 1 }));
      base.rotation.x = -Math.PI / 2;
      base.position.y = -0.05;
      s.add(base);

      // Ground floor
      this.addFloor(-12, -12, 12, 12, '#283044', '#323c55');
      this.addFloor(12, -12, 36, 12, '#18243d', '#22324f');
      this.addFloor(-34, -12, -12, 0, '#241d3b', '#30274d');
      this.addFloor(-34, 0, -12, 12, '#172b29', '#213b37');

      this.wallH(-12, -34, 36);
      this.wallH(12, -34, 36);
      this.wallV(-34, -12, 12);
      this.wallV(36, -12, 12);
      this.wallV(-12, -12, 12, [[-8, -4], [4, 8]]);
      this.wallV(12, -12, 12, [[-2.5, 2.5]]);
      this.wallH(0, -34, -12);

      this.doorStrip(12, -2.5, 2.5, '#3b82f6');
      this.doorStrip(-12, -8, -4, '#a855f7');
      this.doorStrip(-12, 4, 8, '#10b981');
      this.label('Academia Técnica', '#3b82f6', 10, 2.4, 0);
      this.label('Inglés', '#a855f7', -10, 2.4, -6);
      this.label('Habilidades Blandas', '#10b981', -10, 2.4, 6);

      this.buildHub();
      this.buildTechWing();
      this.buildLanguageWing();
      this.buildUpperFloor();
    },

    buildHub() {
      const s = this.scene;
      const carpet = new THREE.Mesh(new THREE.CircleGeometry(4.6, 48), std('#173f3c', { roughness: 1 }));
      carpet.rotation.x = -Math.PI / 2;
      carpet.position.set(0, 0.01, -1);
      carpet.receiveShadow = true;
      s.add(carpet);

      // ARIA onboarding terminal
      const aria = this.addStation({ id: 'aria', label: 'ARIA · Bienvenida', color: '#2dd4bf', x: 0, z: -1, radius: 3, prompt: 'Hablar con ARIA', labelY: 3.6 });
      this.cyl(aria.group, 0.9, 1.05, 0.6, 0, 0.3, 0, std('#1e293b', { metalness: 0.4 }));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.05, 8, 40), glow('#2dd4bf', 1));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.62;
      aria.group.add(ring);
      const holo = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.7, 1),
        new THREE.MeshBasicMaterial({ color: 0x2dd4bf, wireframe: true, transparent: true, opacity: 0.85 })
      );
      holo.position.y = 1.9;
      aria.group.add(holo);
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 16), glow('#99f6e4', 1.2));
      core.position.y = 1.9;
      aria.group.add(core);
      this.animators.push((t, dt) => {
        holo.rotation.y += dt * 0.8;
        holo.rotation.x += dt * 0.3;
        const y = 1.9 + Math.sin(t * 2) * 0.12;
        holo.position.y = y;
        core.position.y = y;
      });
      this.addCollider(0, -1, 2, 2);

      // Rest lounge
      const lounge = this.addStation({ id: 'lounge', label: 'Zona de Descanso', color: '#f472b6', x: -7, z: 8, radius: 2.9, prompt: 'Sentarte en la Zona de Descanso' });
      const rug = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), std('#3b2b4f', { roughness: 1 }));
      rug.rotation.x = -Math.PI / 2;
      rug.position.set(0, 0.015, 0.6);
      lounge.group.add(rug);
      const sofa = std('#be185d');
      this.box(lounge.group, 4, 0.5, 1.2, 0, 0.25, 1.6, sofa);
      this.box(lounge.group, 4, 1, 0.3, 0, 0.6, 2.2, sofa);
      this.box(lounge.group, 0.3, 0.75, 1.2, -2.1, 0.37, 1.6, sofa);
      this.box(lounge.group, 0.3, 0.75, 1.2, 2.1, 0.37, 1.6, sofa);
      this.box(lounge.group, 1.8, 0.4, 0.9, 0, 0.2, -0.3, std('#78350f'));
      this.cyl(lounge.group, 0.12, 0.12, 0.2, 0.4, 0.5, -0.3, glow('#fbbf24', 0.4), 12);
      this.addCollider(-7, 9.7, 4.6, 1.5);
      this.addCollider(-7, 7.7, 1.8, 0.9);

      // Talent kiosk
      const kiosk = this.addStation({ id: 'kiosk', label: 'Kiosco de Talento', color: '#fbbf24', x: 7, z: 8, radius: 2.8, prompt: 'Abrir el Kiosco de Talento', labelY: 3.9 });
      this.box(kiosk.group, 2.6, 1.1, 1, 0, 0.55, 1.4, std('#334155', { metalness: 0.3 }));
      this.box(kiosk.group, 2.2, 1.3, 0.12, 0, 1.85, 1.85, glow('#f59e0b', 0.55));
      const coin = this.cyl(kiosk.group, 0.38, 0.38, 0.09, 0, 3, 1.4, std('#fbbf24', { metalness: 0.8, roughness: 0.25, emissive: '#b45309', emissiveIntensity: 0.3 }), 28);
      coin.rotation.x = Math.PI / 2;
      this.animators.push((t, dt) => { coin.rotation.z += dt * 2; });
      this.addCollider(7, 9.4, 2.6, 1.2);

      // Elevator + stairs to the upper floor
      const elev = this.addStation({ id: 'elevator-up', label: 'Ascensor · Planta Superior', color: '#2dd4bf', x: 0, z: -9.3, radius: 2.3, prompt: 'Subir a la Zona de Ocio', labelY: 3.4 });
      const padMat = glow('#2dd4bf', 0.6);
      this.cyl(elev.group, 1.3, 1.3, 0.08, 0, 0.04, 0, padMat, 32);
      [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]].forEach(([x, z]) => {
        this.cyl(elev.group, 0.07, 0.07, 2.6, x, 1.3, z, std('#94a3b8', { metalness: 0.7, roughness: 0.2 }), 8);
      });
      this.animators.push((t) => { padMat.emissiveIntensity = 0.45 + Math.sin(t * 3) * 0.25; });

      const stairs = this.addStation({ id: 'stairs-up', label: 'Escaleras', color: '#94a3b8', x: 5.6, z: -9.2, radius: 2, prompt: 'Subir por las escaleras', labelY: 2.8 });
      const stepMat = std('#475569');
      for (let i = 0; i < 6; i++) {
        const h = 0.25 * (i + 1);
        this.box(stairs.group, 0.7, h, 1.6, -1.75 + i * 0.7, h / 2, -1.7, stepMat);
      }
      this.addCollider(5.6, -10.9, 4.3, 1.6);

      // Leaderboard screen
      const board = this.addStation({ id: 'leaderboard', label: 'Clasificación', color: '#60a5fa', x: -7, z: -9.4, radius: 2.6, prompt: 'Ver la Tabla de Clasificación', labelY: 3.6 });
      this.box(board.group, 4.2, 2.3, 0.2, 0, 1.6, -1.9, std('#0f172a'));
      this.box(board.group, 3.9, 2, 0.05, 0, 1.6, -1.78, glow('#1d4ed8', 0.45));
      [0.9, 0.3, -0.3].forEach((y, i) => this.box(board.group, 3 - i * 0.6, 0.18, 0.06, -0.35 + i * 0.3, 1.6 + y, -1.74, glow(['#fbbf24', '#e2e8f0', '#d97706'][i], 0.8)));
      this.addCollider(-7, -11.3, 4.2, 0.4);

      this.plant(-10.6, -10.6);
      this.plant(10.6, 10.6);
      this.plant(-10.6, 10.6);
      this.plant(10.6, -6);
    },

    buildTechWing() {
      const syllabus = this.addStation({ id: 'tech-syllabus', label: 'Terminal del Temario', color: '#3b82f6', x: 24, z: -7, radius: 3, prompt: 'Abrir el temario técnico', labelY: 3.8 });
      this.box(syllabus.group, 3.2, 0.9, 1.2, 0, 0.45, -1, std('#1e293b', { metalness: 0.3 }));
      this.box(syllabus.group, 3.6, 2, 0.14, 0, 2.1, -1.6, glow('#2563eb', 0.6));
      this.addCollider(24, -8.2, 3.6, 1.6);

      const day1 = this.addStation({ id: 'tech-day1', label: 'Evaluación Día 1', color: '#22d3ee', x: 24, z: 7, radius: 3, prompt: 'Iniciar la Evaluación Día 1', labelY: 3.8 });
      this.box(day1.group, 3.2, 0.9, 1.2, 0, 0.45, 1, std('#1e293b', { metalness: 0.3 }));
      this.box(day1.group, 3.6, 2, 0.14, 0, 2.1, 1.6, glow('#0891b2', 0.6));
      this.addCollider(24, 8.2, 3.6, 1.6);

      const deskMat = std('#cbd5e1');
      [[17, -4.2], [17, 4.2], [31, -4.2], [31, 4.2]].forEach(([x, z]) => {
        this.box(this.scene, 2.4, 0.8, 1.2, x, 0.4, z, deskMat);
        this.box(this.scene, 0.9, 0.6, 0.06, x - 0.5, 1.15, z, glow('#38bdf8', 0.5));
        this.box(this.scene, 0.9, 0.6, 0.06, x + 0.5, 1.15, z, glow('#818cf8', 0.5));
        this.addCollider(x, z, 2.4, 1.2);
      });

      const rackMat = std('#0f172a', { metalness: 0.5 });
      [-9, -5.5, 5.5, 9].forEach((z) => {
        this.box(this.scene, 1, 2.4, 1.6, 35, 1.2, z, rackMat);
        for (let i = 0; i < 4; i++) this.box(this.scene, 0.05, 0.08, 1.2, 34.48, 0.5 + i * 0.5, z, glow(i % 2 ? '#22c55e' : '#3b82f6', 1));
        this.addCollider(35, z, 1, 1.6);
      });
      this.label('Academia Técnica · Full-Stack', '#3b82f6', 24, 3, 0);
    },

    buildLanguageWing() {
      const eng = this.addStation({ id: 'english', label: 'Cámara de Inglés', color: '#a855f7', x: -23, z: -7, radius: 3, prompt: 'Entrar en la Cámara de Inglés', labelY: 3.8 });
      this.cyl(eng.group, 0.6, 0.8, 1, 0, 0.5, -1.2, std('#1e1b4b'));
      this.box(eng.group, 2.8, 1.7, 0.12, 0, 2, -1.6, glow('#7c3aed', 0.6));
      this.addCollider(-23, -8.3, 2.8, 1.4);
      const panel = std('#5b21b6', { roughness: 1 });
      [-31, -27.5, -18.5, -15].forEach((x) => this.box(this.scene, 2.4, 1.2, 0.15, x, 0.9, -11.7, panel));
      this.cyl(this.scene, 1.1, 1.1, 0.8, -29, 0.4, -4, std('#e2e8f0'), 24);
      this.addCollider(-29, -4, 2.2, 2.2);

      const soft = this.addStation({ id: 'soft', label: 'Habilidades Blandas', color: '#10b981', x: -23, z: 7, radius: 3, prompt: 'Entrar en la Cámara de Habilidades Blandas', labelY: 3.8 });
      this.cyl(soft.group, 0.6, 0.8, 1, 0, 0.5, 1.2, std('#064e3b'));
      this.box(soft.group, 2.8, 1.7, 0.12, 0, 2, 1.6, glow('#059669', 0.6));
      this.addCollider(-23, 8.3, 2.8, 1.4);
      const beanColors = ['#f97316', '#14b8a6', '#eab308'];
      [[-30, 4], [-28.5, 9.5], [-16, 10]].forEach(([x, z], i) => {
        const bean = new THREE.Mesh(new THREE.SphereGeometry(0.75, 18, 12), std(beanColors[i], { roughness: 1 }));
        bean.scale.set(1, 0.6, 1);
        bean.position.set(x, 0.45, z);
        bean.castShadow = true;
        this.scene.add(bean);
        this.addCollider(x, z, 1.4, 1.4);
      });
      this.plant(-33, 11);
      this.plant(-33, -11);
    },

    buildUpperFloor() {
      this.addFloor(-16, -92, 16, -68, '#2a2016', '#3a2d1f');
      this.wallH(-92, -16, 16);
      this.wallH(-68, -16, 16);
      this.wallV(-16, -92, -68);
      this.wallV(16, -92, -68);
      for (let x = -12; x <= 12; x += 6) this.box(this.scene, 4, 1, 0.08, x, 1, -91.75, glow('#7dd3fc', 0.35));
      this.label('Planta Superior · Zona de Ocio', '#f59e0b', 0, 3.4, -78);

      const down = this.addStation({ id: 'elevator-down', label: 'Ascensor · Hub Central', color: '#2dd4bf', x: 0, z: -70.6, radius: 2.3, prompt: 'Bajar al Hub Central', labelY: 3.2 });
      const pad = glow('#2dd4bf', 0.6);
      this.cyl(down.group, 1.3, 1.3, 0.08, 0, 0.04, 0, pad, 32);
      this.animators.push((t) => { pad.emissiveIntensity = 0.45 + Math.sin(t * 3) * 0.25; });

      const pong = this.addStation({ id: 'game-pingpong', label: 'Ping Pong vs CPU', color: '#14b8a6', x: -9, z: -81, radius: 3.3, prompt: 'Jugar al Ping Pong' });
      this.box(pong.group, 4.2, 0.12, 2.3, 0, 0.82, 0, std('#0f766e'));
      this.box(pong.group, 4.2, 0.13, 0.04, 0, 0.83, 0, std('#f8fafc'));
      this.box(pong.group, 0.05, 0.25, 2.4, 0, 0.98, 0, std('#e2e8f0', { transparent: true, opacity: 0.8 }));
      [[-1.9, -1], [1.9, -1], [-1.9, 1], [1.9, 1]].forEach(([x, z]) => this.box(pong.group, 0.1, 0.78, 0.1, x, 0.39, z, std('#1f2937')));
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), std('#ffffff'));
      pong.group.add(ball);
      this.animators.push((t) => { ball.position.set(Math.sin(t * 2.2) * 1.8, 1.05 + Math.abs(Math.cos(t * 4.4)) * 0.35, Math.sin(t * 1.3) * 0.6); });
      this.addCollider(-9, -81, 4.2, 2.3);

      const mem = this.addStation({ id: 'game-memory', label: 'Memoria Corporativa', color: '#a855f7', x: 0, z: -87, radius: 2.8, prompt: 'Jugar a Memoria Corporativa', labelY: 3.6 });
      this.box(mem.group, 1.6, 2.2, 1.2, 0, 1.1, -0.6, std('#4c1d95'));
      this.box(mem.group, 1.2, 0.9, 0.06, 0, 1.6, 0.02, glow('#c084fc', 0.7));
      this.box(mem.group, 1.4, 0.12, 0.5, 0, 1, 0.2, std('#1f2937'));
      this.addCollider(0, -87.4, 1.6, 1.4);

      const toss = this.addStation({ id: 'game-toss', label: 'Lanzamiento de Papel', color: '#f59e0b', x: 9, z: -81, radius: 2.8, prompt: 'Jugar a Lanzamiento de Papel' });
      this.cyl(toss.group, 0.45, 0.35, 0.8, 1.2, 0.4, 0, std('#64748b', { metalness: 0.4 }), 18);
      this.box(toss.group, 1.6, 0.75, 0.9, -1, 0.38, 0, std('#a16207'));
      [[-1.2, 0.9], [-0.7, 0.85], [1.0, 0.9]].forEach(([x, y]) => {
        const p = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), std('#f8fafc', { flatShading: true }));
        p.position.set(x, y, 0.1);
        toss.group.add(p);
      });
      this.addCollider(9, -81, 3.2, 1.2);

      this.plant(-14.5, -69.5);
      this.plant(14.5, -69.5);
      this.plant(14.5, -90.5);
      this.plant(-14.5, -90.5);
    },

    createMarker() {
      const marker = new THREE.Mesh(
        new THREE.RingGeometry(0.25, 0.4, 24),
        new THREE.MeshBasicMaterial({ color: 0x2dd4bf, transparent: true, opacity: 0, side: THREE.DoubleSide })
      );
      marker.rotation.x = -Math.PI / 2;
      marker.position.y = 0.03;
      this.scene.add(marker);
      this.marker = marker;
      this.animators.push((t, dt) => {
        if (marker.material.opacity > 0) {
          marker.material.opacity = Math.max(0, marker.material.opacity - dt * 1.4);
          const sc = 1 + (1 - marker.material.opacity) * 0.8;
          marker.scale.set(sc, sc, sc);
        }
      });
    },

    // ---------- Input ----------
    bindInput() {
      const isTyping = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
      window.addEventListener('keydown', (e) => {
        if (isTyping(e.target)) return;
        if (e.code === 'KeyE' && !e.repeat) {
          if (this.player.sitting) {
            this.on.stand();
          } else if (!this.isBlocked()) {
            this.interactNear();
          }
          return;
        }
        if (this.isBlocked()) return;
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
        this.keys[e.code] = true;
      });
      window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
      window.addEventListener('blur', () => { this.keys = {}; });

      this.renderer.domElement.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || this.isBlocked() || this.player.sitting) return;
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
        this.raycaster.setFromCamera(this.pointer, this.camera);

        const hit = this.raycaster.intersectObjects(this.pickables, true)[0];
        if (hit) {
          let obj = hit.object;
          while (obj && !obj.userData.stationId) obj = obj.parent;
          const st = obj && this.stations.find((s) => s.id === obj.userData.stationId);
          if (st && st.floor === this.currentFloor()) {
            if (this.distTo(st) <= st.radius) {
              this.on.interact(st);
            } else {
              this.moveTarget = new THREE.Vector3(st.x, 0, st.z);
              this.pendingStation = st;
              this.flashMarker(st.x, st.z);
            }
            return;
          }
        }
        const floorHit = this.raycaster.intersectObjects(this.floors, false)[0];
        if (floorHit) {
          this.moveTarget = floorHit.point.clone();
          this.moveTarget.y = 0;
          this.pendingStation = null;
          this.flashMarker(floorHit.point.x, floorHit.point.z);
        }
      });
    },

    flashMarker(x, z) {
      this.marker.position.x = x;
      this.marker.position.z = z;
      this.marker.material.opacity = 1;
      this.marker.scale.set(1, 1, 1);
    },

    setVirtual(x, z) {
      this.virtual.x = x;
      this.virtual.z = z;
    },

    interactNear() {
      if (this.nearStation) this.on.interact(this.nearStation);
    },

    // ---------- Player ----------
    setAvatar(cfg) {
      if (this.player.rig) this.scene.remove(this.player.rig.root);
      this.player.rig = window.Avatar.build(cfg);
      this.scene.add(this.player.rig.root);
    },

    currentFloor() {
      return this.player.pos.z < UPPER_FLOOR_Z ? 'upper' : 'ground';
    },

    distTo(st) {
      return Math.hypot(this.player.pos.x - st.x, this.player.pos.z - st.z);
    },

    collides(x, z) {
      const r = PLAYER_RADIUS;
      for (const c of this.colliders) {
        if (x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ) return true;
      }
      return false;
    },

    tryMove(dx, dz) {
      const p = this.player.pos;
      const ox = p.x;
      const oz = p.z;
      if (!this.collides(p.x + dx, p.z)) p.x += dx;
      if (!this.collides(p.x, p.z + dz)) p.z += dz;
      return Math.hypot(p.x - ox, p.z - oz);
    },

    updatePlayer(dt) {
      const pl = this.player;
      if (pl.sitting || this.isBlocked()) {
        pl.moving = false;
        return;
      }
      let ix = 0;
      let iz = 0;
      const k = this.keys;
      if (k.KeyW || k.ArrowUp) iz -= 1;
      if (k.KeyS || k.ArrowDown) iz += 1;
      if (k.KeyA || k.ArrowLeft) ix -= 1;
      if (k.KeyD || k.ArrowRight) ix += 1;
      ix += this.virtual.x;
      iz += this.virtual.z;

      if (ix || iz) {
        this.moveTarget = null;
        this.pendingStation = null;
      } else if (this.moveTarget) {
        if (this.pendingStation && this.distTo(this.pendingStation) <= this.pendingStation.radius - 0.4) {
          const st = this.pendingStation;
          this.moveTarget = null;
          this.pendingStation = null;
          this.on.interact(st);
        } else {
          const dx = this.moveTarget.x - pl.pos.x;
          const dz = this.moveTarget.z - pl.pos.z;
          const d = Math.hypot(dx, dz);
          if (d < 0.15) {
            this.moveTarget = null;
          } else {
            ix = dx / d;
            iz = dz / d;
          }
        }
      }

      const len = Math.hypot(ix, iz);
      if (len > 0) {
        ix /= len;
        iz /= len;
        const step = pl.speed * dt;
        const moved = this.tryMove(ix * step, iz * step);
        const target = Math.atan2(ix, iz);
        let diff = target - pl.facing;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        pl.facing += diff * Math.min(1, dt * 14);
        pl.moving = moved > step * 0.2;
        if (this.moveTarget && moved < step * 0.2) {
          pl.stuckT += dt;
          if (pl.stuckT > 0.35) {
            this.moveTarget = null;
            this.pendingStation = null;
          }
        } else {
          pl.stuckT = 0;
        }
      } else {
        pl.moving = false;
      }
    },

    updateAvatar(dt) {
      const pl = this.player;
      const rig = pl.rig;
      if (!rig) return;
      rig.root.position.set(pl.pos.x, pl.sitting ? -0.2 : 0, pl.pos.z);
      rig.root.rotation.y = pl.facing;
      const ease = Math.min(1, dt * 12);
      let legA = 0;
      let armA = 0;
      let bob = Math.sin(this.elapsed * 2) * 0.012;
      if (pl.sitting) {
        rig.legL.rotation.x = rig.legR.rotation.x = -Math.PI / 2;
        rig.armL.rotation.x = rig.armR.rotation.x = -0.35;
        rig.body.position.y = 0;
      } else {
        if (pl.moving) {
          pl.walkT += dt * 10;
          legA = Math.sin(pl.walkT) * 0.65;
          armA = -Math.sin(pl.walkT) * 0.5;
          bob = Math.abs(Math.cos(pl.walkT)) * 0.06;
        }
        rig.legL.rotation.x += (legA - rig.legL.rotation.x) * ease;
        rig.legR.rotation.x += (-legA - rig.legR.rotation.x) * ease;
        rig.armL.rotation.x += (armA - rig.armL.rotation.x) * ease;
        rig.armR.rotation.x += (-armA - rig.armR.rotation.x) * ease;
        rig.body.position.y = bob;
      }
      if (rig.aura) {
        rig.aura.rotation.z += dt * 1.5;
        rig.aura.material.opacity = 0.5 + Math.sin(this.elapsed * 3) * 0.2;
      }
    },

    updateCamera(dt, snap) {
      const k = snap ? 1 : 1 - Math.exp(-dt * 6);
      this.camFocus.lerp(this.player.pos, k);
      this.camera.position.copy(this.camFocus).add(CAMERA_OFFSET);
      this.camera.lookAt(this.camFocus);
      const p = this.player.pos;
      this.sun.position.set(p.x + 12, 32, p.z + 14);
      this.sun.target.position.set(p.x, 0, p.z);
    },

    updateNear() {
      let best = null;
      if (!this.player.sitting) {
        const floor = this.currentFloor();
        let bestD = Infinity;
        for (const st of this.stations) {
          if (st.floor !== floor) continue;
          const d = this.distTo(st);
          if (d <= st.radius && d < bestD) {
            best = st;
            bestD = d;
          }
        }
      }
      if (best !== this.nearStation) {
        this.nearStation = best;
        this.on.near(best);
      }
      const z = this.zoneAt(this.player.pos.x, this.player.pos.z);
      if (z !== this.zone) {
        this.zone = z;
        this.on.zone(z);
      }
    },

    zoneAt(x, z) {
      if (z < UPPER_FLOOR_Z) return 'Planta Superior · Zona de Ocio';
      if (x > 12) return 'Ala Derecha · Academia Técnica';
      if (x < -12) return z < 0 ? 'Ala Izquierda · Cámara de Inglés' : 'Ala Izquierda · Habilidades Blandas';
      return 'Hub Central';
    },

    teleport(where) {
      const s = SPAWNS[where];
      if (!s) return;
      this.player.pos.set(s.x, 0, s.z);
      this.player.facing = s.facing;
      this.moveTarget = null;
      this.pendingStation = null;
      this.camFocus.copy(this.player.pos);
      this.updateCamera(0, true);
    },

    sit() {
      const pl = this.player;
      pl.sitting = true;
      pl.moving = false;
      pl.pos.set(SEAT.x, 0, SEAT.z);
      pl.facing = SEAT.facing;
      this.moveTarget = null;
      this.pendingStation = null;
    },

    stand() {
      const pl = this.player;
      pl.sitting = false;
      pl.pos.set(SEAT.x, 0, 7.6);
    },

    resize() {
      if (!this.renderer) return;
      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;
      this.renderer.setSize(w, h);
      const a = w / h;
      let vw;
      let vh;
      if (a >= 1) {
        vh = VIEW_SPAN;
        vw = vh * a;
      } else {
        vw = VIEW_SPAN * 0.75;
        vh = vw / a;
      }
      const c = this.camera;
      c.left = -vw / 2;
      c.right = vw / 2;
      c.top = vh / 2;
      c.bottom = -vh / 2;
      c.updateProjectionMatrix();
    },

    loop() {
      const tick = () => {
        requestAnimationFrame(tick);
        const dt = Math.min(this.clock.getDelta(), 0.05);
        this.elapsed += dt;
        this.updatePlayer(dt);
        this.updateAvatar(dt);
        this.updateCamera(dt);
        this.updateNear();
        for (const fn of this.animators) fn(this.elapsed, dt);
        this.renderer.render(this.scene, this.camera);
      };
      tick();
    },
  };

  window.World = World;
})();
