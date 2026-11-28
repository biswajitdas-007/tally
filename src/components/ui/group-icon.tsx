import {
  BriefcaseBusiness,
  CarFront,
  Clapperboard,
  Coffee,
  Dumbbell,
  Gift,
  GraduationCap,
  Heart,
  House,
  PartyPopper,
  Plane,
  ShoppingBasket,
  TreePalm,
  Trophy,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { groupIconKey, type GroupIconKey } from "@/lib/group-icons";
import { cn } from "@/lib/utils";

const ICONS: Record<GroupIconKey, LucideIcon> = {
  friends: Users,
  home: House,
  trip: TreePalm,
  travel: Plane,
  roadtrip: CarFront,
  food: UtensilsCrossed,
  coffee: Coffee,
  groceries: ShoppingBasket,
  party: PartyPopper,
  movies: Clapperboard,
  sports: Trophy,
  fitness: Dumbbell,
  work: BriefcaseBusiness,
  study: GraduationCap,
  gift: Gift,
  couple: Heart,
};

/**
 * A group's line icon. Accepts whatever the group stored (an icon key or a
 * legacy emoji). Decorative: the group's name always sits beside it.
 */
export function GroupIcon({
  icon,
  className,
  strokeWidth = 1.8,
}: Readonly<{ icon: string | null | undefined; className?: string; strokeWidth?: number }>) {
  const Icon = ICONS[groupIconKey(icon)];
  return <Icon aria-hidden className={cn("shrink-0", className)} strokeWidth={strokeWidth} />;
}
