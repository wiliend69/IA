/* Global game state: player profile, energy, economy, progression and analytics. */
(function () {
  'use strict';

  const STORAGE_KEY = 'academia3d_save_v1';

  function localDateKey(date) {
    const d = date || new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function createDefaults() {
    return {
      player: null,
      energy: 5,
      maxEnergy: 5,
      tokens: 0,
      progress: { tech: {}, english: {}, soft: {} },
      techPoints: 0,
      day1Best: 0,
      day1Solved: [false, false, false],
      commPoints: 0,
      owned: [],
      equipped: { hat: null, aura: null, outfit: null },
      energyEarned: 0,
      energySpent: 0,
      streak: { count: 0, last: null },
      daily: { date: null, tech: false, language: false, soft: false, game: false },
      stats: { gamesPlayed: 0, blocksSolved: 0, attempts: 0 },
      seenIntro: false,
    };
  }

  function isPlainObject(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
  }

  const listeners = new Set();

  const GameState = {
    data: createDefaults(),

    load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const base = createDefaults();
          Object.keys(parsed).forEach((key) => {
            base[key] = isPlainObject(base[key]) && isPlainObject(parsed[key])
              ? Object.assign({}, base[key], parsed[key])
              : parsed[key];
          });
          this.data = base;
        }
      } catch (err) {
        console.warn('Could not load saved progress', err);
      }
      this.ensureDaily();
      return this.data;
    },

    save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      } catch (err) {
        console.warn('Could not persist progress', err);
      }
    },

    reset() {
      this.data = createDefaults();
      this.save();
    },

    onChange(fn) {
      listeners.add(fn);
    },

    commit() {
      this.save();
      listeners.forEach((fn) => fn(this.data));
    },

    /** Energy can only be restored through learning — never purchased. */
    addEnergy(amount) {
      const d = this.data;
      const before = d.energy;
      d.energy = Math.min(d.maxEnergy, Math.round((d.energy + amount) * 10) / 10);
      const gained = d.energy - before;
      d.energyEarned += gained;
      return gained;
    },

    spendEnergy(amount) {
      const d = this.data;
      if (d.energy + 1e-9 < amount) return false;
      d.energy = Math.max(0, Math.round((d.energy - amount) * 10) / 10);
      d.energySpent += amount;
      return true;
    },

    addTokens(amount) {
      this.data.tokens += amount;
    },

    levelProgress(track, levelId) {
      const bucket = this.data.progress[track];
      if (!bucket[levelId]) bucket[levelId] = { solved: [false, false, false], passed: false };
      return bucket[levelId];
    },

    isLevelPassed(track, levelId) {
      const p = this.data.progress[track][levelId];
      return !!(p && p.passed);
    },

    isUnlocked(track, index) {
      if (index === 0) return true;
      const prev = window.CONTENT.tracks[track].levels[index - 1];
      return this.isLevelPassed(track, prev.id);
    },

    solvedCount(track, levelIds) {
      return levelIds.reduce((sum, id) => {
        const p = this.data.progress[track][id];
        return sum + (p ? p.solved.filter(Boolean).length : 0);
      }, 0);
    },

    ensureDaily() {
      const today = localDateKey();
      if (this.data.daily.date !== today) {
        this.data.daily = { date: today, tech: false, language: false, soft: false, game: false };
      }
    },

    markDaily(key) {
      this.ensureDaily();
      this.data.daily[key] = true;
    },

    touchStreak() {
      const today = localDateKey();
      const s = this.data.streak;
      if (s.last === today) return;
      const yesterday = localDateKey(new Date(Date.now() - 86400000));
      s.count = s.last === yesterday ? s.count + 1 : 1;
      s.last = today;
    },
  };

  const Util = {
    esc(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
    clamp(v, min, max) {
      return Math.max(min, Math.min(max, v));
    },
    fmtEnergy(n) {
      return Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',');
    },
  };

  window.GameState = GameState;
  window.Util = Util;
})();
