import { useEffect, useState } from "react";

/** Jam yang berdetak tiap `ms` milidetik (untuk status "aktif / tidak aktif"). */
export function useNow(ms = 5000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

export default useNow;
