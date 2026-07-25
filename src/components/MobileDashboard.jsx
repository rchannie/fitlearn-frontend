import { Activity, Brain, Clock, Coffee, Bell, Sparkles, Lightbulb } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { Card, GaugeRing, StatusPill, Avatar, Logo } from "./shared";
import { useHealthData } from "../hooks/useHealthData";
import { useDailyStats } from "../context/DailyStatsProvider";

export function MobileDashboard({ onTriggerBreak }) {
  // Real-time data untuk GaugeRing dan insights
  const { data, history, isLive } = useHealthData();
  const { focusScore, stressLevel, fatigueScore, sessionInfo, breakWarning } = data;
  const focus = Math.round(focusScore);
  
  // Accumulated daily stats untuk cards
  const { today: todayStat } = useDailyStats();
  
  // Jika ada daily stats, gunakan; jika tidak, fallback ke real-time
  const displayFocus = todayStat?.focus ?? focus;
  const displayStress = todayStat?.stress ?? Math.round(stressLevel);
  const displayFatigue = todayStat?.fatigue ?? Math.round(fatigueScore);
  const displayWorkHours = todayStat?.workHours ?? sessionInfo.activeWorkHours ?? 0;
  
  const trend = history.map((h) => ({ v: h.productivity }));
  const cards = [
    { l: "Focus", v: String(displayFocus), u: "/100", s: displayFocus >= 70 ? "normal" : "warning", i: <Brain size={16} /> },
    { l: "Stress", v: String(displayStress), u: "%", s: displayStress > 40 ? "warning" : "normal", i: <Activity size={16} /> },
    { l: "Active", v: `${(displayWorkHours || 0).toFixed(1)}h`, s: "normal", i: <Clock size={16} /> },
    { l: "Fatigue", v: String(displayFatigue), u: "%", s: displayFatigue > 35 ? "warning" : "normal", i: <Coffee size={16} /> },
  ];
  const insightText = breakWarning?.triggered
    ? `Break suggested (${breakWarning.recommendedMinutes} min). Stress ${Math.round(stressLevel)}%, fatigue ${Math.round(fatigueScore)}%.`
    : `Focus at ${focus}/100. Keep your current break cadence to stay in flow.`;

  return (
    <div className="mx-auto bg-bg-light dark:bg-bg-dark overflow-hidden rounded-[40px] border border-neutral-200 dark:border-white/10 shadow-2xl" style={{ width: 390, minHeight: 780 }}>
      <div className="flex items-center justify-between px-5 pt-3 pb-1" style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
        <span className="text-neutral-700 dark:text-neutral-200">9:41</span>
        <div className="flex items-center gap-1 text-neutral-500">
          <span>•••</span><span>5G</span><span>100%</span>
        </div>
      </div>

      <header className="flex items-center justify-between px-5 py-3">
        <Logo size={24} />
        <div className="flex items-center gap-2">
          <button className="relative w-9 h-9 rounded-xl hover:bg-neutral-100 dark:hover:bg-white/5 flex items-center justify-center text-neutral-600 dark:text-neutral-300 transition active:scale-95">
            <Bell size={16} />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-danger" />
          </button>
          <Avatar />
        </div>
      </header>

      <div className="px-5 space-y-4">
        <div className="flex items-center gap-3">
          <GaugeRing value={focus} size={80} status={focus >= 70 ? "normal" : "warning"} />
          <div>
            <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 600 }} className="text-neutral-900 dark:text-white">
              Hi, Raditya
            </h2>
            <p className="text-neutral-500 mt-0.5" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
              Focus today: <span className="text-primary dark:text-accent" style={{ fontWeight: 600 }}>{focus}/100</span>
            </p>
            <StatusPill status={isLive ? "normal" : "inactive"} label={isLive ? "Live session" : "Offline"} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {cards.map((m) => (
            <Card key={m.l} className="p-3.5 active:scale-[0.98] transition">
              <div className="flex items-center justify-between">
                <span style={{ fontSize: 12 }} className="text-neutral-500">{m.l}</span>
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${m.s === "warning" ? "bg-warning/10 text-warning" : "bg-accent/10 text-accent"}`}>{m.i}</span>
              </div>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 600 }} className="text-neutral-900 dark:text-white">{m.v}</span>
                {m.u && <span style={{ fontSize: 12 }} className="text-neutral-500">{m.u}</span>}
              </div>
            </Card>
          ))}
        </div>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: 14, fontWeight: 600 }} className="text-neutral-900 dark:text-white">Focus trend</h3>
            <span className="text-neutral-500" style={{ fontSize: 11 }}>Last 8 hours</span>
          </div>
          <div className="h-20">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <Line type="monotone" dataKey="v" stroke="#5B4BE6" strokeWidth={2.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4 bg-linear-to-br from-accent/10 to-transparent border-accent/25">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent/20 text-primary dark:text-accent flex items-center justify-center flex-shrink-0">
              <Sparkles size={14} />
            </div>
            <div>
              <div className="text-neutral-900 dark:text-white" style={{ fontSize: 13, fontWeight: 600 }}>AI Insight</div>
              <p className="text-neutral-500 mt-0.5" style={{ fontSize: 12, lineHeight: 1.5 }}>
                {insightText}
              </p>
            </div>
          </div>
        </Card>

        <button
          onClick={onTriggerBreak}
          className="w-full py-3 rounded-2xl bg-primary hover:bg-primary-hover active:bg-primary-active active:scale-[0.98] text-white transition-all flex items-center justify-center gap-2"
          style={{ fontSize: 14, fontWeight: 600 }}
        >
          <Lightbulb size={16} /> Show break alert
        </button>
      </div>

      <div className="mt-5 mx-auto w-32 h-1 rounded-full bg-neutral-300 dark:bg-white/20 mb-2" />
    </div>
  );
}
