import { useEffect, useRef, useState, useCallback } from "react";

/**
 * useFaceVitals
 * -------------------------------------------------------------
 * Computer-vision nyata di browser. Menyalakan webcam, menjalankan
 * MediaPipe FaceMesh (refine_landmarks = iris/pupil), lalu menghitung:
 *
 *   - perclos        : rasio mata tertutup (Eye Aspect Ratio → PERCLOS)
 *   - pupilDilation   : lebar iris / lebar mata (indeks beban kognitif)
 *   - blinkRate       : kedipan per menit
 *   - expression      : ketegangan wajah (proksi Action Unit)
 *   - posture         : postur membungkuk dari sudut kepala
 *
 * Detak jantung & SpO2 TIDAK lagi diestimasi dari kamera (rPPG dihapus):
 * keduanya diukur langsung oleh gelang IoT (MAX30102) yang lebih akurat.
 *
 * Semua diproses LOKAL. Tidak ada video yang keluar dari device.
 *
 * Pemakaian:
 *   const { videoRef, canvasRef, vitals, status, start, stop } = useFaceVitals();
 *   <video ref={videoRef} muted playsInline />
 *   <canvas ref={canvasRef} />   // overlay landmark (opsional)
 *
 * status: "idle" | "loading" | "running" | "no-face" | "denied" | "error"
 */

// ── MediaPipe FaceMesh dimuat dari CDN (hindari masalah bundling WASM Vite) ──
const FACEMESH_SCRIPTS = [
  "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js",
  "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js",
];

// Indeks landmark FaceMesh (468 + 10 iris saat refineLandmarks=true)
const L_EYE = { top: 159, bottom: 145, left: 33, right: 133 };
const R_EYE = { top: 386, bottom: 374, left: 362, right: 263 };
const L_IRIS = [468, 469, 470, 471, 472]; // pusat + 4 tepi
const R_IRIS = [473, 474, 475, 476, 477];
// Landmark untuk FER (ekspresi) & postur
const BROW_L = 105, BROW_R = 334;       // alis dalam kiri/kanan
const EYE_INNER_L = 133, EYE_INNER_R = 362;
const MOUTH_L = 61, MOUTH_R = 291;      // sudut mulut
const MOUTH_TOP = 13, MOUTH_BOTTOM = 14;
const NOSE_TIP = 1, CHIN = 152, FACE_TOP = 10; // untuk head pitch

const PERCLOS_THRESHOLD = Number(import.meta.env.VITE_PERCLOS_THRESHOLD) || 0.4;
const EAR_CLOSED = 0.21; // di bawah ini mata dianggap "tertutup"

// Nilai null = BELUM/TIDAK terdeteksi → UI tampilkan N/A, bukan default.
const NO_DATA = {
  perclos: null,
  pupilDilation: null,
  blinkRate: null,
  ear: null,
  expression: null,
  posture: null,
  isSlumping: false,
  faceDetected: false,
};

let _scriptPromise = null;
function loadFaceMeshScripts() {
  if (_scriptPromise) return _scriptPromise;
  _scriptPromise = Promise.all(
    FACEMESH_SCRIPTS.map(
      (src) =>
        new Promise((resolve, reject) => {
          if (document.querySelector(`script[src="${src}"]`)) return resolve();
          const s = document.createElement("script");
          s.src = src;
          s.crossOrigin = "anonymous";
          s.onload = resolve;
          s.onerror = () => reject(new Error(`Gagal memuat ${src}`));
          document.head.appendChild(s);
        })
    )
  );
  return _scriptPromise;
}

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/** Eye Aspect Ratio: tinggi mata / lebar mata. Kecil = tertutup. */
function eyeAspectRatio(lm, eye) {
  const h = dist(lm[eye.top], lm[eye.bottom]);
  const w = dist(lm[eye.left], lm[eye.right]);
  return w === 0 ? 0 : h / w;
}

/** Diameter iris (rata-rata tepi ke pusat ×2) dinormalisasi ke lebar mata. */
function pupilRatio(lm, irisIdx, eye) {
  const c = lm[irisIdx[0]];
  let r = 0;
  for (let i = 1; i < irisIdx.length; i++) r += dist(lm[irisIdx[i]], c);
  r /= irisIdx.length - 1;
  const eyeW = dist(lm[eye.left], lm[eye.right]);
  return eyeW === 0 ? 0 : (r * 2) / eyeW; // diameter iris / lebar mata
}

/**
 * FER ringan (proksi beban mental) dari geometri FaceMesh — pendekatan
 * Action Unit sederhana (lihat proposal §2b):
 *  - browFurrow (AU4): jarak alis-ke-mata mengecil = alis berkerut/menukik
 *  - mouthFrown (AU15): sudut mulut turun relatif tengah
 * Skala ~0..1 (sudah dinormalisasi ke lebar wajah). Tinggi = tegang.
 */
function expression(lm) {
  const faceW = dist(lm[EYE_INNER_L], lm[EYE_INNER_R]) || 1;
  // Alis menukik: makin kecil jarak alis→mata, makin "berkerut".
  const browGap = (dist(lm[BROW_L], lm[EYE_INNER_L]) + dist(lm[BROW_R], lm[EYE_INNER_R])) / 2 / faceW;
  const browFurrow = Math.max(0, Math.min(1, (0.55 - browGap) / 0.35));
  // Sudut mulut turun di bawah garis tengah bibir = "frown".
  const mouthMidY = (lm[MOUTH_TOP].y + lm[MOUTH_BOTTOM].y) / 2;
  const cornerY = (lm[MOUTH_L].y + lm[MOUTH_R].y) / 2;
  const mouthFrown = Math.max(0, Math.min(1, ((cornerY - mouthMidY) / 0.03)));
  // Indeks tegangan gabungan
  const tension = Math.min(1, browFurrow * 0.6 + mouthFrown * 0.4);
  return {
    browFurrow: Number(browFurrow.toFixed(2)),
    mouthFrown: Number(mouthFrown.toFixed(2)),
    tension: Number(tension.toFixed(2)),
  };
}

/**
 * Postur (proksi is_slumping) dari head pitch via FaceMesh:
 * rasio (hidung→dagu) / (puncak wajah→dagu). Saat kepala menunduk
 * (membungkuk ke layar), wajah memendek secara vertikal → rasio turun.
 * Mengembalikan { slumpScore 0..1, isSlumping bool }.
 */
function posture(lm) {
  const noseChin = dist(lm[NOSE_TIP], lm[CHIN]);
  const topChin = dist(lm[FACE_TOP], lm[CHIN]) || 1;
  const ratio = noseChin / topChin; // ~0.5 tegak; mengecil saat menunduk
  const slumpScore = Math.max(0, Math.min(1, (0.5 - ratio) / 0.18));
  return { slumpScore: Number(slumpScore.toFixed(2)), isSlumping: slumpScore > 0.5 };
}

export function useFaceVitals() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const faceMeshRef = useRef(null);
  const cameraRef = useRef(null);
  const rafRef = useRef(null);
  const preloadedRef = useRef(false);

  // deteksi kedip & PERCLOS
  const lastBlink = useRef(false);
  const blinkTimes = useRef([]);
  const perclosWindow = useRef([]); // EAR<closed boolean dalam jendela bergulir

  const [vitals, setVitals] = useState(NO_DATA);
  const [status, setStatus] = useState("idle");

  const onResults = useCallback((results) => {
    const now = performance.now();

    const faces = results.multiFaceLandmarks;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!faces || faces.length === 0) {
      setStatus("no-face");
      setVitals(NO_DATA); // tampilkan N/A, JANGAN tahan angka lama
      return;
    }
    setStatus("running");
    const lm = faces[0];

    // ── PERCLOS via EAR rata-rata kedua mata ──
    const earL = eyeAspectRatio(lm, L_EYE);
    const earR = eyeAspectRatio(lm, R_EYE);
    const ear = (earL + earR) / 2;
    const closed = ear < EAR_CLOSED;

    perclosWindow.current.push(closed ? 1 : 0);
    if (perclosWindow.current.length > 150) perclosWindow.current.shift(); // ~5 dtk
    const perclos =
      perclosWindow.current.reduce((a, b) => a + b, 0) /
      Math.max(perclosWindow.current.length, 1);

    // Deteksi kedip (transisi terbuka→tertutup)
    if (closed && !lastBlink.current) blinkTimes.current.push(now);
    lastBlink.current = closed;
    blinkTimes.current = blinkTimes.current.filter((t) => now - t < 60000);
    const blinkRate = blinkTimes.current.length; // per menit (jendela 60 dtk)

    // ── Pupil dilation ──
    const pupilDilation =
      (pupilRatio(lm, L_IRIS, L_EYE) + pupilRatio(lm, R_IRIS, R_EYE)) / 2;

    // ── FER (ekspresi) & postur ──
    const expr = expression(lm);
    const post = posture(lm);

    setVitals({
      perclos: Number(perclos.toFixed(2)),
      pupilDilation: Number(pupilDilation.toFixed(2)),
      blinkRate,
      ear: Number(ear.toFixed(2)),
      expression: expr,
      posture: post.slumpScore,
      isSlumping: post.isSlumping,
      faceDetected: true,
    });
  }, []);

  // Bangun & konfigurasi instance FaceMesh (dipakai preload maupun start).
  function buildFaceMesh() {
    const FaceMesh = window.FaceMesh;
    if (!FaceMesh) return null;
    const fm = new FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });
    fm.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true, // wajib untuk iris/pupil
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    return fm;
  }

  /**
   * Preload: muat skrip + unduh WASM/model + kompilasi (warm-up) LEBIH AWAL,
   * saat app idle. Dengan begitu klik "Mulai Kerja" langsung menyalakan kamera
   * tanpa jeda unduh ~beberapa MB dari CDN. Handler asli (onResults) BARU
   * dipasang di start(); saat warm-up dipakai no-op agar UI tidak ter-update.
   */
  const preload = useCallback(async () => {
    if (preloadedRef.current || faceMeshRef.current) return;
    try {
      await loadFaceMeshScripts();
      const fm = buildFaceMesh();
      if (!fm) return;
      fm.onResults(() => {}); // no-op selama warm-up
      const warm = document.createElement("canvas");
      warm.width = 64; warm.height = 64;
      await fm.send({ image: warm }); // paksa unduh model + kompilasi WASM
      faceMeshRef.current = fm;
      preloadedRef.current = true;
    } catch (e) {
      console.warn("[useFaceVitals] preload gagal (akan dimuat ulang saat start):", e?.message);
    }
  }, []);

  const start = useCallback(async () => {
    try {
      setStatus("loading");
      await loadFaceMeshScripts();
      const Camera = window.Camera;
      if (!window.FaceMesh || !Camera) throw new Error("MediaPipe gagal dimuat");

      // Pakai instance hasil preload bila ada (start instan); jika belum, buat.
      const fm = faceMeshRef.current || buildFaceMesh();
      fm.onResults(onResults); // pasang/replace handler asli
      faceMeshRef.current = fm;

      const video = videoRef.current;
      const cam = new Camera(video, {
        onFrame: async () => {
          if (faceMeshRef.current) await faceMeshRef.current.send({ image: video });
        },
        width: 640,
        height: 480,
      });
      cameraRef.current = cam;
      await cam.start();
      setStatus("running");
    } catch (e) {
      if (e?.name === "NotAllowedError") setStatus("denied");
      else setStatus("error");
      console.error("[useFaceVitals]", e);
    }
  }, [onResults]);

  const stop = useCallback(() => {
    try { cameraRef.current?.stop?.(); } catch {}
    try {
      const stream = videoRef.current?.srcObject;
      stream?.getTracks?.().forEach((t) => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    } catch {}
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    blinkTimes.current = [];
    perclosWindow.current = [];
    setVitals(NO_DATA);
    setStatus("idle");
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { videoRef, canvasRef, vitals, status, start, stop, preload };
}

export default useFaceVitals;
