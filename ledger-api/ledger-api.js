// Kitchen ledger API — OIDC-shaped access control for the ledger books
// Zero dependencies. Node 18+.
//
// DEMO MODE (default, works right now):
//   node ledger-api.js
//   GET  /auth/demo-login   -> mints a 5-minute JWT for the Kitchen Manager agent
//   GET  /ledger            -> needs Bearer token with scope ledger:read
//   POST /ledger/orders     -> needs Bearer token with scope orders:write
//   No token -> 401. Token without the scope -> 403.
//   Every access (allowed + denied) is appended to audit.log.
//
// REAL OIDC MODE (swap the demo login for a real identity provider):
//   OIDC_ISSUER=https://accounts.google.com OIDC_AUDIENCE=<your Google client ID> node ledger-api.js
//   Then pass a real Google ID token as the Bearer token. The server fetches
//   the IdP discovery document + JWKS and verifies the RS256 signature.
//   To get a client ID: Google Cloud Console -> APIs & Services -> Credentials
//   -> Create OAuth client ID (Web application), authorized redirect URI
//   http://localhost:3002/auth/callback. (Real-IdP path is included but not
//   tested against a live IdP here; demo mode is the tested path.)
//
// The agent can READ the ledger and WRITE order records. It can never move
// money and there is no buy endpoint — the human presses BUY.

const http = require("http");
const crypto = require("crypto");
const fs = require("fs");

const PORT = Number(process.env.PORT || 3002);
const DEMO_SECRET =
  process.env.DEMO_JWT_SECRET || "hackathon-demo-secret-change-me";
const OIDC_ISSUER = process.env.OIDC_ISSUER || "";
const OIDC_AUDIENCE = process.env.OIDC_AUDIENCE || "";

// --- in-memory ledger (seeded to match the demo) ---
const ledger = {
  currency: "CAD",
  inventory: [
    { item: "salmon fillet", onHand: 3, unit: "portions", unitCost: 9.5 },
    { item: "eggs", onHand: 6, unit: "each", unitCost: 0.45 },
    { item: "rice", onHand: 20, unit: "kg", unitCost: 2.1 },
  ],
  orders: [
    {
      id: "ORD-1",
      dish: "Miso Salmon",
      qty: 1,
      revenue: 24,
      cost: 9.5,
      ts: Date.now(),
    },
  ],
};

// --- tiny JWT helpers (HS256 demo, RS256 real OIDC) ---
const b64urlJson = (obj) =>
  Buffer.from(JSON.stringify(obj)).toString("base64url");

function signHS256(payload, secret) {
  const header = b64urlJson({ alg: "HS256", typ: "JWT" });
  const body = b64urlJson(payload);
  const sig = crypto
    .createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${sig}`;
}

function decode(token) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    return {
      header: JSON.parse(Buffer.from(parts[0], "base64url")),
      payload: JSON.parse(Buffer.from(parts[1], "base64url")),
      signature: parts[2],
      signingInput: `${parts[0]}.${parts[1]}`,
    };
  } catch {
    return null;
  }
}

let jwksCache = null;
async function getJwks() {
  if (jwksCache) return jwksCache;
  const disc = await (
    await fetch(`${OIDC_ISSUER}/.well-known/openid-configuration`)
  ).json();
  const jwks = await (await fetch(disc.jwks_uri)).json();
  jwksCache = jwks;
  return jwks;
}

async function verifyToken(token) {
  const d = decode(token);
  if (!d) return { ok: false, reason: "malformed token" };
  if (OIDC_ISSUER) {
    // Real OIDC: RS256, verified against the IdP JWKS.
    if (d.header.alg !== "RS256")
      return { ok: false, reason: "expected RS256" };
    const jwks = await getJwks();
    const key = (jwks.keys || []).find((k) => k.kid === d.header.kid);
    if (!key) return { ok: false, reason: "unknown kid" };
    const pub = crypto.createPublicKey({ key, format: "jwk" });
    const valid = crypto.verify(
      "sha256",
      Buffer.from(d.signingInput),
      pub,
      Buffer.from(d.signature, "base64url")
    );
    if (!valid) return { ok: false, reason: "bad signature" };
    const p = d.payload;
    if (p.iss !== OIDC_ISSUER) return { ok: false, reason: "wrong issuer" };
    if (
      OIDC_AUDIENCE &&
      p.aud !== OIDC_AUDIENCE &&
      !(Array.isArray(p.aud) && p.aud.includes(OIDC_AUDIENCE))
    )
      return { ok: false, reason: "wrong audience" };
    if (p.exp && p.exp * 1000 < Date.now())
      return { ok: false, reason: "expired" };
    return {
      ok: true,
      sub: p.sub,
      scopes: (p.scope || "").split(" ").filter(Boolean),
    };
  }
  // Demo mode: HS256, short-lived, minted by /auth/demo-login.
  if (d.header.alg !== "HS256")
    return { ok: false, reason: "expected HS256 in demo mode" };
  const expect = crypto
    .createHmac("sha256", DEMO_SECRET)
    .update(d.signingInput)
    .digest("base64url");
  if (
    expect.length !== d.signature.length ||
    !crypto.timingSafeEqual(Buffer.from(expect), Buffer.from(d.signature))
  )
    return { ok: false, reason: "bad signature" };
  const p = d.payload;
  if (p.exp && p.exp * 1000 < Date.now())
    return { ok: false, reason: "expired" };
  return { ok: true, sub: p.sub, scopes: p.scopes || [] };
}

// --- audit log: every access, allowed or denied ---
function audit(entry) {
  const line =
    JSON.stringify({ ts: new Date().toISOString(), ...entry }) + "\n";
  fs.appendFile("audit.log", line, () => {});
  console.log(line.trim());
}

// --- server ---
function send(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(body);
}

async function requireScope(req, res, scope) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) {
    audit({
      actor: "anonymous",
      action: scope,
      result: "denied",
      reason: "no token",
    });
    send(res, 401, { error: "missing Bearer token" });
    return null;
  }
  let v;
  try {
    v = await verifyToken(token);
  } catch (e) {
    v = { ok: false, reason: "verification failed: " + e.message };
  }
  if (!v.ok) {
    audit({ actor: "unknown", action: scope, result: "denied", reason: v.reason });
    send(res, 401, { error: "invalid token: " + v.reason });
    return null;
  }
  if (!v.scopes.includes(scope)) {
    audit({
      actor: v.sub,
      action: scope,
      result: "denied",
      reason: "missing scope " + scope,
    });
    send(res, 403, { error: "token lacks scope " + scope });
    return null;
  }
  audit({ actor: v.sub, action: scope, result: "allowed" });
  return v;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (req.method === "GET" && url.pathname === "/auth/demo-login") {
    if (OIDC_ISSUER) {
      send(res, 400, {
        error: "demo login disabled in real OIDC mode — sign in via your IdP",
      });
      return;
    }
    const now = Math.floor(Date.now() / 1000);
    const token = signHS256(
      {
        sub: "kitchen-manager-agent",
        scopes: ["ledger:read", "orders:write"],
        iat: now,
        exp: now + 300,
      },
      DEMO_SECRET
    );
    audit({
      actor: "kitchen-manager-agent",
      action: "demo-login",
      result: "allowed",
    });
    send(res, 200, {
      access_token: token,
      token_type: "Bearer",
      expires_in: 300,
      scopes: ["ledger:read", "orders:write"],
    });
    return;
  }
  if (req.method === "GET" && url.pathname === "/ledger") {
    const v = await requireScope(req, res, "ledger:read");
    if (!v) return;
    send(res, 200, ledger);
    return;
  }
  if (req.method === "POST" && url.pathname === "/ledger/orders") {
    const v = await requireScope(req, res, "orders:write");
    if (!v) return;
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        const order = JSON.parse(body || "{}");
        order.id = "ORD-" + (ledger.orders.length + 1);
        order.ts = Date.now();
        ledger.orders.push(order);
        audit({
          actor: v.sub,
          action: "orders:write",
          result: "allowed",
          orderId: order.id,
        });
        send(res, 201, order);
      } catch {
        send(res, 400, { error: "invalid JSON" });
      }
    });
    return;
  }
  if (req.method === "GET" && url.pathname === "/health") {
    send(res, 200, { ok: true, oidc: Boolean(OIDC_ISSUER) });
    return;
  }
  send(res, 404, { error: "not found" });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(
    `Ledger API on http://localhost:${PORT} — ${
      OIDC_ISSUER
        ? "REAL OIDC mode, issuer " + OIDC_ISSUER
        : "DEMO mode (HS256 demo login, 5-min tokens)"
    }`
  );
  console.log("No token -> 401. Wrong scope -> 403. Every access -> audit.log");
});
