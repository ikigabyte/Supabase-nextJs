"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";


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

function normalizeOrderIdInput(value: string) {
  return value.replace(/\D+/g, "").slice(0, 20);
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

      router.push(`/orderTracker/${encodeURIComponent(resolvedToken)}`);
    } catch {
      setLookupError("Unable to verify that order right now.");
    } finally {
      setLookupLoading(false);
    }
  };

  const onResolveToken = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const orderIdTrimmed = normalizeOrderIdInput(orderId);
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
              <div className="grid items-end gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-zinc-700">Order Number</p>
                    <Dialog>
                      <TooltipProvider delayDuration={150}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DialogTrigger asChild>
                              <button
                                type="button"
                                aria-label="Where to find your order number"
                                className="rounded-sm text-zinc-500 transition hover:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#76C043] focus:ring-offset-2"
                              >
                                <Info className="h-4 w-4" />
                              </button>
                            </DialogTrigger>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <span className="flex items-center gap-1">
                              <span>Click</span>
                              <Info className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>to see where your order number is located</span>
                            </span>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <DialogContent className="w-[min(90vw,720px)] max-w-none p-0">
                        <div className="flex aspect-[4/3] flex-col bg-white">
                          <DialogHeader className="border-b border-zinc-200 px-6 py-4">
                            <DialogTitle>Find your order number here</DialogTitle>
                          </DialogHeader>
                          <div className="relative flex-1">
                            <Image
                              src="/images/Info.png"
                              alt="Guide showing where to find the order number"
                              fill
                              className="object-contain"
                              sizes="(max-width: 768px) 90vw, 720px"
                            />
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <Textarea
                    value={orderId}
                    onChange={(event) => setOrderId(normalizeOrderIdInput(event.target.value))}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                      }
                    }}
                    placeholder="121302"
                    rows={1}
                    maxLength={20}
                    inputMode="numeric"
                    className="min-h-0 h-11 w-full overflow-hidden resize-none rounded-md px-4 text-lg"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-zinc-700">Email</p>
                  <Textarea
                    value={emailKey}
                    onChange={(event) => setEmailKey(normalizeEmailInput(event.target.value))}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                      }
                    }}
                    placeholder="Johndoe@gmail.com"
                    rows={1}
                    maxLength={254}
                    className="min-h-0 h-11 w-full overflow-hidden resize-none rounded-md px-4 text-lg"
                  />
                </div>
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
