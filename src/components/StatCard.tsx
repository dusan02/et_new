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
}: StatCardProps) {
  return (
    <div
      className={clsx(
        "relative bg-white rounded-xl border border-gray-200",
        "shadow-sm hover:shadow-md transition-shadow",
        "p-4 md:p-5 min-h-[100px]",
        "flex flex-col justify-between",
        align === "center" ? "items-center text-center" : "items-start text-left",
        // top accent bar
        "before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-1.5 before:rounded-t-xl",
        variantBar[variant],
        className
      )}
    >
      <div className="text-[11px] uppercase text-gray-500 font-semibold whitespace-nowrap">
        {title}
      </div>
      <div className="text-sm font-semibold text-gray-900 leading-tight tabular-nums">
        {main ?? "—"}
      </div>
      <div className={clsx("text-sm leading-5 tabular-nums", variantSubText[variant])}>
        {sub ?? "—"}
      </div>
    </div>
  );
}
