/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Languages } from "lucide-react";
import { translations } from "./translations";

const STORAGE_KEY = "fitlearn:lang";
const DEFAULT_LANG = "id"; // default Bahasa Indonesia

const LanguageContext = createContext(null);

/** Ambil nilai nested via dot-path, mis. "dashboard.greeting". */
function resolve(dict, path) {
  return path.split(".").reduce((acc, k) => (acc == null ? undefined : acc[k]), dict);
}

/** Ganti placeholder {nama} dengan vars[nama]. */
function interpolate(str, vars) {
  if (typeof str !== "string" || !vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? vars[k] : `{${k}}`));
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_LANG;
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next) => setLangState(next), []);
  const toggleLang = useCallback(() => setLangState((l) => (l === "id" ? "en" : "id")), []);

  /**
   * t(key, vars?) — terjemahan dengan fallback:
   * 1) bahasa aktif → 2) bahasa Inggris → 3) key apa adanya.
   */
  const t = useCallback(
    (key, vars) => {
      const active = resolve(translations[lang], key);
      const fallback = active === undefined ? resolve(translations.en, key) : active;
      const value = fallback === undefined ? key : fallback;
      return interpolate(value, vars);
    },
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useT() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useT harus dipakai di dalam <LanguageProvider>");
  return ctx;
}

/** Tombol switch bahasa untuk header. */
export function LanguageSwitcher({ compact = false }) {
  const { lang, toggleLang } = useT();
  return (
    <button
      onClick={toggleLang}
      title={lang === "id" ? "Ganti ke English" : "Switch to Bahasa Indonesia"}
      className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg text-neutral-500 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/10 hover:text-neutral-800 dark:hover:text-white transition text-xs font-semibold"
    >
      <Languages size={16} />
      {!compact && <span className="uppercase tracking-wide">{lang}</span>}
    </button>
  );
}

export default LanguageProvider;
