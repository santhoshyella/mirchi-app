import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, ExternalLink, Save, Sun } from "lucide-react";

import { TopBar } from "@/layouts/TopBar";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Pill } from "@/components/Pill";
import { SectionCard } from "@/components/SectionCard";
import { FieldShell, TextInput } from "@/components/Field";
import { VarietyDot } from "@/components/VarietyDot";
import { fmtIN, fmtKG, todayISO } from "@/lib/format";
import {
  RAASI_SOURCE_ICON,
  RAASI_SOURCE_LABEL,
  RAASI_SOURCE_TYPES,
  type Mark,
  type RaasiSourceType,
  type Variety,
} from "@/types/domain";

import { usePurchaseStore } from "@/features/purchase/store";
import { useDestemmingStore } from "@/features/destemming/store";
import { totalReceivedKg } from "@/features/destemming/selectors";
import { useRaasiStore } from "./store";
import { eligibleDestemmingJobs, eligiblePurchases } from "./selectors";

interface DraftState {
  sourceType: RaasiSourceType;
  /** IDs of selected sources. All same `sourceType`. Length ≥ 1 to save. */
  sourceIds: string[];
  inputBags: string;
  inputWetKg: string;
  spreadDate: string;
  notes: string;
}

const empty: DraftState = {
  sourceType: "purchase",
  sourceIds: [],
  inputBags: "",
  inputWetKg: "",
  spreadDate: todayISO(),
  notes: "",
};

interface CheckItem {
  key: string;
  label: string;
  ok: boolean;
}

export function NewRaasiBatchPage() {
  const navigate = useNavigate();
  const purchases = usePurchaseStore((s) => s.items);
  const destemmingJobs = useDestemmingStore((s) => s.jobs);
  const batches = useRaasiStore((s) => s.batches);
  const createBatch = useRaasiStore((s) => s.createBatch);

  const [draft, setDraft] = useState<DraftState>(empty);
  const [touched, setTouched] = useState(false);

  const eligPurchases = useMemo(
    () => eligiblePurchases(purchases, batches, destemmingJobs),
    [purchases, batches, destemmingJobs]
  );
  const eligDestemming = useMemo(
    () => eligibleDestemmingJobs(destemmingJobs, batches),
    [destemmingJobs, batches]
  );

  // Resolve every selected source into a uniform shape so the rest of the
  // form just iterates over a single list. Each row carries the bits the
  // form needs for display + summing.
  interface ResolvedSource {
    id: string;
    shop: string;
    variety: Variety;
    type: string;
    mark: Mark;
    bags: number;
    kg: number;
  }
  const resolvedSources = useMemo<ResolvedSource[]>(() => {
    if (draft.sourceType === "purchase") {
      return draft.sourceIds
        .map((id) => purchases.find((p) => p.id === id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
        .map((p) => ({
          id: p.id,
          shop: p.shop,
          variety: p.variety as Variety,
          type: p.type,
          mark: p.mark,
          bags: p.bags,
          kg: p.kg,
        }));
    }
    return draft.sourceIds
      .map((id) => destemmingJobs.find((j) => j.id === id))
      .filter((j): j is NonNullable<typeof j> => Boolean(j))
      .map((j) => ({
        id: j.id,
        shop: j.shop,
        variety: j.variety as Variety,
        type: j.type,
        mark: j.mark,
        bags: j.inputBags,
        // For destemming sources the wet input is the destemmed weight that
        // returned from points (bags are an approximation post-destem).
        kg: totalReceivedKg(j),
      }));
  }, [draft.sourceType, draft.sourceIds, purchases, destemmingJobs]);

  const totalSourceBags = resolvedSources.reduce((s, x) => s + x.bags, 0);
  const totalSourceKg = resolvedSources.reduce((s, x) => s + x.kg, 0);

  // Primary (first) source — drives the right-side preview's variety dot
  // and the snapshot the row will carry.
  const primarySource = resolvedSources[0];

  // Whenever the selection changes, prefill bags + KG with the combined
  // totals. Operator can override if some bags weren't actually spread.
  // Using a stable key (sorted ids) so React re-runs only on real changes.
  const selectionKey = draft.sourceIds.slice().sort().join(",");
  useEffect(() => {
    if (resolvedSources.length === 0) {
      setDraft((d) => ({ ...d, inputBags: "", inputWetKg: "" }));
      return;
    }
    setDraft((d) => ({
      ...d,
      inputBags: String(totalSourceBags),
      inputWetKg: String(Math.round(totalSourceKg)),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionKey]);

  // Cross-variety check — flag (don't block) if the operator merged lots
  // with different varieties. Uncommon but legal.
  const mixedVariety =
    resolvedSources.length > 1 &&
    !resolvedSources.every((s) => s.variety === resolvedSources[0].variety);

  const bagsNum = parseFloat(draft.inputBags) || 0;
  const wetKgNum = parseFloat(draft.inputWetKg) || 0;

  const checks: CheckItem[] = [
    {
      key: "sourceChosen",
      label:
        draft.sourceIds.length === 0
          ? "Pick at least one source"
          : draft.sourceIds.length === 1
            ? "1 source picked"
            : `${draft.sourceIds.length} sources picked · merging`,
      ok: resolvedSources.length > 0,
    },
    {
      key: "bags",
      label: "Bags > 0",
      ok: bagsNum > 0,
    },
    {
      key: "wetKg",
      label: "Wet KG > 0",
      ok: wetKgNum > 0,
    },
    {
      key: "spreadDate",
      label: "Spread date set",
      ok: !!draft.spreadDate,
    },
  ];
  const allValid = checks.every((c) => c.ok);

  const set = <K extends keyof DraftState>(key: K, value: DraftState[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!allValid) return;
    await createBatch({
      sourceType: draft.sourceType,
      sourceIds: draft.sourceIds,
      inputBags: bagsNum,
      inputWetKg: wetKgNum,
      spreadDate: draft.spreadDate,
      initialNote: draft.notes.trim() || undefined,
    });
    navigate("/raasi");
  };

  // Eligibility-aware empty state. Used when both lists are empty.
  const noEligible = eligPurchases.length === 0 && eligDestemming.length === 0;

  return (
    <>
      <TopBar
        crumbs={[
          { label: "Operations", to: "/" },
          { label: "Grading" },
          { label: "Raasi", to: "/raasi" },
          { label: "New batch" },
        ]}
        mobileBack={{ to: "/raasi", label: "Raasi" }}
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
              title="Source"
              required
              subtitle="Purchase or Destemming"
            >
              <FieldShell label="Source type">
                <div className="flex flex-wrap gap-2">
                  {RAASI_SOURCE_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        // Reset the selection when flipping types so we don't
                        // carry a stale id list into the wrong source's lookup.
                        setDraft((d) => ({
                          ...d,
                          sourceType: t,
                          sourceIds: [],
                        }));
                      }}
                      className={
                        "rounded-vv-sm border-[0.5px] px-3 py-1.5 text-[12px] font-bold transition-all " +
                        (draft.sourceType === t
                          ? "border-[var(--vv-acc)] bg-[var(--vv-acc-bg)] text-[var(--vv-acc)]"
                          : "border-[var(--vv-bd2)] bg-[var(--vv-bg0)] text-[var(--vv-t1)] hover:border-[var(--vv-bd)]")
                      }
                    >
                      {RAASI_SOURCE_ICON[t]} {RAASI_SOURCE_LABEL[t]}
                    </button>
                  ))}
                </div>
              </FieldShell>

              {noEligible ? (
                <Card padding="md" className="bg-[var(--vv-bg1)]">
                  <div className="mb-2 flex items-center gap-2">
                    <Sun size={14} className="text-[var(--vv-t2)]" />
                    <div className="text-[12px] font-bold text-[var(--vv-t1)]">
                      No sources ready for the yard
                    </div>
                  </div>
                  <div className="mb-3 text-[11px] leading-snug text-[var(--vv-t2)]">
                    Raasi pulls from purchases with destination "Raasi" (settled
                    at Accounts) or from fully-received destemming jobs. None
                    are unclaimed at the moment.
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link to="/purchase">
                      <Button type="button" variant="ghost" size="sm">
                        <ExternalLink size={12} />
                        Open Purchase list
                      </Button>
                    </Link>
                    <Link to="/destemming">
                      <Button type="button" variant="ghost" size="sm">
                        <ExternalLink size={12} />
                        Open Destemming
                      </Button>
                    </Link>
                  </div>
                </Card>
              ) : (
                <FieldShell
                  label={
                    draft.sourceType === "purchase"
                      ? "Pick one or more purchases at Accounts"
                      : "Pick one or more completed destemming jobs"
                  }
                  required
                  hint={
                    draft.sourceType === "purchase"
                      ? "Any Accounts-stage purchase that isn't in destemming or another Raasi batch. Tick multiple to merge lots onto one yard plot."
                      : "Fully-received destemming jobs not yet sent to Raasi. Tick multiple to merge destemmed lots into one drying batch."
                  }
                  error={
                    touched && draft.sourceIds.length === 0
                      ? "At least one source required."
                      : undefined
                  }
                >
                  <div className="max-h-[260px] overflow-y-auto rounded-vv-sm border-[0.5px] border-[var(--vv-bd2)] bg-[var(--vv-bg0)]">
                    {(draft.sourceType === "purchase"
                      ? eligPurchases.map((p) => ({
                          id: p.id,
                          line1: `${p.shop} · ${p.variety} ${p.type} · Mark ${p.mark}`,
                          line2: `${fmtIN(p.bags)} bags · ${fmtKG(p.kg)}`,
                        }))
                      : eligDestemming.map((j) => ({
                          id: j.id,
                          line1: `${j.shop} · ${j.variety} ${j.type} · Mark ${j.mark}`,
                          line2: `${fmtIN(j.inputBags)} bags · destemmed ${fmtKG(Math.round(totalReceivedKg(j)))}`,
                        }))
                    ).map((opt, idx, arr) => {
                      const checked = draft.sourceIds.includes(opt.id);
                      return (
                        <label
                          key={opt.id}
                          className={
                            "flex cursor-pointer items-start gap-2.5 px-3 py-2 transition-colors " +
                            (checked
                              ? "bg-[var(--vv-acc-bg)]"
                              : "hover:bg-[var(--vv-bg1)]") +
                            (idx < arr.length - 1
                              ? " border-b-[0.5px] border-[var(--vv-bd)]"
                              : "")
                          }
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              setDraft((d) => ({
                                ...d,
                                sourceIds: e.target.checked
                                  ? [...d.sourceIds, opt.id]
                                  : d.sourceIds.filter((x) => x !== opt.id),
                              }));
                            }}
                            className="mt-0.5 h-3.5 w-3.5 cursor-pointer accent-[var(--vv-acc)]"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="vv-mono text-[10px] font-bold text-[var(--vv-t2)]">
                                {opt.id}
                              </span>
                              <span className="truncate text-[12px] font-bold text-[var(--vv-t0)]">
                                {opt.line1}
                              </span>
                            </div>
                            <div className="vv-mono mt-0.5 text-[10px] text-[var(--vv-t2)]">
                              {opt.line2}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                    {(draft.sourceType === "purchase"
                      ? eligPurchases
                      : eligDestemming
                    ).length === 0 && (
                      <div className="px-3 py-3 text-[11px] text-[var(--vv-t3)]">
                        {draft.sourceType === "purchase"
                          ? "No eligible purchases."
                          : "No eligible destemming jobs."}
                      </div>
                    )}
                  </div>
                </FieldShell>
              )}

              {/* Selection tally + cross-variety warning */}
              {resolvedSources.length > 0 && (
                <div className="mt-1 flex flex-wrap items-center gap-2 rounded-vv-sm border-[0.5px] border-[var(--vv-acc-bd)] bg-[var(--vv-acc-bg)] px-3 py-2">
                  <span className="text-[11px] font-bold text-[var(--vv-acc)]">
                    {resolvedSources.length} source
                    {resolvedSources.length === 1 ? "" : "s"} selected
                  </span>
                  <span className="vv-mono text-[10px] text-[var(--vv-t2)]">
                    Combined {fmtIN(totalSourceBags)} bags ·{" "}
                    {fmtKG(Math.round(totalSourceKg))}
                  </span>
                  {primarySource && (
                    <span className="vv-mono text-[10px] text-[var(--vv-t2)]">
                      <span className="text-[var(--vv-t3)]"> · </span>
                      Primary: {primarySource.id}
                    </span>
                  )}
                  {mixedVariety && (
                    <Pill tone="warning" className="ml-auto text-[9px]">
                      Mixed varieties · primary used for snapshot
                    </Pill>
                  )}
                </div>
              )}
            </SectionCard>

            <SectionCard num={2} title="Spread on yard" required>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <FieldShell label="Bags spread" required>
                  <TextInput
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={draft.inputBags}
                    onChange={(e) => set("inputBags", e.target.value)}
                    error={touched && bagsNum <= 0}
                  />
                </FieldShell>
                <FieldShell label="Wet KG spread" required>
                  <TextInput
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    suffix="KG"
                    value={draft.inputWetKg}
                    onChange={(e) => set("inputWetKg", e.target.value)}
                    error={touched && wetKgNum <= 0}
                  />
                </FieldShell>
                <FieldShell label="Spread date" required>
                  <TextInput
                    type="date"
                    max={todayISO()}
                    value={draft.spreadDate}
                    onChange={(e) => set("spreadDate", e.target.value)}
                    error={touched && !draft.spreadDate}
                  />
                </FieldShell>
              </div>
            </SectionCard>

            <SectionCard num={3} title="Notes" subtitle="Optional">
              <FieldShell label="First note for the batch timeline">
                <textarea
                  className="min-h-[64px] w-full rounded-vv-sm border-[0.5px] border-[var(--vv-bd2)] bg-[var(--vv-bg0)] px-3 py-2.5 text-[13px] font-medium leading-[1.5] text-[var(--vv-t0)] transition-all focus:border-[var(--vv-acc)] focus:outline-none focus:ring-2 focus:ring-[var(--vv-acc-bg)]"
                  placeholder="e.g. Plot 2 · clear weather forecast for the week."
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
                onClick={() => navigate("/raasi")}
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
                Save batch
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
                  {primarySource ? (
                    <VarietyDot variety={primarySource.variety} />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-[var(--vv-bd2)]" />
                  )}
                  <div className="truncate text-[13px] font-bold text-[var(--vv-t0)]">
                    {primarySource
                      ? resolvedSources.length > 1
                        ? `${primarySource.shop} + ${resolvedSources.length - 1} more`
                        : primarySource.shop
                      : "Pick a source…"}
                  </div>
                </div>
                <div className="vv-mono mb-3 text-[10px] text-[var(--vv-t2)]">
                  {primarySource
                    ? `${RAASI_SOURCE_ICON[draft.sourceType]} ${resolvedSources
                        .map((s) => s.id)
                        .join(
                          ", "
                        )} · ${primarySource.variety} · ${primarySource.type} · Mark ${primarySource.mark}`
                    : "—"}
                </div>

                <div className="mb-3 grid grid-cols-3 gap-2">
                  <Stat
                    label="Bags"
                    value={bagsNum > 0 ? fmtIN(bagsNum) : "—"}
                  />
                  <Stat
                    label="Wet KG"
                    value={wetKgNum > 0 ? fmtKG(wetKgNum) : "—"}
                  />
                  <Stat label="Spread" value={draft.spreadDate || "—"} />
                </div>

                <Pill tone="warning">
                  <Sun size={11} />
                  Saves as Drying
                </Pill>
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
                  onClick={() => navigate("/raasi")}
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
