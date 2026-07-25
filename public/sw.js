// FitLearn Service Worker
// Menangani notifikasi "Ayo Fokus" yang muncul DI LUAR website (level OS),
// lengkap dengan tombol aksi "Istirahat sebentar" / "Lanjut fokus".

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("notificationclick", (event) => {
  // Aksi fokus : "break" | "focus" | ""
  // Aksi break : "back-to-work" | "keep-resting" | ""
  const action = event.action;
  event.notification.close();

  // "Lanjut fokus" → biarkan pengguna tetap di aplikasinya, jangan ganggu.
  if (action === "focus") return;

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      let client = all.find((c) => "focus" in c) || null;
      if (client) await client.focus();
      else client = await self.clients.openWindow("/");
      if (!client) return;

      // Tombol "Istirahat sebentar" (notifikasi fokus) → buka modal istirahat.
      if (action === "break") client.postMessage({ type: "focus-action", action: "break" });

      // Tombol notifikasi "waktu istirahat habis".
      if (action === "back-to-work") client.postMessage({ type: "break-action", action: "back-to-work" });
      if (action === "keep-resting") client.postMessage({ type: "break-action", action: "keep-resting" });
    })()
  );
});
