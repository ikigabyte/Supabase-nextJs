"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export function CompletedOrderLookup() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlOrder = searchParams.get("order") ?? "";
  const [orderCode, setOrderCode] = useState(urlOrder);

  // Keep input in sync if user navigates back/forward
  useEffect(() => {
    setOrderCode(urlOrder);
  }, [urlOrder]);

  const onChange = (v: string) => {
    const digitsOnly = v.replace(/\D/g, "").slice(0, 7);
    setOrderCode(digitsOnly);
  };

  const search = () => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));

    if (!orderCode) {
      params.delete("order");
    } else {
      params.set("order", orderCode);
    }

    params.set("page", "1"); // always reset to page 1 on new search

    const qs = params.toString();
    router.push(qs ? `?${qs}` : "?page=1");
  };

  const clear = () => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.delete("order");
    params.set("page", "1");

    setOrderCode("");
    router.push(`?${params.toString()}`);
  };

  return (
    <>
      <textarea
        className="w-full min-h-[44px] max-h-[120px] resize-y rounded border p-2 font-mono text-sm"
        placeholder="Search Order Number"
        value={orderCode}
        onChange={(e) => onChange(e.target.value)}
      />

      <div className="flex items-center gap-2">
        <div className="text-xs text-muted-foreground">{orderCode.length}/7 digits</div>

        <Button
          type="button"
          variant="default"
          className="ml-auto"
          onClick={search}
          disabled={!orderCode}
        >
          Search
        </Button>

        <Button
          type="button"
          variant="secondary"
          onClick={clear}
          disabled={!orderCode}
        >
          Clear
        </Button>
      </div>
    </>
  );
}