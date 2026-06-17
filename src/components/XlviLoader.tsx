import { cn } from "../utils/cn";

export interface XlviLoaderProps {
  className?: string;
  background?: string;
  boxColors?: string[];
  size?: string;
  desktopSize?: string;
  mobileSize?: string;
}

/** Lightweight replacement for react-awesome-loaders (avoids node-sass native builds). */
export function XlviLoader({
  className,
  boxColors = ["var(--primary)", "#F59E0B", "#6366F1"],
  desktopSize = "48px",
  mobileSize = "40px",
}: XlviLoaderProps) {
  const colors = boxColors.length > 0 ? boxColors : ["var(--primary)"];

  return (
    <div
      className={cn("xlvi-loader inline-flex items-end gap-[0.15em]", className)}
      style={
        {
          "--xlvi-desktop": desktopSize,
          "--xlvi-mobile": mobileSize,
        } as React.CSSProperties
      }
      role="status"
      aria-label="Loading"
    >
      {colors.map((color, i) => (
        <span
          key={`${color}-${i}`}
          className="xlvi-loader__box rounded-sm"
          style={{
            backgroundColor: color,
            animationDelay: `${i * 0.12}s`,
          }}
        />
      ))}
    </div>
  );
}
