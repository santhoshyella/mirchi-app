/**
 * EditPurchaseItemPage
 *
 * Route: /purchase/:id/edit
 *
 * - currentStage === 1  → full edit form (source + lot fields editable).
 * - currentStage  >  1  → same form, but source info (type, shop, details) is
 *                          locked read-only. Lot fields remain editable.
 *
 * If the item is not yet in local state (e.g. deep-link), we fetch it on mount.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useLocation, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save, Send } from "lucide-react";

import { TopBar } from "@/layouts/TopBar";
import { Button } from "@/components/Button";
import { SectionCard } from "@/components/SectionCard";
import { FieldShell, TextInput } from "@/components/Field";

import { fmtDateTime, fmtINR } from "@/lib/format";
import { purchasesApi } from "@/lib/api";
import {
  SOURCE_TYPES,
  SOURCE_TYPE_COLOR,
  SOURCE_TYPE_ICON,
  SOURCE_TYPE_SUBTITLE,
  STAGE_NAMES,
  isLotNote,
  type Destination,
  type Mark,
  type PurchaseItem,
  type SourceType,
  type Variety,
} from "@/types/domain";

import { usePurchaseStore } from "./store";
import { useSetupStore } from "@/features/setup/store";
import { CardPicker, type CardOption } from "./CardPicker";
import { LotForm, type LotDraft } from "./LotForm";
import { lotCost, GUNNY_BAG_DEDUCTION_KG, GUNNY_BAG_RATE } from "./selectors";

// ─── Draft shape (edit mode only) ───────────────────────────────────────────

interface DraftState {
  date: string;
  sourceType: SourceType | "";
  shop: string;
  sourceDetails: string;
  variety: Variety | "";
  type: string;
  mark: Mark | "";
  bags: string;
  kg: string;
  price: string;
  gunnyBagDeductionKg: string;
  gunnyBagRatePerBag: string;
  destination: Destination | "";
  destinationDetails: string;
  dispatchDeadline: string;
}

interface ValidationItem {
  key: keyof DraftState | "section";
  label: string;
  ok: boolean;
}

function validate(draft: DraftState): ValidationItem[] {
  const price = parseFloat(draft.price);
  return [
    { key: "date",       label: "Purchase date",    ok: !!draft.date },
    { key: "sourceType", label: "Source type",       ok: !!draft.sourceType },
    { key: "shop",       label: "Name (>= 2 chars)", ok: !draft.sourceType || draft.shop.trim().length >= 2 },
    { key: "variety",    label: "Variety chosen",    ok: !!draft.variety },
    { key: "type",       label: "Type (>= 2 chars)", ok: draft.type.trim().length >= 2 },
    { key: "mark",       label: "Mark chosen",       ok: !!draft.mark },
    { key: "price",      label: "Price/KG > 0",      ok: !!price && price > 0 },
  ];
}

function itemToDraft(item: PurchaseItem): DraftState {
  return {
    date: item.date,
    sourceType: item.sourceType,
    shop: item.shop ?? "",
    sourceDetails: item.sourceDetails ?? "",
    variety: item.variety,
    type: item.type,
    mark: item.mark,
    bags: String(item.bags),
    kg: String(item.kg),
    price: String(item.price),
    gunnyBagDeductionKg: "1",
    gunnyBagRatePerBag: "40",
    destination: item.destination,
    destinationDetails: item.destinationDetails ?? "",
    dispatchDeadline: item.dispatchDeadline,
  };
}

// ─── Read-only view (stage 4+) ───────────────────────────────────────────────

function LotViewPage({ item, returnTo }: { item: PurchaseItem; returnTo: string }) {
  const navigate = useNavigate();
  const { addNote } = usePurchaseStore();
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);
  const [localItem, setLocalItem] = useState(item);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Keep local copy fresh when parent item updates
  useEffect(() => { setLocalItem(item); }, [item]);

  const lotNotes = (localItem.notes ?? []).filter(isLotNote);

  const hasIndividualBags =
    Array.isArray(localItem.bagWeights) && localItem.bagWeights.length > 0;

  const topRows: [string, string][] = [
    ["Variety", localItem.variety],
    ["Type", localItem.type || "—"],
    ["Mark", localItem.mark || "—"],
  ];

  const bottomRows: [string, string][] = [
    ["Price / KG", localItem.price != null ? `₹${localItem.price}` : "—"],
    ["Destination", localItem.destination || "—"],
    ...(localItem.destinationDetails ? [["Dest. details", localItem.destinationDetails] as [string, string]] : []),
    ["Dispatch deadline", localItem.dispatchDeadline || "—"],
  ];

  const handleAddNote = async () => {
    const text = noteText.trim();
    if (!text) return;
    setSaving(true);
    try {
      const updated = await addNote(localItem.id, text);
      setLocalItem(updated);
      setNoteText("");
    } catch (err) {
      alert(`Failed to save note: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <TopBar
        crumbs={[
          { label: "Operations", to: "/" },
          { label: "Inward" },
          { label: "Purchase", to: returnTo },
          { label: localItem.shop || localItem.id },
          { label: "Lot details" },
        ]}
        mobileBack={{ to: returnTo, label: "Back" }}
        rolePill={{ label: `Stage ${localItem.currentStage} · ${STAGE_NAMES[localItem.currentStage]}`, tone: "info" }}
      />
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-16 md:px-6 md:py-5">
        <div className="mx-auto max-w-[560px] flex flex-col gap-3.5">

          {/* Source banner */}
          <div className="flex flex-wrap items-center gap-3 rounded-vv-sm border-[0.5px] border-[var(--vv-bd2)] bg-[var(--vv-bg1)] px-3 py-2.5">
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">Shop</span>
              <span className="text-[13px] font-bold text-[var(--vv-t0)]">{localItem.shop || "—"}</span>
            </div>
            <div className="h-8 w-px bg-[var(--vv-bd)]" />
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">Date</span>
              <span className="vv-mono text-[12px] text-[var(--vv-t1)]">{localItem.date}</span>
            </div>
            <div className="h-8 w-px bg-[var(--vv-bd)]" />
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">Source</span>
              <span className="text-[12px] font-semibold text-[var(--vv-t1)]">
                {SOURCE_TYPE_ICON[localItem.sourceType]} {localItem.sourceType}
              </span>
            </div>
            {localItem.sourceDetails && (
              <>
                <div className="h-8 w-px bg-[var(--vv-bd)]" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">Details</span>
                  <span className="text-[12px] text-[var(--vv-t1)]">{localItem.sourceDetails}</span>
                </div>
              </>
            )}
            <span className="ml-auto rounded border-[0.5px] border-[var(--vv-bd2)] bg-[var(--vv-bg2)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">
              Locked
            </span>
          </div>

          {/* Lot fields */}
          <div className="rounded-vv-sm border-[0.5px] border-[var(--vv-bd2)] bg-[var(--vv-bg1)] divide-y divide-[var(--vv-bd)]">
            {topRows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between px-3 py-2.5">
                <span className="text-[11px] font-semibold text-[var(--vv-t3)]">{label}</span>
                <span className="text-[13px] font-medium text-[var(--vv-t0)]">{value}</span>
              </div>
            ))}

            {/* Weighing section */}
            {hasIndividualBags ? (
              <div className="px-3 py-2.5">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-[var(--vv-t3)]">Weighing</span>
                  <span className="rounded-full bg-[var(--vv-acc-bg)] px-2 py-0.5 text-[10px] font-bold text-[var(--vv-acc)]">
                    Individual Bags
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  {localItem.bagWeights!.map((w, i) => (
                    <div key={i} className="flex items-center justify-between py-0.5">
                      <span className="text-[11px] text-[var(--vv-t3)]">Bag {i + 1}</span>
                      <span className="vv-mono text-[12px] font-medium text-[var(--vv-t0)]">{w} KG</span>
                    </div>
                  ))}
                  <div className="mt-1.5 flex items-center justify-between border-t-[0.5px] border-[var(--vv-bd2)] pt-2">
                    <span className="text-[11px] font-bold text-[var(--vv-t2)]">Total</span>
                    <span className="vv-mono text-[12px] font-bold text-[var(--vv-t0)]">
                      {localItem.bags} bag{localItem.bags !== 1 ? "s" : ""} · {localItem.kg} KG
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between px-3 py-2.5">
                  <span className="text-[11px] font-semibold text-[var(--vv-t3)]">Bags</span>
                  <span className="text-[13px] font-medium text-[var(--vv-t0)]">
                    {localItem.bags != null ? String(localItem.bags) : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between px-3 py-2.5">
                  <span className="text-[11px] font-semibold text-[var(--vv-t3)]">Lot Weight (KG)</span>
                  <span className="text-[13px] font-medium text-[var(--vv-t0)]">
                    {localItem.kg != null ? String(localItem.kg) : "—"}
                  </span>
                </div>
              </>
            )}

            {bottomRows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between px-3 py-2.5">
                <span className="text-[11px] font-semibold text-[var(--vv-t3)]">{label}</span>
                <span className="text-[13px] font-medium text-[var(--vv-t0)]">{value}</span>
              </div>
            ))}
          </div>

          {/* Lot cost breakdown */}
          {(localItem.bags ?? 0) > 0 && (() => {
            const bags = localItem.bags ?? 0;
            const kg = localItem.kg ?? 0;
            const price = localItem.price ?? 0;
            const netKg = Math.max(0, kg - bags * GUNNY_BAG_DEDUCTION_KG);
            const chilliCost = netKg * price;
            const gunnyCost = bags * GUNNY_BAG_RATE;
            const total = lotCost(localItem);
            return (
              <div className="rounded-vv-sm border-[0.5px] border-[var(--vv-acc)] bg-[var(--vv-acc-bg)] px-3 py-2.5 flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px] text-[var(--vv-acc)]">
                  <span>Net weight ({kg} − {bags}×{GUNNY_BAG_DEDUCTION_KG} KG)</span>
                  <span className="vv-mono font-semibold">{netKg.toFixed(2)} KG</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[var(--vv-acc)]">
                  <span>Chilli cost ({netKg.toFixed(2)} KG × ₹{price})</span>
                  <span className="vv-mono font-semibold">{fmtINR(chilliCost)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[var(--vv-acc)]">
                  <span>Gunny bags ({bags} × ₹{GUNNY_BAG_RATE})</span>
                  <span className="vv-mono font-semibold">+ {fmtINR(gunnyCost)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between border-t-[0.5px] border-[var(--vv-acc)] pt-2">
                  <span className="text-[12px] font-semibold text-[var(--vv-acc)]">Lot Cost</span>
                  <span className="vv-mono text-[14px] font-extrabold text-[var(--vv-acc)]">{fmtINR(total)}</span>
                </div>
              </div>
            );
          })()}

          {/* Notes timeline */}
          <div className="rounded-vv-sm border-[0.5px] border-[var(--vv-bd2)] bg-[var(--vv-bg1)]">
            <div className="border-b-[0.5px] border-[var(--vv-bd)] px-3 py-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">Notes</span>
            </div>
            {lotNotes.length === 0 ? (
              <p className="px-3 py-3 text-[12px] text-[var(--vv-t3)]">No notes yet.</p>
            ) : (
              <div className="flex flex-col divide-y divide-[var(--vv-bd)]">
                {lotNotes.map((n, i) => (
                  <div key={i} className="px-3 py-2.5 text-[11px] leading-snug">
                    <span className="vv-mono text-[9px] text-[var(--vv-t3)]">{fmtDateTime(n.at)}</span>
                    <p className="mt-0.5 text-[var(--vv-t1)]">{n.text}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Add note */}
            <div className="border-t-[0.5px] border-[var(--vv-bd)] px-3 py-2.5">
              <div className="flex gap-2 items-end">
                <textarea
                  ref={textareaRef}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add a note…"
                  rows={2}
                  className="min-h-[52px] flex-1 resize-none rounded-vv-sm border-[0.5px] border-[var(--vv-bd2)] bg-[var(--vv-bg0)] px-3 py-2 text-[12px] font-medium leading-[1.5] text-[var(--vv-t0)] transition-all focus:border-[var(--vv-acc)] focus:outline-none focus:ring-2 focus:ring-[var(--vv-acc-bg)]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAddNote();
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={!noteText.trim() || saving}
                  onClick={handleAddNote}
                >
                  <Send size={13} />
                  {saving ? "Saving…" : "Add"}
                </Button>
              </div>
            </div>
          </div>

          <Button type="button" variant="ghost" size="md" onClick={() => navigate(returnTo)}>
            <ArrowLeft size={14} /> Back
          </Button>
        </div>
      </div>
    </>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function EditPurchaseItemPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const shopOnly = searchParams.get("shopOnly") === "true";
  const returnTo: string = (location.state as { returnTo?: string } | null)?.returnTo ?? "/purchase";
  const { getItem, updateItem, addNote } = usePurchaseStore();
  const { varieties, fetchVarieties } = useSetupStore();
  useEffect(() => { fetchVarieties(); }, []);

  const [item, setItem] = useState<PurchaseItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Always fetch fresh from API — ensures notes and other jsonb fields are
  // up-to-date. Use the store item immediately so the form has data to render,
  // then overwrite with the fresh API response (including the latest notes).
  useEffect(() => {
    if (!id) return;
    // Seed from store so the form renders instantly without a blank state
    const stored = getItem(id);
    if (stored) setItem(stored);
    else setLoading(true);

    // Fresh fetch always runs — guarantees notes are current
    purchasesApi
      .get(id)
      .then((raw) => {
        setItem({
          id: raw.id,
          date: raw.date,
          sourceType: raw.sourceType as SourceType,
          shop: raw.shop,
          sourceDetails: raw.sourceDetails,
          variety: raw.variety as Variety,
          type: raw.type,
          mark: raw.mark as Mark,
          bags: Number(raw.bags),
          kg: Number(raw.kg),
          price: Number(raw.price),
          bagWeights: raw.bagWeights ?? undefined,
          destination: raw.destination as Destination,
          destinationDetails: raw.destinationDetails,
          dispatchDeadline: raw.dispatchDeadline,
          currentStage: raw.currentStage as PurchaseItem["currentStage"],
          probability: raw.probability as PurchaseItem["probability"],
          isRejected: raw.isRejected,
          notes: (raw.notes ?? []) as PurchaseItem["notes"],
          stageEnteredAt: raw.stageEnteredAt as PurchaseItem["stageEnteredAt"],
          stageAssignee: raw.stageAssignee as PurchaseItem["stageAssignee"],
          accountsStatus: raw.accountsStatus as PurchaseItem["accountsStatus"],
          createdAt: raw.createdAt,
        });
      })
      .catch((e) => { if (!stored) setFetchError(e.message); })
      .finally(() => setLoading(false));
  }, [id]); // intentionally omit getItem — only re-run when id changes

  // ── Edit mode state ────────────────────────────────────────────────────────

  const [draft, setDraft] = useState<DraftState | null>(null);
  const [remarksText, setRemarksText] = useState("");
  const [editBagWeights, setEditBagWeights] = useState<string[] | undefined>(undefined);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  // Initialise draft once item loads (all stages — source fields are locked via UI for stage > 1)
  useEffect(() => {
    if (item && draft === null) {
      setDraft(itemToDraft(item));
      // Restore individual bag weights if stored.
      // Default to individual bags mode ([""] = one empty row) rather than
      // weigh bridge, so the weighing team starts in the right mode.
      setEditBagWeights(
        item.bagWeights && item.bagWeights.length > 0
          ? item.bagWeights.map(String)
          : [""],
      );
    }
  }, [item, draft]);

  const checks = useMemo(
    () => (draft ? validate(draft) : []),
    [draft]
  );
  const allValid = checks.every((c) => c.ok);

  const set = <K extends keyof DraftState>(key: K, value: DraftState[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  // Source-type card options — used only in shopOnly (stage 1) mode
  const sourceTypeOptions: CardOption<SourceType>[] = SOURCE_TYPES.map(
    (s) => ({
      value: s,
      label: s,
      subtitle: SOURCE_TYPE_SUBTITLE[s],
      icon: SOURCE_TYPE_ICON[s],
      color: SOURCE_TYPE_COLOR[s],
    })
  );

  // ── Loading / error states ─────────────────────────────────────────────────

  if (loading) {
    return (
      <>
        <TopBar
          crumbs={[
            { label: "Operations", to: "/" },
            { label: "Inward" },
            { label: "Purchase", to: returnTo },
            { label: "Loading…" },
          ]}
          mobileBack={{ to: returnTo, label: "Back" }}
        />
        <div className="flex flex-1 items-center justify-center text-[13px] text-[var(--vv-t2)]">
          Loading…
        </div>
      </>
    );
  }

  if (fetchError || !item) {
    return (
      <>
        <TopBar
          crumbs={[
            { label: "Operations", to: "/" },
            { label: "Inward" },
            { label: "Purchase", to: returnTo },
            { label: "Not found" },
          ]}
          mobileBack={{ to: returnTo, label: "Back" }}
        />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-[13px] text-[var(--vv-t2)]">
          <p>{fetchError ?? "Purchase item not found."}</p>
          <Button variant="ghost" size="sm" onClick={() => navigate(returnTo)}>
            <ArrowLeft size={14} /> Back to list
          </Button>
        </div>
      </>
    );
  }

  // Source fields are locked once the purchase moves past stage 1
  const sourceEditable = item.currentStage === 1;
  // Lot fields are locked once past stage 3 (Weighing) OR if the lot is rejected.
  const lotEditable = item.currentStage <= 3 && !item.isRejected;

// ── VIEW-ONLY MODE (stage 4+, or rejected) ────────────────────────────────

  if (!lotEditable) {
    return <LotViewPage item={item} returnTo={returnTo} />;
  }

// ── EDIT FORM (stage 1–3) ──────────────────────────────────────────────────

  if (!draft) return null;

  // ── SHOP-ONLY MODE: edit Date / Source Type / Shop only (stage 1 only) ──────
  // Source info is locked once the purchase moves past stage 1 — redirect away.
  if (shopOnly && !sourceEditable) {
    navigate(returnTo, { replace: true });
    return null;
  }

  if (shopOnly) {
    const handleShopSave = async () => {
      if (!draft) return;
      setSaving(true);
      try {
        // Update this item's source fields; all lots share same shop/date/sourceType
        await updateItem(item.id, {
          date: draft.date,
          sourceType: draft.sourceType as SourceType,
          shop: draft.shop.trim(),
          sourceDetails: draft.sourceDetails.trim() || undefined,
          variety: item.variety,
          type: item.type,
          mark: item.mark,
          bags: item.bags,
          kg: item.kg,
          price: item.price,
          destination: item.destination,
          destinationDetails: item.destinationDetails || undefined,
          dispatchDeadline: item.dispatchDeadline,
        });
        navigate(returnTo);
      } catch (err) {
        alert(`Save failed: ${(err as Error).message}`);
      } finally {
        setSaving(false);
      }
    };

    return (
      <>
        <TopBar
          crumbs={[
            { label: "Operations", to: "/" },
            { label: "Inward" },
            { label: "Purchase", to: returnTo },
            { label: item.shop || item.id },
            { label: "Edit Shop" },
          ]}
          mobileBack={{ to: returnTo, label: "Back" }}
          rolePill={{ label: "Edit Source Info", tone: "accent" }}
        />
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-32 md:px-6 md:py-5 md:pb-6">
          <div className="mx-auto max-w-[560px] flex flex-col gap-3.5">

            <SectionCard num={1} title="Source" subtitle="Date, source type and shop name">
              <FieldShell label="Purchase date" required>
                <TextInput
                  type="date"
                  value={draft.date}
                  onChange={(e) => set("date", e.target.value)}
                />
              </FieldShell>

              <FieldShell label="Source type" required hint="Where is this purchase happening?">
                <CardPicker
                  options={sourceTypeOptions}
                  value={draft.sourceType}
                  onChange={(v) => { set("sourceType", v); set("shop", ""); set("sourceDetails", ""); }}
                />
              </FieldShell>

              {draft.sourceType === "Yard" && (
                <FieldShell label="Shop / mandi" required>
                  <TextInput
                    placeholder="e.g. Sri Lakshmi Traders"
                    value={draft.shop}
                    onChange={(e) => set("shop", e.target.value)}
                  />
                </FieldShell>
              )}

              {draft.sourceType && draft.sourceType !== "Yard" && (
                <>
                  <FieldShell label="Name" required>
                    <TextInput
                      placeholder="e.g. Sri Lakshmi Traders"
                      value={draft.shop}
                      onChange={(e) => set("shop", e.target.value)}
                    />
                  </FieldShell>
                  <FieldShell label="Source additional details" hint="e.g. agent name, farm address">
                    <textarea
                      className="min-h-[72px] w-full rounded-vv-sm border-[0.5px] border-[var(--vv-bd2)] bg-[var(--vv-bg0)] px-3 py-2.5 text-[13px] font-medium leading-[1.5] text-[var(--vv-t0)] transition-all focus:border-[var(--vv-acc)] focus:outline-none focus:ring-2 focus:ring-[var(--vv-acc-bg)]"
                      placeholder="e.g. Raju Reddy, Ongole Road…"
                      value={draft.sourceDetails}
                      onChange={(e) => set("sourceDetails", e.target.value)}
                    />
                  </FieldShell>
                </>
              )}
            </SectionCard>

            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="md" className="flex-1" onClick={() => navigate(returnTo)}>
                Cancel
              </Button>
              <Button type="button" size="md" className="flex-1" disabled={saving} onClick={handleShopSave}>
                <Save size={14} />
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── LOT EDIT MODE: edit lot details only ──────────────────────────────────

  // Map DraftState ↔ LotDraft for LotForm
  const lotDraft: LotDraft = {
    variety: draft.variety,
    type: draft.type,
    mark: draft.mark,
    bags: draft.bags,
    kg: draft.kg,
    price: draft.price,
    gunnyBagDeductionKg: draft.gunnyBagDeductionKg,
    gunnyBagRatePerBag: draft.gunnyBagRatePerBag,
    destination: draft.destination,
    destinationDetails: draft.destinationDetails,
    dispatchDeadline: draft.dispatchDeadline,
    remarks: remarksText,
    bagWeights: editBagWeights,
  };

  const handleLotChange = <K extends keyof LotDraft>(k: K, v: LotDraft[K]) => {
    if (k === "remarks") {
      setRemarksText(v as string);
    } else if (k === "bagWeights") {
      setEditBagWeights(v as string[] | undefined);
    } else {
      setDraft((d) => d ? { ...d, [k]: v } : d);
    }
  };

  const handleSave = async () => {
    setTouched(true);
    if (!allValid) return;
    setSaving(true);
    try {
      await updateItem(item.id, {
        // Source fields — editable at stage 1 only; for stage 2–3 pass the
        // existing item values so the DTO validation passes (the service
        // ignores them when currentStage > 1).
        date: sourceEditable ? draft.date : item.date,
        sourceType: (sourceEditable ? draft.sourceType : item.sourceType) as SourceType,
        shop: sourceEditable ? draft.shop.trim() : (item.shop ?? ""),
        sourceDetails: sourceEditable
          ? (draft.sourceType !== "Yard" ? draft.sourceDetails.trim() || undefined : undefined)
          : item.sourceDetails,
        variety: draft.variety as Variety,
        type: draft.type.trim(),
        mark: draft.mark as Mark,
        bags: parseFloat(draft.bags) || 0,
        kg: parseFloat(draft.kg) || 0,
        price: parseFloat(draft.price) || 0,
        bagWeights: editBagWeights
          ? editBagWeights.map(w => parseFloat(w)).filter(n => n > 0)
          : undefined,
        destination: draft.destination as Destination,
        destinationDetails: draft.destinationDetails.trim() || undefined,
        dispatchDeadline: draft.dispatchDeadline,
        remark: remarksText.trim() || undefined,
      });
      navigate(returnTo);
    } catch (err) {
      alert(`Save failed: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <TopBar
        crumbs={[
          { label: "Operations", to: "/" },
          { label: "Inward" },
          { label: "Purchase", to: returnTo },
          { label: item.shop || item.id },
          { label: "Edit Lot" },
        ]}
        mobileBack={{ to: returnTo, label: "Back" }}
        rolePill={{
          label: `Stage ${item.currentStage} · ${STAGE_NAMES[item.currentStage]}`,
          tone: item.currentStage === 1 ? "accent" : "info",
        }}
      />

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-32 md:px-6 md:py-5 md:pb-6">
        <div className="mx-auto max-w-[680px] flex flex-col gap-3">

          {/* Source banner — always read-only; locked icon shown when stage > 1 */}
          <div className="flex flex-wrap items-center gap-3 rounded-vv-sm border-[0.5px] border-[var(--vv-bd2)] bg-[var(--vv-bg1)] px-3 py-2.5">
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">Shop</span>
              <span className="text-[13px] font-bold text-[var(--vv-t0)]">{item.shop || "—"}</span>
            </div>
            <div className="h-8 w-px bg-[var(--vv-bd)]" />
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">Date</span>
              <span className="vv-mono text-[12px] text-[var(--vv-t1)]">{item.date}</span>
            </div>
            <div className="h-8 w-px bg-[var(--vv-bd)]" />
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">Source</span>
              <span className="text-[12px] font-semibold text-[var(--vv-t1)]">
                {SOURCE_TYPE_ICON[item.sourceType]} {item.sourceType}
              </span>
            </div>
            {item.sourceDetails && (
              <>
                <div className="h-8 w-px bg-[var(--vv-bd)]" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">Details</span>
                  <span className="text-[12px] text-[var(--vv-t1)]">{item.sourceDetails}</span>
                </div>
              </>
            )}
            {!sourceEditable && (
              <span className="ml-1 rounded border-[0.5px] border-[var(--vv-bd2)] bg-[var(--vv-bg2)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">
                Locked
              </span>
            )}
            <button
              type="button"
              onClick={() => navigate(returnTo)}
              className="ml-auto text-[11px] font-semibold text-[var(--vv-t3)] hover:text-[var(--vv-t1)]"
            >
              Cancel
            </button>
          </div>

          {/* Lot notes only — shows notes entered at creation or on previous edits.
              Stage/workflow notes are NEVER shown at the lot level. */}
          {(() => {
            const lotNotes = item.notes.filter(isLotNote);
            if (lotNotes.length === 0) return null;
            return (
              <div className="rounded-vv-sm border-[0.5px] border-[var(--vv-bd2)] bg-[var(--vv-bg1)] px-3 py-2.5">
                <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">
                  Lot notes
                </div>
                <div className="flex flex-col gap-1.5">
                  {lotNotes.map((n, i) => (
                    <div key={i} className="text-[11px] leading-snug">
                      <span className="vv-mono text-[9px] text-[var(--vv-t3)]">
                        ({fmtDateTime(n.at)}):
                      </span>{" "}
                      <span className="text-[var(--vv-t2)]">{n.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Lot form — same UI as lot creation */}
          <LotForm
            idx={0}
            lot={lotDraft}
            totalLots={1}
            touched={touched}
            varieties={varieties}
            currentStage={item.currentStage}
            onChange={handleLotChange}
            onSave={handleSave}
            onCollapse={() => navigate(returnTo)}
            onRemove={() => navigate(returnTo)}
          />

          {saving && (
            <p className="text-center text-[12px] text-[var(--vv-t2)]">Saving…</p>
          )}
        </div>
      </div>
    </>
  );
}
