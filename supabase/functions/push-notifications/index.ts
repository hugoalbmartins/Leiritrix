import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function uint8ToBase64Url(arr: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlToUint8(b64: string): Uint8Array {
  const base64 = b64.replace(/-/g, "+").replace(/_/g, "/");
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(base64 + pad);
  return new Uint8Array([...raw].map((c) => c.charCodeAt(0)));
}

function toBase64Url(str: string): string {
  return btoa(str)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function concatUint8(...arrays: Uint8Array[]): Uint8Array {
  const len = arrays.reduce((s, a) => s + a.length, 0);
  const result = new Uint8Array(len);
  let offset = 0;
  for (const a of arrays) {
    result.set(a, offset);
    offset += a.length;
  }
  return result;
}

async function hkdfDerive(
  ikm: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm, { name: "HKDF" }, false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info },
    key,
    length * 8
  );
  return new Uint8Array(bits);
}

async function generateVAPIDKeys() {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );
  const pubRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", keyPair.publicKey)
  );
  const privJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
  return {
    publicKey: uint8ToBase64Url(pubRaw),
    privateKeyJwk: JSON.stringify(privJwk),
  };
}

async function createVAPIDJWT(
  endpoint: string,
  privateKeyJwk: string
): Promise<string> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: "mailto:admin@leiritrix.pt",
  };
  const headerB64 = toBase64Url(JSON.stringify(header));
  const payloadB64 = toBase64Url(JSON.stringify(payload));
  const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const privateKey = await crypto.subtle.importKey(
    "jwk",
    JSON.parse(privateKeyJwk),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    signingInput
  );
  return `${headerB64}.${payloadB64}.${uint8ToBase64Url(new Uint8Array(sig))}`;
}

async function encryptPayload(
  plaintext: Uint8Array,
  subKeyB64: string,
  subAuthB64: string
): Promise<Uint8Array> {
  const clientPubKey = base64UrlToUint8(subKeyB64);
  const authSecret = base64UrlToUint8(subAuthB64);

  const ephemeral = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
  const ephPubRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", ephemeral.publicKey)
  );
  const clientKey = await crypto.subtle.importKey(
    "raw",
    clientPubKey,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: clientKey },
      ephemeral.privateKey,
      256
    )
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyInfo = concatUint8(
    new TextEncoder().encode("WebPush: info\0"),
    clientPubKey,
    ephPubRaw
  );
  const ikm = await hkdfDerive(sharedSecret, authSecret, keyInfo, 32);
  const cek = await hkdfDerive(
    ikm,
    salt,
    new TextEncoder().encode("Content-Encoding: aes128gcm\0"),
    16
  );
  const nonce = await hkdfDerive(
    ikm,
    salt,
    new TextEncoder().encode("Content-Encoding: nonce\0"),
    12
  );

  const padded = concatUint8(plaintext, new Uint8Array([2]));
  const aesKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, [
    "encrypt",
  ]);
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, padded)
  );

  const header = new Uint8Array(86);
  header.set(salt, 0);
  header[16] = 0;
  header[17] = 0;
  header[18] = 16;
  header[19] = 0;
  header[20] = 65;
  header.set(ephPubRaw, 21);
  return concatUint8(header, encrypted);
}

async function sendPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: object,
  privKeyJwk: string,
  pubKeyB64: string
): Promise<boolean> {
  try {
    const jwt = await createVAPIDJWT(sub.endpoint, privKeyJwk);
    const body = await encryptPayload(
      new TextEncoder().encode(JSON.stringify(payload)),
      sub.p256dh,
      sub.auth
    );
    const res = await fetch(sub.endpoint, {
      method: "POST",
      headers: {
        Authorization: `vapid t=${jwt}, k=${pubKeyB64}`,
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: "86400",
      },
      body,
    });
    return res.status >= 200 && res.status < 300;
  } catch (e) {
    console.error("Push send error:", e);
    return false;
  }
}

function getAdminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function getOrCreateVAPIDKeys(
  supabase: ReturnType<typeof createClient>
) {
  const { data: pub } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "vapid_public_key")
    .maybeSingle();

  if (pub?.value) {
    const { data: priv } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "vapid_private_key")
      .maybeSingle();
    return { publicKey: pub.value, privateKeyJwk: priv?.value || "" };
  }

  const keys = await generateVAPIDKeys();
  await supabase
    .from("app_settings")
    .upsert([
      { key: "vapid_public_key", value: keys.publicKey },
      { key: "vapid_private_key", value: keys.privateKeyJwk },
    ]);
  return keys;
}

async function sendToUser(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  payload: object,
  privKeyJwk: string,
  pubKeyB64: string
) {
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subs || subs.length === 0) return 0;

  let sent = 0;
  for (const sub of subs) {
    const ok = await sendPush(sub, payload, privKeyJwk, pubKeyB64);
    if (ok) sent++;
    else {
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", userId)
        .eq("endpoint", sub.endpoint);
    }
  }
  return sent;
}

async function wasAlreadySent(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  type: string,
  refId: string
): Promise<boolean> {
  const today = new Date().toISOString().split("T")[0];
  const { data } = await supabase
    .from("push_notification_log")
    .select("id")
    .eq("user_id", userId)
    .eq("notification_type", type)
    .eq("reference_id", refId)
    .gte("sent_at", `${today}T00:00:00Z`)
    .limit(1);
  return (data?.length || 0) > 0;
}

async function logSent(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  type: string,
  refId: string
) {
  await supabase
    .from("push_notification_log")
    .insert({ user_id: userId, notification_type: type, reference_id: refId });
}

async function checkDailyAlerts(supabase: ReturnType<typeof createClient>) {
  const keys = await getOrCreateVAPIDKeys(supabase);
  if (!keys.privateKeyJwk) return { error: "No VAPID keys" };

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  let totalSent = 0;

  const { data: allPrefs } = await supabase
    .from("notification_preferences")
    .select("user_id, sales_alerts, loyalty_alerts, lead_alerts");
  const prefsMap = new Map(
    (allPrefs || []).map((p: any) => [p.user_id, p])
  );

  const getUserPref = (userId: string) =>
    prefsMap.get(userId) || {
      sales_alerts: true,
      loyalty_alerts: true,
      lead_alerts: true,
    };

  // --- Loyalty Alerts ---
  const { data: sales } = await supabase
    .from("sales")
    .select("id, client_name, loyalty_months, sale_date, active_date, seller_id, partner_id, status")
    .gt("loyalty_months", 0)
    .in("status", ["ativo", "em_negociacao", "pendente"]);

  for (const sale of sales || []) {
    const startDate = sale.active_date || sale.sale_date;
    if (!startDate || !sale.loyalty_months) continue;
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + sale.loyalty_months);
    const diffDays = Math.ceil(
      (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays < 0 || diffDays > 3) continue;

    const daysLabel =
      diffDays === 0
        ? "termina hoje"
        : diffDays === 1
        ? "termina amanha"
        : `termina em ${diffDays} dias`;
    const payload = {
      title: "Alerta de Fidelizacao",
      body: `${sale.client_name}: fidelizacao ${daysLabel}`,
      url: `/sales/${sale.id}`,
      tag: `loyalty-${sale.id}-${diffDays}`,
    };
    const refId = `${sale.id}-${todayStr}`;

    const { data: admins } = await supabase
      .from("users")
      .select("id")
      .in("role", ["admin", "backoffice"])
      .eq("active", true);
    const targetUsers = [
      ...(admins || []).map((u: any) => u.id),
      ...(sale.seller_id ? [sale.seller_id] : []),
    ];
    const unique = [...new Set(targetUsers)];

    for (const uid of unique) {
      const pref = getUserPref(uid);
      if (!pref.loyalty_alerts) continue;
      if (await wasAlreadySent(supabase, uid, "loyalty", refId)) continue;
      const sent = await sendToUser(
        supabase,
        uid,
        payload,
        keys.privateKeyJwk,
        keys.publicKey
      );
      if (sent > 0) {
        await logSent(supabase, uid, "loyalty", refId);
        totalSent += sent;
      }
    }
  }

  // --- Lead Alerts ---
  const { data: leads } = await supabase
    .from("leads")
    .select("id, client_name, next_contact_date, assigned_to, status, priority")
    .in("status", ["nova", "em_contacto", "qualificada"]);

  for (const lead of leads || []) {
    const isOverdue =
      lead.next_contact_date && new Date(lead.next_contact_date) <= today;
    const isNew = lead.status === "nova";
    if (!isOverdue && !isNew) continue;

    const payload = {
      title: isOverdue ? "Lead com follow-up atrasado" : "Nova lead por contactar",
      body: `${lead.client_name}${lead.priority === "alta" ? " (Prioridade Alta)" : ""}`,
      url: "/leads",
      tag: `lead-${lead.id}`,
    };
    const refId = `${lead.id}-${todayStr}`;

    const targetUsers: string[] = [];
    if (lead.assigned_to) targetUsers.push(lead.assigned_to);
    const { data: admins } = await supabase
      .from("users")
      .select("id")
      .in("role", ["admin", "backoffice"])
      .eq("active", true);
    for (const a of admins || []) targetUsers.push(a.id);
    const unique = [...new Set(targetUsers)];

    for (const uid of unique) {
      const pref = getUserPref(uid);
      if (!pref.lead_alerts) continue;
      if (await wasAlreadySent(supabase, uid, "lead", refId)) continue;
      const sent = await sendToUser(
        supabase,
        uid,
        payload,
        keys.privateKeyJwk,
        keys.publicKey
      );
      if (sent > 0) {
        await logSent(supabase, uid, "lead", refId);
        totalSent += sent;
      }
    }
  }

  return { success: true, totalSent };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace("/push-notifications", "");
    const supabase = getAdminClient();

    if (req.method === "GET" && (path === "/vapid-key" || path === "")) {
      const keys = await getOrCreateVAPIDKeys(supabase);
      return new Response(
        JSON.stringify({ publicKey: keys.publicKey }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "POST" && path === "/subscribe") {
      const { user_id, subscription } = await req.json();
      if (!user_id || !subscription?.endpoint) {
        return new Response(
          JSON.stringify({ error: "Missing user_id or subscription" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      await supabase.from("push_subscriptions").upsert(
        {
          user_id,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
        { onConflict: "user_id,endpoint" }
      );
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "POST" && path === "/unsubscribe") {
      const { user_id, endpoint } = await req.json();
      if (!user_id) {
        return new Response(
          JSON.stringify({ error: "Missing user_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (endpoint) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", user_id)
          .eq("endpoint", endpoint);
      } else {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", user_id);
      }
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "POST" && path === "/check-alerts") {
      const result = await checkDailyAlerts(supabase);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "POST" && path === "/send") {
      const { user_id, title, body: msgBody, url: msgUrl, tag } = await req.json();
      if (!user_id || !title) {
        return new Response(
          JSON.stringify({ error: "Missing user_id or title" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const keys = await getOrCreateVAPIDKeys(supabase);
      const sent = await sendToUser(
        supabase,
        user_id,
        { title, body: msgBody, url: msgUrl || "/dashboard", tag: tag || "general" },
        keys.privateKeyJwk,
        keys.publicKey
      );
      return new Response(
        JSON.stringify({ success: true, sent }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
