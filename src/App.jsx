import { useEffect, useState } from "react";
import { LayoutDashboard, HeartPulse, Lightbulb, Activity, ClipboardCheck, Settings as SettingsIcon, Sparkles, Sun, Moon, Menu, X, HelpCircle, LogIn, LogOut, Play, History as HistoryIcon, Coffee } from "lucide-react";
import { Logo } from "./components/shared";
import { Login } from "./components/Login";
import { Dashboard } from "./components/Dashboard";
import { HealthMonitoring } from "./components/HealthMonitoring";
import { Recommendations } from "./components/Recommendations";
import { AIAdvisor } from "./components/AIAdvisor";
import { ActivityMonitor } from "./components/ActivityMonitor";
import { Assessment } from "./components/Assessment";
import { Settings } from "./components/Settings";
import { History } from "./components/History";
import { BreakModal } from "./components/BreakModal";
import { FocusModal } from "./components/FocusModal";
import { Onboarding } from "./components/Onboarding";
import { NotificationBell } from "./components/NotificationBell";
import { useT, LanguageSwitcher } from "./i18n/LanguageProvider";
import { useAuth } from "./context/AuthContext";
import { useWorkSession } from "./context/WorkSessionProvider";
import { useBreakSession } from "./context/BreakSessionProvider";

const nav = [
  { id: "dashboard",       icon: LayoutDashboard },
  { id: "health",          icon: HeartPulse },
  { id: "history",         icon: HistoryIcon },
  { id: "assessment",      icon: ClipboardCheck },
  { id: "recommendations", icon: Lightbulb },
  { id: "advisor",         icon: Sparkles },
  { id: "activity",        icon: Activity },
  { id: "settings",        icon: SettingsIcon },
];

/** Layar loading saat sesi auth sedang dipulihkan. */
function Splash() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-neutral-50 dark:bg-bg-dark">
      <div className="animate-pulse"><Logo size={36} /></div>
    </div>
  );
}

export default function App() {
  const { t } = useT();
  const { isAuthenticated, isConfigured, loading, profile, signOut } = useAuth();
  const { active: workActive, start: startWork, stop: stopWork, focus, dismissFocus } = useWorkSession();
  const { phase: breakPhase, secondsLeft, modalOpen, openBreak, showModal, backToWork, extendBreak } = useBreakSession();

  const [screen, setScreen]                 = useState("dashboard");
  const [dark, setDark]                     = useState(() => {
    const saved = localStorage.getItem("fitlearn-dark-mode");
    return saved ? JSON.parse(saved) : false; // default light mode
  });
  const [mobileNav, setMobileNav]           = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [showLogin, setShowLogin]           = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("fitlearn-dark-mode", JSON.stringify(dark));
  }, [dark]);

  // Aksi dari notifikasi sistem (service worker).
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMsg = (e) => {
      const d = e.data;
      if (!d) return;
      // Notifikasi "Ayo fokus" → buka alur istirahat.
      if (d.type === "focus-action" && d.action === "break") openBreak();
      // Notifikasi "waktu istirahat habis" → kembali kerja / lanjut istirahat.
      if (d.type === "break-action" && d.action === "back-to-work") backToWork();
      if (d.type === "break-action" && d.action === "keep-resting") extendBreak();
    };
    navigator.serviceWorker.addEventListener("message", onMsg);
    return () => navigator.serviceWorker.removeEventListener("message", onMsg);
  }, [openBreak, backToWork, extendBreak]);

  // ── Login gate ────────────────────────────────────────────────
  // Saat Supabase terkonfigurasi, app hanya bisa diakses setelah login.
  // Bila belum dikonfigurasi, app tetap bisa dibuka (mode tamu) agar dev jalan.
  if (loading) return <Splash />;
  if (isConfigured && !isAuthenticated) return <Login />;

  return (
    <div className="min-h-screen w-full bg-neutral-50 dark:bg-bg-dark text-neutral-900 dark:text-white transition-colors duration-200" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="flex min-h-screen">

        {/* ── Sidebar (desktop) ──────────────────────────── */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-neutral-200 dark:border-white/5 bg-white dark:bg-surface-dark sticky top-0 h-screen shadow-sm dark:shadow-none">
          <div className="px-5 py-5 border-b border-neutral-100 dark:border-white/5">
            <Logo />
          </div>

          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            {nav.map((n) => {
              const Icon = n.icon;
              const active = screen === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => setScreen(n.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-all active:scale-[0.98]
                    ${active
                      ? "bg-primary/10 text-primary font-semibold dark:bg-accent/15 dark:text-accent"
                      : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/5 hover:text-neutral-800 dark:hover:text-white"
                    }`}
                  style={{ fontSize: 14 }}
                >
                  <Icon size={18} strokeWidth={active ? 2 : 1.75} />
                  {t(`nav.${n.id}`)}
                </button>
              );
            })}
          </nav>

          <div className="p-3 border-t border-neutral-100 dark:border-white/5">
            <div className="rounded-2xl p-3.5 bg-linear-to-br from-primary to-accent text-white">
              <div style={{ fontSize: 13, fontWeight: 600 }}>{t("common.coachTitle")}</div>
              <p className="mt-1 text-white/80" style={{ fontSize: 12, lineHeight: 1.5 }}>{t("common.coachBody")}</p>
              <button className="mt-3 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 active:scale-95 text-white transition" style={{ fontSize: 12, fontWeight: 600 }}>{t("common.learnMore")}</button>
            </div>
          </div>
        </aside>

        {/* ── Main content ───────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col">

          {/* Header */}
          <header className="sticky top-0 z-30 bg-white dark:bg-surface-dark border-b border-neutral-200 dark:border-white/5 shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between px-4 lg:px-6 h-14 lg:h-16">

              {/* Left */}
              <div className="flex items-center gap-3">
                <button
                  className="lg:hidden p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/5 hover:text-neutral-800 dark:hover:text-white active:scale-95 transition"
                  onClick={() => setMobileNav(!mobileNav)}
                  aria-label={t("common.menu")}
                >
                  {mobileNav ? <X size={20} /> : <Menu size={20} />}
                </button>
                <div className="lg:hidden"><Logo /></div>
                <h2 className="hidden lg:block text-neutral-700 dark:text-neutral-200" style={{ fontFamily: "'Baloo 2', 'Sora', sans-serif", fontSize: 16, fontWeight: 700 }}>
                  {t(`nav.${screen}`)}
                </h2>
              </div>

              {/* Right */}
              <div className="flex items-center gap-1.5">
                {screen === "dashboard" && (
                  <button
                    onClick={() => setShowOnboarding(true)}
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-primary dark:text-accent hover:bg-primary/10 dark:hover:bg-accent/10 transition text-sm font-medium"
                  >
                    <HelpCircle size={14} /> {t("common.tour")}
                  </button>
                )}
                {/* Saat istirahat berjalan: pill timer di navbar (klik → buka modal) */}
                {breakPhase === "running" ? (
                  <button
                    onClick={showModal}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-warning/15 text-warning hover:bg-warning/25 transition-all active:scale-95"
                    title={t("break.openModal")}
                  >
                    <Coffee size={14} />
                    <span className="font-mono tabular-nums">
                      {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
                    </span>
                    <span className="hidden sm:inline">{t("break.onBreak")}</span>
                  </button>
                ) : (
                  <button
                    onClick={workActive ? stopWork : startWork}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                      workActive
                        ? "bg-danger/10 text-danger hover:bg-danger/15"
                        : "bg-primary text-white hover:bg-primary-hover"
                    }`}
                    title={workActive ? t("work.stopFull") : t("work.start")}
                  >
                    {workActive ? (
                      <span className="w-2 h-2 rounded-full bg-danger animate-pulse" />
                    ) : (
                      <Play size={14} />
                    )}
                    <span className="hidden sm:inline">{workActive ? t("work.stop") : t("work.start")}</span>
                  </button>
                )}
                <LanguageSwitcher />
                <button
                  onClick={() => setDark(!dark)}
                  className="w-9 h-9 rounded-lg text-neutral-500 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/10 hover:text-neutral-800 dark:hover:text-white flex items-center justify-center transition"
                  aria-label="Toggle theme"
                >
                  {dark ? <Sun size={17} /> : <Moon size={17} />}
                </button>
                <NotificationBell />

                {isAuthenticated ? (
                  <div className="flex items-center gap-2 ml-1">
                    <div className="hidden sm:flex items-center gap-2 pl-1">
                      <div className="w-8 h-8 rounded-full bg-linear-to-br from-primary to-accent flex items-center justify-center text-white text-xs font-bold">
                        {profile?.initials || "U"}
                      </div>
                      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200 max-w-[120px] truncate">{profile?.fullName}</span>
                    </div>
                    <button
                      onClick={signOut}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-neutral-500 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/10 hover:text-danger text-sm font-medium transition active:scale-95"
                      title={t("common.logout")}
                    >
                      <LogOut size={15} />
                      <span className="hidden sm:inline">{t("common.logout")}</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowLogin(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-hover active:bg-primary-active text-white text-sm font-semibold transition-all active:scale-95 ml-1"
                  >
                    <LogIn size={14} />
                    <span className="hidden sm:inline">{t("common.login")}</span>
                  </button>
                )}
              </div>
            </div>

          </header>

          {/* Mobile nav drawer — slide-in panel + backdrop */}
          <div className={`lg:hidden fixed inset-0 z-50 ${mobileNav ? "" : "pointer-events-none"}`}>
            <div
              onClick={() => setMobileNav(false)}
              className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${mobileNav ? "opacity-100" : "opacity-0"}`}
            />
            <aside
              className={`absolute top-0 left-0 h-full w-72 max-w-[82%] bg-white dark:bg-surface-dark border-r border-neutral-200 dark:border-white/5 shadow-2xl flex flex-col transition-transform duration-300 ease-out ${mobileNav ? "translate-x-0" : "-translate-x-full"}`}
            >
              <div className="flex items-center justify-between px-5 h-14 border-b border-neutral-100 dark:border-white/5">
                <Logo />
                <button
                  onClick={() => setMobileNav(false)}
                  className="w-9 h-9 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/5 hover:text-neutral-800 dark:hover:text-white flex items-center justify-center active:scale-95 transition"
                  aria-label={t("common.close")}
                >
                  <X size={18} />
                </button>
              </div>

              <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
                {nav.map((n) => {
                  const Icon = n.icon;
                  const active = screen === n.id;
                  return (
                    <button
                      key={n.id}
                      onClick={() => { setScreen(n.id); setMobileNav(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-all active:scale-[0.98]
                        ${active
                          ? "bg-primary/10 text-primary font-semibold dark:bg-accent/15 dark:text-accent"
                          : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/5 hover:text-neutral-800 dark:hover:text-white"
                        }`}
                      style={{ fontSize: 14 }}
                    >
                      <Icon size={18} strokeWidth={active ? 2 : 1.75} /> {t(`nav.${n.id}`)}
                    </button>
                  );
                })}
              </nav>

              <div className="p-3 border-t border-neutral-100 dark:border-white/5">
                <div className="rounded-2xl p-3.5 bg-linear-to-br from-primary to-accent text-white">
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{t("common.coachTitle")}</div>
                  <p className="mt-1 text-white/80" style={{ fontSize: 12, lineHeight: 1.5 }}>{t("common.coachBodyShort")}</p>
                </div>
              </div>
            </aside>
          </div>

          {/* Page content */}
          <main className="flex-1">
            {screen === "dashboard"       && <Dashboard onTriggerBreak={openBreak} onViewHistory={() => setScreen("history")} onOpenActivity={() => setScreen("activity")} />}
            {screen === "health"          && <HealthMonitoring />}
            {screen === "history"         && <History />}
            {screen === "assessment"      && <Assessment />}
            {screen === "recommendations" && <Recommendations />}
            {screen === "advisor"         && <AIAdvisor onTriggerBreak={openBreak} />}
            {screen === "activity"        && <ActivityMonitor />}
            {screen === "settings"        && <Settings />}
          </main>
        </div>
      </div>

      {screen === "dashboard" && showOnboarding && (
        <Onboarding onClose={() => setShowOnboarding(false)} />
      )}

      <BreakModal open={modalOpen} />

      {/* Modal "Ayo Fokus" — dipicu otomatis oleh WorkSessionProvider */}
      <FocusModal
        open={focus.open}
        reason={focus.reason}
        onDismiss={dismissFocus}
        onTakeBreak={() => { dismissFocus(); openBreak(); }}
      />

      {/* Login modal overlay (mode tamu / Supabase belum dikonfigurasi) */}
      {showLogin && (
        <div className="fixed inset-0 z-100">
          <button
            onClick={() => setShowLogin(false)}
            className="absolute top-4 right-4 z-10 w-9 h-9 rounded-xl bg-black/20 hover:bg-black/30 backdrop-blur flex items-center justify-center text-white transition"
            aria-label={t("common.close")}
          >
            <X size={18} />
          </button>
          <Login onEnter={() => setShowLogin(false)} />
        </div>
      )}
    </div>
  );
}
