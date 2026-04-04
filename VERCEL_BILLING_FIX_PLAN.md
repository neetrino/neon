# Vercel Billing Dashboard — Plan of Fixes

## Diagnosis: why the numbers are wrong

### Billing cycle

Vercel invoices are issued on the **4th of each month**. The billing period is therefore
**4th → 3rd** (e.g. Mar 4 – Apr 3 is one billing period; Apr 4 – May 3 is the next).

### Root cause 1 — Plan fee comes from invoices (wrong period)

`project-totals/route.ts` fetches invoices where `issuedAt` falls inside the
selected date range and sums `platformFeeUsd` from them as `vercelPlanUsd`.

| User selects               | Invoice issued                         | Result                                   |
| -------------------------- | -------------------------------------- | ---------------------------------------- |
| "Current month" Apr 1–5    | Apr 4 invoice (for Mar 4–Apr 3 period) | **$20 shown — but it's for last period** |
| "Previous month" Mar 1–31  | Apr 4 invoice is outside range         | **$0 shown — missing fee entirely**      |
| Billing period Mar 4–Apr 3 | Apr 4 invoice is outside range         | **$0 shown**                             |

The FOCUS API (`/v1/billing/charges`) already includes the Pro subscription as a
`serviceCategory = "Subscription Licenses"` line item mapped to `serviceCategory = 'plan'`
in `vercel_daily_charges`. This data is already synced and stored — it just isn't being
used for the plan-fee KPI card.

### Root cause 2 — Date presets use calendar months, not billing periods

"Current month" = Apr 1 → today; "Previous month" = Mar 1–31.
Neither aligns with the 4th-to-4th billing cycle, so totals never match invoices.

### Root cause 3 — Team-level charges excluded from project totals

`buildVercelProjects` explicitly filters `vercelProjectId: { not: '' }`, so team-level
charges (including the Pro plan subscription, and some bandwidth that isn't attributed
to a project) are never counted. Only `vercelPlanUsd` (from invoices) partially
compensates — and it's wrong, as shown above.

---

## What needs to be done

### Step 1 — Add billing-period date presets

**File:** `components/dashboard/date-presets.ts`

Add two new functions (billing cycle day = 4):

```ts
const BILLING_DAY = 4; // Vercel bills on the 4th

export function rangeCurrentBillingPeriod(): { from: string; to: string } {
  // from = most recent 4th (inclusive), to = today
  const today = utcToday();
  const [y, m, d] = today.split('-').map(Number);
  let fromYear = y,
    fromMonth = m;
  if (d < BILLING_DAY) {
    // we're before the 4th: billing period started in the previous month
    if (m === 1) {
      fromYear = y - 1;
      fromMonth = 12;
    } else {
      fromMonth = m - 1;
    }
  }
  const from = `${fromYear}-${String(fromMonth).padStart(2, '0')}-0${BILLING_DAY}`;
  return { from, to: today };
}

export function rangePreviousBillingPeriod(): { from: string; to: string } {
  // One period before the current one
  const current = rangeCurrentBillingPeriod();
  const [fy, fm] = current.from.split('-').map(Number);
  // Previous period end = day before current period start
  const toDate = new Date(Date.UTC(fy, fm - 1, BILLING_DAY - 1));
  // Previous period start = BILLING_DAY of the month before that
  let pYear = fy,
    pMonth = fm - 1;
  if (pMonth < 1) {
    pYear = fy - 1;
    pMonth = 12;
  }
  const from = `${pYear}-${String(pMonth).padStart(2, '0')}-0${BILLING_DAY}`;
  const to = toDate.toISOString().slice(0, 10);
  return { from, to };
}
```

**File:** `components/dashboard/DashboardFilterSidebar.tsx`

Add these two presets to the `PRESETS` array (replace or add alongside calendar-month ones):

```ts
const PRESETS = [
  { label: 'Current billing period', getRange: rangeCurrentBillingPeriod },
  { label: 'Previous billing period', getRange: rangePreviousBillingPeriod },
  { label: '7 days', getRange: () => rangeLastDays(7) },
  { label: '30 days', getRange: () => rangeLastDays(30) },
  { label: '60 days', getRange: () => rangeLastDays(60) },
] as const;
```

---

### Step 2 — Replace invoice-based plan fee with daily-charges data

**File:** `app/api/usage/project-totals/route.ts`

Remove the invoice query. Instead add a query for team-level charges:

```ts
// REMOVE this:
prisma.vercelInvoice.findMany({
  where: { issuedAt: { gte: fromDate, lte: ... } },
  ...
})

// ADD this:
prisma.vercelDailyCharge.findMany({
  where: {
    chargeDate: { gte: fromDate, lte: toDate },
    vercelProjectId: '',           // team-level only
  },
})
```

Then compute category totals from these team charges:

```ts
const vercelPlanUsd = teamCharges
  .filter((r) => r.serviceCategory === 'plan')
  .reduce((s, r) => s + Number(r.billedCost), 0);

const vercelTeamOtherUsd = teamCharges
  .filter((r) => r.serviceCategory !== 'plan')
  .reduce((s, r) => s + Number(r.billedCost), 0);
```

Update `vercelTotalUsd`:

```ts
const vercelTotalUsd = vercelProjectsTotal + vercelPlanUsd + vercelTeamOtherUsd;
```

Remove `vercelInvoiceCount` from `CostSummary` type (or keep as 0 for backward compat).

Update the KPI footer text in `UsageKpiStrip.tsx`:

```
Plan fee and usage charges from daily FOCUS data.
```

---

### Step 3 — Fix vercel-series breakdown to include team-level charges

**File:** `app/api/usage/vercel-series/route.ts`

Currently team-level charges (`vercelProjectId = ''`) ARE included in the breakdown
(the code doesn't filter by project ID for the category breakdown). This is correct.

But verify the `bandwidthUsd` in breakdown includes team bandwidth as well.
Trace through: the `for` loop uses all `charges` rows without filtering on
`vercelProjectId`, so this should be working. ✓ No change needed here.

---

### Step 4 — Verify the "plan" charge actually appears in daily FOCUS data

Before writing the code, check the database:

```sql
SELECT charge_date, service_name, service_category, billed_cost
FROM vercel_daily_charges
WHERE vercel_project_id = ''
ORDER BY charge_date DESC
LIMIT 30;
```

Expected: see rows with `service_category = 'plan'` showing the $20 subscription
distributed as either a single entry on the 4th, or spread across days.

If NO plan rows exist → the FOCUS API doesn't include subscription charges.
In that case the fallback is to keep invoice-based plan fee but fix the date range:
query invoices where `periodStart` (not `issuedAt`) overlaps with the selected range.

**Fallback fix (if FOCUS lacks plan charges):**

```ts
// Find invoice whose billing period OVERLAPS the selected date range
prisma.vercelInvoice.findMany({
  where: {
    periodStart: { lte: toDate },
    periodEnd: { gte: fromDate },
  },
  orderBy: { periodStart: 'asc' },
});
```

This correctly matches the Mar 4–Apr 3 invoice to any range that overlaps it.

---

### Step 5 — Add daily breakdown view like Vercel's own analytics

**What Vercel shows**: stacked bar chart, one bar per day, segments per project
(or per category: Functions, Bandwidth, Builds).

**Current state**: `VercelBreakdownBarChart` shows category breakdown per day ✓.
`VercelCostLineChart` shows per-project line chart ✓.

**What's missing**: a stacked bar chart where each bar = one day, each stack =
one project (like Vercel's "Usage" tab). This is more useful than a line chart
for seeing project contribution per day.

**File to add/modify**: `components/dashboard/VercelProjectStackedBar.tsx` (new)

This uses the existing `vercel-series` API response field `costByProject` which
already has `{ period: string; byProject: Record<projectId, cost> }[]` — exactly
the shape needed for a Recharts `<BarChart>` with one `<Bar>` per project.

Implement as a stacked `<BarChart>` (Recharts), similar to `VercelBreakdownBarChart`
but keyed on project ID instead of category.

**Register in `UsageDashboard.tsx`**:

```tsx
{
  showVercelCharts ? (
    <>
      <VercelProjectStackedBar
        loading={loading}
        points={vercelSeries?.costByProject ?? []}
        projectNames={vercelSeries?.projectNames ?? {}}
      />
      <VercelBreakdownBarChart loading={loading} breakdown={vercelSeries?.breakdown ?? []} />
    </>
  ) : null;
}
```

---

## Implementation order

1. **First**: run the SQL query (Step 4) to confirm whether FOCUS data includes plan charges.
2. **Step 2** (fix plan fee source) — this is the core bug, one file change.
3. **Step 1** (billing-period presets) — cosmetic but important for UX.
4. **Step 3** (verify breakdown) — likely no code change needed.
5. **Step 5** (stacked bar chart) — new component, lowest priority.

---

## Files to change

| File                                               | Change                                                               |
| -------------------------------------------------- | -------------------------------------------------------------------- |
| `components/dashboard/date-presets.ts`             | Add `rangeCurrentBillingPeriod`, `rangePreviousBillingPeriod`        |
| `components/dashboard/DashboardFilterSidebar.tsx`  | Add new presets to `PRESETS` array                                   |
| `app/api/usage/project-totals/route.ts`            | Replace invoice query with team-charges query                        |
| `components/dashboard/UsageKpiStrip.tsx`           | Update footer text (remove "from N invoices")                        |
| `components/dashboard/types.ts`                    | Remove `vercelInvoiceCount` from `CostSummary` (or keep as optional) |
| `components/dashboard/VercelProjectStackedBar.tsx` | New stacked bar chart component                                      |
| `components/dashboard/UsageDashboard.tsx`          | Register new chart                                                   |

No schema changes needed — `vercel_daily_charges` already stores all the data.
No new API endpoints needed — `vercel-series` already returns the right shape.
