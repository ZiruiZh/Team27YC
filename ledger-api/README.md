# Kitchen ledger API — OIDC-shaped access control

## The situation
You're right: there is no API yet, so there is nothing for OIDC to guard.
The ledger is local state inside the app. This file creates the API boundary
first, then puts identity + scopes on it. That is the unblocker.

## What it does
- `GET /ledger` — read the ledger books (inventory + orders). Needs a token
  with scope `ledger:read`.
- `POST /ledger/orders` — write an order record. Needs scope `orders:write`.
- No token -> 401. Token without the scope -> 403.
- Every access, allowed or denied, is appended to `audit.log`.
- The agent can read the ledger and write order records. It can never move
  money — there is no buy endpoint, the human presses BUY.

## Run it (Windows, same machine as the dashboard)
```
node ledger-api.js
```
No packages to install, zero dependencies. Serves on http://localhost:3002.

## Demo it (2 minutes, in the video)
```
curl http://localhost:3002/ledger
-> 401 missing Bearer token

curl http://localhost:3002/auth/demo-login
-> copy the access_token (5-minute token, scopes ledger:read + orders:write)

curl -H "Authorization: Bearer <token>" http://localhost:3002/ledger
-> 200, the ledger books

curl -X POST -H "Authorization: Bearer <token>" -H "Content-Type: application/json" ^
  -d "{\"dish\":\"Miso Salmon\",\"qty\":1,\"revenue\":24,\"cost\":9.5}" ^
  http://localhost:3002/ledger/orders
-> 201, order recorded

type audit.log
-> every access, allowed and denied, with actor + timestamp
```
(On Windows use `curl.exe`; the `^` is the cmd line-continuation character.
In PowerShell use backtick instead, or run each curl on one line.)

## Real OIDC (the swap — do this after the hackathon, or now if you have 5 min)
Demo mode mints its own short-lived token so the demo works with no setup.
The real version is one env var: point the server at a real identity
provider and it verifies real RS256 ID tokens against the provider's JWKS.
```
OIDC_ISSUER=https://accounts.google.com OIDC_AUDIENCE=<your Google client ID> node ledger-api.js
```
To get the client ID: Google Cloud Console -> APIs & Services -> Credentials
-> Create OAuth client ID (Web application), authorized redirect URI
http://localhost:3002/auth/callback. Then sign in with Google, pass the ID
token as the Bearer token, and `/auth/demo-login` is disabled automatically.
The real-IdP path is included in the code but was not tested against a live
IdP here — demo mode is the tested path.

Honest demo line: "Same shape as OIDC — short-lived token, scopes, audit log.
The production swap is the issuer URL."

## Alter (the partner-tool version of this)
If you want the partner tool in the demo too: claim Alter at alterauth.com
with code DRTOHWDE, create a Kitchen Manager agent identity with scopes
`ledger:read` + `orders:write`, and show its dashboard (scopes + audit log)
next to this API. Same story, real product: the agent has its own identity,
not the boss's keys.

## Do NOT do this now
Do not rewire the app's local ledger state to call this API before
submitting. Show the 401 vs 200 + audit log in the demo video as the
security layer, and wire it in after.
