import { useEffect, useRef, useState } from "react";
import { Bell, Check, Trash2, AlertTriangle, Activity, Eye, Coffee } from "lucide-react";
import { useNotifications } from "../context/NotificationProvider";
import { useT } from "../i18n/LanguageProvider";

const ICON = {
  break: Coffee,
  stress: Activity,
  posture: AlertTriangle,
  eye: Eye,
};

const TONE = {
  warning: "bg-warning/10 text-warning",
  alert: "bg-danger/10 text-danger",
};

function useRelativeTime(t) {
  return (ms) => {
    const diff = Math.max(0, Date.now() - ms);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t("notif.justNow");
    if (mins < 60) return t("notif.minAgo", { n: mins });
    return t("notif.hourAgo", { n: Math.floor(mins / 60) });
  };
}

export function NotificationBell() {
  const { items, unread, markAllRead, clear } = useNotifications();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const rel = useRelativeTime(t);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen((o) => !o); if (!open && unread) markAllRead(); }}
        className="relative w-9 h-9 rounded-lg text-neutral-500 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/10 hover:text-neutral-800 dark:hover:text-white flex items-center justify-center transition"
        aria-label={t("notif.title")}
      >
        <Bell size={17} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-surface-dark">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl bg-white dark:bg-surface-dark border border-neutral-200 dark:border-white/10 shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 dark:border-white/5">
            <span className="font-semibold text-sm text-neutral-900 dark:text-white">{t("notif.title")}</span>
            {items.length > 0 && (
              <button onClick={clear} className="inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-danger transition">
                <Trash2 size={12} /> {t("notif.clear")}
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-neutral-400">
                <Check size={20} className="mx-auto mb-2 opacity-50" />
                {t("notif.empty")}
              </div>
            ) : (
              items.map((n) => {
                const Icon = ICON[n.type] || Bell;
                return (
                  <div key={n.id} className={`flex gap-3 px-4 py-3 border-b border-neutral-50 dark:border-white/5 ${n.read ? "" : "bg-accent/5"}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${TONE[n.tone] || TONE.warning}`}>
                      <Icon size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-neutral-800 dark:text-white leading-snug">{t(n.titleKey)}</div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 leading-snug">{t(n.bodyKey, n.vars)}</div>
                      <div className="text-[11px] text-neutral-400 mt-1 font-mono">{rel(n.time)}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
