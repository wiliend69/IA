/* Procedural avatar built from primitives. Forward direction is +Z. */
(function () {
  'use strict';

  function mat(color, extra) {
    return new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.7, metalness: 0.05 }, extra || {}));
  }

  function add(parent, geo, material, x, y, z) {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = true;
    parent.add(m);
    return m;
  }

  function buildAvatar(cfg) {
    const preset = window.CONTENT.presets[cfg.preset] || window.CONTENT.presets[0];
    const equipped = cfg.equipped || {};
    const outfit = equipped.outfit ? window.CONTENT.shop.find((i) => i.id === equipped.outfit) : null;
    const female = cfg.gender === 'female';

    const skin = mat(preset.skin);
    const top = mat(outfit ? outfit.color : preset.top);
    const bottom = mat(preset.bottom);
    const hair = mat(preset.hair, { roughness: 0.9 });
    const dark = mat('#0b1020');
    const shoe = mat('#111827');

    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);

    // Legs pivot at the hip so they can swing and fold when sitting.
    const legGeo = new THREE.CapsuleGeometry(0.13, 0.5, 4, 8);
    const makeLeg = (x) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0.75, 0);
      add(pivot, legGeo, bottom, 0, -0.35, 0);
      add(pivot, new THREE.BoxGeometry(0.22, 0.12, 0.34), shoe, 0, -0.7, 0.06);
      body.add(pivot);
      return pivot;
    };
    const legL = makeLeg(-0.16);
    const legR = makeLeg(0.16);

    const torsoGeo = female
      ? new THREE.CylinderGeometry(0.29, 0.34, 0.75, 16)
      : new THREE.CylinderGeometry(0.38, 0.32, 0.75, 16);
    add(body, torsoGeo, top, 0, 1.15, 0);
    if (female) add(body, new THREE.CylinderGeometry(0.33, 0.5, 0.42, 16), bottom, 0, 0.72, 0);

    const shoulderX = female ? 0.4 : 0.46;
    const armGeo = new THREE.CapsuleGeometry(0.1, 0.5, 4, 8);
    const makeArm = (x) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, 1.45, 0);
      add(pivot, armGeo, top, 0, -0.3, 0);
      add(pivot, new THREE.SphereGeometry(0.1, 10, 8), skin, 0, -0.64, 0);
      body.add(pivot);
      return pivot;
    };
    const armL = makeArm(-shoulderX);
    const armR = makeArm(shoulderX);

    add(body, new THREE.CylinderGeometry(0.1, 0.12, 0.14, 10), skin, 0, 1.58, 0);
    add(body, new THREE.SphereGeometry(0.3, 20, 16), skin, 0, 1.86, 0);
    add(body, new THREE.SphereGeometry(0.035, 8, 6), dark, -0.1, 1.9, 0.27);
    add(body, new THREE.SphereGeometry(0.035, 8, 6), dark, 0.1, 1.9, 0.27);

    add(body, new THREE.SphereGeometry(0.32, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), hair, 0, 1.88, -0.01);
    if (female) {
      add(body, new THREE.BoxGeometry(0.58, 0.62, 0.2), hair, 0, 1.66, -0.18);
      add(body, new THREE.SphereGeometry(0.12, 10, 8), hair, 0, 2.08, -0.26);
    }

    if (preset.accessory === 'tie') {
      add(body, new THREE.BoxGeometry(0.09, 0.4, 0.03), mat(preset.accent), 0, 1.26, female ? 0.32 : 0.36);
    } else if (preset.accessory === 'glasses') {
      const frame = mat(preset.accent, { metalness: 0.5, roughness: 0.3 });
      const lens = new THREE.TorusGeometry(0.075, 0.016, 6, 16);
      add(body, lens, frame, -0.11, 1.89, 0.29);
      add(body, lens, frame, 0.11, 1.89, 0.29);
      add(body, new THREE.BoxGeometry(0.07, 0.015, 0.015), frame, 0, 1.9, 0.3);
    } else if (preset.accessory === 'headphones') {
      const hp = mat(preset.accent, { roughness: 0.4 });
      add(body, new THREE.TorusGeometry(0.33, 0.035, 8, 24, Math.PI), hp, 0, 1.88, 0);
      const cup = new THREE.CylinderGeometry(0.1, 0.1, 0.08, 14);
      add(body, cup, hp, -0.32, 1.84, 0).rotation.z = Math.PI / 2;
      add(body, cup, hp, 0.32, 1.84, 0).rotation.z = Math.PI / 2;
    }

    if (cfg.deptColor) {
      add(body, new THREE.BoxGeometry(0.14, 0.1, 0.03), mat(cfg.deptColor, { emissive: cfg.deptColor, emissiveIntensity: 0.4 }), 0.18, 1.36, female ? 0.31 : 0.35);
    }

    if (equipped.hat === 'grad') {
      const black = mat('#111827');
      add(body, new THREE.CylinderGeometry(0.23, 0.25, 0.14, 16), black, 0, 2.12, 0);
      const board = add(body, new THREE.BoxGeometry(0.64, 0.04, 0.64), black, 0, 2.2, 0);
      board.rotation.y = Math.PI / 4;
      add(body, new THREE.SphereGeometry(0.04, 8, 6), mat('#fbbf24'), 0.24, 2.12, 0.1);
    } else if (equipped.hat === 'crown') {
      const gold = mat('#fbbf24', { metalness: 0.8, roughness: 0.25, emissive: '#b45309', emissiveIntensity: 0.25 });
      add(body, new THREE.CylinderGeometry(0.27, 0.25, 0.16, 8, 1, true), gold, 0, 2.16, 0);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        add(body, new THREE.ConeGeometry(0.045, 0.14, 6), gold, Math.cos(a) * 0.26, 2.3, Math.sin(a) * 0.26);
      }
    }

    let aura = null;
    if (equipped.aura === 'aura') {
      aura = new THREE.Mesh(
        new THREE.RingGeometry(0.55, 0.8, 32),
        new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.7, side: THREE.DoubleSide })
      );
      aura.rotation.x = -Math.PI / 2;
      aura.position.y = 0.03;
      root.add(aura);
    }

    return { root, body, legL, legR, armL, armR, aura };
  }

  window.Avatar = { build: buildAvatar };
})();
