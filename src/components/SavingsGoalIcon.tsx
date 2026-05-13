import { PiggyBank } from "lucide-react";
import { DEFAULT_SAVINGS_GOAL_ICON, SAVINGS_GOAL_ICON_OPTIONS } from "../constants/savingsGoalIconsMeta";
import { cn } from "../utils/cn";

const iconByKey = Object.fromEntries(SAVINGS_GOAL_ICON_OPTIONS.map((o) => [o.key, o.Icon]));

export function SavingsGoalIcon({
  iconKey,
  className,
}: {
  iconKey?: string | null;
  className?: string;
}) {
  const k = iconKey && iconByKey[iconKey] ? iconKey : DEFAULT_SAVINGS_GOAL_ICON;
  const Icon = iconByKey[k] ?? PiggyBank;
  return <Icon className={cn(className)} aria-hidden />;
}
