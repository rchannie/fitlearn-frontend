import {
  ChevronRight, Coffee, Brain, Smile, Timer, Target, Gamepad2, Trophy, Rocket, Check, Sprout, Flame, Zap,
  BookOpen, Medal, Crown, Watch, Camera, Cpu, Activity, Gauge, CalendarDays, TrendingUp,
} from "lucide-react";
import { Card } from "./shared";
import { HeroPanel, LevelBar, StreakCard, StatCard, QuestRow, BadgeShelf, SectionTitle } from "./gamified";
import { HealthStatusCard, SourcePanel, MetricRow, TrendChart, RoomPanel, agoLabel } from "./HealthWidgets";
import { useHealth } from "../context/HealthProvider";
import { useDailyStats, localDay } from "../context/DailyStatsProvider";
import { useWorkSession } from "../context/WorkSessionProvider";
import { useAuth } from "../context/AuthContext";
import { useBreakStats } from "../lib/breakStats";
import { useT } from "../i18n/LanguageProvider";
import { computeGameState, levelTitle } from "../lib/gamification";
import { useHealthAssessment } from "../hooks/useHealthAssessment";
import {
  THRESHOLDS, rateHeartRate, rateSpo2, rateStress, rateFatigue, rateFocus, ratePerclos, rateBlink,
  ratePosture, rateTension, rateSessionHours, rateActivity,
} from "../lib/healthRules";

// id badge → ikon lucide (dipisah dari lib gamification agar lib bebas JSX)
const BADGE_ICONS = {
  firstStep: <Sprout size={22} />,
  focused: <Target size={22} />,
  streak3: <Flame size={22} />,
  streak7: <Zap size={22} />,
  marathon: <BookOpen size={22} />,
  calm: <Smile size={22} />,
  level5: <Medal size={22} />,
  level10: <Crown size={22} />,
};

const r = (v) => (v == null ? null : Math.round(v));
// Gelang mengirim tiap ~15 detik, jadi label waktu grafiknya sampai detik.
const clock = (iso, locale) => new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit" });

/** Judul bagian + kalimat penjelas singkat. */
function Section({ icon, title, sub, children }) {
  return (
    <section className="space-y-3">
      <div>
        <SectionTitle icon={icon}>{title}</SectionTitle>
        {sub && <p className="text-neutral-500 dark:text-neutral-400 text-sm -mt-2">{sub}</p>}
      </div>
      {children}
    </section>
  );
}

/**
 * Dashboard FitLearn — dibaca dari atas ke bawah:
 *   1. Sapaan & level
 *   2. Kondisi saat ini (keputusan dari semua sumber, lib/healthRules)
 *   3. Data langsung per sumber: gelang IoT, unit ruangan, analisis ML, kamera, aktivitas
 *   4. Ringkasan hari ini
 *   5. Tren: sesi ini, 7 hari, detak jantung & SpO2 gelang
 *   6. Progres belajar (streak, misi, lencana)
 */
export function Dashboard({ onTriggerBreak, onViewHistory, onOpenActivity }) {
  const { t, lang } = useT();
  const locale = lang === "id" ? "id-ID" : "en-US";
  const fmt1 = (v) => (v == null ? null : Number(v).toLocaleString(locale, { maximumFractionDigits: 1 }));
  const { profile, isAuthenticated } = useAuth();
  const { history } = useHealth();
  const { today: todayStat, history: daily } = useDailyStats();
  const ws = useWorkSession();
  const breakStats = useBreakStats();
  const { assessment, band, scores, cv, activity, session, wearable, room, roomData, now } = useHealthAssessment();

  // ── Gamifikasi (murni dari histori yang sudah ada) ──
  const game = computeGameState(daily, { breaksToday: breakStats.taken, todayStat, todayKey: localDay() });
  const { level, streak, quests, badges } = game;
  const title = levelTitle(level.level, lang);
  const unlockedCount = badges.filter((b) => b.unlocked).length;
  const firstName = isAuthenticated && profile ? (profile.fullName || "").split(" ")[0] || profile.fullName : null;
  const greeting = firstName ? t("game.hiName", { name: firstName }) : t("game.hiGuest");
  const todayFocus = todayStat?.focus ?? null;
  const heroSub = todayFocus != null ? (todayFocus >= 70 ? t("game.subFlow") : t("game.subBring")) : t("game.subReady");
  const questMeta = {
    focus: { icon: <Target size={18} />, title: t("game.questFocus", { n: quests[0].target }) },
    hours: { icon: <Timer size={18} />, title: t("game.questHours", { n: quests[1].target }) },
    breaks: { icon: <Coffee size={18} />, title: t("game.questBreaks", { n: quests[2].target }) },
  };
  const badgesWithIcons = badges.map((b) => ({ ...b, icon: BADGE_ICONS[b.id] }));

  // ── Gelang ──
  const latest = band.latest;
  const bandState = band.fresh ? "on" : band.hasData ? "stale" : "off";
  const bandHr = band.fresh ? band.heartRate : latest?.heartRate ?? null;
  const bandSpo2 = band.fresh ? band.spo2 : latest?.spo2 ?? null;

  // ── Kamera ──
  const camState = cv.live ? "on" : ws.active ? "stale" : "off";
  const camStateLabel = cv.live ? t("dash.stOn") : ws.active ? t("health.camSearching") : t("dash.stOff");

  // ── Sesi ──
  const sessionMin = session.seconds != null ? Math.floor(session.seconds / 60) : null;
  const sessionValue = sessionMin == null ? null : sessionMin < 60 ? sessionMin : fmt1(session.hours);
  const sessionUnit = sessionMin != null && sessionMin < 60 ? t("common.min") : t("dash.u.hours");

  // ── Hari ini ──
  const calm = todayStat?.stress == null ? null : Math.max(0, 100 - todayStat.stress);
  const hours = todayStat?.workHours ?? 0;

  // ── Data grafik ──
  const sessionData = history.map((h) => ({ t: h.t, focus: h.productivity, stress: h.stress }));
  const weekData = daily
    .filter((d) => d.samples > 0)
    .slice(-7)
    .map((d) => ({ t: new Date(`${d.day}T00:00:00`).toLocaleDateString(locale, { weekday: "short", day: "numeric" }), focus: d.focus, stress: d.stress }));
  const bandData = wearable.readings.map((x) => ({ t: clock(x.at, locale), hr: x.heartRate, spo2: x.spo2 }));
  const roomChart = roomData.readings.map((x) => ({ t: clock(x.at, locale), suhu: x.suhu, ppm: x.gasPpm }));
  const roomSim = roomData.readings.some((x) => x.suhuDummy && x.suhu != null);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-7 lg:space-y-8">

      {/* 1. Sapaan & level */}
      <HeroPanel>
        <div className="flex flex-col lg:flex-row lg:items-end gap-5 lg:gap-10">
          <div className="lg:w-2/5">
            <h1 style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: "clamp(22px,5vw,30px)", fontWeight: 700 }} className="leading-tight">{greeting}</h1>
            <p className="text-white/80 mt-1" style={{ fontSize: 14 }}>{heroSub}</p>
          </div>
          <div className="flex-1">
            <LevelBar
              level={level.level} title={title} intoLevel={level.intoLevel} span={level.span} toNext={level.toNext} progress={level.progress}
              labels={{ level: t("game.level"), toNext: level.toNext > 0 ? t("game.toNext", { n: level.toNext }) : t("game.maxLevel") }}
            />
          </div>
        </div>
      </HeroPanel>

      {/* 2. Kondisi saat ini */}
      <HealthStatusCard
        assessment={assessment}
        t={t}
        onBreak={onTriggerBreak}
        onStart={ws.active ? undefined : ws.start}
      />

      {/* 3. Data langsung */}
      <Section icon={<Gauge size={20} />} title={t("dash.liveTitle")} sub={t("dash.liveSub")}>
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4 lg:gap-5">
          <SourcePanel
            icon={<Watch size={19} />}
            title={t("dash.srcBand")}
            sub={latest?.deviceId ? t("wearable.device", { id: latest.deviceId }) : t("dash.srcBandSub")}
            state={bandState}
            stateLabel={band.fresh ? t("dash.stOn") : band.hasData ? t("dash.stStale") : t("dash.stOff")}
            empty={!band.hasData ? t("dash.emptyBand") : null}
            footer={latest ? t("dash.lastBand", { ago: agoLabel(now - Date.parse(latest.at), t) }) : null}
          >
            <MetricRow t={t} label={t("dash.m.hr")} hint={t("dash.h.hr")} value={bandHr} unit={t("common.bpm")} rating={band.fresh ? rateHeartRate(bandHr) : null} />
            <MetricRow t={t} label={t("dash.m.spo2")} hint={t("dash.h.spo2")} value={bandSpo2} unit="%" rating={band.fresh ? rateSpo2(bandSpo2) : null} />
          </SourcePanel>

          <RoomPanel room={room} t={t} now={now} locale={locale} />

          <SourcePanel
            icon={<Cpu size={19} />}
            title={t("dash.srcModel")}
            sub={t("dash.srcModelSub")}
            state={scores.live ? "on" : "off"}
            stateLabel={scores.live ? t("dash.stOn") : t("dash.stOff")}
            empty={!scores.live ? t("dash.emptyModel") : null}
            footer={scores.live ? (band.fresh ? t("dash.modelHrBand") : t("dash.modelHrDefault")) : null}
          >
            <MetricRow t={t} label={t("dash.m.focus")} hint={t("dash.h.focus")} value={r(scores.focusScore)} unit="/100" rating={rateFocus(scores.focusScore)} />
            <MetricRow t={t} label={t("dash.m.stress")} hint={t("dash.h.stress")} value={r(scores.stressLevel)} unit="/100" rating={rateStress(scores.stressLevel)} />
            <MetricRow t={t} label={t("dash.m.fatigue")} hint={t("dash.h.fatigue")} value={r(scores.fatigueScore)} unit="/100" rating={rateFatigue(scores.fatigueScore)} />
          </SourcePanel>

          <SourcePanel
            icon={<Camera size={19} />}
            title={t("dash.srcCamera")}
            sub={t("dash.srcCameraSub")}
            state={camState}
            stateLabel={camStateLabel}
            empty={!ws.active ? t("dash.emptyCamera") : null}
          >
            <MetricRow t={t} label={t("dash.m.perclos")} hint={t("dash.h.perclos", { t: THRESHOLDS.perclos })} value={cv.live ? cv.perclos : null} rating={cv.live ? ratePerclos(cv.perclos) : null} />
            <MetricRow t={t} label={t("dash.m.blink")} hint={t("dash.h.blink")} value={cv.live ? cv.blinkRate : null} unit={t("dash.u.perMin")} rating={cv.live ? rateBlink(cv.blinkRate, session.seconds) : null} />
            <MetricRow t={t} label={t("dash.m.posture")} hint={t("dash.h.posture")} rating={cv.live ? ratePosture(cv.isSlumping, cv.posture != null) : null} />
            <MetricRow t={t} label={t("dash.m.tension")} hint={t("dash.h.tension")} value={cv.live && cv.tension != null ? Math.round(cv.tension * 100) : null} unit="%" rating={cv.live ? rateTension(cv.tension) : null} />
            <MetricRow t={t} label={t("dash.m.pupil")} hint={t("dash.h.pupil")} value={cv.live && cv.pupilDilation != null ? Math.round(cv.pupilDilation * 100) : null} unit="%" />
          </SourcePanel>

          <SourcePanel
            icon={<Activity size={19} />}
            title={t("dash.srcActivity")}
            sub={t("dash.srcActivitySub")}
            state={ws.active ? "on" : "off"}
            stateLabel={ws.active ? t("dash.stOn") : t("dash.stOff")}
            empty={!ws.active ? t("dash.emptyActivity") : null}
            footer={ws.active ? (
              <button onClick={onOpenActivity} className="inline-flex items-center gap-1 text-primary dark:text-accent font-semibold hover:underline">
                {t("dashboard.openActivity")} <ChevronRight size={13} />
              </button>
            ) : null}
          >
            <MetricRow t={t} label={t("dash.m.session")} hint={t("dash.h.session")} value={sessionValue} unit={sessionUnit} rating={rateSessionHours(session.hours)} />
            <MetricRow t={t} label={t("dash.m.kpm")} hint={t("dash.h.kpm")} value={activity.keysPerMin ?? null} unit={t("dash.u.perMin")} rating={rateActivity(activity.status, activity.active)} />
            <MetricRow t={t} label={t("dash.m.activeRatio")} hint={t("dash.h.activeRatio")} value={activity.activeRatio != null ? Math.round(activity.activeRatio * 100) : null} unit="%" />
            <MetricRow t={t} label={t("dash.m.away")} hint={t("dash.h.away")} value={session.awayCount ?? 0} unit={t("dash.u.times")} />
          </SourcePanel>
        </div>
      </Section>

      {/* 4. Hari ini */}
      <Section icon={<CalendarDays size={20} />} title={t("dash.todayTitle")} sub={t("dash.todaySub")}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <StatCard icon={<Brain size={20} />} label={t("dash.tFocus")} value={todayFocus ?? "--"} unit={todayFocus != null ? "/100" : null} tone="primary" />
          <StatCard icon={<Smile size={20} />} label={t("dash.tCalm")} value={calm ?? "--"} unit={calm != null ? "/100" : null} hint={t("dash.tCalmHint")} tone="fun" />
          <StatCard icon={<Timer size={20} />} label={t("dash.tHours")} value={fmt1(hours)} unit={t("dash.u.hours")} tone="accent" />
          <StatCard
            icon={<Coffee size={20} />}
            label={t("dash.tBreaks")}
            value={breakStats.taken}
            hint={breakStats.recommended > 0 ? t("dash.tBreaksHint", { taken: breakStats.taken, rec: breakStats.recommended })
              : breakStats.taken > 0 ? t("dash.tBreaksSelf") : t("dash.tBreaksNone")}
            tone="warning"
          />
        </div>
      </Section>

      {/* 5. Tren */}
      <Section icon={<TrendingUp size={20} />} title={t("dash.trendTitle")}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
          <TrendChart
            title={t("dash.chSession")}
            data={sessionData}
            series={[{ key: "focus", name: t("dash.m.focus"), color: "var(--chart-1)" }, { key: "stress", name: t("dash.m.stress"), color: "var(--chart-2)" }]}
            domain={[0, 100]}
            empty={t("dash.chSessionEmpty")}
          />
          <TrendChart
            title={t("dash.chWeek")}
            data={weekData}
            series={[{ key: "focus", name: t("dash.m.focus"), color: "var(--chart-1)" }, { key: "stress", name: t("dash.m.stress"), color: "var(--chart-2)" }]}
            domain={[0, 100]}
            empty={t("dash.chWeekEmpty")}
            action={
              <button onClick={onViewHistory} className="inline-flex items-center gap-1 text-primary dark:text-accent hover:underline text-xs font-semibold">
                {t("history.viewAll")} <ChevronRight size={13} />
              </button>
            }
          />
          <TrendChart
            title={t("dash.chHr")}
            data={bandData}
            series={[{ key: "hr", name: t("dash.m.hr"), color: "var(--chart-3)" }]}
            unit={t("common.bpm")}
            empty={t("dash.chBandEmpty")}
          />
          <TrendChart
            title={t("dash.chSpo2")}
            data={bandData}
            series={[{ key: "spo2", name: "SpO2", color: "var(--chart-1)" }]}
            domain={[85, 100]}
            unit="%"
            empty={t("dash.chBandEmpty")}
          />
          <TrendChart
            title={roomSim ? t("dash.chSuhuSim") : t("dash.chSuhu")}
            data={roomChart}
            series={[{ key: "suhu", name: t("dash.m.suhu"), color: "var(--chart-2)" }]}
            unit="°C"
            empty={t("dash.chRoomEmpty")}
          />
          <TrendChart
            title={t("dash.chAir")}
            data={roomChart}
            series={[{ key: "ppm", name: t("dash.m.air"), color: "var(--chart-3)" }]}
            unit="ppm"
            empty={t("dash.chAirEmpty")}
          />
        </div>
      </Section>

      {/* 6. Progres belajar */}
      <Section icon={<Trophy size={20} />} title={t("dash.progressTitle")}>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-5">
          <div className="space-y-4 self-start">
            <StreakCard
              current={streak.current}
              best={streak.best}
              activeToday={streak.activeToday}
              labels={{ days: t("game.days"), streak: t("game.streak"), best: t("game.best"), startToday: t("game.startToday"), doneToday: t("game.doneToday") }}
            />
            <Card className="p-5">
              <SectionTitle icon={<Trophy size={18} />}>{t("game.badges")}</SectionTitle>
              <p className="text-neutral-400 dark:text-neutral-500 text-sm -mt-2 mb-4">{t("game.badgesSub", { n: unlockedCount, total: badges.length })}</p>
              <BadgeShelf badges={badgesWithIcons} nameOf={(id) => t(`game.badgeNames.${id}`)} />
            </Card>
          </div>
          <Card className="xl:col-span-2 p-5 lg:p-6">
            <SectionTitle icon={<Gamepad2 size={20} />}>{t("game.quests")}</SectionTitle>
            <p className="text-neutral-400 dark:text-neutral-500 text-sm -mt-2 mb-4">{t("game.questsSub")}</p>
            <div className="space-y-2.5">
              {quests.map((q) => (
                <QuestRow
                  key={q.id}
                  icon={questMeta[q.id].icon}
                  title={questMeta[q.id].title}
                  current={q.current}
                  target={q.target}
                  unit={q.unit}
                  progress={q.progress}
                  done={q.done}
                  labels={{ unitHours: t("game.unitHours") }}
                  CheckIcon={Check}
                />
              ))}
            </div>
            {!ws.active && (
              <button
                onClick={ws.start}
                className="mt-4 w-full py-3 rounded-2xl bg-primary hover:bg-primary-hover text-white font-bold text-sm active:scale-[0.98] transition shadow-sm inline-flex items-center justify-center gap-2"
              >
                <Rocket size={17} /> {t("game.startCta")}
              </button>
            )}
          </Card>
        </div>
      </Section>
    </div>
  );
}

export default Dashboard;
