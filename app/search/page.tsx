"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const NO_ORDER_FOUND_MESSAGE = "No orders found for that Order ID and email key, please be sure to input the correct email associated with your Ticket #";

function normalizeEmailInput(value: string) {
  const singleLineValue = value.replace(/[\r\n]+/g, "");
  return singleLineValue.slice(0, 254);
}

function getEmailKeyLookupValue(value: string) {
  const normalizedInput = normalizeEmailInput(value).trim();
  const beforeAt = normalizedInput.split("@")[0] ?? "";
  return beforeAt.slice(0, 20);
}

export default function SearchPage() {
  const router = useRouter();
  const [orderId, setOrderId] = useState("");
  const [emailKey, setEmailKey] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  const resolveTokenAndRoute = async (orderIdValue: string, emailKeyValue: string) => {
    setLookupError(null);
    setLookupLoading(true);
    try {
      const response = await fetch(
        `/api/track?orderId=${encodeURIComponent(orderIdValue)}&emailKey=${encodeURIComponent(emailKeyValue)}`,
        { cache: "no-store" }
      );
      const payload = await response.json();

      if (!response.ok) {
        const responseError = String(payload?.error ?? "").trim().toLowerCase();
        const noOrderFound =
          response.status === 404 ||
          responseError.includes("not found") ||
          responseError.includes("no orders found");

        setLookupError(noOrderFound ? NO_ORDER_FOUND_MESSAGE : payload?.error ?? "Unable to find token");
        return;
      }

      const resolvedToken = String(payload?.tracking_token ?? "").trim();
      if (!resolvedToken) {
        setLookupError(NO_ORDER_FOUND_MESSAGE);
        return;
      }

      router.push(`/tracking/${encodeURIComponent(resolvedToken)}`);
    } catch {
      setLookupError("Unable to verify that order right now.");
    } finally {
      setLookupLoading(false);
    }
  };

  const onResolveToken = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const orderIdTrimmed = orderId.trim();
    const emailKeyTrimmed = getEmailKeyLookupValue(emailKey);
    if (!orderIdTrimmed || !emailKeyTrimmed) {
      setLookupError("Order ID and email key are required.");
      return;
    }

    await resolveTokenAndRoute(orderIdTrimmed, emailKeyTrimmed);
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-archivo">
      <header className="w-full bg-[#76C043] px-6 py-4 text-white">
        <div className="grid grid-cols-3 items-center">
          <Link href="https://www.stickerbeat.ca" aria-label="Go to Stickerbeat home">
            <img src="/images/stickerbeat-logo-white.png" alt="Stickerbeat Logo" className="h-8 w-auto" />
          </Link>
          <h1 className="text-center text-4xl tracking-tight">Order Tracker</h1>
          <div className="flex justify-end">
            {/* <Button asChild variant="outline" className="border-white bg-transparent text-white hover:bg-white/15">
              <Link href="/database">View Orders</Link>
            </Button> */}
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-88px)] items-center justify-center px-4">
        <div className="w-full max-w-3xl space-y-4 rounded-md border border-zinc-200 bg-white p-6 shadow-sm">
            <form onSubmit={onResolveToken} className="space-y-3">
              <div className="grid items-stretch gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                <Textarea
                  value={orderId}
                  onChange={(event) => setOrderId(event.target.value.replace(/[\r\n]+/g, "").slice(0, 20))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                    }
                  }}
                  placeholder="Enter Order Number"
                  rows={1}
                  maxLength={20}
                  className="min-h-0 h-11 w-full overflow-hidden resize-none rounded-md px-4 text-lg"
                />
                <Textarea
                  value={emailKey}
                  onChange={(event) => setEmailKey(normalizeEmailInput(event.target.value))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                    }
                  }}
                  placeholder="Enter Email"
                  rows={1}
                  maxLength={254}
                  className="min-h-0 h-11 w-full overflow-hidden resize-none rounded-md px-4 text-lg"
                />
                <Button type="submit" className="h-11 whitespace-nowrap px-6" disabled={lookupLoading}>
                  {lookupLoading ? "Searching Order..." : "Search Orders"}
                </Button>
              </div>
              {lookupError && <p className="text-sm font-medium text-red-600">{lookupError}</p>}
            </form>
        </div>
      </div>
    </div>
  );
}
