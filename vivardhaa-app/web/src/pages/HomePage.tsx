import { Link } from "react-router-dom";
import { TopBar } from "@/layouts/TopBar";
import { Card } from "@/components/Card";
import { Pill } from "@/components/Pill";
import { fmtLongDate } from "@/lib/format";
import { getSessionUser } from "@/lib/permissions";

export function HomePage() {
  const session = getSessionUser();
  return (
    <>
      <TopBar
        crumbs={[{ label: "Operations", to: "/" }, { label: "Home" }]}
        rolePill={{ label: session?.name ?? "Owner", tone: "purple" }}
      />
      <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5">
        <div className="mb-4">
          <h1 className="text-[18px] font-bold leading-tight">
            Today's overview
          </h1>
          <div className="vv-mono text-[11px] text-[var(--vv-t2)]">
            {fmtLongDate(new Date())}
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <Link to="/purchase">
            <Card
              accent="#f97316"
              accentSide="top"
              padding="md"
              className="cursor-pointer transition-colors hover:bg-[var(--vv-bg2)]"
            >
              <div className="mb-1.5 flex items-center justify-between">
                <div className="text-[13px] font-bold">Inward</div>
                <Pill tone="accent">Open</Pill>
              </div>
              <div className="vv-mono mb-2 text-[10px] text-[var(--vv-t2)]">
                Purchase · Machule · Weighing · Loading · Receipt
              </div>
              <div className="text-[11px] text-[var(--vv-t2)]">
                Daily purchase list, quality gates, destination receipt.
              </div>
            </Card>
          </Link>

          <Card
            accent="#10b981"
            accentSide="top"
            padding="md"
            className="opacity-60"
          >
            <div className="mb-1.5 flex items-center justify-between">
              <div className="text-[13px] font-bold">Grading</div>
              <Pill tone="neutral">Phase 2</Pill>
            </div>
            <div className="vv-mono mb-2 text-[10px] text-[var(--vv-t2)]">
              Destemming + Raasi sun-drying
            </div>
            <div className="text-[11px] text-[var(--vv-t2)]">Coming next.</div>
          </Card>

          <Card
            accent="#8b5cf6"
            accentSide="top"
            padding="md"
            className="opacity-60"
          >
            <div className="mb-1.5 flex items-center justify-between">
              <div className="text-[13px] font-bold">Outward</div>
              <Pill tone="neutral">Phase 4</Pill>
            </div>
            <div className="vv-mono mb-2 text-[10px] text-[var(--vv-t2)]">
              Dispatch · invoice · profit & loss
            </div>
            <div className="text-[11px] text-[var(--vv-t2)]">
              Coming after grading.
            </div>
          </Card>
        </div>

        <Card padding="md">
          <div className="mb-1 text-[12px] font-bold">
            Phase 0 + Inward · Purchase
          </div>
          <div className="text-[11px] leading-relaxed text-[var(--vv-t2)]">
            This build ships the foundation (design system, responsive shell)
            and the first slice of Inward — the Purchase list and New purchase
            item form. Other modules are stubbed and will follow phase-by-phase.
          </div>
        </Card>
      </div>
    </>
  );
}
