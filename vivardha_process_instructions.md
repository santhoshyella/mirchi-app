# Vivardha — Mirchi Business Process Instructions

> Use this document to provide context to any AI model when seeking help with Vivardha's operations. Paste the relevant section(s) before your question.

---

## High-Level Business Flow

Vivardha's entire mirchi business operation is organised into three top-level stages. Every chilli that enters the system passes through all three stages in sequence.

```
INWARD  →  GRADING  →  OUTWARD
```

| Stage | What it covers | Processes involved |
|---|---|---|
| **Inward** | Sourcing, quality inspection, and receiving chillies into Vivardha's system from the market | Purchase → Machule → Weighing → Loading → Receipt at 4 destinations (AC / Godown / Direct Load / Raasi) |
| **Grading** | Processing and improving chilli quality through destemming and/or sun drying | Destemming Process and/or Raasi Process |
| **Outward** | Dispatching graded chillies to clients with full quality and traceability information | Outward Process |

### Inward
Inward begins when the Purchase Team identifies chillies to buy from market shops. It ends when the physical chillies have been received and confirmed at one of the four destination points — AC facility, Godown, Direct Load, or Raasi. All purchase metadata (type, mark, variety, quantity, shop, quality grade, price) is recorded and linked to every bag that enters.

### Grading
Grading improves the quality of inward chillies before they are sent to clients. It is not always mandatory for both processes — a batch may go through destemming only, Raasi only, or both, depending on the condition and client requirements. The Godown Incharge owns all grading operations. Shortage is tracked at every grading step.

### Outward
Outward is the dispatch of graded chillies to clients. Every outward consignment must carry full traceability — linking the dispatched chillies back to the specific purchase items they came from. This enables Vivardha to answer at any time: which client received which chillies, when they were purchased, from which shop, what variety and quality, and at what price.

---

## Teams & Roles at Vivardha

Vivardha operates through ten teams across three business stages — Inward, Grading, and Outward. Each team has a defined incharge or lead role and a set of responsibilities. The table below lists every team, the roles within it, the stage it belongs to, and the processes each team is involved in.

| Team | Roles | Stage | Involved in |
|---|---|---|---|
| **Purchase Team** | Purchase Head, Purchase Team Members | Inward | Purchase Process |
| **Machule Team** | Machule Team Members | Inward | Purchase Process |
| **Weighing Team** | Weighing Incharge, Weighing Team Members | Inward | Purchase Process |
| **Loading Team** | Loading Team Members | Inward | Purchase Process |
| **AC Team** | AC Incharge | Inward | Purchase Process (receipt) |
| **Godown Team** | Godown Incharge | Inward + Grading | Purchase Process (receipt), Destemming Process, Raasi Process |
| **Direct Load Team** | Direct Load Incharge | Inward | Purchase Process (receipt) |
| **Raasi Team** | Raasi Incharge | Inward + Grading | Purchase Process (receipt), Raasi Process |
| **Accounts Team** | Accounts Team Members | Inward + Outward | Purchase Process (billing), Outward Process (invoicing) |
| **Outward Team** | Outward Incharge, Outward Team Members | Outward | Outward Process |

### Role descriptions

**Purchase Head**
- Senior decision-maker for the Purchase Team
- Resolves bill discrepancies escalated by the Accounts Team
- Final authority on purchase price approvals and supplier decisions

**Purchase Team Members**
- Prepare the daily purchase list each morning
- Perform quality checking and price fixing before the list is issued
- Assign initial 30% buy probability to each item

**Machule Team Members**
- Visit market shops and physically inspect 2 bags per purchase list item
- Update item probability to 70% (pass) or 0% (fail) with remarks
- Forward approved items to the Weighing Team

**Weighing Incharge**
- Supervises all-bag inspection at the weighing stage
- Must be physically present during the Loading stage
- Co-signs weight records at the time of loading

**Weighing Team Members**
- Inspect all bags for each item forwarded by the Machule Team
- Update item probability to 100% (pass) or 0% (fail) with remarks

**Loading Team Members**
- Load only 100%-approved items
- Coordinate with destination incharges (AC / Godown / Direct Load / Raasi) upon completion

**AC Incharge**
- Confirms receipt and verifies quantities for items allocated to the AC facility

**Godown Incharge**
- Confirms receipt and verifies quantities for items allocated to the godown (Purchase Process)
- Initiates and owns the Destemming Process — allocates KGs per variety to each destemming point, receives and records returns, calculates shortage
- Initiates and owns the Raasi Process — weighs chillies before and after sun drying, records shortage by variety

**Direct Load Incharge**
- Confirms receipt and verifies quantities for items allocated to direct load

**Raasi Incharge**
- Confirms receipt and verifies quantities for items allocated to Raasi (Purchase Process)
- Note: the Godown Incharge operationally manages the Raasi drying process day-to-day

**Accounts Team Members**
- Enter all purchase items and quantities into the system
- Collect and verify bills from shops
- Coordinate with Purchase Head and shops to resolve discrepancies
- Mark items for payment once verified
- Generate outward invoices linking dispatched quantities to purchase items

**Outward Incharge**
- Manages all outward dispatches to clients
- Ensures each consignment contains the correct variety, quality, and quantity as per client order
- Records the link between outward consignment and the source purchase items (purchase reference, shop, variety, quality grade, date of purchase)
- Signs off on each outward dispatch

**Outward Team Members**
- Pack and prepare graded chillies for dispatch
- Assist in weight verification at time of outward dispatch
- Attach consignment documentation to each outward shipment

---

## INWARD STAGE

---

## 1. Purchase Process

### Overview
The Purchase Process is the entry point for all chillies into the Vivardha system. It involves six sequential teams acting as progressive quality gates. Each purchase is recorded as a header (source, shop, date) with one or more **lots** underneath — each lot represents a distinct variety+mark combination bought from that shop. Every lot starts at a 30% buy probability and must pass through each gate independently to reach 100% approval before loading.

### Entities
- **Teams:** Purchase Team, Machule Team, Weighing Team, Loading Team, Operations Sub-Teams (AC / Godown / Direct Load / Raasi), Accounts Team
- **Varieties:** Teja, 334, 341, Number 5
- **Marks (quality grades):** AA (Top grade), A (Grade 1), B (Grade 2), C (Grade 3)
- **Source types:** Agri Form (direct from farmer), AC (cold-storage holder), Yard (market yard / mandi), Network (broker / agent network)
- **Purchase list fields:** Source type, Shop/source name, Type, Mark, Number of bags, Number of KGs bought, Price per KG (₹), Total purchase value (₹), Destination, Dispatch deadline

### Purchase structure — header and lots

A single purchase entry is split into two levels:

**Purchase header** — shared across all lots bought from the same source on the same day:

| Field | Required | Description |
|---|---|---|
| Purchase date | Yes | Date the purchase happened |
| Source type | Yes | Agri Form / AC / Yard / Network |
| Shop / source name | Yes | Name of the farm, AC holder, yard stall, or agent |
| Source details | No | Additional context for non-Yard sources (e.g. agent name, farm address) |

**Lots** — one or more lots under each purchase header. Each lot is an independent purchase item in the system and carries its own variety and mark:

| Field | Required | Description |
|---|---|---|
| Variety | Yes | Teja / 334 / 341 / Number 5 |
| Type | Yes | Free-text chilli type identifier (e.g. S4, S5, Whole, Stem) |
| Mark | Yes | Quality grade — AA / A / B / C. Mark options are specific to the selected variety |
| Number of bags | No | Total bags for this lot |
| Weight (KGs) | No | Gross weight purchased (KGs) |
| Price per KG (₹) | Yes | Rate at which this lot was purchased |
| Bag weight deduction (KG each) | Editable, default 1 KG | KGs deducted per bag to account for gunny bag tare weight |
| Gunny bag rate (₹ each) | Editable, default ₹40 | Cost added to the bill per gunny bag |
| Total lot cost (₹) | Computed | See formula below |
| Destination | No | AC / Godown / Direct Load / Raasi |
| Destination details | No | Optional context — bay number, address, contact |
| Dispatch deadline | No | Latest date this lot should leave its destination. Rows flagged red when ≤ 5 days remain |
| Lot note | No | Free-text note saved with this lot only — not forwarded to subsequent stages |

**Lot cost formula:**

```
Net weight (KG)       = max(0, Gross weight − Number of bags × Bag weight deduction per bag)
Chilli cost (₹)       = Net weight × Price per KG
Gunny bag cost (₹)    = Number of bags × Gunny bag rate per bag
Total lot cost (₹)    = Chilli cost + Gunny bag cost
```

- The bag weight deduction accounts for the tare weight of each gunny bag (default 1 KG per bag, editable per lot).
- The gunny bag rate covers the cost of the bags themselves, added on top of the chilli value (default ₹40 per bag, editable per lot).
- Both fields are visible and editable in the lot form only once a bag count has been entered.
- In the Purchase List, lot cost and all group/variety totals are computed using this formula with the default values (1 KG deduction, ₹40 per bag), since the per-lot overrides are not stored on the server.

A single shop visit (same date + source type + shop) can have multiple lots — for example, if the same shop sells Teja AA and 334 A at the same time. Lots within the same purchase group **move through stages together**: when the Purchase Team advances a purchase, all lots in that group — including rejected ones — advance simultaneously.

**Editability rules by stage:**

| What | Editable up to | Locked after |
|---|---|---|
| Purchase header (date, source type, shop, source details) | Stage 1 only | Stage 1 |
| Lot details (variety, type, mark, bags, KG, price, destination, deadline) | Stage 3 (Weighing), and only if the lot is not rejected | Stage 3, or immediately on rejection |
| Adding a new lot to an existing purchase group | Stage 3 (Weighing) | Stage 3 |
| Lot notes | Any stage — including after locking and after rejection | Never locked |

Once a purchase group advances past Stage 3 (Weighing), no further field edits or new lot additions are allowed. This ensures that the record entering the Loading stage and beyond is final. **Exception:** notes can always be appended to any lot at any stage.

**New lot placement:** When a lot is added to an existing purchase group that is already at Stage 2 or Stage 3, the new lot is created at the group's current stage — not back at Stage 1. This keeps all lots in the group at the same stage.

**Rejected lot access:** A rejected lot is immediately view-only regardless of which stage it is in. Its fields (variety, mark, bags, KG, price, etc.) cannot be edited after rejection. Notes can still be added.

### Stage-by-stage flow

**Stage 1 — Purchase Planning (Purchase Team)**
- Performed every morning
- For each source / shop visit, fill in the **purchase header**: date, source type, shop/source name, and optional source details
- Under each header, add one or more **lots** — each lot captures: variety, type, mark, price per KG, and optionally bags, KGs, destination, dispatch deadline, and a lot note
- A single shop visit may have multiple lots (e.g. Teja AA and 334 A bought from the same shop on the same day)
- Price fixing is done at this stage — the purchase price per KG is agreed per lot before visiting the shop
- Each lot is initially marked at **30% chance of buying**
- Record: number of people in Purchase Team involved today + their daily cost → **Stage 1 labour cost**

**Stage 2 — Preliminary Quality Check (Machule Team)**
- Visit each shop on the purchase list; inspect all lots for that shop
- Open and inspect 2 bags per lot
- If both bags pass → advance the purchase group to Stage 3 at **70% chance of buying**
- If a specific lot fails → reject that lot individually with remarks (probability = 0%); the lot is marked rejected but continues to move with the group through subsequent stages
- Lot details (variety, mark, bags, KG, price) can still be edited at this stage if corrections are needed
- Record: number of people in Machule Team involved today + their daily cost → **Stage 2 labour cost**

**Stage 3 — Detailed Quality Check (Weighing Team)**
- Inspect all bags for each lot received from Machule Team
- If all bags pass → advance the purchase group to Stage 4 at **100% chance of buying**
- If a specific lot fails → reject that lot individually with remarks (probability = 0%); the lot is marked rejected but still advances to Loading with the rest of the group
- **This is the last stage at which lot edits or new lot additions are permitted**
- Record: number of people in Weighing Team involved today + their daily cost → **Stage 3 labour cost**

**Stage 4 — Loading (Loading Team)**
- The full purchase group arrives at this stage, including any rejected lots
- Physically load only lots marked at **100% approval**; rejected lots (probability = 0%) are present in the record but not loaded
- Load in the physical presence of the Weighing Incharge
- Notify the relevant destination incharge based on allocation:
  - AC Incharge
  - Godown Incharge
  - Direct Load Incharge
  - Raasi Incharge
- Record: number of people in Loading Team involved today + their daily cost → **Stage 4 labour cost**

**Stage 5 — Receipt & Confirmation (Operations Sub-Teams)**
- Each destination incharge confirms receipt of items
- Verifies quantities against dispatch records
- Record: number of people involved at each destination point + their daily cost → **Stage 5 labour cost**

**Stage 6 — Accounts Processing (Accounts Team)**
- Items arrive at Stage 6 with `accountsStatus = pending`
- Enter all purchased items and quantities into the system
- Collect bills from respective shops
- Verify bill details against system entries
- If match → settle the lot (`accountsStatus = settled`) — terminal, no further action
- If more information is needed → set to `accountsStatus = info-requested` and note the reason; earlier teams respond and the Accounts team resolves before settling
- If discrepancy → coordinate with Shop and Purchase Head to resolve, record remarks, then settle
- Record: number of people in Accounts Team involved today + their daily cost → **Stage 6 labour cost**

### Labour cost tracking — Purchase Process
At every stage of the Purchase Process, the following must be recorded:

| Field | Description |
|---|---|
| Stage | Stage number (1–6) |
| Number of people | Total headcount involved at that stage on that day |
| Cost per person per day (₹) | Daily wage / cost for each person |
| Total stage labour cost (₹) | Number of people × Cost per person per day |

- **Total Purchase Process labour cost (₹)** = Sum of labour costs across all six stages
- This is used downstream in the Outward Process to calculate the total cost per KG

### Key rules
- All lots in a purchase group advance together — stage transitions are group-level actions, not per-lot; rejected lots move along with the group
- Individual lots within a group can be rejected independently at any stage; rejection flags a lot as failed (probability = 0%) but does not stop it from advancing with the group
- Variety and mark are set per lot, not per purchase; the same shop can supply multiple varieties/marks in a single visit
- Mark options available for a lot depend on the selected variety — marks are configured per variety in Setup → Varieties
- Purchase header fields (date, source type, shop) are editable only at Stage 1
- Lot fields (variety, mark, type, bags, KG, price, destination, deadline) are editable up to and including Stage 3 (Weighing), provided the lot has not been rejected
- A rejected lot is immediately view-only — its fields cannot be edited regardless of stage; notes can still be added to it
- New lots can be added to a purchase group up to and including Stage 3 (Weighing); when added to a group already at Stage 2 or 3, the new lot is created at the group's current stage
- After Stage 3, the entire purchase group is locked — no field edits, no new lots; notes can still be appended to individual lots at any time
- Items rejected at Stage 2 or Stage 3 are stopped immediately with documented remarks
- The Loading Team is informed of Stage 3 rejections for awareness even if no action is taken
- Payment is only authorised after bill verification is complete and any discrepancies are resolved
- Price per KG is mandatory per lot; variety and mark must be set before a lot can be submitted

### Metrics to track
- Rejection rate by team (Machule, Weighing)
- Rejection rate by shop
- Purchase price per KG by variety and shop
- Total KGs bought per variety per day
- Total purchase value (₹) per variety per day
- Bill discrepancy rate by shop
- Labour cost per stage per day
- Total labour cost across all Purchase Process stages per day

---

## GRADING STAGE

---

## 2. Destemming Process

### Overview
Destemming is the process of separating chilli stems from the chilli body. It is carried out at multiple external destemming points. The Godown Incharge owns and initiates the process. Bags are dispatched in the morning and must be returned the same evening. Shortage is tracked per destemming point, per variety, and per date.

### Entities
- **Actor:** Godown Incharge
- **Locations:** Multiple destemming points (e.g. Point A, Point B, Point C, Point D)
- **Varieties:** Teja, 334, 341, Number 5
- **Unit of measurement:** KGs (kilograms)

### Eligibility — what can be destemmed
A purchase becomes eligible for destemming as soon as it reaches the **Accounts stage** (the terminal stage of the Purchase Process, regardless of `accountsStatus`). Settlement is **not** a prerequisite — the Accounts team can settle a lot's payment in parallel with the destemming work. The only hard exclusions are:

- Rejected purchases (`isRejected = true`) — never eligible
- Purchases already linked to a Raasi batch (mutual exclusion — see below)
- Purchases already linked to an existing destemming job (no re-destemming)

### Mutual exclusion with Raasi (one-form-at-a-time)
A single purchase lot can flow down **exactly one** processing path:

- Purchase → Destemming → (optionally Raasi for further drying) → Outward, **or**
- Purchase → Raasi → Outward, **or**
- Purchase → Outward directly

A purchase that has been claimed by a destemming job is **not** eligible to be sent directly to Raasi (and vice versa). The destemming → Raasi chain is allowed via the destemming job's received output, not via the original purchase.

### Stage-by-stage flow

**Stage 1 — Initiate (Godown Incharge)**
- Every morning, determine how many KGs of each variety to send to each destemming point
- Log the dispatch: date, destemming point, variety, KGs sent
- Record: number of people involved in dispatch + their daily cost → **Stage 1 labour cost**

**Stage 2 — Receive & Process (Destemming Points)**
- Each destemming point receives its allocated bags
- Stems are manually separated from chillies throughout the day
- Record: number of workers at each destemming point + their daily cost → **Stage 2 labour cost (per point)**

**Stage 3 — Return (Destemming Points → Godown)**
- Same day, by evening, all destemmed chillies are bagged and returned to the godown
- No overnight holding at destemming points
- Record: number of people involved in return collection + their daily cost → **Stage 3 labour cost**

**Stage 4 — Receive & Record (Godown Incharge)**
- Weigh all returned bags by variety and by destemming point
- Record: date, destemming point, variety, KGs sent, KGs received
- Calculate: **Shortage (KGs) = KGs sent − KGs received**
- Calculate: **Shortage % = (Shortage KGs ÷ KGs sent) × 100**
- Flag any destemming point exceeding **12% shortage** as a red flag
- Record: number of people involved in receiving + their daily cost → **Stage 4 labour cost**

### Dashboard requirements
- Filter by: destemming point, date, variety (Teja / 334 / 341 / Number 5)
- Show per row: KGs sent, KGs received, shortage (KGs), shortage %
- Summary cards: total KGs sent, total KGs received, total shortage (KGs), overall shortage %
- Red flag rule: any row with shortage % > 12% must be highlighted in red with a ⚑ indicator
- Views:
  - All points, all dates → aggregated by point
  - All points, specific date → all points for that date
  - Specific point, all dates → date-by-date history for that point
  - Specific point, specific date, specific variety → granular single record

### Labour cost tracking — Destemming Process

| Field | Description |
|---|---|
| Stage | Stage number (1–4) |
| Destemming point | Applicable for Stage 2 (per point) |
| Number of people | Headcount at that stage |
| Cost per person per day (₹) | Daily wage / cost |
| Total stage labour cost (₹) | Number of people × Cost per person per day |

- **Total Destemming labour cost (₹)** = Sum of labour costs across all four stages
- This feeds into the total cost per KG calculation at Outward

### Key rules
- Shortage tracking is mandatory per destemming point, per variety, per date
- Any destemming point exceeding 12% shortage triggers investigation before next allocation
- KGs sent and KGs received are always recorded in kilograms, not bag counts

### Metrics to track
- Shortage % by destemming point
- Shortage % by variety
- Shortage % by date
- Cumulative shortage by destemming point (aggregated)
- Red flag frequency by destemming point
- Labour cost per stage per day
- Total Destemming labour cost per day

---

## 3. Raasi Process

### Overview
Raasi is the natural sun-drying process where chillies are spread in open sky at the godown for moisture evaporation. Unlike destemming, there are no external points — the entire process happens at the godown. The Godown Incharge owns the process. Shortage is expected (natural moisture loss) but must be monitored closely by variety and compared against seasonal benchmarks.

### Entities
- **Actor:** Godown Incharge
- **Location:** Godown (open-sky drying area)
- **Varieties:** Teja, 334, 341, Number 5
- **Unit of measurement:** KGs (kilograms)

### Eligibility — what can be sent to Raasi
A Raasi batch can be created from two source types:

1. **A settled purchase** that has reached the Accounts stage (any `accountsStatus`, not just "settled") and isn't already destemmed or in another Raasi batch. Destination of the original purchase is **not** restricted to "Raasi" — the operator chooses where each Accounts-stage lot goes.
2. **A fully-received destemming job** (`status === "received"`, all dispatches returned) that hasn't already been sent to Raasi. This represents destemmed chilli being given a final sun-dry pass.

Mutual exclusion still holds: a purchase used as a Raasi source is not also available as a destemming source.

### Multi-source merging (combining lots)
Operationally, multiple lots are often combined on the same yard plot for efficient drying. The system supports this directly:

- A single Raasi batch may merge **one or more** sources of the **same source type** (all purchases OR all destemming jobs — not mixed).
- The first source picked becomes the "primary" for the batch's variety/mark/type snapshot. If varieties differ across merged sources, the batch carries the primary's variety and a "mixed varieties" warning is surfaced — the operator can still proceed.
- Bags and wet KG default to the combined totals of all selected sources, and the operator can adjust if the actual spread differed.
- Traceability is preserved per source — the batch carries the list of source IDs and shows back-links to each.

### Stage-by-stage flow

**Stage 1 — Initiate & Weigh Before (Godown Incharge)**
- Determine how many KGs of each variety to dry on a given day
- Weigh chillies before drying
- Log: date, variety, KGs before drying
- Record: number of people involved in setup + their daily cost → **Stage 1 labour cost**

**Stage 2 — Sun Drying (Raasi)**
- Spread chillies in the open-sky area at the godown
- Each variety is dried in a separate, designated drying zone
- Sunlight evaporates natural moisture throughout the day
- Record: number of people supervising / managing the drying area + their daily cost → **Stage 2 labour cost**

**Stage 3 — Evening Collection & Weigh After (Godown Incharge)**
- Collect all dried chillies into gunny bags at end of day
- Weigh the collected bags
- Log: date, variety, KGs after drying
- Record: number of people involved in collection + their daily cost → **Stage 3 labour cost**

**Stage 4 — Record Shortage (Godown Incharge)**
- Calculate: **Shortage (KGs) = KGs before − KGs after**
- Calculate: **Shortage % = (Shortage KGs ÷ KGs before) × 100**
- Log with remarks if shortage is significantly above expected benchmark for that variety and season

### Dashboard requirements
- Filter by: date, variety (Teja / 334 / 341 / Number 5)
- Show per row: KGs before, KGs after, shortage (KGs), shortage %
- Summary cards: total KGs before, total KGs after, total shortage (KGs), overall shortage %
- Views:
  - Specific date → all varieties for that day
  - All dates → aggregated by variety
  - Specific variety → date-by-date history
- Optional: show shortage % vs seasonal benchmark per variety

### Labour cost tracking — Raasi Process

| Field | Description |
|---|---|
| Stage | Stage number (1–3) |
| Number of people | Headcount at that stage |
| Cost per person per day (₹) | Daily wage / cost |
| Total stage labour cost (₹) | Number of people × Cost per person per day |

- **Total Raasi labour cost (₹)** = Sum of labour costs across all three stages
- This feeds into the total cost per KG calculation at Outward

### Key rules
- Each variety must be dried in a separate zone — no mixing
- Shortage is natural (moisture loss) but must be compared against historical benchmarks
- Both before-weight and after-weight must be recorded on the same date
- Shortage % thresholds should be set per variety, not as a single flat rate across all varieties

### Metrics to track
- Shortage % by variety per day
- Shortage % by variety (aggregated across all dates)
- Shortage % vs seasonal benchmark by variety
- Total KGs processed through Raasi per day and per variety
- Labour cost per stage per day
- Total Raasi labour cost per day

---

## OUTWARD STAGE

---

## 4. Outward Process

### Overview
The Outward Process is the final stage of Vivardha's operations. Graded chillies are dispatched to clients with full documentation. Every outward consignment must be traceable back to the original purchase items — enabling Vivardha to track at any point in time which client received which chillies, from which shop, of what variety and quality, and on what date they were purchased.

### Entities
- **Actor:** Outward Incharge, Outward Team Members, Accounts Team
- **Clients:** External buyers receiving graded chillies
- **Unit of measurement:** KGs (kilograms)
- **Varieties:** Teja, 334, 341, Number 5

### Outward consignment record — mandatory fields
Every outward dispatch must record the following:

**Traceability fields**

| Field | Description |
|---|---|
| Outward date | Date of dispatch to client |
| Client name | Name of the receiving client |
| Variety | Teja / 334 / 341 / Number 5 |
| Quality grade | Quality as assessed during inward inspection |
| KGs dispatched | Total weight sent to client |
| Purchase reference(s) | Link to original purchase item(s) |
| Shop name(s) | Market shop(s) where originally bought |
| Purchase date(s) | Date(s) chillies were purchased |
| Grading applied | Destemming and/or Raasi performed |
| Outward Incharge sign-off | Confirmed before dispatch |

**Cost & profitability fields**

| Field | Formula / Description |
|---|---|
| Price per KG bought (₹) | From the original purchase item record |
| Number of KGs bought (₹) | Gross KGs from the original purchase item record |
| Total purchase value (₹) | Computed using lot cost formula: (Gross KG − bags × deduction) × price/KG + bags × gunny rate |
| Shortage (KGs) | Total KGs bought − KGs dispatched to client (accounts for all grading shortage) |
| Shortage value (₹) | Shortage (KGs) × Price per KG bought |
| Total labour cost (₹) | Sum of Purchase + Destemming + Raasi labour costs attributed to this consignment |
| Total cost per KG (₹) | (Total purchase value + Total labour cost) ÷ KGs dispatched |
| Selling price per KG (₹) | Price at which this consignment is sold to the client |
| Total revenue (₹) | KGs dispatched × Selling price per KG |
| Profit / Loss (₹) | Total revenue − (Total purchase value + Total labour cost) |
| Profit / Loss per KG (₹) | Profit / Loss ÷ KGs dispatched |
| Order result | **Profit** if Profit/Loss (₹) > 0 · **Loss** if Profit/Loss (₹) < 0 · **Break-even** if = 0 |

### Stage-by-stage flow (4-stage workflow)

The Outward Process is a 4-stage pipeline: **Order → Allocate → Deliver → Settlement**. Each order progresses through these stages in sequence. Stage 4 (Settlement) has two sub-states — *pending* (just arrived from Deliver) and *settled* (terminal, after the operator marks payment received).

**Stage 1 — Order (Sales / Outward Incharge)**
- Receive client order specifying: variety, quality grade (Mark), quantity (KGs), price per KG
- Capture customer name, optional destination city, and an optional delivery deadline
- Order is created at Stage 1 with no inventory yet allocated
- Record: number of people in Sales involved + their daily cost → **Stage 1 labour cost**

**Stage 2 — Allocate (Warehouse / Outward Incharge)**
- Tag specific source lots from inventory to fulfill the order
- Each allocation is a `(sourceKind, sourceId, KG)` triple where `sourceKind` is one of `purchase`, `destemming`, or `raasi`. An order can pull from any combination of these
- Multi-source allocation is required for orders larger than a single available lot — the order's `targetKg` must be reached before the order can advance to Stage 3
- Allocations can be **added** and **removed** freely while the order sits in Stage 1 or 2. Once advanced to Stage 3, allocations are **locked** and cannot be edited (the lot is physically out the door)
- Record: number of people in Warehouse involved + their daily cost → **Stage 2 labour cost**

**Fulfillment guard:** Advancing from Stage 2 to Stage 3 is **blocked** until total allocated KG ≥ target KG. The system prevents partial dispatch — the order must be fully fulfilled before delivery.

**Stage 3 — Deliver (Loading / Outward Incharge)**
- Combines vehicle loading, dispatch, and customer delivery into a single stage. The previous separate "Dispatch" and "Delivered" stages have been collapsed since the operator visibility difference is minimal at this scale
- Record vehicle / driver / dispatch date inside the order's note timeline
- POD (proof of delivery) signed by customer concludes this stage
- Outward Incharge signs off before goods leave the premises
- Record: number of people in Loading involved + their daily cost → **Stage 3 labour cost**

**Stage 4 — Settlement (Accounts Team)**
- The order arrives in Stage 4 in **pending** sub-state — delivered, awaiting payment
- Accounts generates the client invoice linked to the order record, referencing: client, variety/Mark, KGs, source lot references, outward date, selling price per KG
- Once payment is received and verified, Accounts clicks **"Mark settled"** — this sets `settledAt` to the current timestamp and flips the order to the **settled** sub-state (terminal). No further action possible after settlement
- If payment falls through, the order can still be cancelled from this stage
- Calculate total cost per KG, profit/loss per KG, and overall order result (profit / loss / break-even)
- Record: number of people in Accounts Team involved + their daily cost → **Stage 4 labour cost**

### Cancellation
Any order at any non-settled stage can be cancelled. Cancelled orders are kept in the record (counted under "Cancelled" in metrics) but their KG and revenue contributions are **excluded** from all KPI totals — total target KG, allocated KG, and revenue figures only reflect non-cancelled orders. Cancellation frees any allocated KG back to its source lot's "left over" pool.

### Labour cost tracking — Outward Process

| Field | Description |
|---|---|
| Stage | Stage number (1–4) |
| Number of people | Headcount at that stage |
| Cost per person per day (₹) | Daily wage / cost |
| Total stage labour cost (₹) | Number of people × Cost per person per day |

- **Total Outward labour cost (₹)** = Sum of labour costs across all four Outward stages
- **Grand total labour cost (₹)** = Purchase labour + Destemming labour + Raasi labour + Outward labour

### Profit / Loss calculation

```
Total purchase value (₹)   = (Gross KG − bags × deduction/bag) × price/KG + bags × gunny_rate/bag
Total labour cost (₹)      = Purchase + Destemming + Raasi + Outward labour costs
Total cost (₹)             = Total purchase value + Total labour cost
Total revenue (₹)          = KGs dispatched × Selling price per KG
Profit / Loss (₹)          = Total revenue − Total cost
Profit / Loss per KG (₹)   = Profit / Loss ÷ KGs dispatched
Total cost per KG (₹)      = Total cost ÷ KGs dispatched
Order result               = Profit | Loss | Break-even
```

### Traceability rules
- Every outward consignment must have at least one purchase reference — dispatching without a traceable source is not permitted
- If a consignment blends chillies from multiple purchase lots or varieties, each component must be separately documented
- The traceability record must enable the following lookups at any time:
  - **Forward:** Given a purchase item → which client(s) received it
  - **Backward:** Given a client consignment → which shop(s) and purchase date(s) sourced it
- Grading history (destemming / Raasi) must also be linked so quality changes from inward to outward are fully visible

### Key rules
- Clients must receive the correct variety and quality as per their order — no substitutions without explicit client approval
- Outward weight must be verified independently before dispatch
- No consignment leaves without Outward Incharge sign-off
- Invoice generation by Accounts Team is mandatory for every dispatch
- Selling price per KG must be recorded before the consignment is dispatched
- Profit/loss must be calculated and recorded for every outward order

### Metrics to track
- KGs dispatched per client per variety per date
- On-time dispatch rate
- Variety and quality accuracy rate (dispatched vs ordered)
- Traceability completeness rate (% of consignments with full purchase reference)
- Price per KG bought vs selling price per KG (margin per KG)
- Total cost per KG by variety
- Profit / Loss (₹) per order
- Profit / Loss per KG by variety
- Shortage (KGs) attributed to each outward order
- % of orders resulting in profit vs loss
- Labour cost as a % of total cost per order

---

## General rules across all processes

- **Unit:** All quantities are measured in **KGs (kilograms)**
- **Currency:** All monetary values are in **₹ (Indian Rupees)**
- **Varieties:** Always tracked at variety level — Teja, 334, 341, Number 5
- **Marks:** AA / A / B / C (AA = Top grade, A = Grade 1, B = Grade 2, C = Grade 3)
- **Lot cost formula:** `Net KG = max(0, Gross KG − bags × deduction_per_bag)` · `Lot cost (₹) = Net KG × price/KG + bags × gunny_rate_per_bag` · Default deduction = 1 KG/bag · Default gunny rate = ₹40/bag
- **Shortage formula:** `Shortage (KGs) = KGs before / sent − KGs after / received`
- **Shortage % formula:** `Shortage % = (Shortage KGs ÷ KGs before / sent) × 100`
- **Labour cost formula:** `Stage labour cost (₹) = Number of people × Cost per person per day`
- **Total cost formula:** `Total cost (₹) = Total purchase value + Sum of all stage labour costs (Purchase + Destemming + Raasi + Outward)`
- **Total cost per KG formula:** `Total cost per KG (₹) = Total cost ÷ KGs dispatched`
- **Profit / Loss formula:** `Profit / Loss (₹) = Total revenue − Total cost`
- **Order result:** Profit if > 0 · Loss if < 0 · Break-even if = 0
- **Date granularity:** All records are at day level (one entry per date per variety per point/process)
- **Incharge accountability:** The Godown Incharge is responsible for initiating and recording all grading processes (Destemming and Raasi)
- **Red flag threshold (destemming):** Shortage % > 12% = red flag, triggers investigation
- **Variety-specific thresholds (Raasi):** Each variety has its own acceptable shortage range based on historical moisture content
- **Traceability:** Every outward consignment must be linked back to its source purchase items — shop, variety, quality, purchase date — enabling both forward and backward lookup at any time
- **Business stage flow:** Inward → Grading → Outward. No chilli should reach Outward without having passed through Inward. Grading is applied as needed between Inward and Outward.

---

## Stock visibility & cross-process rules

The following rules govern how a lot is represented across the three processes (Purchase / Destemming / Raasi) and into Outward. They ensure each KG of chilli appears in exactly one "form" at a time, with no double-counting.

### One-form-at-a-time

A lot is shown in **exactly one** processing-stage view at any moment:

| Lot's current state | Main list it appears in |
|---|---|
| Stage 1–5 of Purchase (still in procurement) | `/purchase` |
| Stage 6 (Accounts), unclaimed | `/purchase` |
| Stage 6 + claimed by a Destemming job | `/destemming` (the parent purchase is hidden from `/purchase` main view) |
| Stage 6 + claimed by a Raasi batch directly | `/raasi` (the parent purchase is hidden from `/purchase` main view) |
| Destemming job, draft / sent / partial / received, not yet in Raasi | `/destemming` |
| Destemming job whose output is now in Raasi | `/raasi` (the destemming job is hidden from `/destemming` main view) |
| Raasi batch (drying or collected) | `/raasi` |

**Role queues** (Machule queue, Weighing queue, Loading queue, Receipt queue, Accounts queue) are intentionally **exempt** from this rule — they're workflow views, not stock views, and must still show every lot that needs that team's attention. For example, a purchase that has been destemmed but not yet paid still appears in the Accounts queue so the Accounts team can settle.

A "moved downstream" count is surfaced on the main list headers (e.g. *"5 of 9 items · filtered view · 2 moved downstream"*), and the hidden lot is still reachable via cross-link pills and `?focus=<id>` deep links.

### Left-over inventory tracking

Each lot that's available for direct sale (Purchase at Accounts, Destemming "received", Raasi "collected") shows a **"Left over"** strip on its row indicating how much of its processed KG is still unsold. The strip is purely informational — the row's original processed total (Weight / Destemmed / Dry output) is **never** modified.

Formulas:

| Source | Total | Allocated KG | Left over |
|---|---|---|---|
| Purchase (Stage 6) | `kg` | Σ allocations to open orders | `kg − allocated` |
| Destemming job (received) | Σ `receivedKg` across dispatches | Σ allocations to open orders | `received − allocated` |
| Raasi batch (collected) | `outputDryKg` | Σ allocations to open orders | `dry − allocated` |

Where **"open orders"** means not cancelled. The moment an order is cancelled or an allocation is removed (only possible at Order Stage 1 or 2), the corresponding KG returns to the source lot's left-over pool automatically. Settled orders' allocations remain consumed (the lot was physically shipped).

### Outward inventory pool

The `New Order` form composes inventory from the three source forms with these rules:

- Purchases at Stage 6 not already claimed by Destemming/Raasi
- Destemming jobs in `received` status not already claimed by Raasi
- Raasi batches in `collected` status

For each candidate lot, `remainingKg = totalKg − Σ allocatedKg from open orders`. Lots with `remainingKg = 0` are automatically excluded from the picker. The operator can filter the picker by source kind (Raasi / Destemming / Purchase) — for example to deliberately sell only processed (destemmed/raasi'd) stock.

### Cancellation exclusion from KPI tiles

When an item is cancelled (Purchase rejection, Order cancellation), its KG/value contributions are **excluded** from KPI metric tiles:

- **Purchase KPIs** — `totalBags`, `totalKg`, `totalValue` omit rejected items. The `Rejected` tile keeps the rejected-bag count as a separate informational metric.
- **Order KPIs** — `targetKg`, `allocatedKg`, `revenue`, `awaiting allocation` omit cancelled orders. The `Cancelled` tile keeps the cancelled-order count as a separate informational metric.

This ensures aggregate performance numbers reflect only transactions that actually flowed through the business. Counts of cancelled/rejected items remain visible as quality signals.

### Cross-linking between processes

Every related record carries forward and back links so traceability is reachable in one click in either direction:

- **Purchase row** → forward "Destemming · d-XXX →" pill if a destemming job was created from this lot; forward "Raasi · r-XXX →" pill if a Raasi batch was created from this lot
- **Destemming row** → back-link "from p-XXX →" on meta line to the source purchase; forward "Raasi · r-XXX →" pill stacked under status if the destemmed output was sent to Raasi
- **Raasi row** → back-link "from p-XXX, p-YYY, …" or "from d-XXX, d-YYY, …" (multiple when sources are merged) to each source
- **Outward row** → each allocation pill links forward to its specific source lot's `?focus=` view (Purchase, Destemming, or Raasi)

All cross-links use the `?focus=<id>` URL parameter, which lifts the target row to the top of its list regardless of active filters and highlights it with a focus ring. A focus banner explains the "brought to top regardless of filters" behavior, with a "Clear focus" button to return to normal browsing.

---

*End of document. Paste relevant sections when seeking AI assistance for Vivardha operations. The three business stages are: Inward (Purchase Process), Grading (Destemming + Raasi), Outward (Outward Process). Cross-cutting rules — one-form-at-a-time stock visibility, left-over tracking, cancellation exclusion — are in the section above.*
