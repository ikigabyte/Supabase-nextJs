'use server'

import { Redis } from "@upstash/redis";

const googleFunctionUrl = process.env.GOOGLE_ZENDESK_FUNCTION_URL;
const NOTE_WEBHOOK_COOLDOWN_SECONDS = 10;
const NOTE_WEBHOOK_COOLDOWN_KEY_PREFIX = "zendesk-notes:";
const NOTE_WEBHOOK_TIMEOUT_MS = 20_000;

type UpdateNotesWebhookResponse = {
  ok?: boolean;
  error?: string;
  requestId?: string;
  retryAfterSeconds?: number;
};

declare global {
  var __noteWebhookCooldowns: Map<number, number> | undefined;
}

let upstashRedis: Redis | null | undefined;

function getUpstashRedis() {
  if (upstashRedis !== undefined) return upstashRedis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  upstashRedis = url && token ? new Redis({ url, token }) : null;
  return upstashRedis;
}

async function acquireNoteWebhookCooldown(orderId: number): Promise<boolean> {
  const redis = getUpstashRedis();

  if (redis) {
    const result = await redis.set(`${NOTE_WEBHOOK_COOLDOWN_KEY_PREFIX}${orderId}`, "1", {
      nx: true,
      ex: NOTE_WEBHOOK_COOLDOWN_SECONDS,
    });
    return result === "OK";
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Upstash Redis must be configured to protect the Zendesk notes webhook");
  }

  const cooldowns = globalThis.__noteWebhookCooldowns ?? new Map<number, number>();
  globalThis.__noteWebhookCooldowns = cooldowns;

  const now = Date.now();
  const cooldownUntil = cooldowns.get(orderId) ?? 0;
  if (now < cooldownUntil) return false;

  cooldowns.set(orderId, now + NOTE_WEBHOOK_COOLDOWN_SECONDS * 1000);
  return true;
}

export async function updateZendeskStatus(orderId: number, newStatus: string): Promise<void> {
  // if (!googleFunctionUrl) {
  //   throw new Error("Missing GOOGLE_ZENDESK_FUNCTION_URL env variable");
  // }
  console.log("Updating Zendesk status for order", orderId, "to", newStatus);
  const response = await fetch(googleFunctionUrl + "/updateZendesk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId: orderId, status: newStatus }),
  });
  if (!response.ok) {
    // const errorText = await response.text();
    // console.error("Zendesk function error", response.status, errorText);
    // throw new Error(`Zendesk function failed: ${response.status}`);
  }
  console.log("Zendesk function response", response.status);
}

export async function updateZendeskNotes(orderId: number, notes: string): Promise<void> {
  // check to make sure 
  if (!googleFunctionUrl) {
    throw new Error("Missing GOOGLE_ZENDESK_FUNCTION_URL env variable");
  }

  const acquiredCooldown = await acquireNoteWebhookCooldown(orderId);
  if (!acquiredCooldown) {
    console.warn("Zendesk notes webhook blocked by cooldown", { orderId });
    throw new Error("Zendesk notes webhook blocked by cooldown");
  }

  let response: Response;
  try {
    response = await fetch(googleFunctionUrl + "/updateNotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: orderId, notes: notes }),
      signal: AbortSignal.timeout(NOTE_WEBHOOK_TIMEOUT_MS),
    });
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error("Zendesk notes webhook request failed", { errorName });
    throw new Error("Zendesk notes webhook timed out or could not be reached");
  }

  const result = await response.json().catch(() => null) as UpdateNotesWebhookResponse | null;
  if (!response.ok || result?.ok !== true) {
    const retryAfterSeconds = result?.retryAfterSeconds;
    console.error("Zendesk notes webhook rejected", {
      status: response.status,
      error: result?.error,
      requestId: result?.requestId,
      retryAfterSeconds,
    });
    const retryMessage = retryAfterSeconds === undefined
      ? ""
      : ` Try again in ${retryAfterSeconds} seconds.`;
    throw new Error(`Zendesk notes webhook failed: ${result?.error || response.status}.${retryMessage}`);
  }
  console.log("Zendesk notes webhook confirmed", { requestId: result.requestId });
}




export async function forceRefreshTimeline(): Promise<void> {
  // check to make sure 

  if (!googleFunctionUrl) {
    throw new Error("Missing GOOGLE_ZENDESK_FUNCTION_URL env variable");
  }
  const response = await fetch(googleFunctionUrl + "/requestRefreshTimeline", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Zendesk function error", response.status, errorText);
    throw new Error(`Zendesk function failed: ${response.status}`);
  }
  console.log("Zendesk function response", response.status);
}




export async function reprintInternalNote(orderId: number, notes: string): Promise<void> {
  // check to make sure 

  if (!googleFunctionUrl) {
    throw new Error("Missing GOOGLE_ZENDESK_FUNCTION_URL env variable");
  }
  const response = await fetch(googleFunctionUrl + "/reprintNote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId: orderId, notes: notes }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Zendesk function error", response.status, errorText);
    throw new Error(`Zendesk function failed: ${response.status}`);
  }
  console.log("Zendesk function response", response.status);
}
