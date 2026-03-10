"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const NO_ORDER_FOUND_MESSAGE = "No orders found for that Order ID and email key.";

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
    const emailKeyTrimmed = emailKey.trim();
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
          <img src="/images/stickerbeat-logo-white.png" alt="Stickerbeat Logo" className="h-8 w-auto" />
          <h1 className="text-center text-4xl tracking-tight">Order Tracker</h1>
          <div className="flex justify-end">
            {/* <Button asChild variant="outline" className="border-white bg-transparent text-white hover:bg-white/15">
              <Link href="/database">View Orders</Link>
            </Button> */}
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-88px)] items-center justify-center px-4">
        <div className="w-full max-w-3xl space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <form onSubmit={onResolveToken} className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <Textarea
                  value={orderId}
                  onChange={(event) => setOrderId(event.target.value.replace(/[\r\n]+/g, "").slice(0, 20))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                    }
                  }}
                  placeholder="Enter order ID"
                  rows={1}
                  maxLength={20}
                  className="min-h-0 h-11 overflow-hidden resize-none rounded-full px-4 text-lg"
                />
                <Textarea
                  value={emailKey}
                  onChange={(event) => setEmailKey(event.target.value.replace(/[\r\n]+/g, "").slice(0, 20))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                    }
                  }}
                  placeholder="Enter last part of your email (before @)"
                  rows={1}
                  maxLength={20}
                  className="min-h-0 h-11 overflow-hidden resize-none rounded-full px-4 text-lg"
                />
              </div>
              {lookupError && <p className="text-sm font-medium text-red-600">{lookupError}</p>}
              <Button type="submit" className="h-11" disabled={lookupLoading}>
                {lookupLoading ? "Searching Order..." : "Search Orders"}
              </Button>
            </form>
        </div>
      </div>
    </div>
  );
}
