# Overnight Kitchen Manager

**An AI coworker you can actually hire. It owns prep and ordering for a restaurant.**

The Kitchen Manager tracks every ingredient, scores itself on food cost and waste, can 86 a dish, and builds tomorrow's grocery list at close of day. It never buys anything on its own — a human always presses BUY.

Built by Team 27 at the YC × ElevenLabs Hackathon, University of Waterloo, Nov 22, 2026.

## What it does

**Service (all day).** Staff press a dish on the POS. The recipe deducts from inventory live, a receipt is logged, and the scoreboard updates food cost, waste, and profit. Salmon only has 3 portions — after the third order the dish 86s itself off the menu board.

**Voice (all day).** Talk to the manager through the ElevenLabs voice widget: 86 a dish, change a price, add a dish, add a supplier, or ask for the grocery list.

**End Sales (close of day).** One button tallies what was used, what is left, the most-used ingredient, and the most expensive barely-used ingredient. Then it builds tomorrow's grocery list in three parts — daily perishables, bulk (3–4 days), weekly — using registry prices first, then a seeded 20 km supplier search. BUY shows a confirmation only and never places an order.

**Demo data.** 6 seeded dishes, low eggs, one expensive barely-used ingredient, a supplier registry with custom suppliers and rates, and seeded 20 km prices.

## Architecture

```mermaid
flowchart TB
    Staff["Restaurant staff"] -->|"clicks POS"| Dash["Red Dashboard<br/>React + Vite · localhost:4173"]
    Staff -->|"voice"| Widget["ElevenLabs widget<br/>index.html"]
    Widget --> Agent["Overnight Kitchen Manager<br/>ElevenLabs agent · gpt-4o-mini · voice Alice"]
    Agent -->|"6 client tools"| Dash
    Dash -->|"GET /auth/demo-login → 5-min JWT"| Ledger["Ledger API<br/>Node · localhost:3002"]
    Dash -->|"GET /ledger · POST /ledger/orders<br/>Bearer token, scoped"| Ledger
    Ledger --> Audit["audit.log<br/>every access, allowed + denied"]
    Alter["Alter identity<br/>Kitchen Manager agent<br/>scopes: ledger:read, orders:write"] -.->|"scopes mirrored<br/>on ledger tokens"| Ledger
```

## Tools used

| Tool | What it does here |
|---|---|
| **ElevenLabs Conversational AI** | The voice agent. Agent "Overnight Kitchen Manager", LLM gpt-4o-mini, voice Alice. 6 client tools: `eighty_six_dish`, `add_supplier`, `update_price`, `add_dish`, `get_grocery_list`, `request_order_approval`. Embedded as a plain ConvAI widget in `app/index.html`. |
| **Alter** | The agent's identity. Application "Kitchen Manager" with an agent scoped to `ledger:read` + `orders:write`. No money movement, no other permissions. |
| **React + Vite + TypeScript** | The red dashboard: POS, menu board, live scoreboard, chart, receipt log, End Sales panel, Alter security card. `app/src/App.tsx` + `app/src/App.css`. |
| **Ledger API (Node, zero dependencies)** | `ledger-api/ledger-api.js` on port 3002. Holds inventory and orders. `GET /ledger` reads, `POST /ledger/orders` writes. |

## How it is secured

1. **The agent has its own identity.** In Alter, the Kitchen Manager agent holds exactly two scopes: `ledger:read` and `orders:write`. It cannot move money or touch anything else.
2. **Short-lived scoped tokens.** The ledger mints a 5-minute JWT (`GET /auth/demo-login`, subject `kitchen-manager-agent`) carrying only those two scopes. Every ledger call needs the token as a Bearer header.
3. **Deny by default.** No token → `401`. Token without the right scope → `403`. The dashboard's Alter card shows this live: it fetches the ledger with the minted token, and falls back gracefully if the API is not running.
4. **Everything is audited.** Every ledger access, allowed or denied, is appended to `audit.log` with a timestamp.
5. **A human approves every purchase.** The agent proposes orders; only a human pressing BUY confirms one. The agent never buys on its own.
6. **Production mode included.** The ledger also ships a real-OIDC mode (RS256 via JWKS, `OIDC_ISSUER` / `OIDC_AUDIENCE` env vars). The demo runs in demo-token mode.

## Run it

```bash
# Terminal 1 — the ledger
cd ledger-api && node ledger-api.js

# Terminal 2 — the dashboard
cd app && npm run build && npm run preview -- --port 4173 --host 127.0.0.1
```

Open http://localhost:4173/.

## Repo layout

```
app/                  React + Vite dashboard (App.tsx, App.css, index.html with the ElevenLabs widget)
ledger-api/           Ledger API (ledger-api.js, README.md)
```

## Team 27

Zirui Zhao, Jawed Jamshid, Baraa Al alnakwa, Shivoy Malhotra.
