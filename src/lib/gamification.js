/**
 * gamification.js — Lapisan gamifikasi FitLearn.
 *
 * Semua dihitung MURNI dari data yang sudah ada (riwayat `daily_stats` per hari
 * + statistik istirahat lokal). Tidak ada tabel/skema baru di Supabase — cukup
 * turunan deterministik dari histori, sehingga aman & bisa dihitung ulang kapan
 * saja di sisi klien.
 *
 * Model:
 *   XP        → poin dari aktivitas belajar sehat (fokus, jam belajar, patuh istirahat)
 *   Level     → tingkat dari akumulasi XP (kurva bertambah)
 *   Streak    → jumlah hari beruntun ada sesi belajar
 *   Badge     → pencapaian milestone (buka/terkunci)
 *   Quest     → misi HARI INI (progress 0..1) berbasis target harian
 */

// ── XP dari satu hari ────────────────────────────────────────────
// Satu hari sehat bernilai puluhan XP; komponennya dibuat mudah dipahami pelajar.
export function xpForDay(stat) {
  if (!stat || !stat.samples) return 0;
  const focus = stat.focus ?? 0;         // 0..100
  const hours = stat.workHours ?? 0;     // jam belajar aktif
  const lowStress = 100 - (stat.stress ?? 0); // makin rendah stres makin baik

  const focusXp = Math.round(focus * 0.6);         // maks ~60
  const hoursXp = Math.round(Math.min(hours, 6) * 15); // maks 90 (cap 6 jam)
  const calmXp = Math.round(lowStress * 0.2);      // maks ~20
  const showUpXp = 20;                             // bonus "hadir belajar"
  return focusXp + hoursXp + calmXp + showUpXp;
}

export function totalXp(history = []) {
  return history.reduce((sum, s) => sum + xpForDay(s), 0);
}

// ── Level dari XP ────────────────────────────────────────────────
// Kurva kuadratik lembut: butuh XP makin banyak tiap naik level.
//   XP kumulatif untuk MENCAPAI level L  =  50 * L * (L - 1)
//   → L1:0, L2:100, L3:300, L4:600, L5:1000, ...
const LEVEL_TITLES_ID = [
  "Pemula", "Penjelajah", "Rajin", "Fokus", "Tangguh",
  "Ahli", "Master", "Juara", "Legenda", "Bintang",
];
const LEVEL_TITLES_EN = [
  "Rookie", "Explorer", "Diligent", "Focused", "Resilient",
  "Expert", "Master", "Champion", "Legend", "Star",
];

function xpToReachLevel(level) {
  return 50 * level * (level - 1);
}

export function levelFromXp(xp) {
  let level = 1;
  while (xpToReachLevel(level + 1) <= xp) level++;
  const currentFloor = xpToReachLevel(level);
  const nextFloor = xpToReachLevel(level + 1);
  const intoLevel = xp - currentFloor;
  const span = nextFloor - currentFloor;
  return {
    level,
    xp,
    intoLevel,               // XP yang sudah terkumpul di level ini
    span,                    // total XP yang dibutuhkan level ini
    toNext: span - intoLevel, // sisa XP untuk naik level
    progress: span ? Math.min(intoLevel / span, 1) : 0, // 0..1
  };
}

export function levelTitle(level, lang = "id") {
  const list = lang === "id" ? LEVEL_TITLES_ID : LEVEL_TITLES_EN;
  return list[Math.min(level - 1, list.length - 1)];
}

// ── Streak (hari belajar beruntun) ───────────────────────────────
// Streak berjalan bila ada sesi kemarin/hari ini; putus bila ada hari kosong.
export function computeStreak(history = [], todayKey) {
  const active = new Set(history.filter((s) => s.samples > 0).map((s) => s.day));
  if (active.size === 0) return { current: 0, best: 0, activeToday: false };

  const dayKey = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  };
  const today = todayKey || dayKey(new Date());
  const activeToday = active.has(today);

  // Hitung streak berjalan mundur dari hari ini (atau kemarin bila hari ini belum).
  let current = 0;
  const cursor = new Date(today + "T00:00:00");
  if (!activeToday) cursor.setDate(cursor.getDate() - 1); // toleransi: belum belajar hari ini
  while (active.has(dayKey(cursor))) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Streak terbaik sepanjang riwayat.
  const sortedDays = [...active].sort();
  let best = 0, run = 0, prev = null;
  for (const dstr of sortedDays) {
    if (prev) {
      const gap = (new Date(dstr) - new Date(prev)) / 86400000;
      run = gap === 1 ? run + 1 : 1;
    } else run = 1;
    best = Math.max(best, run);
    prev = dstr;
  }
  return { current, best: Math.max(best, current), activeToday };
}

// ── Target harian & Quest (misi hari ini) ────────────────────────
export const DAILY_TARGETS = {
  focus: 70,      // skor fokus target
  hours: 2,       // jam belajar target
  breaks: 3,      // jumlah istirahat sehat
};

/**
 * Bangun daftar quest harian dari statistik hari ini.
 * @param {object} today  stat hari ini {focus, workHours, ...} atau null
 * @param {number} breaksToday jumlah istirahat yang diambil hari ini
 * @returns array quest {id, target, current, progress, done}
 */
export function buildQuests(today, breaksToday = 0) {
  const focus = today?.focus ?? 0;
  const hours = today?.workHours ?? 0;
  const q = [
    { id: "focus", target: DAILY_TARGETS.focus, current: Math.round(focus), unit: "score" },
    { id: "hours", target: DAILY_TARGETS.hours, current: Number(hours.toFixed(1)), unit: "hours" },
    { id: "breaks", target: DAILY_TARGETS.breaks, current: breaksToday, unit: "count" },
  ];
  return q.map((item) => {
    const progress = item.target ? Math.min(item.current / item.target, 1) : 0;
    return { ...item, progress, done: progress >= 1 };
  });
}

// ── Badge (pencapaian) ───────────────────────────────────────────
// Tiap badge: {id, emoji, threshold-check}. `unlocked` dihitung dari agregat.
export const BADGE_DEFS = [
  { id: "firstStep", emoji: "🌱", test: (a) => a.daysActive >= 1 },
  { id: "focused", emoji: "🎯", test: (a) => a.bestFocus >= 80 },
  { id: "streak3", emoji: "🔥", test: (a) => a.bestStreak >= 3 },
  { id: "streak7", emoji: "⚡", test: (a) => a.bestStreak >= 7 },
  { id: "marathon", emoji: "📚", test: (a) => a.totalHours >= 10 },
  { id: "calm", emoji: "😌", test: (a) => a.bestCalm >= 80 },
  { id: "level5", emoji: "🏅", test: (a) => a.level >= 5 },
  { id: "level10", emoji: "👑", test: (a) => a.level >= 10 },
];

/** Ringkas riwayat jadi agregat untuk pengecekan badge. */
export function aggregate(history = []) {
  const withData = history.filter((s) => s.samples > 0);
  const bestFocus = withData.reduce((m, s) => Math.max(m, s.focus ?? 0), 0);
  const bestCalm = withData.reduce((m, s) => Math.max(m, 100 - (s.stress ?? 100)), 0);
  const totalHours = withData.reduce((sum, s) => sum + (s.workHours ?? 0), 0);
  return {
    daysActive: withData.length,
    bestFocus,
    bestCalm,
    totalHours: Number(totalHours.toFixed(1)),
  };
}

export function computeBadges(history, streakBest, level) {
  const agg = { ...aggregate(history), bestStreak: streakBest, level };
  return BADGE_DEFS.map((b) => ({ id: b.id, emoji: b.emoji, unlocked: b.test(agg) }));
}

/**
 * Satu panggilan untuk semua turunan gamifikasi.
 * @returns {level, streak, quests, badges, agg}
 */
export function computeGameState(history = [], { breaksToday = 0, todayStat = null, todayKey } = {}) {
  const xp = totalXp(history);
  const level = levelFromXp(xp);
  const streak = computeStreak(history, todayKey);
  const quests = buildQuests(todayStat, breaksToday);
  const badges = computeBadges(history, streak.best, level.level);
  const agg = aggregate(history);
  return { level, streak, quests, badges, agg };
}
