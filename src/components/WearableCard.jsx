import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Watch, Heart, Droplets, Copy, Check, WifiOff } from "lucide-react";
import { Card, GaugeRing, StatusPill } from "./shared";
import { useHealth } from "../context/HealthProvider";
import { useT } from "../i18n/LanguageProvider";
import { IOT_STALE_MS } from "../lib/iot";
import { rateHeartRate, rateSpo2 } from "../lib/healthRules";
import { useNow } from "../hooks/useNow";

const clock = (iso) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

// Level penilaian (lib/healthRules) → status warna GaugeRing.
const GAUGE = { good: "normal", warning: "warning", alert: "alert", none: "normal" };

/** Grafik kecil satu seri (detak jantung dan SpO2 dipisah: satuannya beda). */
function MiniChart({ title, data, dataKey, color, domain, unit }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">{title}</div>
      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 0, top: 4, right: 6, bottom: 0 }}>
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis dataKey="t" tick={{ fontSize: 10, fill: "var(--chart-axis)" }} tickLine={false} axisLine={false} minTickGap={28} />
            <YAxis tick={{ fontSize: 10, fill: "var(--chart-axis)" }} tickLine={false} axisLine={false} domain={domain} allowDecimals={false} width={32} />
            <Tooltip
              contentStyle={{ background: "var(--chart-surface)", border: "1px solid var(--chart-grid)", borderRadius: 14, fontSize: 12 }}
              labelStyle={{ color: "var(--chart-axis)" }}
              formatter={(v) => [v == null ? "--" : `${v} ${unit}`, title]}
            />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2}
              dot={{ r: 3.5, fill: color, stroke: "var(--chart-surface)", strokeWidth: 2 }}
              activeDot={{ r: 5, stroke: "var(--chart-surface)", strokeWidth: 2 }}
              isAnimationActive={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function CopyId({ value, t }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard ditolak browser: user tetap bisa blok & salin manual */ }
  };
  return (
    <div className="flex items-center gap-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/3 px-3 py-2">
      <code className="flex-1 min-w-0 truncate text-xs text-neutral-700 dark:text-neutral-200" style={{ fontFamily: "'JetBrains Mono', monospace" }} data-testid="wearable-user-id">
        {value}
      </code>
      <button onClick={copy} className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary dark:bg-accent/15 dark:text-accent text-xs font-semibold hover:opacity-80 active:scale-95 transition">
        {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? t("wearable.copied") : t("wearable.copy")}
      </button>
    </div>
  );
}

function Header({ t, pill, sub }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary dark:bg-accent/15 dark:text-accent flex items-center justify-center shrink-0"><Watch size={19} /></div>
        <div className="min-w-0">
          <h3 style={{ fontFamily: "'Baloo 2', 'Sora', sans-serif", fontSize: 15, fontWeight: 700 }} className="text-neutral-900 dark:text-white">{t("wearable.title")}</h3>
          <div className="text-neutral-400 text-xs truncate">{sub}</div>
        </div>
      </div>
      {pill}
    </div>
  );
}

/**
 * Kartu "Gelang FitLearn": detak jantung & SpO2 dari gelang IoT (ESP32-C3 +
 * MAX30102). Data berasal dari backend fitwork-api lewat HealthProvider
 * (`wearable`), terpisah dari vitals kamera.
 */
export function WearableCard() {
  const { t } = useT();
  const { wearable } = useHealth();
  const now = useNow(5000);
  const { enabled, userId, readings, latest, error } = wearable;

  // ── Belum bisa dipakai: belum login / backend belum diatur ──
  if (!enabled) {
    return (
      <Card className="p-5">
        <Header t={t} sub={t("wearable.subtitle")} pill={<StatusPill status="inactive" label={t("wearable.statusNone")} />} />
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {userId ? t("wearable.notConfigured") : t("wearable.loginFirst")}
        </p>
      </Card>
    );
  }

  // ── Login, tapi gelang belum pernah mengirim data ──
  if (!latest) {
    return (
      <Card className="p-5">
        <Header t={t} sub={t("wearable.subtitle")} pill={<StatusPill status="inactive" label={t("wearable.statusNone")} />} />
        <div className="grid gap-4 md:grid-cols-2 md:items-center">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-white/5 text-neutral-400 flex items-center justify-center shrink-0"><WifiOff size={17} /></div>
            <div>
              <div className="text-neutral-800 dark:text-white font-semibold text-sm">{t("wearable.emptyTitle")}</div>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-0.5 leading-relaxed">{t("wearable.emptyBody")}</p>
              {error && <p className="text-danger text-xs mt-2">{t("wearable.fetchError", { msg: error })}</p>}
            </div>
          </div>
          <div>
            <div className="text-neutral-500 dark:text-neutral-400 text-xs mb-1.5">{t("wearable.userIdLabel")}</div>
            <CopyId value={userId} t={t} />
          </div>
        </div>
      </Card>
    );
  }

  // ── Ada data ──
  const ageMs = now - Date.parse(latest.at);
  const fresh = ageMs <= IOT_STALE_MS;
  const ageSec = Math.max(0, Math.round(ageMs / 1000));
  const ago = ageSec < 60 ? t("wearable.agoSec", { n: ageSec }) : t("wearable.agoMin", { n: Math.round(ageSec / 60) });
  const chart = readings.map((r) => ({ t: clock(r.at), hr: r.heartRate, spo2: r.spo2 }));
  const sub = latest.deviceId ? t("wearable.device", { id: latest.deviceId }) : t("wearable.subtitle");

  return (
    <Card className="p-5">
      <Header
        t={t}
        sub={sub}
        pill={<StatusPill status={fresh ? "normal" : "inactive"} label={fresh ? t("wearable.statusLive") : t("wearable.statusStale")} />}
      />

      <div className="grid gap-5 lg:grid-cols-[auto_1fr] lg:items-center">
        <div className="grid grid-cols-2 gap-4 sm:gap-6">
          <div className="flex flex-col items-center gap-2" data-testid="wearable-hr">
            <GaugeRing value={latest.heartRate} max={140} size={104} unit={t("common.bpm")} status={GAUGE[rateHeartRate(latest.heartRate).level]} />
            <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400 text-sm"><Heart size={14} className="text-[var(--chart-3)]" /> {t("wearable.heartRate")}</div>
          </div>
          <div className="flex flex-col items-center gap-2" data-testid="wearable-spo2">
            <GaugeRing value={latest.spo2} max={100} size={104} unit="%" status={GAUGE[rateSpo2(latest.spo2).level]} />
            <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400 text-sm"><Droplets size={14} className="text-[var(--chart-1)]" /> {t("wearable.spo2")}</div>
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="text-neutral-500 dark:text-neutral-400 text-xs">{t("wearable.trend", { n: readings.length })}</span>
            <span className="text-neutral-400 text-xs" data-testid="wearable-last">{t("wearable.lastSeen", { time: clock(latest.at) })}, {ago}</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <MiniChart title={`${t("wearable.heartRate")} (${t("common.bpm")})`} data={chart} dataKey="hr" color="var(--chart-3)" domain={["dataMin - 5", "dataMax + 5"]} unit={t("common.bpm")} />
            <MiniChart title="SpO2 (%)" data={chart} dataKey="spo2" color="var(--chart-1)" domain={[85, 100]} unit="%" />
          </div>
          {!fresh && <p className="text-warning text-xs mt-2">{t("wearable.staleHint")}</p>}
        </div>
      </div>
    </Card>
  );
}

export default WearableCard;
