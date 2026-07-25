import { useState } from "react";
import { motion } from "motion/react";
import { Lock, Mail, User, ShieldCheck, Eye, Loader2, AlertCircle } from "lucide-react";
import { Logo, PrimaryButton } from "./shared";
import { useAuth } from "../context/AuthContext";
import { useT } from "../i18n/LanguageProvider";

export function Login({ onEnter }) {
  const { t } = useT();
  const { signIn, signUp, signInWithGoogle, isConfigured } = useAuth();

  const [mode, setMode] = useState("signin"); // signin | signup
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const isSignup = mode === "signup";

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isConfigured) { setError(t("login.configMissing")); return; }
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const { data, error } = isSignup
        ? await signUp(email, password, name)
        : await signIn(email, password);

      if (error) {
        const msg = /invalid login|invalid credentials/i.test(error.message || "")
          ? t("login.errInvalid")
          : error.message || t("login.errGeneric");
        setError(msg);
        return;
      }
      // Signup tanpa sesi langsung → biasanya butuh konfirmasi email.
      if (isSignup && !data?.session) {
        setInfo(t("login.checkEmail"));
        return;
      }
      // Sukses & ada sesi → AuthContext akan re-render & gate terbuka.
      onEnter?.();
    } catch {
      setError(t("login.errGeneric"));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    if (!isConfigured) { setError(t("login.configMissing")); return; }
    setBusy(true);
    setError(null);
    const { error } = await signInWithGoogle();
    if (error) { setError(error.message || t("login.errGeneric")); setBusy(false); }
    // Bila sukses, browser redirect ke Google.
  }

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2 bg-bg-light dark:bg-bg-dark">
      <div className="relative hidden lg:flex items-center justify-center bg-linear-to-br from-primary via-primary-hover to-accent overflow-hidden p-12">
        <div className="absolute inset-0 opacity-30">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full border border-white/40"
              style={{ width: 120 + i * 60, height: 120 + i * 60, left: "50%", top: "50%", marginLeft: -(60 + i * 30), marginTop: -(60 + i * 30) }}
              animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 4 + i * 0.5, repeat: Infinity, delay: i * 0.3 }}
            />
          ))}
        </div>
        <div className="relative z-10 text-white max-w-md">
          <div className="w-20 h-20 rounded-3xl bg-white/15 backdrop-blur flex items-center justify-center mb-6 border border-white/20">
            <Eye size={36} className="text-white" />
          </div>
          <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: 36, fontWeight: 700, lineHeight: 1.15 }}>
            {t("login.heroTitle")}
          </h1>
          <p className="mt-4 text-white/80" style={{ fontSize: 15, lineHeight: 1.6 }}>
            {t("login.heroBody")}
          </p>
          <div className="mt-8 grid grid-cols-3 gap-3">
            {[t("login.pillFocus"), t("login.pillWellness"), t("login.pillInsights")].map((label) => (
              <div key={label} className="rounded-xl bg-white/10 backdrop-blur border border-white/15 px-3 py-2.5 text-center" style={{ fontSize: 13 }}>
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <Logo size={32} />
          <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 24, fontWeight: 600 }} className="mt-8 text-neutral-900 dark:text-white">
            {isSignup ? t("login.createAccount") : t("login.welcomeBack")}
          </h2>
          <p className="text-neutral-500 mt-1" style={{ fontSize: 14 }}>{t("login.tagline")}</p>

          {!isConfigured && (
            <div className="mt-5 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-warning/10 text-warning border border-warning/25" style={{ fontSize: 12.5 }}>
              <AlertCircle size={15} className="shrink-0 mt-0.5" /> {t("login.configMissing")}
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {isSignup && (
              <div>
                <label style={{ fontSize: 13 }} className="text-neutral-600 dark:text-neutral-300">{t("login.name")}</label>
                <div className="mt-1.5 relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text" required value={name} onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-surface-dark text-neutral-900 dark:text-white outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                    style={{ fontSize: 14 }}
                  />
                </div>
              </div>
            )}
            <div>
              <label style={{ fontSize: 13 }} className="text-neutral-600 dark:text-neutral-300">{t("login.email")}</label>
              <div className="mt-1.5 relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-surface-dark text-neutral-900 dark:text-white outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                  style={{ fontSize: 14 }}
                />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 13 }} className="text-neutral-600 dark:text-neutral-300">{t("login.password")}</label>
              <div className="mt-1.5 relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-surface-dark text-neutral-900 dark:text-white outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                  style={{ fontSize: 14 }}
                />
              </div>
            </div>

            {!isSignup && (
              <div className="flex items-center justify-between" style={{ fontSize: 13 }}>
                <label className="inline-flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                  <input type="checkbox" defaultChecked className="accent-accent" /> {t("login.rememberMe")}
                </label>
                <a className="text-primary dark:text-accent hover:underline cursor-pointer">{t("login.forgot")}</a>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-danger/10 text-danger border border-danger/25" style={{ fontSize: 12.5 }}>
                <AlertCircle size={15} className="shrink-0 mt-0.5" /> {error}
              </div>
            )}
            {info && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-accent/10 text-primary dark:text-accent border border-accent/25" style={{ fontSize: 12.5 }}>
                <ShieldCheck size={15} className="shrink-0 mt-0.5" /> {info}
              </div>
            )}

            <PrimaryButton className="w-full">
              <span className="inline-flex items-center justify-center gap-2">
                {busy && <Loader2 size={15} className="animate-spin" />}
                {busy ? t("login.signingIn") : isSignup ? t("login.signUp") : t("login.signIn")}
              </span>
            </PrimaryButton>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-neutral-200 dark:border-white/10" /></div>
              <div className="relative flex justify-center"><span className="px-3 bg-bg-light dark:bg-bg-dark text-neutral-400" style={{ fontSize: 12 }}>{t("login.or")}</span></div>
            </div>

            <button type="button" onClick={handleGoogle} disabled={busy} className="w-full py-2.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-surface-dark hover:bg-neutral-50 dark:hover:bg-white/5 flex items-center justify-center gap-2.5 text-neutral-700 dark:text-neutral-200 disabled:opacity-60" style={{ fontSize: 14, fontWeight: 500 }}>
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
              {t("login.continueGoogle")}
            </button>
          </form>

          <p className="mt-6 text-center text-neutral-500 dark:text-neutral-400" style={{ fontSize: 13 }}>
            {isSignup ? t("login.haveAccount") : t("login.noAccount")}{" "}
            <button
              onClick={() => { setMode(isSignup ? "signin" : "signup"); setError(null); setInfo(null); }}
              className="text-primary dark:text-accent font-semibold hover:underline"
            >
              {isSignup ? t("login.signInNow") : t("login.registerNow")}
            </button>
          </p>

          <div className="mt-6 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-accent/10 text-primary dark:text-accent border border-accent/20" style={{ fontSize: 12 }}>
            <ShieldCheck size={14} /> {t("login.privacyBadge")}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
