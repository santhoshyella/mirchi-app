import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  ExternalLink,
  Plus,
  Save,
  Trash2,
  Wind,
} from "lucide-react";

import { TopBar } from "@/layouts/TopBar";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Pill } from "@/components/Pill";
import { SectionCard } from "@/components/SectionCard";
import { FieldShell, SelectInput, TextInput } from "@/components/Field";
import { VarietyDot } from "@/components/VarietyDot";
import { fmtIN, fmtINR, fmtKG } from "@/lib/format";
import {
  DESTEMMING_POINTS,
  DESTEMMING_POINT_COLOR,
  DESTEMMING_POINT_ICON,
  DESTINATION_ICON,
  type DestemmingPoint,
} from "@/types/domain";

import { usePurchaseStore } from "@/features/purchase/store";
import { useRaasiStore } from "@/features/raasi/store";
import { useDestemmingStore } from "./store";
import { eligiblePurchases } from "./selectors";

/**
 * Allocation row in the form. Held as strings so the user can type freely;
 * we parse on submit.
 */
interface AllocationDraft {
  point: DestemmingPoint;
  bags: string;
  kg: string;
  pricePerKg: string;
}

interface DraftState {
  purchaseId: string;
  notes: string;
  allocations: AllocationDraft[];
}

const empty: DraftState = {
  purchaseId: "",
  notes: "",
  allocations: [],
};

interface Check {
  key: string;
  label: string;
  ok: boolean;
}

export function NewDestemmingJobPage() {
  const navigate = useNavigate();
  const purchases = usePurchaseStore((s) => s.items);
  const jobs = useDestemmingStore((s) => s.jobs);
  const raasiBatches = useRaasiStore((s) => s.batches);
  const createJob = useDestemmingStore((s) => s.createJob);

  const [draft, setDraft] = useState<DraftState>(empty);
  const [touched, setTouched] = useState(false);

  const eligible = useMemo(
    () => eligiblePurchases(purchases, jobs, raasiBatches),
    [purchases, jobs, raasiBatches]
  );

  // Extra counts to power the empty-state hint — telling the user *why*
  // there's nothing to pick is the whole point. With the relaxed rule, a
  // purchase needs to be at Accounts and unclaimed by either pipeline.
  const stats = useMemo(() => {
    let atAccounts = 0;
    let claimedByDestemming = 0;
    let claimedByRaasi = 0;
    let inPipeline = 0;
    const destemmingTaken = new Set(jobs.map((j) => j.purchaseId));
    const raasiTaken = new Set<string>();
    for (const b of raasiBatches) {
      if (b.sourceType !== "purchase") continue;
      for (const id of b.sourceIds) raasiTaken.add(id);
    }
    for (const p of purchases) {
      if (p.isRejected) continue;
      if (p.currentStage === 6) {
        atAccounts += 1;
        if (destemmingTaken.has(p.id)) claimedByDestemming += 1;
        if (raasiTaken.has(p.id)) claimedByRaasi += 1;
      } else {
        inPipeline += 1;
      }
    }
    return {
      atAccounts,
      claimedByDestemming,
      claimedByRaasi,
      inPipeline,
    };
  }, [purchases, jobs, raasiBatches]);

  const source = useMemo(
    () => purchases.find((p) => p.id === draft.purchaseId),
    [purchases, draft.purchaseId]
  );

  // Sum up allocated bags / kg from the draft rows.
  const allocBags = draft.allocations.reduce(
    (s, a) => s + (parseFloat(a.bags) || 0),
    0
  );
  const allocKg = draft.allocations.reduce(
    (s, a) => s + (parseFloat(a.kg) || 0),
    0
  );

  const remainingBags = source ? source.bags - allocBags : 0;
  const remainingKg = source ? source.kg - allocKg : 0;

  const allocationsValid =
    !source ||
    (allocBags <= source.bags &&
      allocKg <= source.kg &&
      draft.allocations.every(
        (a) =>
          a.point &&
          parseFloat(a.bags) > 0 &&
          parseFloat(a.kg) > 0 &&
          a.pricePerKg !== "" &&
          parseFloat(a.pricePerKg) >= 0
      ));

  const checks: Check[] = [
    { key: "source", label: "Source purchase chosen", ok: !!source },
    {
      key: "allocations",
      label:
        draft.allocations.length === 0
          ? "Allocations optional · skip to save as draft"
          : "Allocations within input total",
      ok: draft.allocations.length === 0 ? true : allocationsValid,
    },
  ];
  const allValid = checks.every((c) => c.ok);

  const set = <K extends keyof DraftState>(key: K, value: DraftState[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const addAllocation = () => {
    if (!source) return;
    // Default the new row's point to one not yet used (round-robin); fall
    // through to "Point A" if all four are taken.
    const taken = new Set(draft.allocations.map((a) => a.point));
    const point =
      DESTEMMING_POINTS.find((p) => !taken.has(p)) ?? DESTEMMING_POINTS[0];
    setDraft((d) => ({
      ...d,
      allocations: [
        ...d.allocations,
        {
          point,
          bags: String(Math.max(0, remainingBags)),
          kg: String(Math.max(0, remainingKg)),
          pricePerKg: "",
        },
      ],
    }));
  };

  const updateAllocation = (i: number, patch: Partial<AllocationDraft>) =>
    setDraft((d) => ({
      ...d,
      allocations: d.allocations.map((a, idx) =>
        idx === i ? { ...a, ...patch } : a
      ),
    }));

  const removeAllocation = (i: number) =>
    setDraft((d) => ({
      ...d,
      allocations: d.allocations.filter((_, idx) => idx !== i),
    }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!allValid || !source) return;
    await createJob({
      purchaseId: source.id,
      initialNote: draft.notes.trim() || undefined,
      initialDispatches: draft.allocations
        .filter((a) => parseFloat(a.bags) > 0 && parseFloat(a.kg) > 0)
        .map((a) => ({
          point: a.point,
          sentBags: parseFloat(a.bags),
          sentKg: parseFloat(a.kg),
          pricePerKg: a.pricePerKg !== "" ? parseFloat(a.pricePerKg) : undefined,
        })),
    });
    navigate("/destemming");
  };

  return (
    <>
      <TopBar
        crumbs={[
          { label: "Operations", to: "/" },
          { label: "Grading" },
          { label: "Destemming", to: "/destemming" },
          { label: "New job" },
        ]}
        mobileBack={{ to: "/destemming", label: "Destemming" }}
        rolePill={{ label: "Grading", tone: "purple" }}
      />

      <form
        onSubmit={onSubmit}
        className="flex-1 overflow-y-auto px-4 py-4 pb-32 md:px-6 md:py-5 md:pb-6"
      >
        <div className="grid max-w-[1100px] grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex flex-col gap-3.5">
            <SectionCard
              num={1}
              title="Source purchase"
              required
              subtitle="At Accounts stage"
            >
              {eligible.length === 0 ? (
                <Card padding="md" className="bg-[var(--vv-bg1)]">
                  <div className="mb-2 flex items-center gap-2">
                    <Wind size={14} className="text-[var(--vv-t2)]" />
                    <div className="text-[12px] font-bold text-[var(--vv-t1)]">
                      No purchases ready for destemming
                    </div>
                  </div>
                  <div className="mb-3 text-[11px] leading-snug text-[var(--vv-t2)]">
                    Any purchase at the Accounts stage is eligible for
                    destemming, as long as it isn't already in a destemming job
                    or a Raasi batch.
                  </div>
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    <Pill
                      tone={stats.atAccounts > 0 ? "info" : "neutral"}
                      className="text-[10px]"
                    >
                      {fmtIN(stats.atAccounts)} at Accounts
                    </Pill>
                    <Pill tone="neutral" className="text-[10px]">
                      {fmtIN(stats.claimedByDestemming)} already destemmed
                    </Pill>
                    <Pill tone="neutral" className="text-[10px]">
                      {fmtIN(stats.claimedByRaasi)} sent to Raasi
                    </Pill>
                    <Pill tone="neutral" className="text-[10px]">
                      {fmtIN(stats.inPipeline)} earlier in pipeline
                    </Pill>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link to="/accounts">
                      <Button type="button" variant="ghost" size="sm">
                        <ExternalLink size={12} />
                        Open Accounts queue
                      </Button>
                    </Link>
                    <Link to="/purchase">
                      <Button type="button" variant="ghost" size="sm">
                        <ExternalLink size={12} />
                        Open Purchase list
                      </Button>
                    </Link>
                  </div>
                </Card>
              ) : (
                <FieldShell
                  label="Choose a purchase lot"
                  required
                  hint="Purchases at Accounts that aren't already in destemming or Raasi."
                >
                  <SelectInput
                    value={draft.purchaseId}
                    onChange={(e) => {
                      // Reset allocations when source changes — totals shift.
                      setDraft({
                        purchaseId: e.target.value,
                        notes: draft.notes,
                        allocations: [],
                      });
                    }}
                    error={touched && !source}
                  >
                    <option value="">Choose a purchase…</option>
                    {eligible.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.id} · {p.shop} · {p.variety} {p.type} · Mark {p.mark}{" "}
                        · {DESTINATION_ICON[p.destination]} {p.destination} ·{" "}
                        {p.bags} bags / {p.kg} KG
                      </option>
                    ))}
                  </SelectInput>
                </FieldShell>
              )}

              {source && (
                <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-5">
                  <Stat label="Variety" value={source.variety} />
                  <Stat label="Mark" value={source.mark} />
                  <Stat
                    label="Sitting at"
                    value={`${DESTINATION_ICON[source.destination]} ${source.destination}`}
                  />
                  <Stat label="Bags" value={fmtIN(source.bags)} />
                  <Stat label="Weight" value={fmtKG(source.kg)} />
                </div>
              )}
            </SectionCard>

            <SectionCard
              num={2}
              title="Send to points"
              subtitle="Optional · split now or later"
            >
              {!source ? (
                <div className="text-[12px] text-[var(--vv-t3)]">
                  Choose a source purchase first.
                </div>
              ) : (
                <>
                  <div className="vv-mono flex flex-wrap items-center gap-2 text-[11px] text-[var(--vv-t2)]">
                    <span>
                      Allocated{" "}
                      <span className="font-bold text-[var(--vv-t0)]">
                        {fmtIN(allocBags)} / {fmtIN(source.bags)} bags
                      </span>
                    </span>
                    <span className="text-[var(--vv-t3)]">·</span>
                    <span>
                      <span className="font-bold text-[var(--vv-t0)]">
                        {fmtKG(allocKg)} / {fmtKG(source.kg)}
                      </span>
                    </span>
                    {remainingKg < 0 || remainingBags < 0 ? (
                      <Pill tone="danger" className="ml-auto">
                        Over-allocated
                      </Pill>
                    ) : remainingKg === 0 && allocKg > 0 ? (
                      <Pill tone="success" className="ml-auto">
                        Fully allocated
                      </Pill>
                    ) : (
                      <Pill tone="neutral" className="ml-auto">
                        {fmtKG(Math.max(0, remainingKg))} unallocated
                      </Pill>
                    )}
                  </div>

                  {draft.allocations.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {draft.allocations.map((a, i) => (
                        <div
                          key={i}
                          className="grid grid-cols-[1fr_90px_110px_110px_28px] items-end gap-2"
                        >
                          <FieldShell label="Point">
                            <SelectInput
                              value={a.point}
                              onChange={(e) =>
                                updateAllocation(i, {
                                  point: e.target.value as DestemmingPoint,
                                })
                              }
                            >
                              {DESTEMMING_POINTS.map((p) => (
                                <option key={p} value={p}>
                                  {p}
                                </option>
                              ))}
                            </SelectInput>
                          </FieldShell>
                          <FieldShell label="Bags">
                            <TextInput
                              type="number"
                              inputMode="numeric"
                              min={0}
                              value={a.bags}
                              onChange={(e) =>
                                updateAllocation(i, { bags: e.target.value })
                              }
                            />
                          </FieldShell>
                          <FieldShell label="KG sent">
                            <TextInput
                              type="number"
                              inputMode="decimal"
                              min={0}
                              step="0.01"
                              suffix="KG"
                              value={a.kg}
                              onChange={(e) =>
                                updateAllocation(i, { kg: e.target.value })
                              }
                            />
                          </FieldShell>
                          <FieldShell label="Destemming Price (₹/KG)" required>
                            <TextInput
                              type="number"
                              inputMode="decimal"
                              min={0}
                              step="0.01"
                              value={a.pricePerKg}
                              onChange={(e) =>
                                updateAllocation(i, { pricePerKg: e.target.value })
                              }
                              error={touched && (a.pricePerKg === "" || parseFloat(a.pricePerKg) < 0)}
                            />
                          </FieldShell>
                          <button
                            type="button"
                            onClick={() => removeAllocation(i)}
                            className="inline-flex h-[38px] w-[28px] items-center justify-center rounded-vv-sm border-[0.5px] border-[var(--vv-bd2)] text-[var(--vv-t3)] hover:border-[var(--vv-dan-bd)] hover:text-[var(--vv-dan)]"
                            aria-label="Remove allocation"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addAllocation}
                    disabled={remainingKg <= 0 && draft.allocations.length > 0}
                  >
                    <Plus size={13} />
                    Add destemming point
                  </Button>
                </>
              )}
            </SectionCard>

            <SectionCard num={3} title="Notes" subtitle="Optional">
              <FieldShell label="First note for the job timeline">
                <textarea
                  className="min-h-[64px] w-full rounded-vv-sm border-[0.5px] border-[var(--vv-bd2)] bg-[var(--vv-bg0)] px-3 py-2.5 text-[13px] font-medium leading-[1.5] text-[var(--vv-t0)] transition-all focus:border-[var(--vv-acc)] focus:outline-none focus:ring-2 focus:ring-[var(--vv-acc-bg)]"
                  placeholder="e.g. AA grade · careful destemming."
                  value={draft.notes}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </FieldShell>
            </SectionCard>

            <div className="flex gap-2 pt-1 lg:hidden">
              <Button
                type="button"
                variant="ghost"
                size="md"
                fullWidth
                onClick={() => navigate("/destemming")}
              >
                <ArrowLeft size={14} />
                Cancel
              </Button>
              <Button
                type="submit"
                size="md"
                fullWidth
                disabled={touched && !allValid}
              >
                <Save size={14} />
                Save job
              </Button>
            </div>
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-4 flex flex-col gap-3">
              <Card padding="md">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--vv-t2)]">
                  Live preview
                </div>
                <div className="mb-1 flex items-center gap-1.5">
                  {source ? (
                    <VarietyDot variety={source.variety} />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-[var(--vv-bd2)]" />
                  )}
                  <div className="truncate text-[13px] font-bold text-[var(--vv-t0)]">
                    {source?.shop ?? "Pick a source…"}
                  </div>
                </div>
                <div className="vv-mono mb-3 text-[10px] text-[var(--vv-t2)]">
                  {source
                    ? `${source.id} · ${source.variety} · ${source.type} · Mark ${source.mark}`
                    : "—"}
                </div>

                <div className="mb-3 grid grid-cols-3 gap-2">
                  <Stat label="Input" value={source ? fmtKG(source.kg) : "—"} />
                  <Stat label="To send" value={source ? fmtKG(allocKg) : "—"} />
                  <Stat
                    label="Lot value"
                    value={source ? fmtINR(source.kg * source.price) : "—"}
                  />
                </div>

                {draft.allocations.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {draft.allocations.map((a, i) => (
                      <Pill key={i} tone="neutral" className="text-[9px]">
                        <span
                          style={{
                            color: DESTEMMING_POINT_COLOR[a.point],
                          }}
                        >
                          {DESTEMMING_POINT_ICON[a.point]}
                        </span>
                        {a.point} · {a.kg || 0} KG
                      </Pill>
                    ))}
                  </div>
                )}
                {draft.allocations.length === 0 && (
                  <Pill tone="neutral">
                    <Wind size={11} />
                    Saves as draft · split later
                  </Pill>
                )}
              </Card>

              <Card padding="md">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--vv-t2)]">
                  Checklist
                </div>
                <ul className="flex flex-col gap-1.5">
                  {checks.map((c) => (
                    <li
                      key={c.key}
                      className="flex items-center gap-2 text-[11px]"
                    >
                      <span
                        className={
                          c.ok
                            ? "flex h-4 w-4 items-center justify-center rounded-full bg-[var(--vv-suc)] text-white"
                            : "flex h-4 w-4 items-center justify-center rounded-full border-[1.5px] border-[var(--vv-bd2)]"
                        }
                      >
                        {c.ok && <Check size={10} strokeWidth={3} />}
                      </span>
                      <span
                        className={
                          c.ok
                            ? "font-semibold text-[var(--vv-t1)]"
                            : "text-[var(--vv-t3)]"
                        }
                      >
                        {c.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={() => navigate("/destemming")}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="md"
                  disabled={touched && !allValid}
                  className="flex-1"
                >
                  <Save size={14} />
                  Save
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </form>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">
        {label}
      </div>
      <div className="vv-mono text-[12px] font-medium text-[var(--vv-t0)]">
        {value}
      </div>
    </div>
  );
}
