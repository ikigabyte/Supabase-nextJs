import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { createClient } from "@supabase/supabase-js";

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RATE_LIMIT_WINDOW_SECONDS = 300;
const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 10;
const RATE_LIMIT_KEY_PREFIX = "track:";

type MemoryRateLimitEntry = {
  count: number;
  expiresAt: number;
};

declare global {
  var __trackRateLimitStore: Map<string, MemoryRateLimitEntry> | undefined;
}

let upstashRedis: Redis | null | undefined;

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwardedFor) return forwardedFor;

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "unknown";
}

function getUpstashRedis() {
  if (upstashRedis !== undefined) {
    return upstashRedis;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    upstashRedis = null;
    return upstashRedis;
  }

  upstashRedis = new Redis({ url, token });
  return upstashRedis;
}

function getMemoryRateLimitStore() {
  if (!globalThis.__trackRateLimitStore) {
    globalThis.__trackRateLimitStore = new Map<string, MemoryRateLimitEntry>();
  }

  return globalThis.__trackRateLimitStore;
}

function getRateLimitMaxRequests() {
  const rawValue = process.env.TRACK_RATE_LIMIT_MAX_REQUESTS;
  if (!rawValue) return DEFAULT_RATE_LIMIT_MAX_REQUESTS;

  const parsedValue = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return DEFAULT_RATE_LIMIT_MAX_REQUESTS;
  }

  return parsedValue;
}

async function checkRateLimit(ip: string): Promise<boolean> {
  const key = `${RATE_LIMIT_KEY_PREFIX}${ip}`;
  const redis = getUpstashRedis();
  const maxRequests = getRateLimitMaxRequests();

  if (redis) {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, RATE_LIMIT_WINDOW_SECONDS);
    }

    console.log("track rate limit", { ip, key, count, blocked: count > maxRequests, maxRequests, storage: "upstash" });
    return count > maxRequests;
  }

  if (process.env.NODE_ENV === "production") {
    console.warn("track rate limit skipped: Upstash Redis is not configured in production");
    return false;
  }

  const store = getMemoryRateLimitStore();
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.expiresAt <= now) {
    const nextEntry = {
      count: 1,
      expiresAt: now + RATE_LIMIT_WINDOW_SECONDS * 1000,
    };
    store.set(key, nextEntry);
    console.log("track rate limit", {
      ip,
      key,
      count: nextEntry.count,
      blocked: nextEntry.count > maxRequests,
      maxRequests,
      storage: "memory",
    });
    return nextEntry.count > maxRequests;
  }

  existing.count += 1;
  store.set(key, existing);

  console.log("track rate limit", {
    ip,
    key,
    count: existing.count,
    blocked: existing.count > maxRequests,
    maxRequests,
    storage: "memory",
  });
  return existing.count > maxRequests;
}

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
  const ip = getClientIp(request);
  const limited = await checkRateLimit(ip);
  if (limited) {
    console.warn("track rate limit exceeded", { ip });
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });  }

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
  console.log(normalizedEmailKey);
  if (!normalizedEmailKey) {
    return NextResponse.json({ error: "Invalid email key" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("tracking_orders")
    .select("tracking_token")
    .eq("order_id", orderId)
    .eq("email_key", normalizedEmailKey)
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
