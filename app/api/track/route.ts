import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeEmailKey(value: string) {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return "";

  const withoutAtPrefix = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
  const domainPart = withoutAtPrefix.includes("@") ? withoutAtPrefix.split("@")[1] ?? "" : withoutAtPrefix;
  const root = domainPart.split(".")[0] ?? "";

  return root.replace(/[^a-z0-9_-]/g, "");
}

function getJwtRole(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return "";
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as { role?: string };
    return payload?.role ?? "";
  } catch {
    return "";
  }
}

function withSupabaseError(message: string, error: { code?: string; details?: string; hint?: string; message?: string }) {
  const isDev = process.env.NODE_ENV !== "production";
  if (isDev) {
    return {
      error: `${message}: ${error?.message ?? "unknown error"}`,
      code: error?.code ?? null,
      details: error?.details ?? null,
      hint: error?.hint ?? null,
    };
  }

  return { error: message };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token")?.trim() ?? "";
  const orderIdRaw = searchParams.get("orderId")?.trim() ?? "";
  const emailKeyRaw = searchParams.get("emailKey")?.trim() ?? "";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const serviceRole = getJwtRole(serviceRoleKey);
  if (serviceRole !== "service_role") {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is not a service_role key" },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  if (token) {
    if (!UUID_V4_REGEX.test(token)) {
      return NextResponse.json({ error: "Invalid token format" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("tracking_orders")
      .select(
        "order_id, created_at, current_status, items, history, ship_date, shipping_method, tracking_info, provided_date, email_key, tracking_token"
      )
      .eq("tracking_token", token)
      .maybeSingle();

    if (error) {
      console.error("track token lookup error", error);
      return NextResponse.json(withSupabaseError("Failed to load tracking order", error), { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Tracking order not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  }

  if (!orderIdRaw || !emailKeyRaw) {
    return NextResponse.json({ error: "Missing token or order lookup parameters" }, { status: 400 });
  }

  const orderId = Number.parseInt(orderIdRaw, 10);
  if (!Number.isFinite(orderId) || orderId <= 0) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  const normalizedEmailKey = normalizeEmailKey(emailKeyRaw);
  if (!normalizedEmailKey) {
    return NextResponse.json({ error: "Invalid email key" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("tracking_orders")
    .select("tracking_token")
    .eq("order_id", orderId)
    .ilike("email_key", `%${normalizedEmailKey}%`)
    .limit(1);

  if (error) {
    console.error("track orderId/emailKey lookup error", error);
    return NextResponse.json(withSupabaseError("Failed to resolve tracking token", error), { status: 500 });
  }

  const match = data?.[0];
  if (!match?.tracking_token) {
    return NextResponse.json({ error: "Tracking token not found for this order id and email key" }, { status: 404 });
  }

  return NextResponse.json({ tracking_token: match.tracking_token });
}
