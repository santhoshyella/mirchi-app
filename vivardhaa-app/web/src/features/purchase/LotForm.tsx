import { useState } from "react";
import { ChevronUp, Plus, Trash2, X } from "lucide-react";
import { FieldShell, TextInput } from "@/components/Field";
import { CardPicker, type CardOption } from "./CardPicker";
import { cn } from "@/lib/cn";
import { fmtINR, todayISO } from "@/lib/format";
import { DESTINATIONS, type Destination } from "@/types/domain";
import type { SetupVariety } from "@/features/setup/store";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LotDraft {
  variety: string;
  type: string;
  mark: string;
  bags: string;
  kg: string;
  price: string;
  /** KG to deduct per gunny bag when computing net weight (default "1") */
  gunnyBagDeductionKg: string;
  /** Rupees to add per gunny bag to the total bill (default "40") */
  gunnyBagRatePerBag: string;
  destination: string;
  destinationDetails: string;
  dispatchDeadline: string;
  remarks: string;
  /** undefined = weigh bridge mode; string[] = individual bag weights */
  bagWeights?: string[];
}

export function defaultDeadline(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

export function emptyLot(): LotDraft {
  return {
    variety: "",
    type: "",
    mark: "",
    bags: "",
    kg: "",
    price: "",
    gunnyBagDeductionKg: "1",
    gunnyBagRatePerBag: "40",
    destination: "",
    destinationDetails: "",
    dispatchDeadline: "",
    remarks: "",
    bagWeights: [""],   // default: individual bags mode, one empty row
  };
}

// ── Validation ────────────────────────────────────────────────────────────────

export interface LotChk { key: string; label: string; ok: boolean; }

export function chkLot(l: LotDraft, currentStage?: number): LotChk[] {
  const checks: LotChk[] = [
    { key: "variety", label: "Variety",            ok: !!l.variety },
    { key: "type",    label: "Type (>= 2 ch)",     ok: l.type.trim().length >= 2 },
    { key: "mark",    label: "Mark",                ok: !!l.mark },
    { key: "price",   label: "Price per KG > 0",   ok: !!l.price && parseFloat(l.price) > 0 },
  ];
  if (currentStage === 3) {
    checks.push({ key: "bags", label: "No. of bags > 0",   ok: !!l.bags && parseFloat(l.bags) > 0 });
    checks.push({ key: "kg",   label: "Lot weight > 0 KG", ok: !!l.kg && parseFloat(l.kg) > 0 });
  }
  return checks;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDeadline(iso: string) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const ta =
  "w-full rounded-vv-sm border-[0.5px] border-[var(--vv-bd2)] bg-[var(--vv-bg0)] px-3 py-2.5 " +
  "text-[13px] font-medium leading-[1.5] text-[var(--vv-t0)] transition-all " +
  "focus:border-[var(--vv-acc)] focus:outline-none focus:ring-2 focus:ring-[var(--vv-acc-bg)]";

// ── LotForm component ─────────────────────────────────────────────────────────

interface LotFormProps {
  idx: number;
  lot: LotDraft;
  totalLots: number;
  touched: boolean;
  varieties: SetupVariety[];
  /** Current workflow stage of this lot. Stage 3 = Weighing (shows + requires weighing input). */
  currentStage?: number;
  onChange: <K extends keyof LotDraft>(k: K, v: LotDraft[K]) => void;
  onSave: () => void;
  onCollapse: () => void;
  onRemove: () => void;
}

export function LotForm({ idx, lot, totalLots, touched, varieties, currentStage, onChange, onSave, onCollapse, onRemove }: LotFormProps) {
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);
  // Individual bags is the default (bagWeights undefined → weigh bridge; array → individual)
  const [useWeighBridge, setUseWeighBridge] = useState(lot.bagWeights === undefined);
  const [bagWeights, setBagWeights] = useState<string[]>(lot.bagWeights ?? [""]);

  // Weighing section is only shown (and required) at stage 3 (Weighing stage)
  const showWeighing = currentStage === 3;

  const checks = chkLot(lot, currentStage);

  const varietyOpts: CardOption<string>[] = varieties.map(v => ({
    value: v.name,
    label: v.name,
    color: v.color,
    subtitle: v.subtitle ?? undefined,
  }));

  const selectedVariety = varieties.find(v => v.name === lot.variety);
  const adminMarks = (selectedVariety?.marks ?? [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const markOpts: CardOption<string>[] = adminMarks.map(m => ({
    value: m.name,
    label: m.label || m.name,
  }));

  const destOpts: CardOption<string>[] = DESTINATIONS.map(d => ({
    value: d,
    label: d,
  }));

  function fieldErr(key: string) {
    if (!touched) return false;
    const check = checks.find(c => c.key === key);
    return check ? !check.ok : false;
  }

  // ── Individual bags helpers ──────────────────────────────────────────────────

  function syncFromBagWeights(weights: string[]) {
    const totalKg = weights.reduce((s, w) => s + (parseFloat(w) || 0), 0);
    const validBags = weights.filter(w => parseFloat(w) > 0).length;
    onChange("bagWeights", weights);
    onChange("kg", totalKg > 0 ? String(totalKg) : "");
    onChange("bags", validBags > 0 ? String(validBags) : "");
  }

  function updateBagWeight(i: number, val: string) {
    const next = bagWeights.map((w, j) => j === i ? val : w);
    setBagWeights(next);
    syncFromBagWeights(next);
  }

  function removeBag(i: number) {
    const next = bagWeights.filter((_, j) => j !== i);
    setBagWeights(next);
    syncFromBagWeights(next);
  }

  function addBag() {
    const next = [...bagWeights, ""];
    setBagWeights(next);
    onChange("bagWeights", next);
  }

  function switchToIndividual() {
    setUseWeighBridge(false);
    const initial = [""];
    setBagWeights(initial);
    onChange("bagWeights", initial);
    onChange("kg", "");
    onChange("bags", "");
  }

  function switchToWeighBridge() {
    setUseWeighBridge(true);
    // undefined signals weigh bridge mode; clear individual data
    onChange("bagWeights", undefined);
    onChange("kg", "");
    onChange("bags", "");
  }

  // ── Derived display values ────────────────────────────────────────────────────
  const lotKg = parseFloat(lot.kg) || 0;
  const lotBags = parseFloat(lot.bags) || 0;
  const lotPrice = parseFloat(lot.price) || 0;
  const bagDeductionKg = parseFloat(lot.gunnyBagDeductionKg) || 0;
  const gunnyRatePerBag = parseFloat(lot.gunnyBagRatePerBag) || 0;
  const totalDeductionKg = lotBags * bagDeductionKg;
  const netKg = Math.max(0, lotKg - totalDeductionKg);
  const chilliCost = netKg * lotPrice;
  const gunnyCost = lotBags * gunnyRatePerBag;
  const totalLotCost = chilliCost + gunnyCost;

  return (
    <div className="overflow-hidden rounded-vv-md border-[0.5px] border-[var(--vv-acc)] bg-[var(--vv-bg0)] shadow-sm">
      {/* Lot header */}
      <div className="flex items-center gap-3 border-b-[0.5px] border-[var(--vv-bd2)] bg-[var(--vv-bg1)] px-4 py-2.5">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--vv-acc-bg)] text-[11px] font-bold text-[var(--vv-acc)]">
          {idx + 1}
        </div>
        <span className="flex-1 text-[13px] font-bold text-[var(--vv-t0)]">Lot {idx + 1}</span>
        {totalLots > 1 && (
          <button
            type="button"
            onClick={onRemove}
            className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold text-[var(--vv-t3)] transition-colors hover:bg-[var(--vv-dan-bg)] hover:text-[var(--vv-dan)]"
          >
            <Trash2 size={11} /> Remove
          </button>
        )}
        <button
          type="button"
          onClick={onCollapse}
          className="rounded p-1 text-[var(--vv-t3)] transition-colors hover:bg-[var(--vv-bg2)] hover:text-[var(--vv-t0)]"
          title="Collapse"
        >
          <ChevronUp size={16} />
        </button>
      </div>

      {/* Lot body */}
      <div className="flex flex-col gap-3.5 p-4">

        {/* Variety */}
        <FieldShell label="Variety" required>
          {varietyOpts.length > 0 ? (
            <CardPicker
              options={varietyOpts}
              value={lot.variety}
              onChange={v => { onChange("variety", v); onChange("mark", ""); }}
            />
          ) : (
            <TextInput
              value={lot.variety}
              onChange={e => onChange("variety", e.target.value)}
              placeholder="e.g. Teja, Wonder Hot, 334..."
              error={fieldErr("variety")}
            />
          )}
        </FieldShell>

        {/* Type */}
        <FieldShell label="Type" required hint="e.g. S4, S5, Whole, Stem">
          <TextInput
            value={lot.type}
            onChange={e => onChange("type", e.target.value)}
            placeholder="e.g. S4, Whole, Stem..."
            error={fieldErr("type")}
          />
        </FieldShell>

        {/* Mark */}
        <FieldShell label="Mark" required>
          {!lot.variety ? (
            <p className="text-[12px] text-[var(--vv-t3)]">Select a variety first to see its marks.</p>
          ) : markOpts.length > 0 ? (
            <CardPicker
              options={markOpts}
              value={lot.mark}
              onChange={v => onChange("mark", v)}
            />
          ) : (
            <p className="text-[12px] text-[var(--vv-dan)]">No marks configured for this variety. Add them in Setup → Varieties.</p>
          )}
        </FieldShell>

        {/* ── Weighing ─────────────────────────────────────────────────────── */}
        {showWeighing ? (
          <div className="flex flex-col gap-2.5">
            {/* Section header with required badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-semibold text-[var(--vv-t2)]">Weighing</span>
                <span className="rounded-full bg-[var(--vv-dan-bg)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--vv-dan)]">
                  Required at Stage 3
                </span>
              </div>
              <div className="flex overflow-hidden rounded-vv-sm border-[0.5px] border-[var(--vv-bd2)] text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={switchToIndividual}
                  className={cn(
                    "px-3 py-1.5 transition-colors",
                    !useWeighBridge
                      ? "bg-[var(--vv-acc)] text-white"
                      : "bg-[var(--vv-bg0)] text-[var(--vv-t2)] hover:bg-[var(--vv-bg1)]"
                  )}
                >
                  Individual Bags
                </button>
                <button
                  type="button"
                  onClick={switchToWeighBridge}
                  className={cn(
                    "border-l-[0.5px] border-[var(--vv-bd2)] px-3 py-1.5 transition-colors",
                    useWeighBridge
                      ? "bg-[var(--vv-acc)] text-white"
                      : "bg-[var(--vv-bg0)] text-[var(--vv-t2)] hover:bg-[var(--vv-bg1)]"
                  )}
                >
                  Weigh Bridge
                </button>
              </div>
            </div>

            {useWeighBridge ? (
              /* ── Weigh Bridge: enter bags + total lot weight ── */
              <div className="grid grid-cols-2 gap-3">
                <FieldShell label="No. of Bags" required>
                  <TextInput
                    type="number"
                    min={0}
                    value={lot.bags}
                    onChange={e => onChange("bags", e.target.value)}
                    placeholder="0"
                    error={fieldErr("bags")}
                  />
                </FieldShell>
                <FieldShell label="Lot Weight (KG)" required>
                  <TextInput
                    type="number"
                    min={0}
                    step={0.01}
                    value={lot.kg}
                    onChange={e => onChange("kg", e.target.value)}
                    placeholder="0.00"
                    error={fieldErr("kg")}
                  />
                </FieldShell>
              </div>
            ) : (
              /* ── Individual Bags: per-bag weights, auto-sum ── */
              <div className={cn(
                "rounded-vv-sm border-[0.5px] bg-[var(--vv-bg1)] p-3",
                fieldErr("bags") || fieldErr("kg")
                  ? "border-[var(--vv-dan-bd)]"
                  : "border-[var(--vv-bd2)]"
              )}>
                <div className="flex flex-col gap-2">
                  {bagWeights.map((w, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-[52px] shrink-0 text-[11px] font-medium text-[var(--vv-t3)]">
                        Bag {i + 1}
                      </span>
                      <TextInput
                        type="number"
                        min={0}
                        step={0.01}
                        value={w}
                        onChange={e => updateBagWeight(i, e.target.value)}
                        placeholder="0.00 KG"
                      />
                      {bagWeights.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeBag(i)}
                          className="shrink-0 rounded p-1 text-[var(--vv-t3)] transition-colors hover:text-[var(--vv-dan)]"
                          title="Remove bag"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  ))}

                  {/* Add bag */}
                  <button
                    type="button"
                    onClick={addBag}
                    className="mt-0.5 flex items-center gap-1.5 self-start rounded px-1 py-0.5 text-[12px] font-semibold text-[var(--vv-acc)] transition-opacity hover:opacity-70"
                  >
                    <Plus size={13} /> Add bag
                  </button>
                </div>

                {/* Summary row */}
                {lotKg > 0 && (
                  <div className="mt-2.5 flex items-center gap-2 border-t-[0.5px] border-[var(--vv-bd2)] pt-2.5 text-[12px]">
                    <span className="text-[var(--vv-t3)]">Total:</span>
                    <span className="font-bold text-[var(--vv-t0)]">
                      {lot.bags} bag{parseFloat(lot.bags) !== 1 ? "s" : ""} · {lotKg.toFixed(2)} KG
                    </span>
                  </div>
                )}

                {/* Error message */}
                {touched && (fieldErr("bags") || fieldErr("kg")) && (
                  <p className="mt-1.5 text-[10px] font-semibold text-[var(--vv-dan)]">
                    Enter at least one bag weight to record weighing.
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Weighing not available at this stage */
          <div className="flex items-center gap-2 rounded-vv-sm border-[0.5px] border-[var(--vv-bd)] bg-[var(--vv-bg1)] px-3 py-2 text-[11px] text-[var(--vv-t3)]">
            <span className="font-semibold">Weighing</span>
            <span>·</span>
            <span>Entered at Stage 3 (Weighing stage)</span>
          </div>
        )}

        {/* Price */}
        <FieldShell label="Price per KG (₹)" required>
          <TextInput
            type="number"
            min={0.01}
            step={0.01}
            value={lot.price}
            onChange={e => onChange("price", e.target.value)}
            placeholder="e.g. 185.50"
            error={fieldErr("price")}
          />
        </FieldShell>

        {/* Gunny bag fields + lot cost — visible only once bags are entered */}
        {lotBags > 0 && (
          <div className="rounded-vv-sm border-[0.5px] border-[var(--vv-acc)] bg-[var(--vv-acc-bg)] p-3 flex flex-col gap-3">
            {/* Editable gunny bag rates */}
            <div className="grid grid-cols-2 gap-3">
              <FieldShell label="Bag weight deduction (KG each)" hint="Deducted from gross weight per bag">
                <TextInput
                  type="number"
                  min={0}
                  step={0.1}
                  value={lot.gunnyBagDeductionKg}
                  onChange={e => onChange("gunnyBagDeductionKg", e.target.value)}
                  placeholder="1"
                />
              </FieldShell>
              <FieldShell label="Gunny bag rate (₹ each)" hint="Added to total bill per bag">
                <TextInput
                  type="number"
                  min={0}
                  step={1}
                  value={lot.gunnyBagRatePerBag}
                  onChange={e => onChange("gunnyBagRatePerBag", e.target.value)}
                  placeholder="40"
                />
              </FieldShell>
            </div>

            {/* Lot cost breakdown */}
            {totalLotCost > 0 && (
              <div className="flex flex-col gap-1 border-t-[0.5px] border-[var(--vv-acc)] pt-2.5 opacity-100">
                {bagDeductionKg > 0 && (
                  <div className="flex items-center justify-between text-[11px] text-[var(--vv-acc)]">
                    <span>Net weight ({lotKg} − {lotBags}×{bagDeductionKg} KG)</span>
                    <span className="vv-mono font-semibold">{netKg.toFixed(2)} KG</span>
                  </div>
                )}
                {chilliCost > 0 && (
                  <div className="flex items-center justify-between text-[11px] text-[var(--vv-acc)]">
                    <span>Chilli cost ({netKg.toFixed(2)} KG × ₹{lotPrice})</span>
                    <span className="vv-mono font-semibold">{fmtINR(chilliCost)}</span>
                  </div>
                )}
                {gunnyCost > 0 && (
                  <div className="flex items-center justify-between text-[11px] text-[var(--vv-acc)]">
                    <span>Gunny bags ({lotBags} × ₹{gunnyRatePerBag})</span>
                    <span className="vv-mono font-semibold">+ {fmtINR(gunnyCost)}</span>
                  </div>
                )}
                <div className="mt-1 flex items-center justify-between border-t-[0.5px] border-[var(--vv-acc)] pt-2">
                  <span className="text-[12px] font-semibold text-[var(--vv-acc)]">Lot Cost</span>
                  <span className="vv-mono text-[14px] font-extrabold text-[var(--vv-acc)]">
                    {fmtINR(totalLotCost)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Destination */}
        <FieldShell label="Destination" hint="Optional — where will this lot be dispatched?">
          <CardPicker
            options={destOpts}
            value={lot.destination}
            onChange={v => onChange("destination", v)}
          />
        </FieldShell>

        {lot.destination && (
          <FieldShell label="Destination details" hint="Optional">
            <TextInput
              value={lot.destinationDetails}
              onChange={e => onChange("destinationDetails", e.target.value)}
              placeholder="e.g. cold storage name, address..."
            />
          </FieldShell>
        )}

        {/* Dispatch deadline */}
        <FieldShell label="Dispatch deadline" hint="Optional — latest date for dispatch">
          {!lot.dispatchDeadline && !showDeadlinePicker ? (
            <button
              type="button"
              onClick={() => { setShowDeadlinePicker(true); onChange("dispatchDeadline", defaultDeadline()); }}
              className="rounded-vv-sm border-[0.5px] border-dashed border-[var(--vv-bd2)] px-3 py-2 text-[12px] text-[var(--vv-t3)] transition-colors hover:border-[var(--vv-acc)] hover:text-[var(--vv-acc)]"
            >
              + Set deadline
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={lot.dispatchDeadline}
                min={todayISO()}
                onChange={e => onChange("dispatchDeadline", e.target.value)}
                className="rounded-vv-sm border-[0.5px] border-[var(--vv-bd2)] bg-[var(--vv-bg0)] px-3 py-2.5 text-[13px] font-medium text-[var(--vv-t0)] focus:border-[var(--vv-acc)] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => { onChange("dispatchDeadline", ""); setShowDeadlinePicker(false); }}
                className="text-[11px] text-[var(--vv-t3)] hover:text-[var(--vv-dan)]"
              >
                Clear
              </button>
              {lot.dispatchDeadline && (
                <div className="text-[11px] text-[var(--vv-t2)]">
                  {fmtDeadline(lot.dispatchDeadline)}
                </div>
              )}
            </div>
          )}
        </FieldShell>

        {/* Lot Note — stays with this lot only, never sent to next stage */}
        <FieldShell label="Lot note" hint="Saved with this lot only — not carried to next stage or other lots">
          <textarea
            className={cn(ta, "min-h-[64px]")}
            placeholder="e.g. Damaged bags, special handling required..."
            value={lot.remarks}
            onChange={(e) => onChange("remarks", e.target.value)}
          />
        </FieldShell>
      </div>

      {/* Save Lot footer — type="button" so it never submits the parent form */}
      <div className="flex items-center justify-between border-t-[0.5px] border-[var(--vv-bd2)] bg-[var(--vv-bg1)] px-4 py-3">
        <p className="text-[11px] text-[var(--vv-t3)]">
          {touched && !checks.every(c => c.ok)
            ? <span className="font-semibold text-[var(--vv-dan)]">Fix errors above before saving this lot</span>
            : "Fill in the details, then save to collapse"}
        </p>
        <button
          type="button"
          onClick={onSave}
          className="flex items-center gap-1.5 rounded-vv-sm bg-[var(--vv-acc)] px-3 py-1.5 text-[12px] font-bold text-white transition-opacity hover:opacity-90"
        >
          Save Lot {idx + 1}
        </button>
      </div>
    </div>
  );
}
