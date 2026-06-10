import { useLocation } from "react-router-dom";
import { TopBar } from "@/layouts/TopBar";
import { Card } from "@/components/Card";
import { Pill } from "@/components/Pill";
import { EmptyState } from "@/components/EmptyState";
import { Construction } from "lucide-react";

interface Props {
  /** Section group, e.g. "Inward" / "Grading" */
  group?: string;
  /** Page title */
  title: string;
  /** Phase pill, e.g. "Phase 2" */
  phase?: string;
  /** One-line description */
  description?: string;
}

/**
 * Generic stub page used for routes that haven't been implemented yet.
 * Phase 0 ships only the Purchase slice; everything else points here.
 */
export function PlaceholderPage({ group, title, phase, description }: Props) {
  const location = useLocation();
  const crumbs = group
    ? [{ label: "Operations", to: "/" }, { label: group }, { label: title }]
    : [{ label: "Operations", to: "/" }, { label: title }];

  return (
    <>
      <TopBar
        crumbs={crumbs}
        mobileBack={{ to: "/", label: title }}
        right={phase ? <Pill tone="neutral">{phase}</Pill> : undefined}
      />
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-6 md:py-8">
        <Card padding="lg" className="mx-auto max-w-[640px]">
          <EmptyState
            icon={<Construction size={40} />}
            title={`${title} — coming up`}
            description={
              description ??
              `This screen is part of an upcoming phase. The current build only ships Inward · Purchase.`
            }
          />
          <div className="vv-mono pb-2 text-center text-[10px] text-[var(--vv-t3)]">
            {location.pathname}
          </div>
        </Card>
      </div>
    </>
  );
}
