/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useRef, useState, useCallback, useMemo } from "react";

const NotificationContext = createContext(null);

const COOLDOWN_MS = 120_000; // jangan ulang alert tipe sama dalam 2 menit
const MAX_ITEMS = 30;

// Pemetaan tipe alert → kunci terjemahan (judul/isi).
const ALERT_MAP = {
  break:       { titleKey: "notif.breakTitle",       bodyKey: "notif.breakBody",       tone: "warning" },
  stress:      { titleKey: "notif.stressTitle",      bodyKey: "notif.stressBody",      tone: "alert" },
  posture:     { titleKey: "notif.postureTitle",     bodyKey: "notif.postureBody",     tone: "warning" },
  eye:         { titleKey: "notif.eyeTitle",         bodyKey: "notif.eyeBody",         tone: "warning" },
  tension:     { titleKey: "notif.tensionTitle",     bodyKey: "notif.tensionBody",     tone: "warning" },
  distraction: { titleKey: "notif.distractionTitle", bodyKey: "notif.distractionBody", tone: "warning" },
  overactiveKeys:     { titleKey: "notif.overactiveTitle", bodyKey: "notif.overactiveKeysBody",     tone: "warning" },
  overactiveDuration: { titleKey: "notif.overactiveTitle", bodyKey: "notif.overactiveDurationBody", tone: "warning" },
  inactive:           { titleKey: "notif.inactiveTitle",   bodyKey: "notif.inactiveBody",            tone: "warning" },
};

let _id = 0;

export function NotificationProvider({ children }) {
  const [items, setItems] = useState([]);
  const lastFired = useRef({}); // type -> timestamp ms

  /** Catat alert (dengan cooldown per-tipe agar tidak spam). */
  const pushAlert = useCallback((type, vars = {}) => {
    const def = ALERT_MAP[type];
    if (!def) return;
    const now = Date.now();
    if (lastFired.current[type] && now - lastFired.current[type] < COOLDOWN_MS) return;
    lastFired.current[type] = now;

    setItems((prev) => {
      const item = {
        id: ++_id,
        type,
        titleKey: def.titleKey,
        bodyKey: def.bodyKey,
        tone: def.tone,
        vars,
        time: now,
        read: false,
      };
      return [item, ...prev].slice(0, MAX_ITEMS);
    });
  }, []);

  const markAllRead = useCallback(() => {
    setItems((prev) => prev.map((n) => (n.read ? n : { ...n, read: true })));
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    lastFired.current = {};
  }, []);

  const value = useMemo(() => {
    const unread = items.reduce((n, i) => (i.read ? n : n + 1), 0);
    return { items, unread, pushAlert, markAllRead, clear };
  }, [items, pushAlert, markAllRead, clear]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications harus dipakai di dalam <NotificationProvider>");
  return ctx;
}

export default NotificationProvider;
