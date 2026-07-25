import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import {
  WifiOff, ChevronRight, Coffee, Brain, Smile, Timer, Target, Gamepad2, Trophy,
  TrendingUp, BarChart3, Rocket, Check, Sprout, Flame, Zap, BookOpen, Medal, Crown,
} from "lucide-react";
import { Card } from "./shared";
import { HeroPanel, LevelBar, StreakCard, StatCard, QuestRow, BadgeShelf, SectionTitle } from "./gamified";

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
import { useHealth } from "../context/HealthProvider";
import { useDailyStats } from "../context/DailyStatsProvider";
import { useWorkSession } from "../context/WorkSessionProvider";
import { useAuth } from "../context/AuthContext";
import { useBreakStats } from "../lib/breakStats";
import { useT } from "../i18n/LanguageProvider";
import { computeGameState, levelTitle } from "../lib/gamification";
import { localDay } from "../context/DailyStatsProvider";

const r = (v) => (v == null ? "--" : Math.round(v));

export function Dashboard({ onTriggerBreak, onViewHistory, onOpenActivity }) {
  const { t, lang } = useT();
  const { profile, isAuthenticated } = useAuth();
  const { data, history, isLive } = useHealth();
  const { today: todayStat, history: daily } = useDailyStats();
  const { active: workActive } = useWorkSession();
  const breakStats = useBreakStats();
  const { focusScore, stressLevel, fatigueScore, vitals, sessionInfo, breakWarning } = data;

  const displayFocus = focusScore ?? todayStat?.focus;
  const displayStress = todayStat?.stress ?? stressLevel;
  const displayHours = todayStat?.workHours ?? sessionInfo.activeWorkHours;
  const calm = displayStress == null ? null : Math.max(0, 100 - Math.round(displayStress));
  const hasData = focusScore != null || (todayStat && todayStat.samples > 0);

  // ── Turunan gamifikasi (murni dari histori yang sudah ada) ──
  const game = computeGameState(daily, {
    breaksToday: breakStats.taken,
    todayStat,
    todayKey: localDay(),
  });
  const { level, streak, quests, badges } = game;
  const title = levelTitle(level.level, lang);
  const unlockedCount = badges.filter((b) => b.unlocked).length;

  const greeting = isAuthenticated && profile
    ? t("game.hiName", { name: (profile.fullName || "").split(" ")[0] || profile.fullName })
    : t("game.hiGuest");
  const heroSub = hasData ? (displayFocus >= 70 ? t("game.subFlow") : t("game.subBring")) : t("game.subReady");

  const questMeta = {
    focus: { icon: <Target size={18} />, title: t("game.questFocus", { n: quests[0].target }) },
    hours: { icon: <Timer size={18} />, title: t("game.questHours", { n: quests[1].target }) },
    breaks: { icon: <Coffee size={18} />, title: t("game.questBreaks", { n: quests[2].target }) },
  };
  const questLabels = { unitHours: t("game.unitHours") };
  const nameOf = (id) => t(`game.badgeNames.${id}`);
  const badgesWithIcons = badges.map((b) => ({ ...b, icon: BADGE_ICONS[b.id] }));

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 lg:space-y-6">

      {/* ══ HERO: level + XP + sapaan ══ */}
      <HeroPanel>
        <div className="flex flex-col gap-5">
          <div>
            <h1 style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: "clamp(22px,5vw,30px)", fontWeight: 700 }} className="leading-tight">
              {greeting}
            </h1>
            <p className="text-white/80 mt-1" style={{ fontSize: 14 }}>{heroSub}</p>
          </div>
          <LevelBar
            level={level.level}
            title={title}
            intoLevel={level.intoLevel}
            span={level.span}
            toNext={level.toNext}
            progress={level.progress}
            labels={{ level: t("game.level"), toNext: level.toNext > 0 ? t("game.toNext", { n: level.toNext }) : t("game.maxLevel") }}
          />
        </div>
      </HeroPanel>

      {/* ══ Break warning (data nyata) ══ */}
      {breakWarning?.triggered && (
        <Card className="p-4 border-warning/40 bg-warning/8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-warning/15 text-warning flex items-center justify-center shrink-0"><Coffee size={18} /></div>
              <div>
                <div className="text-neutral-900 dark:text-white font-semibold text-sm">{t("dashboard.breakRecommended")}</div>
                <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-0.5">
                  {t("dashboard.breakTime")} · {t("dashboard.suggestedMin", { min: breakWarning.recommendedMinutes })}
                </p>
              </div>
            </div>
            <button onClick={onTriggerBreak} className="px-4 py-2 rounded-2xl bg-warning text-white text-sm font-bold hover:opacity-90 active:scale-95 transition shrink-0">
              {t("dashboard.takeBreakNow")}
            </button>
          </div>
        </Card>
      )}

      {/* ══ Streak + Stat cards ══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <div className="col-span-2 lg:col-span-1">
          <StreakCard
            current={streak.current}
            best={streak.best}
            activeToday={streak.activeToday}
            labels={{ days: t("game.days"), streak: t("game.streak"), best: t("game.best"), startToday: t("game.startToday"), doneToday: t("game.doneToday") }}
          />
        </div>
        <StatCard icon={<Brain size={20} />} label={t("game.statFocus")} value={r(displayFocus)} unit="/100" tone="primary" />
        <StatCard icon={<Smile size={20} />} label={t("game.statCalm")} value={calm == null ? "--" : calm} unit="%" tone="fun" />
        <StatCard icon={<Timer size={20} />} label={t("game.statHours")} value={displayHours != null ? `${(displayHours || 0).toFixed(1)}` : "--"} unit={t("game.unitHours")} tone="accent" />
      </div>

      {/* ══ Quest harian + Badge ══ */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 lg:gap-6">
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
                labels={questLabels}
                CheckIcon={Check}
              />
            ))}
          </div>
          {!workActive && (
            <button
              onClick={onOpenActivity}
              className="mt-4 w-full py-3 rounded-2xl bg-primary hover:bg-primary-hover text-white font-bold text-sm active:scale-[0.98] transition shadow-sm inline-flex items-center justify-center gap-2"
            >
              <Rocket size={17} /> {t("game.startCta")}
            </button>
          )}
        </Card>

        <Card className="p-5 lg:p-6">
          <SectionTitle icon={<Trophy size={20} />}>{t("game.badges")}</SectionTitle>
          <p className="text-neutral-400 dark:text-neutral-500 text-sm -mt-2 mb-4">
            {t("game.badgesSub", { n: unlockedCount, total: badges.length })}
          </p>
          <BadgeShelf badges={badgesWithIcons} nameOf={nameOf} />
        </Card>
      </div>

      {/* ══ Grafik progres (tetap ada, bergaya lebih ramah) ══ */}
      <Card className="p-5 lg:p-6">
        <div className="flex items-center justify-between mb-4">
          <SectionTitle icon={<TrendingUp size={20} />}>{t("history.card7Title")}</SectionTitle>
          <button onClick={onViewHistory} className="inline-flex items-center gap-1 text-primary dark:text-accent hover:underline text-sm font-semibold">
            {t("history.viewAll")} <ChevronRight size={15} />
          </button>
        </div>
        <div className="h-56 sm:h-64">
          {history.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-neutral-400 dark:text-neutral-500 gap-2">
              <BarChart3 size={30} className="opacity-50" />
              <span className="text-sm text-center max-w-xs">{t("dashboard.chartEmpty")}</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history} margin={{ left: -20, top: 8, right: 8 }}>
                <CartesianGrid stroke="currentColor" strokeOpacity={0.07} vertical={false} />
                <XAxis dataKey="t" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--color-surface-dark, #fff)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 14, fontSize: 12 }} itemStyle={{ color: "#6b7280" }} />
                <Line type="monotone" dataKey="productivity" stroke="#5B4BE6" strokeWidth={3} dot={{ r: 3, fill: "#5B4BE6" }} activeDot={{ r: 6 }} isAnimationActive={false} connectNulls />
                <Line type="monotone" dataKey="stress" stroke="#FF9E45" strokeWidth={3} dot={{ r: 3, fill: "#FF9E45" }} activeDot={{ r: 6 }} isAnimationActive={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* ══ Live session bar ══ */}
      <Card className="p-3.5 px-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 justify-between">
          <div className="flex items-center gap-2">
            {isLive ? (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent" />
              </span>
            ) : (
              <WifiOff size={14} className="text-neutral-400" />
            )}
            <span className="text-neutral-700 dark:text-neutral-200 font-medium text-sm">{isLive ? t("dashboard.sessionLive") : t("dashboard.sessionOffline")}</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-neutral-500 dark:text-neutral-400 text-xs">
            <span>{t("dashboard.source")}: <span className={`font-mono ${data.source === "live" ? "text-accent" : "text-neutral-500"}`}>{data.source === "live" ? t("status.camera") : t("status.baseline")}</span></span>
            <span>HR: <span className="font-mono text-neutral-700 dark:text-neutral-200">{vitals.heartRate != null ? `${vitals.heartRate} bpm` : "--"}</span></span>
            <span>PERCLOS: <span className="font-mono text-neutral-700 dark:text-neutral-200">{vitals.perclos != null ? vitals.perclos : "--"}</span></span>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default Dashboard;
