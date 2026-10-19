/* eslint-disable react-refresh/only-export-components */
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { CheckCircle2, AlertTriangle, OctagonAlert, CircleDashed, Coffee, Play, Watch, Camera, Cpu, Activity, Thermometer, Info } from "lucide-react";
import { Card } from "./shared";
import { rateSuhu, rateKelembapan, rateUdara } from "../lib/healthRules";

/* ══════════════════════════════════════════════════════════════════
   Komponen penyajian data kesehatan yang dipakai bersama (Dashboard,
   Monitor Kesehatan, AI Advisor, Rekomendasi). Status selalu ditampilkan
   sebagai ikon + kata, tidak hanya warna.
   ══════════════════════════════════════════════════════════════════ */

const FONT_DISPLAY = "'Baloo 2', 'Sora', sans-serif";

export const LEVEL_STYLE = {
  good:    { Icon: CheckCircle2,  icon: "text-fun",     chip: "bg-fun/12 border-fun/30",         stripe: "bg-fun" },
  warning: { Icon: AlertTriangle, icon: "text-warning", chip: "bg-warning/12 border-warning/30", stripe: "bg-warning" },
  alert:   { Icon: OctagonAlert,  icon: "text-danger",  chip: "bg-danger/10 border-danger/30",   stripe: "bg-danger" },
  none:    { Icon: CircleDashed,  icon: "text-neutral-400", chip: "bg-neutral-100 dark:bg-white/5 border-neutral-200 dark:border-white/10", stripe: "bg-neutral-300 dark:bg-white/15" },
};

export const SOURCE_ICON = { band: Watch, camera: Camera, model: Cpu, activity: Activity, session: Activity, room: Thermometer };

/** Penanda kecil bahwa angka di sebelahnya adalah data simulasi (bukan hasil ukur). */
export function SimBadge({ t }) {
  return (
    <span
      title={t("room.simTitle")}
      className="inline-flex items-center px-1.5 py-px rounded-md border border-dashed border-warning/70 bg-warning/10 text-[10px] font-semibold text-neutral-600 dark:text-neutral-300 align-middle"
      data-testid="sim-badge"
    >
      {t("room.sim")}
    </span>
  );
}

/** Label status: ikon + kata (teks tetap warna teks, ikon yang berwarna). */
export function LevelChip({ level = "none", label }) {
  const s = LEVEL_STYLE[level] || LEVEL_STYLE.none;
  const Icon = s.Icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium text-neutral-700 dark:text-neutral-200 whitespace-nowrap ${s.chip}`}>
      <Icon size={13} className={s.icon} aria-hidden="true" />
      {label}
    </span>
  );
}

/**
 * Satu baris metrik: nama + batas normal di kiri, angka + status di kanan.
 * Tanpa prop `value` (mis. postur), yang tampil hanya status-nya.
 */
export function MetricRow({ label, hint, value, unit, rating, badge, t }) {
  const statusOnly = value === undefined;
  const missing = statusOnly ? !rating || rating.level === "none" : value == null || value === "";
  const showChip = rating && rating.level !== "none";
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-neutral-100 dark:border-white/6 last:border-b-0">
      <div className="min-w-0">
        <div className="text-sm text-neutral-800 dark:text-neutral-100">{label}</div>
        {hint && <div className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5 leading-snug">{hint}</div>}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        {(!statusOnly || missing) && (
          <div className="leading-none">
            <span className={`text-lg font-semibold ${missing ? "text-neutral-300 dark:text-white/25" : "text-neutral-900 dark:text-white"}`} style={{ fontFamily: FONT_DISPLAY }}>
              {missing ? "--" : value}
            </span>
            {!missing && unit && <span className="text-neutral-400 text-xs ml-1">{unit}</span>}
            {!missing && badge && <span className="ml-1.5">{badge}</span>}
          </div>
        )}
        {showChip && <LevelChip level={rating.level} label={t(`rate.${rating.word}`)} />}
      </div>
    </div>
  );
}

/** Panel satu sumber data (gelang / kamera / ML / aktivitas). */
export function SourcePanel({ icon, title, sub, state, stateLabel, empty, footer, children }) {
  const dot = state === "on" ? "bg-fun" : state === "stale" ? "bg-warning" : "bg-neutral-300 dark:bg-white/20";
  return (
    <Card className="p-5 flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary dark:bg-accent/15 dark:text-accent flex items-center justify-center shrink-0">{icon}</div>
          <div className="min-w-0">
            <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 700 }} className="text-neutral-900 dark:text-white leading-tight">{title}</h3>
            <div className="text-xs text-neutral-400 truncate">{sub}</div>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 shrink-0">
          <span className={`w-2 h-2 rounded-full ${dot}`} aria-hidden="true" /> {stateLabel}
        </span>
      </div>
      <div className="mt-3 flex-1">
        {empty ? <p className="text-sm text-neutral-400 dark:text-neutral-500 leading-relaxed py-2">{empty}</p> : children}
      </div>
      {footer && <div className="mt-2 text-xs text-neutral-400">{footer}</div>}
    </Card>
  );
}

const LEVEL_TITLE = { good: "decision.levelGood", warning: "decision.levelWarning", alert: "decision.levelAlert", none: "decision.levelNone" };
const SOURCE_FROM = { band: "decision.fromBand", camera: "decision.fromCamera", model: "decision.fromModel", session: "decision.fromSession", activity: "decision.fromActivity", room: "decision.fromRoom" };

/**
 * Kartu keputusan: status keseluruhan, sumber yang dipakai, tindakan, dan
 * daftar alasan beserta sarannya (hasil lib/healthRules.assessHealth).
 */
export function HealthStatusCard({ assessment, t, onBreak, onStart, maxReasons = 4 }) {
  const { level, factors, sources, action, breakMinutes, notes = [] } = assessment;
  const s = LEVEL_STYLE[level] || LEVEL_STYLE.none;
  const Icon = s.Icon;
  const sub = level === "alert" ? t("decision.subAlert")
    : level === "warning" ? (action === "break" ? t("decision.subWarningBreak") : t("decision.subWarning"))
    : level === "good" ? t("decision.subGood")
    : t("decision.subNone");
  const used = [
    sources.band && t("decision.srcBand"),
    sources.camera && t("decision.srcCamera"),
    sources.model && t("decision.srcModel"),
    sources.room && t("decision.srcRoom"),
    sources.activity && t("decision.srcActivity"),
  ].filter(Boolean);
  const shown = factors.slice(0, maxReasons);

  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${s.stripe}`} aria-hidden="true" />
      <div className="p-5 sm:p-6 pl-6 sm:pl-7">
        <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div className="flex items-start gap-4 min-w-0">
            <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${s.chip}`}>
              <Icon size={24} className={s.icon} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-sm text-neutral-500 dark:text-neutral-400">{t("decision.title")}</div>
              <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: "clamp(22px,4vw,28px)", fontWeight: 700 }} className="text-neutral-900 dark:text-white leading-tight" data-testid="decision-level">
                {t(LEVEL_TITLE[level])}
              </h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-1 max-w-2xl leading-relaxed">{sub}</p>
              {used.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                  <span className="text-xs text-neutral-400">{t("decision.basedOn")}</span>
                  {used.map((u) => (
                    <span key={u} className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-white/6 text-xs text-neutral-600 dark:text-neutral-300">{u}</span>
                  ))}
                </div>
              )}
              {notes.includes("roomSimulated") && (
                <p className="flex items-start gap-1.5 mt-2 text-xs text-neutral-500 dark:text-neutral-400" data-testid="decision-note-sim">
                  <Info size={13} className="mt-px shrink-0" aria-hidden="true" /> {t("decision.noteRoomSimulated")}
                </p>
              )}
            </div>
          </div>
          {action === "break" && onBreak && (
            <button onClick={onBreak} className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-white text-sm font-bold shrink-0 active:scale-95 transition hover:opacity-90 ${level === "alert" ? "bg-danger" : "bg-warning"}`}>
              <Coffee size={17} /> {t("decision.actionBreak", { min: breakMinutes })}
            </button>
          )}
          {level === "none" && onStart && (
            <button onClick={onStart} className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-primary hover:bg-primary-hover text-white text-sm font-bold shrink-0 active:scale-95 transition">
              <Play size={16} /> {t("decision.actionStart")}
            </button>
          )}
        </div>

        {shown.length > 0 && (
          <div className="mt-5 pt-4 border-t border-neutral-100 dark:border-white/8">
            <div className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 mb-2">{t("decision.reasons")}</div>
            <ul className="grid gap-3 md:grid-cols-2" data-testid="decision-reasons">
              {shown.map((f) => {
                const fs = LEVEL_STYLE[f.level];
                const FIcon = fs.Icon;
                const SrcIcon = SOURCE_ICON[f.source] || Activity;
                return (
                  <li key={f.id} className="flex items-start gap-3">
                    <FIcon size={18} className={`${fs.icon} mt-0.5 shrink-0`} aria-hidden="true" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-neutral-900 dark:text-white">{t(`decision.f.${f.id}.title`, { v: f.value })}</div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">{t(`decision.f.${f.id}.advice`)}</p>
                      <span className="inline-flex items-center gap-1.5 mt-1 text-[11px] text-neutral-400"><SrcIcon size={11} aria-hidden="true" /> {t(SOURCE_FROM[f.source])} {f.simulated && <SimBadge t={t} />}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * Grafik garis sederhana dengan satu sumbu. Untuk >= 2 seri ditampilkan
 * legenda (swatch + nama); satu seri cukup dinamai lewat judul.
 */
export function TrendChart({ title, data, series, empty, height = 180, domain, unit, action }) {
  const hasData = data.length > 0 && data.some((d) => series.some((s) => d[s.key] != null));
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 700 }} className="text-neutral-900 dark:text-white">{title}</h3>
        <div className="flex flex-wrap items-center gap-3">
          {series.length > 1 && hasData && series.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
              <span className="w-3 h-0.5 rounded-full" style={{ background: s.color }} aria-hidden="true" />{s.name}
            </span>
          ))}
          {action}
        </div>
      </div>
      <div style={{ height }}>
        {!hasData ? (
          <div className="h-full flex items-center justify-center text-sm text-neutral-400 dark:text-neutral-500 text-center px-6">{empty}</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ left: -18, top: 6, right: 10, bottom: 0 }}>
              <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
              <XAxis dataKey="t" tick={{ fontSize: 11, fill: "var(--chart-axis)" }} tickLine={false} axisLine={false} minTickGap={20} />
              <YAxis tick={{ fontSize: 11, fill: "var(--chart-axis)" }} tickLine={false} axisLine={false} domain={domain || ["auto", "auto"]} allowDecimals={false} width={44} />
              <Tooltip
                contentStyle={{ background: "var(--chart-surface)", border: "1px solid var(--chart-grid)", borderRadius: 14, fontSize: 12 }}
                labelStyle={{ color: "var(--chart-axis)" }}
                formatter={(v, name) => [v == null ? "--" : `${v}${unit ? ` ${unit}` : ""}`, name]}
              />
              {series.map((s) => (
                <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2}
                  dot={{ r: 4, fill: s.color, stroke: "var(--chart-surface)", strokeWidth: 2 }}
                  activeDot={{ r: 6, stroke: "var(--chart-surface)", strokeWidth: 2 }}
                  isAnimationActive={false} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

/** "12 dtk lalu" / "3 mnt lalu". */
export function agoLabel(ms, t) {
  const sec = Math.max(0, Math.round(ms / 1000));
  return sec < 60 ? t("wearable.agoSec", { n: sec }) : t("wearable.agoMin", { n: Math.round(sec / 60) });
}

/**
 * Panel unit ruangan (suhu, kelembapan, MQ135). Suhu & kelembapan simulasi
 * (suhuDummy dari firmware) diberi penanda "simulasi" dan tidak dinilai.
 */
export function RoomPanel({ room, t, now, locale }) {
  const latest = room.latest;
  const sim = room.suhuDummy;
  const pick = (k) => (room.fresh ? room[k] : latest?.[k] ?? null);
  const suhu = pick("suhu");
  const lembap = pick("kelembapan");
  const ppm = pick("gasPpm");
  const adc = pick("gasAdc");
  const fmt1 = (v) => (v == null ? null : Number(v).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
  const state = room.fresh ? "on" : room.hasData ? "stale" : "off";
  return (
    <SourcePanel
      icon={<Thermometer size={19} />}
      title={t("dash.srcRoom")}
      sub={latest?.deviceId ? t("wearable.device", { id: latest.deviceId }) : t("dash.srcRoomSub")}
      state={state}
      stateLabel={room.fresh ? t("dash.stOn") : room.hasData ? t("dash.stStale") : t("dash.stOff")}
      empty={!room.hasData ? t("dash.emptyRoom") : null}
      footer={latest ? (
        <div className="space-y-1">
          <div>{t("dash.lastBand", { ago: agoLabel(now - Date.parse(latest.at), t) })}</div>
          {sim && (suhu != null || lembap != null) && <div data-testid="room-sim-note">{t("room.simNote")}</div>}
        </div>
      ) : null}
    >
      <MetricRow t={t} label={t("dash.m.suhu")} hint={t("dash.h.suhu")} value={fmt1(suhu)} unit="°C"
        badge={sim && suhu != null ? <SimBadge t={t} /> : null}
        rating={room.fresh && !sim ? rateSuhu(suhu) : null} />
      <MetricRow t={t} label={t("dash.m.lembap")} hint={t("dash.h.lembap")} value={fmt1(lembap)} unit="%"
        badge={sim && lembap != null ? <SimBadge t={t} /> : null}
        rating={room.fresh && !sim ? rateKelembapan(lembap) : null} />
      <MetricRow t={t} label={t("dash.m.air")} hint={ppm == null && adc != null ? t("dash.h.airWarmup") : t("dash.h.air")}
        value={ppm != null ? Math.round(ppm) : null} unit="ppm" rating={room.fresh ? rateUdara(ppm) : null} />
      <MetricRow t={t} label={t("dash.m.adc")} hint={t("dash.h.adc")} value={adc} />
    </SourcePanel>
  );
}
