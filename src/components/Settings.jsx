import { useState } from "react";
import { User, Bell, ShieldCheck, Plug, HelpCircle, Camera, Eye, Building2, Languages, Loader2, Check, Coffee } from "lucide-react";
import { Card, Toggle, PrimaryButton } from "./shared";
import { useT } from "../i18n/LanguageProvider";
import { useAuth } from "../context/AuthContext";
import { useBreakDuration } from "../lib/breakPrefs";

export function Settings() {
  const { t, lang, setLang } = useT();
  const { profile, isAuthenticated, updateProfile } = useAuth();

  const [active, setActive] = useState("privacy");
  const [camera, setCamera] = useState(true);
  const [share,  setShare]  = useState(false);
  const [hr,     setHr]     = useState(true);
  const [push,   setPush]   = useState(true);
  const [email,  setEmail]  = useState(false);

  const sections = [
    { id: "account",       label: t("settings.account"),       icon: <User size={15} /> },
    { id: "notifications", label: t("settings.notifications"),  icon: <Bell size={15} /> },
    { id: "workSession",   label: t("settings.workSession"),    icon: <Coffee size={15} /> },
    { id: "privacy",       label: t("settings.privacy"),        icon: <ShieldCheck size={15} /> },
    { id: "language",      label: t("settings.language"),       icon: <Languages size={15} /> },
    { id: "integrations",  label: t("settings.integrations"),   icon: <Plug size={15} /> },
    { id: "help",          label: t("settings.help"),           icon: <HelpCircle size={15} /> },
  ];

  const displayName = isAuthenticated && profile ? profile.fullName : t("dashboard.greetingGuest");
  const initials = isAuthenticated && profile ? profile.initials : "FW";

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 lg:space-y-6">

      {/* Profile card */}
      <Card className="p-5 lg:p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-primary to-accent flex items-center justify-center text-white shrink-0" style={{ fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 700 }}>
            {initials}
          </div>
          <div>
            <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 600 }} className="text-neutral-900 dark:text-white">{displayName}</h2>
            {profile?.email && (
              <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-0.5">
                {profile.jobTitle || profile.email}
                {profile.company && <span className="inline-flex items-center gap-1"> · <Building2 size={11} /> {profile.company}</span>}
              </p>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-5 lg:gap-6">

        {/* Side nav */}
        <Card className="p-2 h-fit">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-sm font-medium transition ${
                active === s.id
                  ? "bg-primary/10 text-primary dark:bg-accent/12 dark:text-accent"
                  : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/5 hover:text-neutral-800 dark:hover:text-white"
              }`}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </Card>

        {/* Content panel */}
        <Card className="p-5 lg:p-6">
          {active === "privacy" && (
            <div className="space-y-5">
              <SectionHeader title={t("settings.privacyTitle")} desc={t("settings.privacyDesc")} />
              <SettingsRow icon={<Camera size={15} />} title={t("settings.cameraAccess")} desc={t("settings.cameraAccessDesc")} on={camera} onChange={setCamera} />
              <SettingsRow icon={<ShieldCheck size={15} />} title={t("settings.healthSharing")} desc={t("settings.healthSharingDesc")} on={share} onChange={setShare} />
              <SettingsRow icon={<Eye size={15} />} title={t("settings.hrVisibility")} desc={t("settings.hrVisibilityDesc")} on={hr} onChange={setHr} />
              <div className="rounded-xl p-3.5 bg-accent/8 border border-accent/20 text-primary dark:text-accent text-sm leading-relaxed">
                {t("settings.privacyNote")}
              </div>
            </div>
          )}

          {active === "language" && (
            <div className="space-y-5">
              <SectionHeader title={t("settings.language")} desc={t("settings.languageDesc")} />
              <div className="grid grid-cols-2 gap-3 max-w-sm">
                {[{ id: "id", label: "Bahasa Indonesia", code: "ID" }, { id: "en", label: "English", code: "EN" }].map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setLang(l.id)}
                    className={`flex items-center gap-2.5 p-4 rounded-2xl border text-sm font-medium transition ${
                      lang === l.id
                        ? "border-primary bg-accent/8 ring-2 ring-accent/20 text-primary dark:text-accent"
                        : "border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-300 hover:border-accent/40"
                    }`}
                  >
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${lang === l.id ? "bg-primary text-white" : "bg-neutral-100 dark:bg-white/10"}`}>{l.code}</span>
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {active === "notifications" && (
            <div className="space-y-5">
              <SectionHeader title={t("settings.notifTitle")} desc={t("settings.notifDesc")} />
              <SettingsRow icon={<Bell size={15} />} title={t("settings.pushNotif")} desc={t("settings.pushNotifDesc")} on={push} onChange={setPush} />
              <SettingsRow icon={<Bell size={15} />} title={t("settings.emailSummary")} desc={t("settings.emailSummaryDesc")} on={email} onChange={setEmail} />
            </div>
          )}

          {active === "workSession" && (
            <BreakDurationSettings t={t} />
          )}

          {active === "integrations" && (
            <div className="space-y-5">
              <SectionHeader title={t("settings.integrationsTitle")} desc={t("settings.integrationsDesc")} />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <IntegrationCard name="Slack"            desc={t("settings.slackDesc")}    color="#4A154B" connect={t("settings.connect")} />
                <IntegrationCard name="Google Calendar"  desc={t("settings.calendarDesc")} color="#4285F4" connect={t("settings.connect")} />
                <IntegrationCard name="Microsoft Teams"  desc={t("settings.teamsDesc")}    color="#5059C9" connect={t("settings.connect")} />
              </div>
            </div>
          )}

          {active === "account" && (
            <AccountForm t={t} profile={profile} updateProfile={updateProfile} />
          )}

          {active === "help" && (
            <div className="space-y-3">
              <SectionHeader title={t("settings.helpTitle")} desc={t("settings.helpDesc")} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                {[t("settings.kb"), t("settings.contact"), t("settings.tutorials"), t("settings.releaseNotes")].map((item) => (
                  <button key={item} className="p-4 rounded-xl border border-neutral-200 dark:border-white/10 text-left text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-white/5 hover:border-accent/40 transition">
                    {item} →
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

/** Pengaturan durasi istirahat — input bebas 1–60 menit (tersimpan sebagai default). */
function BreakDurationSettings({ t }) {
  const [minutes, setMinutes] = useBreakDuration();
  const dec = () => setMinutes(Math.max(1, minutes - 1));
  const inc = () => setMinutes(Math.min(60, minutes + 1));
  return (
    <div className="space-y-5">
      <SectionHeader title={t("settings.workSessionTitle")} desc={t("settings.workSessionDesc")} />
      <div>
        <label className="text-neutral-700 dark:text-neutral-200 text-sm font-medium">{t("settings.breakDuration")}</label>
        <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-0.5 mb-3">{t("settings.breakDurationDesc")}</p>
        <div className="flex items-center gap-2">
          <button onClick={dec} className="w-10 h-11 rounded-xl bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-white/10 text-xl font-semibold transition" aria-label="-1">−</button>
          <div className="flex items-end gap-1.5 px-4 h-11 rounded-xl border border-neutral-200 dark:border-white/10">
            <input
              type="number"
              min={1}
              max={60}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className="w-16 bg-transparent text-center text-neutral-900 dark:text-white focus:outline-none"
              style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, fontWeight: 600 }}
            />
            <span className="text-neutral-400 text-sm pb-2.5">{t("breakModal.min")}</span>
          </div>
          <button onClick={inc} className="w-10 h-11 rounded-xl bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-white/10 text-xl font-semibold transition" aria-label="+1">+</button>
          <span className="ml-2 text-neutral-400 dark:text-neutral-500 text-sm">{t("settings.breakRange")}</span>
        </div>
      </div>
      <div className="rounded-xl p-3.5 bg-accent/8 border border-accent/20 text-primary dark:text-accent text-sm leading-relaxed">
        {t("settings.breakDurationNote")}
      </div>
    </div>
  );
}

function SectionHeader({ title, desc }) {
  return (
    <div>
      <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: 17, fontWeight: 600 }} className="text-neutral-900 dark:text-white">{title}</h3>
      <p className="text-neutral-500 dark:text-neutral-400 mt-1 text-sm">{desc}</p>
    </div>
  );
}

function SettingsRow({ icon, title, desc, on, onChange }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <div className="flex gap-3">
        <div className="w-9 h-9 rounded-xl bg-accent/10 text-primary dark:text-accent flex items-center justify-center shrink-0">{icon}</div>
        <div>
          <div className="text-neutral-800 dark:text-white font-semibold text-sm">{title}</div>
          <div className="text-neutral-500 dark:text-neutral-400 mt-0.5 text-xs leading-relaxed">{desc}</div>
        </div>
      </div>
      <Toggle on={on} onChange={onChange} />
    </div>
  );
}

function IntegrationCard({ name, desc, color, connect }) {
  return (
    <div className="p-4 rounded-2xl border border-neutral-200 dark:border-white/10 hover:border-accent/40 transition">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold" style={{ background: color }}>
        {name[0]}
      </div>
      <div className="mt-3 text-neutral-800 dark:text-white font-semibold text-sm">{name}</div>
      <div className="text-neutral-500 dark:text-neutral-400 mt-0.5 text-xs">{desc}</div>
      <button className="mt-3 w-full py-1.5 rounded-lg border border-accent/40 text-primary dark:text-accent hover:bg-accent/8 text-xs font-semibold transition">{connect}</button>
    </div>
  );
}

function Field({ label, value, onChange, disabled }) {
  return (
    <div>
      <label className="text-neutral-500 dark:text-neutral-400 text-sm">{label}</label>
      <input
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        disabled={disabled}
        className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/5 text-neutral-900 dark:text-white text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition disabled:opacity-60"
      />
    </div>
  );
}

/** Form akun: edit nama/jabatan/perusahaan → simpan ke tabel `profiles`. */
function AccountForm({ t, profile, updateProfile }) {
  const [fullName, setFullName] = useState(profile?.fullName || "");
  const [jobTitle, setJobTitle] = useState(profile?.jobTitle || "");
  const [company, setCompany]   = useState(profile?.company || "");
  const [busy, setBusy]   = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  async function save() {
    setBusy(true); setSaved(false); setError(null);
    const { error } = await updateProfile({ full_name: fullName, job_title: jobTitle, company });
    setBusy(false);
    if (error) setError(error.message);
    else { setSaved(true); setTimeout(() => setSaved(false), 2500); }
  }

  return (
    <div className="space-y-5">
      <SectionHeader title={t("settings.accountTitle")} desc={t("settings.accountDesc")} />
      <Field label={t("settings.fullName")} value={fullName} onChange={setFullName} />
      <Field label={t("settings.email")} value={profile?.email || ""} disabled />
      <Field label={t("settings.jobTitle")} value={jobTitle} onChange={setJobTitle} />
      <Field label={t("settings.company")} value={company} onChange={setCompany} />
      {error && <div className="text-danger text-sm">{error}</div>}
      <div className="flex items-center gap-3">
        <PrimaryButton onClick={busy ? undefined : save} className={busy ? "opacity-60 pointer-events-none" : ""}>
          <span className="inline-flex items-center gap-1.5 text-sm">
            {busy ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : null}
            {saved ? t("settings.saved") : t("settings.save")}
          </span>
        </PrimaryButton>
      </div>
    </div>
  );
}

export default Settings;
