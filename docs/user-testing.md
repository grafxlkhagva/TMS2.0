## Lightweight user testing (pilot: Orders + Dashboard)

This is a practical, low-overhead protocol to validate UX improvements after standardizing UI patterns.

### Goals

- Verify that common tasks are **faster**, **less error-prone**, and **more understandable**.
- Catch friction in: navigation, filtering/search, table actions, confirmations, and empty/loading states.

### Who to test with

- **3–5 internal users** is enough for pilot feedback.
- Mix roles if possible: admin/management/transport manager.

### Environment

- Use a staging dataset if possible (or a seeded dev dataset).
- Test on:
  - Desktop (primary)
  - One smaller screen size (laptop) to validate responsive layout

### Tasks (script)

#### Task A — Orders list: find & filter

- Go to **Orders**.
- Find an order by:
  - customer name search
  - order number search
- Apply filters:
  - status multi-select
  - date range
- Clear filters and confirm the state resets correctly.

**Success criteria**
- User understands where to filter/search without instruction.
- User can return to the “full list” quickly (clear filters/search).

#### Task B — Orders list: row actions & confirmation

- On a specific order:
  - open details from the order number link
  - open the row actions menu
  - trigger delete, read confirmation, cancel
- Repeat and confirm delete (on a safe test item).

**Success criteria**
- Action menu is discoverable and keyboard reachable.
- Confirmation copy is clear about irreversibility.

#### Task C — Dashboard: interpret and navigate

- On **Dashboard**:
  - interpret KPI cards (what each means)
  - interpret the status chart
  - open a recent order from the list

**Success criteria**
- User can explain what the KPIs mean in their own words.
- User finds navigation from recent orders intuitive.

### Metrics to record (simple)

For each participant and each task:

- **Completion**: success / partial / fail
- **Time-on-task**: seconds (rough is fine)
- **Errors**: count (wrong click, wrong filter, confusion)
- **Confidence**: 1–5 (self-reported)
- **Notes**: what was confusing or slow

Template:

| Participant | Task | Completion | Time(s) | Errors | Confidence(1-5) | Notes |
|---|---|---|---:|---:|---:|---|
| P1 | A |  |  |  |  |  |

### Debrief questions (2 minutes)

- “What part felt slow or confusing?”
- “What did you expect to happen that didn’t?”
- “If you could change one thing on this page, what would it be?”

### How to turn results into action

- Bucket issues into:
  - **Copywriting** (labels, descriptions)
  - **Pattern gaps** (need a new `patterns/*` component)
  - **Bugs** (functional issues)
  - **Information architecture** (sidebar naming/grouping)
- Fix issues in the pilot patterns first, then roll out to additional pages.

