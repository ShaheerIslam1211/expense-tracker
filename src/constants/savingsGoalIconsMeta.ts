import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  Car,
  GraduationCap,
  Heart,
  Home,
  Landmark,
  PiggyBank,
  Plane,
  Sparkles,
} from "lucide-react";

export const DEFAULT_SAVINGS_GOAL_ICON = "piggy-bank";

export const SAVINGS_GOAL_ICON_OPTIONS: { key: string; label: string; Icon: LucideIcon }[] = [
  { key: "piggy-bank", label: "Savings", Icon: PiggyBank },
  { key: "landmark", label: "Bank", Icon: Landmark },
  { key: "home", label: "Home", Icon: Home },
  { key: "car", label: "Vehicle", Icon: Car },
  { key: "plane", label: "Travel", Icon: Plane },
  { key: "sparkles", label: "Extra", Icon: Sparkles },
  { key: "graduation-cap", label: "Education", Icon: GraduationCap },
  { key: "heart", label: "Family", Icon: Heart },
  { key: "briefcase", label: "Career", Icon: Briefcase },
];
