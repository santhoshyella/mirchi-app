import {
  ListChecks,
  ShieldCheck,
  Scale,
  Truck,
  Inbox,
  Sun,
  Wind,
  PackageCheck,
  Receipt,
  Settings,
  Layers,
  Users,
  type LucideIcon,
} from "lucide-react";

export type Stage = "Inward" | "Grading" | "Outward" | "Setup";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  stage?: Stage;
  /** Mobile-only short label */
  mobileLabel?: string;
}

export const INWARD_NAV: NavItem[] = [
  {
    to: "/purchase",
    label: "Purchase list",
    icon: ListChecks,
    stage: "Inward",
  },
  { to: "/machule", label: "Machule", icon: ShieldCheck, stage: "Inward" },
  { to: "/weighing", label: "Weighing", icon: Scale, stage: "Inward" },
  { to: "/loading", label: "Loading", icon: Truck, stage: "Inward" },
  { to: "/receipt", label: "Receipt", icon: Inbox, stage: "Inward" },
  { to: "/accounts", label: "Accounts", icon: Receipt, stage: "Inward" },
];

export const GRADING_NAV: NavItem[] = [
  { to: "/destemming", label: "Destemming", icon: Wind, stage: "Grading" },
  { to: "/raasi", label: "Raasi", icon: Sun, stage: "Grading" },
];

export const OUTWARD_NAV: NavItem[] = [
  { to: "/outward", label: "Orders", icon: PackageCheck, stage: "Outward" },
];

export const SETUP_NAV: NavItem[] = [
  {
    to: "/setup/varieties",
    label: "Varieties & Marks",
    icon: Layers,
    stage: "Setup",
  },
  {
    to: "/user-management",
    label: "Users",
    icon: Users,
    stage: "Setup",
  },
];

/** All nav groups — used for permission pickers */
export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  { label: "Inward", items: INWARD_NAV },
  { label: "Grading", items: GRADING_NAV },
  { label: "Outward", items: OUTWARD_NAV },
  { label: "Setup", items: SETUP_NAV },
];

/** Mobile bottom-tab condensed nav: 4 slots */
export const MOBILE_TABS: NavItem[] = [
  { to: "/purchase", label: "Inward", icon: ListChecks, mobileLabel: "Inward" },
  { to: "/destemming", label: "Grading", icon: Wind, mobileLabel: "Grading" },
  {
    to: "/outward",
    label: "Outward",
    icon: PackageCheck,
    mobileLabel: "Outward",
  },
  { to: "/setup/varieties", label: "Setup", icon: Settings, mobileLabel: "Setup" },
];
