"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SearchIcon } from "lucide-react";

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
    <div className="flex justify-end">
      <div className="flex w-[30%] min-w-[120px] items-center gap-2">
        <textarea
          className="w-full h-[44px] resize-none rounded border p-2 font-mono text-sm"
          placeholder="Search Order Number"
          value={orderCode}
          onChange={(e) => onChange(e.target.value)}
          style={{ minHeight: 44, maxHeight: 44 }}
        />
        <Button
          type="button"
          variant="default"
          className="h-[44px]"
          onClick={search}
          disabled={!orderCode}
        >
          <SearchIcon className="mr-2 h-4 w-4" />
          Search
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="h-[44px]"
          onClick={clear}
          disabled={!orderCode}
        >
          Clear
        </Button>
      </div>
    </div>
  );
}