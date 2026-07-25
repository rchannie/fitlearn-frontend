import { MobileDashboard } from "./MobileDashboard";
import { MobileBreak } from "./MobileBreak";

export function MobilePreview() {
  return (
    <div className="p-6 lg:p-8">
      <div>
        <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: 28, fontWeight: 600 }} className="text-neutral-900 dark:text-white">
          Mobile (390px)
        </h1>
        <p className="text-neutral-500 mt-1" style={{ fontSize: 14 }}>
          Responsive variants for the Dashboard and Break Warning screens.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap items-start justify-center gap-10">
        <div className="flex flex-col items-center gap-3">
          <span className="text-neutral-500" style={{ fontSize: 13, fontWeight: 500 }}>Dashboard · 390 × 780</span>
          <MobileDashboard onTriggerBreak={() => {}} />
        </div>
        <div className="flex flex-col items-center gap-3">
          <span className="text-neutral-500" style={{ fontSize: 13, fontWeight: 500 }}>Break Warning · 390 × 780</span>
          <MobileBreak />
        </div>
      </div>
    </div>
  );
}
