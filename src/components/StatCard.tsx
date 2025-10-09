import clsx from "clsx";

type Variant = "blue" | "green" | "red";
type Align = "center" | "left";

interface StatCardProps {
  title: string;            // horný riadok (UPPERCASE)
  main: string | number;    // stredný riadok (bold)
  sub?: string;             // dolný riadok (delta / cap / percento)
  variant?: Variant;        // farebnosť
  align?: Align;            // zarovnanie (default center)
  className?: string;
  onClick?: () => void;     // click handler for tracking
}

const variantBar: Record<Variant, string> = {
  blue:  "before:bg-blue-500",
  green: "before:bg-green-500",
  red:   "before:bg-red-500",
};

const variantSubText: Record<Variant, string> = {
  blue:  "text-blue-600",
  green: "text-green-600",
  red:   "text-red-600",
};

export default function StatCard({
  title,
  main,
  sub = "—",
  variant = "blue",
  align = "center",
  className,
  onClick,
}: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        "relative group overflow-hidden",
        "bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl",
        "rounded-lg border-2 border-gray-300 dark:border-gray-600",
        "shadow-2xl hover:shadow-3xl",
        "transition-all duration-300 ease-out",
        "p-3 sm:p-4 md:p-5 min-h-[90px] sm:min-h-[100px] md:min-h-[110px] w-full",
        "flex flex-col justify-between",
        "hover:scale-105 hover:rotate-1 animate-fade-in",
        align === "center" ? "items-center text-center" : "items-start text-left",
        onClick ? "cursor-pointer" : "",
        className
      )}
    >
      {/* Animated background gradient */}
      <div className={clsx(
        "absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500",
        variant === "blue" ? "bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600" : "",
        variant === "green" ? "bg-gradient-to-br from-emerald-400 via-green-500 to-emerald-600" : "",
        variant === "red" ? "bg-gradient-to-br from-red-400 via-rose-500 to-red-600" : ""
      )} />
      
      
      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-between px-1 py-3">
        <div className={clsx(
          "text-xs uppercase font-semibold tracking-wide text-center whitespace-nowrap",
          variant === "blue" ? "text-blue-700 dark:text-blue-300" : "",
          variant === "green" ? "text-emerald-700 dark:text-emerald-300" : "",
          variant === "red" ? "text-red-700 dark:text-red-300" : ""
        )}>
          {title}
        </div>
        <div className={clsx(
          "text-sm font-bold leading-tight tabular-nums flex items-center justify-center",
          variant === "blue" ? "text-blue-900 dark:text-blue-100" : "",
          variant === "green" ? "text-emerald-900 dark:text-emerald-100" : "",
          variant === "red" ? "text-red-900 dark:text-red-100" : ""
        )}>
          {main ?? "—"}
        </div>
        <div className={clsx(
          "text-xs font-semibold leading-tight tabular-nums text-center",
          variant === "blue" ? "text-blue-600 dark:text-blue-400" : "",
          variant === "green" ? "text-emerald-600 dark:text-emerald-400" : "",
          variant === "red" ? "text-red-600 dark:text-red-400" : ""
        )}>
          {sub ?? "—"}
        </div>
      </div>
      
      {/* Top accent line */}
      <div className={clsx(
        "absolute top-0 left-0 right-0 h-2 rounded-t-lg opacity-80 transition-opacity duration-300",
        variant === "blue" ? "bg-gradient-to-r from-blue-400 to-blue-600" : "",
        variant === "green" ? "bg-gradient-to-r from-emerald-400 to-emerald-600" : "",
        variant === "red" ? "bg-gradient-to-r from-red-400 to-red-600" : ""
      )} />
      
      {/* Bottom accent line */}
      <div className={clsx(
        "absolute bottom-0 left-0 right-0 h-2 rounded-b-lg opacity-80 transition-opacity duration-300",
        variant === "blue" ? "bg-gradient-to-r from-blue-400 to-blue-600" : "",
        variant === "green" ? "bg-gradient-to-r from-emerald-400 to-emerald-600" : "",
        variant === "red" ? "bg-gradient-to-r from-red-400 to-red-600" : ""
      )} />
      
      {/* Glassmorphism effect */}
      <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
    </div>
  );
}
