import Image from "next/image";
import { productImagesBySlug } from "@/lib/product-images";

type Category =
  | "CPU" | "GPU" | "MOTHERBOARD" | "RAM" | "STORAGE"
  | "PSU" | "CASE" | "COOLER" | "PERIPHERAL" | "ACCESSORY";

type Props = {
  category: Category | string;
  slug?: string;
  size?: "card" | "detail";
  className?: string;
};

const categoryMeta: Record<string, { label: string; abbr: string; icon: React.ReactNode }> = {
  CPU: {
    label: "Procesor",
    abbr: "CPU",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10">
        <rect x="7" y="7" width="10" height="10" rx="1" />
        <path d="M9 7V4M12 7V4M15 7V4M9 20v-3M12 20v-3M15 20v-3M4 9h3M4 12h3M4 15h3M17 9h3M17 12h3M17 15h3" />
        <rect x="9.5" y="9.5" width="5" height="5" rx="0.5" />
      </svg>
    ),
  },
  GPU: {
    label: "Placă video",
    abbr: "GPU",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10">
        <rect x="2" y="7" width="20" height="10" rx="2" />
        <circle cx="8" cy="12" r="2" />
        <circle cx="14" cy="12" r="2" />
        <path d="M6 17v2M10 17v2M14 17v2M18 17v2" />
        <path d="M18 7V5a1 1 0 00-1-1H7a1 1 0 00-1 1v2" />
      </svg>
    ),
  },
  MOTHERBOARD: {
    label: "Placă de bază",
    abbr: "MBO",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10">
        <rect x="2" y="2" width="20" height="20" rx="2" />
        <rect x="6" y="6" width="5" height="5" rx="0.5" />
        <rect x="13" y="6" width="5" height="3" rx="0.5" />
        <rect x="13" y="11" width="5" height="3" rx="0.5" />
        <path d="M6 14h5M6 17h5M13 17h5" />
        <path d="M6 20v-3M9 20v-3M18 20v-3M15 20v-3" />
      </svg>
    ),
  },
  RAM: {
    label: "Memorie RAM",
    abbr: "RAM",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10">
        <rect x="3" y="8" width="18" height="8" rx="1" />
        <path d="M7 8V6M10 8V6M13 8V6M16 8V6" />
        <path d="M7 16v2M10 16v2M13 16v2M16 16v2" />
        <rect x="6" y="10" width="2" height="4" rx="0.3" />
        <rect x="10" y="10" width="2" height="4" rx="0.3" />
        <rect x="14" y="10" width="2" height="4" rx="0.3" />
      </svg>
    ),
  },
  STORAGE: {
    label: "Stocare",
    abbr: "SSD",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10">
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <circle cx="16" cy="12" r="2.5" />
        <path d="M7 10h5M7 14h5" />
        <circle cx="16" cy="12" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  PSU: {
    label: "Sursă",
    abbr: "PSU",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M13 9l-3 3h4l-3 3" />
        <circle cx="18" cy="9" r="0.8" fill="currentColor" stroke="none" />
        <circle cx="18" cy="12" r="0.8" fill="currentColor" stroke="none" />
        <circle cx="18" cy="15" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  CASE: {
    label: "Carcasă",
    abbr: "CASE",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10">
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <rect x="8" y="5" width="5" height="3" rx="0.5" />
        <circle cx="12" cy="17" r="1.5" />
        <path d="M8 11h3M8 14h2" />
      </svg>
    ),
  },
  COOLER: {
    label: "Răcire",
    abbr: "FAN",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="2" />
        <path d="M12 3c0 4-2 5-2 9M12 21c0-4 2-5 2-9M3 12c4 0 5 2 9 2M21 12c-4 0-5-2-9-2" />
      </svg>
    ),
  },
  PERIPHERAL: {
    label: "Periferic",
    abbr: "PRF",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10">
        <path d="M12 2C8.5 2 7 5 7 8v8a5 5 0 0010 0V8c0-3-1.5-6-5-6z" />
        <line x1="12" y1="2" x2="12" y2="10" />
        <line x1="7" y1="10" x2="17" y2="10" />
      </svg>
    ),
  },
  ACCESSORY: {
    label: "Accesoriu",
    abbr: "ACC",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
      </svg>
    ),
  },
};

const fallbackMeta = {
  label: "Produs",
  abbr: "PRD",
  icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 21V9" />
    </svg>
  ),
};

// Acceptă atât cheia enum ("CPU") cât și eticheta în română ("Procesor")
const labelToKey: Record<string, string> = Object.fromEntries(
  Object.entries(categoryMeta).map(([key, val]) => [val.label, key])
);

export function ProductVisual({ category, slug, size = "card", className = "" }: Props) {
  const imageSrc = slug ? productImagesBySlug[slug] : undefined;
  const resolvedKey = categoryMeta[category] ? category : (labelToKey[category] ?? category);
  const meta = categoryMeta[resolvedKey] ?? fallbackMeta;

  const heightClass = size === "detail" ? "h-64 sm:h-72" : "h-36";

  if (imageSrc) {
    return (
      <div className={`relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 ${heightClass} ${className}`}>
        <Image
          src={imageSrc}
          alt={meta.label}
          fill
          sizes={size === "detail" ? "(min-width: 1024px) 600px, 100vw" : "(min-width: 640px) 300px, 100vw"}
          className="object-contain p-4"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-xl border border-zinc-800 ${heightClass} ${className}`}
      style={{
        background: "linear-gradient(135deg, #18181b 0%, #18181b 60%, rgba(127,29,29,0.15) 100%)",
      }}
    >
      {/* Linie decorativă de circuit în colț */}
      <svg
        className="absolute left-0 top-0 h-full w-full opacity-[0.04]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <line x1="0" y1="30%" x2="100%" y2="30%" stroke="#ef4444" strokeWidth="1" />
        <line x1="0" y1="70%" x2="100%" y2="70%" stroke="#ef4444" strokeWidth="1" />
        <line x1="20%" y1="0" x2="20%" y2="100%" stroke="#ef4444" strokeWidth="1" />
        <line x1="80%" y1="0" x2="80%" y2="100%" stroke="#ef4444" strokeWidth="1" />
      </svg>

      <div className="relative z-10 flex flex-col items-center gap-2 text-center">
        <span className="text-red-600/50">{meta.icon}</span>
        {size === "detail" && (
          <p className="mt-1 text-xs font-medium uppercase tracking-widest text-zinc-600">
            {meta.label}
          </p>
        )}
      </div>

      {/* Badge categorie colț dreapta-sus */}
      <span className="absolute right-3 top-3 rounded bg-zinc-800/80 px-2 py-0.5 text-[10px] font-bold tracking-widest text-zinc-500">
        {meta.abbr}
      </span>
    </div>
  );
}
