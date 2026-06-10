import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, ChevronDown, Plus, Save, Search } from "lucide-react";

import { TopBar } from "@/layouts/TopBar";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { SectionCard } from "@/components/SectionCard";
import { FieldShell, TextInput } from "@/components/Field";
import { VarietyDot } from "@/components/VarietyDot";
import { cn } from "@/lib/cn";
import { fmtIN, fmtINR, todayISO } from "@/lib/format";
import {
  SOURCE_TYPES, SOURCE_TYPE_COLOR, SOURCE_TYPE_ICON, SOURCE_TYPE_SUBTITLE,
  type SourceType, type Destination,
} from "@/types/domain";
import { usePurchaseStore } from "./store";
import { useSetupStore } from "@/features/setup/store";
import { CardPicker, type CardOption } from "./CardPicker";
import {
  LotForm,
  emptyLot, defaultDeadline, chkLot, chkLot as chkLotFn,
  type LotDraft,
} from "./LotForm";

// ── Shop name localStorage (keyed by source type) ─────────────────────────────

const SHOP_KEY = "vv-shop-names";

type ShopStore = Record<string, string[]>; // { "Agri Form": ["Sri Lakshmi", ...], ... }

function loadShops(sourceType: string): string[] {
  try {
    const raw = localStorage.getItem(SHOP_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Migrate old flat string[] format → clear and start fresh (source type unknown)
    if (Array.isArray(parsed)) {
      localStorage.removeItem(SHOP_KEY);
      return [];
    }
    const all: ShopStore = parsed;
    return Array.isArray(all[sourceType]) ? all[sourceType] : [];
  } catch { return []; }
}

function persistShop(name: string, sourceType: string) {
  const t = name.trim();
  if (!t || !sourceType) return;
  try {
    const raw = localStorage.getItem(SHOP_KEY);
    const all: ShopStore = raw ? JSON.parse(raw) : {};
    const existing = Array.isArray(all[sourceType]) ? all[sourceType] : [];
    if (!existing.includes(t)) {
      all[sourceType] = [t, ...existing].slice(0, 200);
      localStorage.setItem(SHOP_KEY, JSON.stringify(all));
    }
  } catch {}
}

// ── Shop name searchable combobox ─────────────────────────────────────────────
// Uses position:fixed so it escapes any overflow-hidden ancestor (e.g. SectionCard).

function ShopCombobox({ value, onChange, sourceType, error }: {
  value: string;
  onChange: (v: string) => void;
  sourceType: string;
  error?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [allShops, setAllShops] = useState<string[]>([]);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    return (q ? allShops.filter(s => s.toLowerCase().includes(q)) : allShops).slice(0, 8);
  }, [value, allShops]);

  const openDropdown = () => {
    if (wrapRef.current) setRect(wrapRef.current.getBoundingClientRect());
    setAllShops(loadShops(sourceType));
    setOpen(true);
  };

  // Recalculate position on scroll/resize while open
  useEffect(() => {
    if (!open) return;
    const update = () => {
      if (wrapRef.current) setRect(wrapRef.current.getBoundingClientRect());
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={value}
          placeholder="Type to search or enter new shop name..."
          onChange={e => { onChange(e.target.value); openDropdown(); }}
          onFocus={openDropdown}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className={cn(
            "w-full rounded-vv-sm border-[0.5px] bg-[var(--vv-bg0)] py-2.5 pl-3 pr-8",
            "text-[13px] font-medium leading-[1.4] text-[var(--vv-t0)] transition-all",
            "focus:outline-none focus:ring-2 focus:ring-[var(--vv-acc-bg)]",
            error
              ? "border-[var(--vv-dan-bd)] bg-[var(--vv-dan-bg)] focus:border-[var(--vv-dan-bd)]"
              : "border-[var(--vv-bd2)] focus:border-[var(--vv-acc)]"
          )}
        />
        <Search size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--vv-t3)]" />
      </div>

      {/* Fixed-position dropdown — escapes SectionCard's overflow-hidden */}
      {open && rect && (
        <div
          style={{
            position: "fixed",
            top: rect.bottom + 4,
            left: rect.left,
            width: rect.width,
            zIndex: 9999,
          }}
          className="overflow-hidden rounded-vv-sm border-[0.5px] border-[var(--vv-bd2)] bg-[var(--vv-bg0)] shadow-xl"
        >
          {filtered.length > 0 ? (
            <ul className="max-h-60 overflow-y-auto py-1">
              {filtered.map(s => (
                <li key={s}>
                  <button
                    type="button"
                    onMouseDown={() => { onChange(s); setOpen(false); }}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2.5 text-left",
                      "text-[13px] font-medium text-[var(--vv-t0)] hover:bg-[var(--vv-bg1)]",
                      s === value && "bg-[var(--vv-acc-bg)] font-semibold"
                    )}
                  >
                    <span className="flex-1 truncate">{s}</span>
                    {s === value && <Check size={12} strokeWidth={3} className="shrink-0 text-[var(--vv-acc)]" />}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-3 py-3 text-[12px] text-[var(--vv-t3)]">
              {value.trim()
                ? `"${value.trim()}" — new shop under ${sourceType || "this source"}, saved on completion`
                : `No saved shops for ${sourceType || "this source type"} yet.`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Types & validation ────────────────────────────────────────────────────────

interface PurchaseHeader {
  date: string; sourceType: SourceType | ""; shop: string; sourceDetails: string;
}

interface ChkItem { key: string; label: string; ok: boolean; }

function chkHeader(h: PurchaseHeader): ChkItem[] {
  return [
    { key: "date",       label: "Purchase date",        ok: !!h.date },
    { key: "sourceType", label: "Source type",           ok: !!h.sourceType },
    { key: "shop",       label: "Shop / name (>= 2 ch)", ok: !h.sourceType || h.shop.trim().length >= 2 },
  ];
}

// ── CheckRow (sidebar) ────────────────────────────────────────────────────────

function CheckRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-[11px]">
      <span className={ok
        ? "flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--vv-suc)] text-white"
        : "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-[1.5px] border-[var(--vv-bd2)]"
      }>
        {ok && <Check size={10} strokeWidth={3} />}
      </span>
      <span className={ok ? "font-semibold text-[var(--vv-t1)]" : "text-[var(--vv-t3)]"}>{label}</span>
    </li>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function NewPurchaseItemPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const addItem = usePurchaseStore(s => s.addItem);
  const setFilters = usePurchaseStore(s => s.setFilters);
  const { varieties, fetchVarieties } = useSetupStore();
  useEffect(() => { fetchVarieties(); }, []);

  // Pre-fill from query params when navigating from "Add Lot" button on group card
  const prefillShop = searchParams.get("shop") ?? "";
  const prefillSourceType = searchParams.get("sourceType") ?? "";
  const prefillDate = searchParams.get("date") ?? todayISO();
  const prefillStage = parseInt(searchParams.get("stage") ?? "1", 10);
  // addLotMode = came from a group card's "Add Lot" button — source is locked
  const addLotMode = !!(prefillShop && prefillSourceType);

  const [header, setHeader] = useState<PurchaseHeader>({
    date: prefillDate,
    sourceType: prefillSourceType as SourceType | "",
    shop: prefillShop,
    sourceDetails: "",
  });
  const [lots, setLots] = useState<LotDraft[]>([emptyLot()]);
  const [expandedIdx, setExpandedIdx] = useState<number>(0);
  const [headerTouched, setHeaderTouched] = useState(false);
  const [lotTouched, setLotTouched] = useState<boolean[]>([false]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const setH = <K extends keyof PurchaseHeader>(k: K, v: PurchaseHeader[K]) =>
    setHeader(h => ({ ...h, [k]: v }));

  const setL = <K extends keyof LotDraft>(i: number, k: K, v: LotDraft[K]) =>
    setLots(ls => ls.map((l, j) => j === i ? { ...l, [k]: v } : l));

  const headerChecks = useMemo(() => chkHeader(header), [header]);
  const lotsChecks = useMemo(() => lots.map(l => chkLot(l)), [lots]);

  const saveLot = (idx: number) => {
    setLotTouched(t => t.map((v, i) => i === idx ? true : v));
    if (!chkLot(lots[idx]).every(c => c.ok)) return;
    setExpandedIdx(-1);
  };

  const addLot = () => {
    const newIdx = lots.length;
    setLots(ls => [...ls, emptyLot()]);
    setLotTouched(t => [...t, false]);
    setExpandedIdx(newIdx);
  };

  const removeLot = (idx: number) => {
    setLots(ls => ls.filter((_, i) => i !== idx));
    setLotTouched(t => t.filter((_, i) => i !== idx));
    setExpandedIdx(prev => prev === idx ? -1 : prev > idx ? prev - 1 : prev);
  };

  const toggleExpand = (idx: number) =>
    setExpandedIdx(prev => prev === idx ? -1 : idx);

  const completePurchase = async (e: FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setHeaderTouched(true);
    setLotTouched(lots.map(() => true));

    const hChecks = chkHeader(header);
    if (!addLotMode && !hChecks.every(c => c.ok)) return;

    const lChecks = lots.map(l => chkLotFn(l));
    if (!lChecks.every(cs => cs.every(c => c.ok))) {
      const firstBad = lChecks.findIndex(cs => !cs.every(c => c.ok));
      if (firstBad >= 0) setExpandedIdx(firstBad);
      return;
    }

    setSaving(true);
    try {
      persistShop(header.shop, header.sourceType);
      for (const lot of lots) {
        await addItem({
          date: header.date,
          sourceType: header.sourceType as SourceType,
          shop: header.shop.trim(),
          sourceDetails: header.sourceType !== "Yard" ? header.sourceDetails.trim() || undefined : undefined,
          variety: lot.variety as any,
          type: lot.type.trim(),
          mark: lot.mark as any,
          bags: lot.bags ? parseFloat(lot.bags) : undefined,
          kg: lot.kg ? parseFloat(lot.kg) : undefined,
          price: parseFloat(lot.price),
          bagWeights: lot.bagWeights
            ? lot.bagWeights.map(w => parseFloat(w)).filter(n => n > 0)
            : undefined,
          destination: lot.destination ? lot.destination as Destination : undefined,
          destinationDetails: lot.destinationDetails.trim() || undefined,
          dispatchDeadline: lot.dispatchDeadline || undefined,
          initialNote: lot.remarks.trim() || undefined,
          initialStage: addLotMode ? prefillStage : undefined,
        });
      }
      setFilters({ dateMode: "single", singleDate: header.date });
      navigate("/purchase");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSaveError(msg);
      console.error("[completePurchase] API error:", err);
    } finally {
      setSaving(false);
    }
  };

  const srcTypeOpts: CardOption<SourceType>[] = SOURCE_TYPES.map(s => ({
    value: s, label: s, subtitle: SOURCE_TYPE_SUBTITLE[s],
    icon: SOURCE_TYPE_ICON[s], color: SOURCE_TYPE_COLOR[s],
  }));

  const grandTotal = lots.reduce((s, l) => {
    const kg = parseFloat(l.kg) || 0;
    const bags = parseFloat(l.bags) || 0;
    const price = parseFloat(l.price) || 0;
    const deduction = parseFloat(l.gunnyBagDeductionKg) || 0;
    const gunnyRate = parseFloat(l.gunnyBagRatePerBag) || 0;
    const netKg = Math.max(0, kg - bags * deduction);
    return s + netKg * price + bags * gunnyRate;
  }, 0);
  const totalBags = lots.reduce((s, l) => s + (parseFloat(l.bags) || 0), 0);
  const completeLabel = saving
    ? "Saving..."
    : lots.length > 1 ? `Complete (${lots.length} lots)` : "Complete Purchase";

  return (
    <>
      <TopBar
        crumbs={[
          { label: "Operations", to: "/" },
          { label: "Inward" },
          { label: "Purchase", to: "/purchase" },
          { label: addLotMode ? `Add Lot — ${prefillShop}` : "New purchase" },
        ]}
        mobileBack={{ to: "/purchase", label: "Purchase" }}
        rolePill={{ label: "Stage 1", tone: "accent" }}
      />

      <form onSubmit={completePurchase}
        className="flex-1 overflow-y-auto px-4 py-4 pb-32 md:px-6 md:py-5 md:pb-6">

        {saveError && (
          <div className="mb-4 max-w-[1100px] rounded-vv-md border-[0.5px] border-[var(--vv-dan-bd)] bg-[var(--vv-dan-bg)] px-4 py-3">
            <p className="text-[12px] font-bold text-[var(--vv-dan)]">Failed to save purchase</p>
            <p className="mt-0.5 text-[11px] text-[var(--vv-dan)]">{saveError}</p>
          </div>
        )}

        <div className="grid max-w-[1100px] grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex flex-col gap-3.5">

            {/* ── Section 1: Purchase header ── */}
            {addLotMode ? (
              /* Locked source banner — shown when adding a lot to an existing shop visit */
              <div className="flex items-center gap-3 rounded-vv-md border-[0.5px] border-[var(--vv-bd2)] bg-[var(--vv-bg1)] px-4 py-3">
                <span className="text-[18px]">{SOURCE_TYPE_ICON[prefillSourceType as SourceType]}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-bold text-[var(--vv-t0)]">{prefillShop}</div>
                  <div className="text-[11px] text-[var(--vv-t2)]">
                    {prefillSourceType} · {prefillDate}
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-[var(--vv-bg2)] px-2 py-0.5 text-[10px] font-bold text-[var(--vv-t3)]">
                  Source locked
                </span>
              </div>
            ) : (
              <SectionCard num={1} title="Source" required subtitle="Shared across all lots">
                <FieldShell label="Purchase date" required>
                  <TextInput type="date" value={header.date}
                    onChange={e => setH("date", e.target.value)}
                    error={headerTouched && !headerChecks.find(c => c.key === "date")!.ok} />
                </FieldShell>

                <FieldShell label="Source type" required hint="Where is this purchase happening?">
                  <CardPicker
                    options={srcTypeOpts}
                    value={header.sourceType}
                    onChange={v => { setH("sourceType", v); setH("shop", ""); setH("sourceDetails", ""); }}
                  />
                </FieldShell>

                {header.sourceType && (
                  <>
                    <FieldShell
                      label={header.sourceType === "Yard" ? "Shop / mandi" : "Name"}
                      required
                      hint={`Shows shops previously used for ${header.sourceType}`}
                    >
                      <ShopCombobox
                        value={header.shop}
                        onChange={v => setH("shop", v)}
                        sourceType={header.sourceType}
                        error={headerTouched && !headerChecks.find(c => c.key === "shop")!.ok}
                      />
                    </FieldShell>

                    {header.sourceType !== "Yard" && (
                      <FieldShell label="Source additional details" hint="e.g. agent name, farm address">
                        <textarea
                          className="min-h-[72px] w-full rounded-vv-sm border-[0.5px] border-[var(--vv-bd2)] bg-[var(--vv-bg0)] px-3 py-2.5 text-[13px] font-medium leading-[1.5] text-[var(--vv-t0)] transition-all focus:border-[var(--vv-acc)] focus:outline-none focus:ring-2 focus:ring-[var(--vv-acc-bg)]"
                          placeholder="e.g. Raju Reddy, Ongole Road, near APMC gate..."
                          value={header.sourceDetails}
                          onChange={e => setH("sourceDetails", e.target.value)}
                        />
                      </FieldShell>
                    )}
                  </>
                )}
              </SectionCard>
            )}

            {/* ── Lots ── */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 px-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--vv-t2)]">Lots</span>
                <span className="rounded-full bg-[var(--vv-bg2)] px-2 py-0.5 text-[10px] font-bold text-[var(--vv-t2)]">
                  {lots.length}
                </span>
              </div>

              {lots.map((lot, idx) => {
                const isExpanded = expandedIdx === idx;
                const touched = lotTouched[idx] ?? false;
                const checks = lotsChecks[idx];
                const showError = touched && !checks.every(c => c.ok);

                if (isExpanded) {
                  return (
                    <LotForm
                      key={idx}
                      idx={idx}
                      lot={lot}
                      totalLots={lots.length}
                      touched={touched}
                      varieties={varieties}
                      onChange={(k, v) => setL(idx, k, v)}
                      onSave={() => saveLot(idx)}
                      onCollapse={() => setExpandedIdx(-1)}
                      onRemove={() => removeLot(idx)}
                    />
                  );
                }

                const v = varieties.find(x => x.name === lot.variety);
                const lotBags = parseFloat(lot.bags) || 0;
                const lotKg = parseFloat(lot.kg) || 0;
                const lotPrice = parseFloat(lot.price) || 0;
                const lotDeduction = parseFloat(lot.gunnyBagDeductionKg) || 0;
                const lotGunnyRate = parseFloat(lot.gunnyBagRatePerBag) || 0;
                const lotNetKg = Math.max(0, lotKg - lotBags * lotDeduction);
                const lotTotal = lotNetKg * lotPrice + lotBags * lotGunnyRate;

                return (
                  <div
                    key={idx}
                    role="button"
                    tabIndex={0}
                    onClick={() => setExpandedIdx(idx)}
                    onKeyDown={e => e.key === "Enter" && setExpandedIdx(idx)}
                    className={cn(
                      "flex cursor-pointer select-none items-center gap-3 rounded-vv-md border-[0.5px] px-4 py-3",
                      "outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--vv-acc)]",
                      showError
                        ? "border-[var(--vv-dan-bd)] bg-[var(--vv-dan-bg)]"
                        : "border-[var(--vv-bd2)] bg-[var(--vv-bg0)] hover:border-[var(--vv-bd1)] hover:bg-[var(--vv-bg1)]"
                    )}
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--vv-bg2)] text-[11px] font-bold text-[var(--vv-t2)]">
                      {idx + 1}
                    </div>

                    {lot.variety
                      ? <VarietyDot variety={lot.variety as any} color={v?.color} size={8} />
                      : <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--vv-bd2)]" />
                    }

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-bold text-[var(--vv-t0)]">
                        {lot.variety
                          ? [lot.variety, lot.type, lot.mark].filter(Boolean).join(" · ")
                          : "Lot not configured — click to expand"}
                      </div>
                      <div className="mt-0.5 flex flex-wrap gap-x-2.5 text-[11px] text-[var(--vv-t2)]">
                        {lotBags > 0 && <span>{fmtIN(lotBags)} bags</span>}
                        {lotKg > 0 && <span>{lotKg} KG</span>}
                        {lotPrice > 0 && <span>Rs.{lotPrice}/KG</span>}
                        {lotTotal > 0 && <span className="font-semibold text-[var(--vv-t0)]">= {fmtINR(lotTotal)}</span>}
                        {lot.destination && <span>to {lot.destination}</span>}
                      </div>
                    </div>

                    {showError && (
                      <span className="shrink-0 text-[10px] font-bold text-[var(--vv-dan)]">Incomplete</span>
                    )}

                    {lots.length > 1 && (
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); removeLot(idx); }}
                        className="shrink-0 rounded p-1 text-[var(--vv-t3)] transition-colors hover:text-[var(--vv-dan)]"
                        title="Remove lot"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                        </svg>
                      </button>
                    )}

                    <ChevronDown size={16} className="shrink-0 text-[var(--vv-t3)]" />
                  </div>
                );
              })}

              {!addLotMode && (
                <button
                  type="button"
                  onClick={addLot}
                  className="flex items-center gap-2 rounded-vv-md border-[1.5px] border-dashed border-[var(--vv-bd2)] px-4 py-3 text-[13px] font-semibold text-[var(--vv-t2)] transition-colors hover:border-[var(--vv-acc)] hover:text-[var(--vv-acc)]"
                >
                  <Plus size={15} />
                  Add another lot
                </button>
              )}
            </div>

            {/* Mobile actions */}
            <div className="flex gap-2 pt-1 lg:hidden">
              <Button type="button" variant="ghost" size="md" fullWidth onClick={() => navigate("/purchase")}>
                <ArrowLeft size={14} /> Cancel
              </Button>
              <Button type="submit" size="md" fullWidth disabled={saving}>
                <Save size={14} /> {completeLabel}
              </Button>
            </div>
          </div>

          {/* ── Sidebar ── */}
          <aside className="hidden lg:block">
            <div className="sticky top-4 flex flex-col gap-3">

              <Card padding="md">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--vv-t2)]">Purchase summary</div>
                <div className="mb-0.5 truncate text-[13px] font-bold text-[var(--vv-t0)]">
                  {header.shop || "Shop name..."}
                </div>
                <div className="vv-mono mb-3 text-[10px] text-[var(--vv-t2)]">
                  {header.date}
                  {header.sourceType ? ` · ${SOURCE_TYPE_ICON[header.sourceType as SourceType]} ${header.sourceType}` : ""}
                  {` · ${lots.length} lot${lots.length !== 1 ? "s" : ""}`}
                </div>

                <div className="flex flex-col gap-1.5">
                  {lots.map((lot, idx) => {
                    const v = varieties.find(x => x.name === lot.variety);
                    const lotKg = parseFloat(lot.kg) || 0;
                    const lotBagsN = parseFloat(lot.bags) || 0;
                    const lotPrice = parseFloat(lot.price) || 0;
                    const lotDeductionN = parseFloat(lot.gunnyBagDeductionKg) || 0;
                    const lotGunnyRateN = parseFloat(lot.gunnyBagRatePerBag) || 0;
                    const lotNetKgN = Math.max(0, lotKg - lotBagsN * lotDeductionN);
                    const lotSidebarTotal = lotNetKgN * lotPrice + lotBagsN * lotGunnyRateN;
                    return (
                      <button key={idx} type="button" onClick={() => toggleExpand(idx)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
                          expandedIdx === idx ? "bg-[var(--vv-acc-bg)]" : "bg-[var(--vv-bg1)] hover:bg-[var(--vv-bg2)]"
                        )}
                      >
                        <span className="text-[10px] font-bold text-[var(--vv-t3)]">#{idx + 1}</span>
                        {lot.variety
                          ? <VarietyDot variety={lot.variety as any} color={v?.color} size={6} />
                          : <span className="h-1.5 w-1.5 rounded-full bg-[var(--vv-bd2)]" />
                        }
                        <span className="flex-1 truncate text-[11px] font-medium text-[var(--vv-t0)]">
                          {lot.variety || "—"}{lot.type ? ` · ${lot.type}` : ""}{lot.mark ? ` · ${lot.mark}` : ""}
                        </span>
                        {lotSidebarTotal > 0 && (
                          <span className="vv-mono shrink-0 text-[10px] text-[var(--vv-t2)]">
                            {fmtINR(lotSidebarTotal)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {grandTotal > 0 && (
                  <div className="mt-3 flex items-center justify-between border-t-[0.5px] border-[var(--vv-bd2)] pt-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">Grand total</span>
                    <span className="vv-mono text-[13px] font-extrabold text-[var(--vv-acc)]">{fmtINR(grandTotal)}</span>
                  </div>
                )}
                {totalBags > 0 && (
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--vv-t3)]">Total bags</span>
                    <span className="vv-mono text-[12px] font-bold text-[var(--vv-t1)]">{fmtIN(totalBags)}</span>
                  </div>
                )}
              </Card>

              <Card padding="md">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--vv-t2)]">Checklist</div>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--vv-t3)]">Purchase header</div>
                <ul className="mb-3 flex flex-col gap-1.5">
                  {headerChecks.filter(c => c.key !== "shop" || !!header.sourceType).map(c => (
                    <CheckRow key={c.key} ok={c.ok} label={c.label} />
                  ))}
                </ul>
                {lots.map((_, idx) => (
                  <div key={idx} className="mb-2">
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--vv-t3)]">Lot {idx + 1}</div>
                    <ul className="flex flex-col gap-1.5">
                      {lotsChecks[idx].map(c => <CheckRow key={c.key} ok={c.ok} label={c.label} />)}
                    </ul>
                  </div>
                ))}
              </Card>

              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="md" onClick={() => navigate("/purchase")} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" size="md" disabled={saving} className="flex-1">
                  <Save size={14} /> {completeLabel}
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </form>
    </>
  );
}

