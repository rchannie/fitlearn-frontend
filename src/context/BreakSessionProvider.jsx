/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useWorkSession } from "./WorkSessionProvider";
import { useT } from "../i18n/LanguageProvider";
import { getBreakMinutes } from "../lib/breakPrefs";
import { recordBreakTaken } from "../lib/breakStats";

/**
 * BreakSessionProvider — state istirahat GLOBAL.
 *
 * Timer istirahat hidup di sini (bukan di modal), sehingga bisa tampil di
 * navbar maupun modal sekaligus, dan tetap berjalan walau modal ditutup.
 *
 * Fase:
 *   "idle"    — tidak istirahat
 *   "setup"   — modal terbuka, pilih durasi & belum mulai (timer diam)
 *   "running" — hitung mundur berjalan (boleh tutup modal; pill navbar tampil)
 *   "done"    — waktu habis, tanya lanjut/kembali kerja
 *
 * Saat istirahat dimulai, sesi kerja DIHENTIKAN penuh; saat "kembali bekerja"
 * sesi dinyalakan lagi bila sebelumnya aktif.
 */

const BreakSessionContext = createContext(null);

export function BreakSessionProvider({ children }) {
  const { active: workActive, start: startWork, stop: stopWork } = useWorkSession();
  const { t } = useT();
  const tRef = useRef(t);
  useEffect(() => { tRef.current = t; }, [t]);

  const [phase, setPhase] = useState("idle");
  const [minutes, setMinutes] = useState(() => getBreakMinutes());
  const [secondsLeft, setSecondsLeft] = useState(() => getBreakMinutes() * 60);
  const [modalOpen, setModalOpen] = useState(false);
  const resumeAfter = useRef(false);

  // Hitung mundur hanya saat fase "running".
  useEffect(() => {
    if (phase !== "running") return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          setPhase("done");
          setModalOpen(true); // tampilkan layar "waktu habis" walau tadi dikecilkan
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Saat waktu habis: beri tahu via notifikasi OS juga (jika diizinkan), supaya
  // pengguna tahu walau sedang di tab/aplikasi lain. Tombol aksi ditangani sw.js.
  useEffect(() => {
    if (phase !== "done") return;
    const tt = tRef.current;
    if (!("serviceWorker" in navigator) || !("Notification" in window) || Notification.permission !== "granted") return;
    navigator.serviceWorker.ready.then((reg) => {
      try {
        reg.showNotification(tt("breakModal.timeUpTitle"), {
          body: tt("breakModal.timeUpBody"),
          tag: "fitlearn-break-done",
          renotify: true,
          requireInteraction: true,
          icon: "/favicon.svg",
          badge: "/favicon.svg",
          actions: [
            { action: "back-to-work", title: tt("breakModal.backToWork") },
            { action: "keep-resting", title: tt("breakModal.keepRestingShort") },
          ],
        });
      } catch { /* abaikan bila tak didukung */ }
    }).catch(() => {});
  }, [phase]);

  // Buka alur istirahat: hentikan sesi kerja, tampilkan modal pada fase setup.
  const openBreak = useCallback(() => {
    recordBreakTaken();
    resumeAfter.current = workActive;
    if (workActive) stopWork();
    const m = getBreakMinutes();
    setMinutes(m);
    setSecondsLeft(m * 60);
    setPhase("setup");
    setModalOpen(true);
  }, [workActive, stopWork]);

  // Ubah durasi saat masih setup (juga update tampilan timer).
  const chooseMinutes = useCallback((m) => {
    setMinutes(m);
    setSecondsLeft(m * 60);
  }, []);

  // Mulai hitung mundur.
  const startTimer = useCallback(() => {
    setSecondsLeft((s) => (s > 0 ? s : minutes * 60));
    setPhase("running");
  }, [minutes]);

  // Lanjut istirahat lagi (dari fase done) → reset timer & jalan lagi.
  const extendBreak = useCallback(() => {
    setSecondsLeft(minutes * 60);
    setPhase("running");
  }, [minutes]);

  // Sembunyikan modal tapi biarkan timer jalan (tampil di navbar).
  const hideModal = useCallback(() => setModalOpen(false), []);
  // Buka lagi modal (klik pill navbar).
  const showModal = useCallback(() => setModalOpen(true), []);

  // Kembali bekerja: hentikan istirahat, nyalakan lagi sesi bila tadi aktif.
  const backToWork = useCallback(() => {
    setPhase("idle");
    setModalOpen(false);
    if (resumeAfter.current) startWork();
    resumeAfter.current = false;
  }, [startWork]);

  // Batalkan istirahat tanpa menyalakan sesi (mis. klik X saat setup).
  const cancelBreak = useCallback(() => {
    setPhase("idle");
    setModalOpen(false);
    resumeAfter.current = false;
  }, []);

  const value = useMemo(() => ({
    phase, minutes, secondsLeft, modalOpen,
    isBreaking: phase !== "idle",
    openBreak, chooseMinutes, startTimer, extendBreak,
    hideModal, showModal, backToWork, cancelBreak,
  }), [phase, minutes, secondsLeft, modalOpen, openBreak, chooseMinutes, startTimer, extendBreak, hideModal, showModal, backToWork, cancelBreak]);

  return <BreakSessionContext.Provider value={value}>{children}</BreakSessionContext.Provider>;
}

export function useBreakSession() {
  const ctx = useContext(BreakSessionContext);
  if (!ctx) throw new Error("useBreakSession harus dipakai di dalam <BreakSessionProvider>");
  return ctx;
}

export default BreakSessionProvider;
