"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function SearchPage() {
  const router = useRouter();
  const [orderNumber, setOrderNumber] = useState("");

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = orderNumber.trim();
    if (!trimmed) return;
    router.push(`/tracking/result=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-archivo">
      <header className="w-full bg-[#76C043] px-6 py-4 text-white">
        <div className="grid grid-cols-3 items-center">
          <img src="public/stickerbeat-logo-white.png" alt="Stickerbeat Logo" className="h-8 w-auto" />
          <h1 className="text-center text-4xl tracking-tight">Order Tracker</h1>
          <div className="flex justify-end">
            <Button asChild variant="outline" className="border-white bg-transparent text-white hover:bg-white/15">
              <Link href="/database">View Orders</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-88px)] items-center justify-center px-4">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-3xl space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-stretch gap-3">
            <Textarea
              value={orderNumber}
              onChange={(event) => setOrderNumber(event.target.value)}
              placeholder="Enter order number"
              className="min-h-0 h-11 flex-1 resize-none rounded-full px-4 text-lg"
            />
            <Button type="submit" className="h-11 shrink-0">
              Track Order
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
