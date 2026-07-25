import { useState } from "react";
import { Brain, Dumbbell, Apple, Moon, Share2, Download, AlertTriangle, Coffee, Inbox, Check, Lightbulb } from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { Card, PrimaryButton, GhostButton, PageHeader } from "./shared";
import { useHealth } from "../context/HealthProvider";
import { useT } from "../i18n/LanguageProvider";

const PERCLOS_THRESHOLD = Number(import.meta.env.VITE_PERCLOS_THRESHOLD) || 0.4;

const REASON_KEY = {
  stress_index_high: { title: "advisor.reasonStressHigh", body: "advisor.sugBreatheBody" },
  fatigue_detected: { title: "advisor.reasonFatigue", body: "advisor.sugBreakBody" },
  long_session: { title: "advisor.reasonLongSession", body: "advisor.sugBreakBody" },
  cognitive_overload: { title: "advisor.reasonOverload", body: "advisor.sugBreatheBody" },
};

// Tips terlokalisasi (dipilih berdasarkan bahasa aktif).
const RECS = {
  id: {
    mental: [
      { title: "Pernapasan kotak 5 menit", desc: "Menurunkan kortisol dan mereset fokus.", impact: "+12% fokus" },
      { title: "Blok satu-tugas", desc: "Bisukan notifikasi selama 45 menit.", impact: "+18% output" },
      { title: "Meditasi singkat", desc: "Sesi terpandu di aplikasi Calm.", impact: "−22% stres" },
    ],
    physical: [
      { title: "Reset postur", desc: "Putar bahu, luruskan tulang belakang.", impact: "+8% nyaman" },
      { title: "Peregangan leher & pergelangan", desc: "Urutan 60 detik.", impact: "−15% pegal" },
      { title: "Jalan setelah makan", desc: "Jalan kaki 10 menit di luar.", impact: "+10% energi" },
    ],
    nutrition: [
      { title: "Minum air sekarang", desc: "Kamu kurang 1,5 gelas dari target.", impact: "+6% fokus" },
      { title: "Tambah protein saat makan siang", desc: "Menstabilkan energi sore.", impact: "−12% lemas" },
      { title: "Batasi kafein setelah jam 2", desc: "Memperbaiki tidur malam ini.", impact: "+9% tidur" },
    ],
    sleep: [
      { title: "Relaksasi pukul 22.30", desc: "Redupkan lampu, jauhi layar.", impact: "+14% tidur dalam" },
      { title: "Kamar sejuk", desc: "Atur termostat ke 19°C.", impact: "+7% pemulihan" },
      { title: "Bangun di jam konsisten", desc: "Mengunci ritme sirkadian.", impact: "−18% lelah" },
    ],
  },
  en: {
    mental: [
      { title: "5-min box breathing", desc: "Reduces cortisol and resets focus.", impact: "+12% focus" },
      { title: "Single-task block", desc: "Mute notifications for 45 min.", impact: "+18% output" },
      { title: "Brief meditation", desc: "Guided session in Calm app.", impact: "−22% stress" },
    ],
    physical: [
      { title: "Posture reset", desc: "Roll shoulders, align spine.", impact: "+8% comfort" },
      { title: "Wrist & neck stretch", desc: "60-second sequence.", impact: "−15% strain" },
      { title: "Walk after lunch", desc: "10-min outdoor walk.", impact: "+10% energy" },
    ],
    nutrition: [
      { title: "Hydrate now", desc: "You're 1.5 cups behind target.", impact: "+6% focus" },
      { title: "Add protein at lunch", desc: "Stabilizes afternoon energy.", impact: "−12% slump" },
      { title: "Limit caffeine after 2pm", desc: "Improves sleep onset tonight.", impact: "+9% sleep" },
    ],
    sleep: [
      { title: "Wind-down at 10:30 PM", desc: "Dim lights, no screens.", impact: "+14% deep sleep" },
      { title: "Cool bedroom", desc: "Set thermostat to 67°F.", impact: "+7% recovery" },
      { title: "Consistent wake time", desc: "Anchor circadian rhythm.", impact: "−18% fatigue" },
    ],
  },
};

const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));

export function Recommendations() {
  const { t, lang } = useT();
  const [tab, setTab] = useState("mental");
  const { data } = useHealth();
  const { focusScore, stressLevel, fatigueScore, vitals, breakWarning } = data;
  const hasData = focusScore != null;

  const tabs = [
    { id: "mental", label: t("recommendations.tabMental"), icon: <Brain size={15} /> },
    { id: "physical", label: t("recommendations.tabPhysical"), icon: <Dumbbell size={15} /> },
    { id: "nutrition", label: t("recommendations.tabNutrition"), icon: <Apple size={15} /> },
    { id: "sleep", label: t("recommendations.tabSleep"), icon: <Moon size={15} /> },
  ];
  const currentTab = tabs.find((x) => x.id === tab);
  const recList = (RECS[lang] || RECS.en)[tab];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 lg:space-y-6">
      <PageHeader icon={<Lightbulb size={24} />} title={t("recommendations.title")} subtitle={t("recommendations.sub")} />

      {!hasData ? (
        <Card className="p-10 flex flex-col items-center justify-center text-center gap-3">
          <Inbox size={28} className="text-neutral-300 dark:text-neutral-600" />
          <p className="text-neutral-400 dark:text-neutral-500 text-sm max-w-sm">{t("recommendations.idle")}</p>
        </Card>
      ) : (
        <RecommendationsBody
          t={t} lang={lang} tab={tab} setTab={setTab} tabs={tabs} currentTab={currentTab} recList={recList}
          focusScore={focusScore} stressLevel={stressLevel} fatigueScore={fatigueScore}
          vitals={vitals} breakWarning={breakWarning}
        />
      )}
    </div>
  );
}

function RecommendationsBody({ t, lang, tab, setTab, tabs, currentTab, recList, focusScore, stressLevel, fatigueScore, vitals, breakWarning }) {
  const [shared, setShared] = useState(false);
  const healthScore = clamp((focusScore + (100 - stressLevel) + (100 - fatigueScore)) / 3);
  const risk = healthScore >= 75 ? { label: t("recommendations.lowRisk"), cls: "bg-accent/15 text-primary dark:text-accent" }
    : healthScore >= 55 ? { label: t("recommendations.moderateRisk"), cls: "bg-warning/15 text-warning" }
    : { label: t("recommendations.highRisk"), cls: "bg-danger/15 text-danger" };

  // Ringkasan teks untuk dibagikan / diekspor.
  const summaryLines = [
    `${t("recommendations.healthScore")}: ${healthScore}/100 (${risk.label})`,
    `${t("dashboard.metricFocus")}: ${clamp(focusScore)}/100`,
    `${t("dashboard.metricStress")}: ${clamp(stressLevel)}%`,
    `${t("dashboard.metricFatigue")}: ${clamp(fatigueScore)}%`,
  ];

  // Bagikan via Web Share API; fallback salin ke clipboard.
  const handleShare = async () => {
    const text = `FitLearn — ${t("recommendations.healthScore")}\n${summaryLines.join("\n")}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "FitLearn", text });
      } else {
        await navigator.clipboard.writeText(text);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
    } catch { /* dibatalkan pengguna — abaikan */ }
  };

  // Ekspor PDF: buka jendela cetak terformat → pengguna "Save as PDF".
  const handleExport = () => {
    const recs = (RECS[lang] || RECS.en);
    const tabTitle = { mental: t("recommendations.tabMental"), physical: t("recommendations.tabPhysical"), nutrition: t("recommendations.tabNutrition"), sleep: t("recommendations.tabSleep") };
    const recBlocks = ["mental", "physical", "nutrition", "sleep"].map((k) => `
      <h3>${tabTitle[k]}</h3>
      <ul>${recs[k].map((r) => `<li><b>${r.title}</b> — ${r.desc} <span class="impact">${r.impact}</span></li>`).join("")}</ul>
    `).join("");
    const today = new Date().toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { year: "numeric", month: "long", day: "numeric" });
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>FitLearn — ${t("recommendations.exportTitle")}</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;max-width:720px;margin:32px auto;padding:0 24px;line-height:1.5}
        h1{font-size:24px;margin:0 0 4px} .sub{color:#666;margin:0 0 20px;font-size:13px}
        .score{font-size:40px;font-weight:700;margin:0} .risk{display:inline-block;padding:3px 10px;border-radius:8px;background:#ece9ff;color:#5B4BE6;font-size:13px;font-weight:600;margin-left:8px}
        table{width:100%;border-collapse:collapse;margin:16px 0} td{padding:8px 0;border-bottom:1px solid #eee;font-size:14px} td:last-child{text-align:right;font-family:monospace;color:#5B4BE6}
        h3{font-size:15px;margin:18px 0 6px;color:#5B4BE6} ul{margin:0;padding-left:18px} li{font-size:13px;margin:4px 0} .impact{color:#5B4BE6;font-family:monospace;font-size:12px}
        .foot{margin-top:28px;color:#999;font-size:11px;border-top:1px solid #eee;padding-top:10px}
      </style></head><body>
      <h1>FitLearn — ${t("recommendations.exportTitle")}</h1>
      <p class="sub">${today}</p>
      <p class="score">${healthScore}<span style="font-size:16px;color:#999">/100</span><span class="risk">${risk.label}</span></p>
      <table>
        <tr><td>${t("dashboard.metricFocus")}</td><td>${clamp(focusScore)}/100</td></tr>
        <tr><td>${t("dashboard.metricStress")}</td><td>${clamp(stressLevel)}%</td></tr>
        <tr><td>${t("dashboard.metricFatigue")}</td><td>${clamp(fatigueScore)}%</td></tr>
      </table>
      ${recBlocks}
      <p class="foot">FitLearn · ${today}</p>
      </body></html>`;
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 300);
  };

  const good = clamp(focusScore);
  const moderate = clamp(stressLevel);
  const poor = clamp(fatigueScore);
  const total = good + moderate + poor || 1;

  const perclos = vitals.perclos ?? 0;
  const pupil = vitals.pupilDilation ?? 0;
  const radarData = [
    { dim: t("recommendations.dimFocus"), val: clamp(focusScore) },
    { dim: t("recommendations.dimCalm"), val: clamp(100 - stressLevel) },
    { dim: t("recommendations.dimEnergy"), val: clamp(100 - fatigueScore) },
    { dim: t("recommendations.dimEye"), val: clamp(100 - (perclos / PERCLOS_THRESHOLD) * 100) },
    { dim: t("recommendations.dimCognitive"), val: clamp(pupil * 100) },
  ];

  const reason = breakWarning?.reason ? REASON_KEY[breakWarning.reason] : null;
  const suggestedTab =
    stressLevel > 65 ? "mental"
    : fatigueScore > 60 ? "sleep"
    : perclos > PERCLOS_THRESHOLD ? "physical"
    : tab;

  return (
    <>
      {breakWarning?.triggered && reason && (
        <Card className="p-5 border-warning/40 bg-linear-to-br from-warning/10 to-transparent">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-warning/15 text-warning flex items-center justify-center shrink-0">
                <AlertTriangle size={22} />
              </div>
              <div>
                <div className="text-neutral-900 dark:text-white font-semibold">{t(reason.title)}</div>
                <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1 max-w-xl leading-relaxed">{t(reason.body)}</p>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-warning text-white text-sm font-semibold shrink-0">
              <Coffee size={16} /> {t("advisor.sugBreakTitle", { min: breakWarning.recommendedMinutes })}
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 lg:gap-6">
        <Card className="xl:col-span-2 p-5 lg:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="text-neutral-500 dark:text-neutral-400 text-sm">{t("recommendations.healthScore")}</div>
              <div className="flex items-baseline gap-2 mt-1">
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 36, fontWeight: 600 }} className="text-neutral-900 dark:text-white">{healthScore}</span>
                <span className="text-neutral-400 text-sm">/ 100</span>
                <span className={`ml-1 px-2 py-0.5 rounded-lg text-xs font-semibold ${risk.cls}`}>{risk.label}</span>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <GhostButton onClick={handleShare}>
                <span className="inline-flex items-center gap-1.5 text-sm">
                  {shared ? <Check size={13} /> : <Share2 size={13} />} {shared ? t("recommendations.copied") : t("recommendations.share")}
                </span>
              </GhostButton>
              <PrimaryButton onClick={handleExport}><span className="inline-flex items-center gap-1.5 text-sm"><Download size={13} /> {t("recommendations.exportPdf")}</span></PrimaryButton>
            </div>
          </div>

          <div className="mt-4 h-2.5 rounded-full bg-neutral-100 dark:bg-white/5 overflow-hidden flex">
            <div className="h-full bg-accent" style={{ width: `${(good / total) * 100}%` }} />
            <div className="h-full bg-warning" style={{ width: `${(moderate / total) * 100}%` }} />
            <div className="h-full bg-danger/70" style={{ width: `${(poor / total) * 100}%` }} />
          </div>

          <div className="mt-5 flex flex-wrap gap-2 items-center">
            {tabs.map((x) => (
              <button
                key={x.id}
                onClick={() => setTab(x.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-sm font-medium transition ${
                  tab === x.id ? "bg-primary text-white border-primary"
                    : "border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/5 hover:border-neutral-300"
                } ${suggestedTab === x.id && tab !== x.id ? "ring-2 ring-accent/40" : ""}`}
              >
                {x.icon} {x.label}
                {suggestedTab === x.id && tab !== x.id && (
                  <span className="ml-1 text-[10px] font-semibold text-primary dark:text-accent">AI</span>
                )}
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {recList.map((rec, i) => (
              <div key={i} className="p-4 rounded-2xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/2 hover:border-accent/40 transition group">
                <div className="w-9 h-9 rounded-xl bg-accent/10 text-primary dark:text-accent flex items-center justify-center group-hover:scale-105 transition">
                  {currentTab?.icon}
                </div>
                <div className="mt-3 text-neutral-800 dark:text-white font-semibold text-sm">{rec.title}</div>
                <p className="text-neutral-500 dark:text-neutral-400 mt-1 text-xs leading-relaxed">{rec.desc}</p>
                <span className="inline-block mt-3 px-2 py-0.5 rounded-md bg-accent/12 text-primary dark:text-accent text-xs font-semibold font-mono">{rec.impact}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 lg:p-6">
          <h3 style={{ fontFamily: "'Baloo 2', 'Sora', sans-serif", fontSize: 15, fontWeight: 700 }} className="text-neutral-900 dark:text-white">{t("recommendations.wellnessProfile")}</h3>
          <p className="text-neutral-400 dark:text-neutral-500 mt-1 text-sm">{t("recommendations.wellnessSub")}</p>
          <div className="h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="currentColor" strokeOpacity={0.1} />
                <PolarAngleAxis dataKey="dim" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                <Radar dataKey="val" stroke="#5B4BE6" fill="#FF9E45" fillOpacity={0.25} isAnimationActive={false} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </>
  );
}

export default Recommendations;
