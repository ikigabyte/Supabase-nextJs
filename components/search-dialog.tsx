"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/utils/supabase/client";
import { Order } from "@/types/custom";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
  TableHeader,
} from "@/components/ui/table";

import { groupOrdersByFakeType } from "@/utils/grouper";
import { assignKeyType, filterBySameKeyType } from "@/utils/orderKeyAssigner";

import {convertToSpaces} from "@/lib/utils";


type OrderWithMeta = Order & {
  keyType?: string | null;
  fakeIndex?: number;
};

export function DialogSearch({
  open,
  onOpenChange,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const supabase = getBrowserClient();

  const [orderId, setOrderId] = useState("");
  const [orders, setOrders] = useState<OrderWithMeta[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Reset input/results when dialog closes
  useEffect(() => {
    if (!open) {
      setOrderId("");
      setOrders(null);
      setLoading(false);
      setHasSearched(false);
    }
  }, [open]);

  const getCorrectPage = useCallback(
    (productionStatus: string, material: string, orderQuery: string) => {
      const normalizedMaterial =
        material === "regular" || material === "roll" ? material : "regular";
      switch (productionStatus) {
        case "print":
          return `toprint?${encodeURIComponent(material)}=${encodeURIComponent(orderQuery)}`;
        case "cut":
          return `tocut?${encodeURIComponent(normalizedMaterial)}=${encodeURIComponent(orderQuery)}`;
        case "pack":
          return `topack?${encodeURIComponent(normalizedMaterial)}=${encodeURIComponent(orderQuery)}`;
        case "ship":
          return `toship?${encodeURIComponent(normalizedMaterial)}=${encodeURIComponent(orderQuery)}`;
        default:
          return `search?${orderQuery ? `order=${orderQuery}` : ""}`;
      }
    },
    []
  );

  // const getOrderNumberOutput = useCallback((orderIdStr: string) => {
  //   const trimmed = orderIdStr.trim();
  //   if (!trimmed) return "Search Orders";
  //   if (/^\d+$/.test(trimmed)) {
  //     return `Search Orders for ID: ${trimmed}`;
  //   }
  //   return `Search Orders for Name ID: ${trimmed}`;
  // }, []);

const handleSearch = useCallback(
  async (searchTerm: string) => {
    // Extract number before first dash if present
    let q = searchTerm.trim();
    const dashIndex = q.indexOf("-");
    if (dashIndex > 0 && /^\d+$/.test(q.slice(0, dashIndex))) {
      q = q.slice(0, dashIndex);
    }

    setHasSearched(true);

    if (!q) {
      setOrders([]);
      return;
    }

    setLoading(true);

    const isNumeric = /^\d+$/.test(q);
    let builder = supabase.from("orders").select("*");

    // 1) First: find the specific order(s) the user searched for
    if (isNumeric) {
      builder = builder.eq("order_id", parseInt(q, 10));
    } else {
      builder = builder.eq("name_id", q);
      // or: builder = builder.ilike("name_id", `%${q}%`)
    }

    const { data: found, error } = await builder;

    if (error) {
      console.error("Search error:", error);
      setOrders([]);
      setLoading(false);
      return;
    }

    const foundOrders = found ?? [];
// Show the direct matches in the table (for debugging if needed)
    // console.log("Search results for", q, ":", foundOrders);

    if (foundOrders.length === 0) {
      setOrders([]);
      setLoading(false);
      return;
    }

    // 2) Use the first found order as the reference
    const reference = foundOrders[0];
    const referenceStatus = reference.production_status ?? "";
    const referenceLamination = reference.lamination ?? "";

    if (!referenceStatus || !referenceLamination) {
      console.log("Reference order missing production_status or lamination:", reference);
      setOrders([]);
      setLoading(false);
      return;
    }

    // 3) Fetch ALL orders with the same production_status
    const { data: sameStatusOrders, error: statusError } = await supabase
      .from("orders")
      .select("*")
      .eq("production_status", referenceStatus)
      .eq("lamination", referenceLamination);

    if (statusError) {
      console.error("Error fetching orders by status:", statusError);
      setOrders([]);
      setLoading(false);
      return;
    }

    const allStatusOrders = (sameStatusOrders ?? []) as Order[];
    // 4) From that bigger set, find ones with same lamination and quantity ending with "-tiles"
    // const similarTileOrders = allStatusOrders.filter((o) => {
    //   const lam = o.lamination ?? "";
    //   if (lam !== referenceLamination) return false;

    //   const qtyStr = o.quantity != null ? String(o.quantity).toLowerCase() : "";
    //   return qtyStr.endsWith("-tiles");
    // });

    // Make sure reference is included in this set
    const withReference: Order[] = allStatusOrders.some(
      (o) => o.name_id === reference.name_id
    )
      ? allStatusOrders
      : [reference, ...allStatusOrders];

    // 5) Filter by SAME keyType group as the reference
    const filteredByKeyType = filterBySameKeyType(
      withReference,
      reference,
      referenceStatus as any
    );

    // 6) Attach keyType + fakeIndex for display
    const ordersWithMeta: OrderWithMeta[] = filteredByKeyType.map((order, index) => ({
      ...order,
      keyType: assignKeyType(order, referenceStatus as any),
      fakeIndex: index, // fake index inside the filtered keyType group
    }));

    setOrders(ordersWithMeta);

    console.log("Reference order:", reference);
    console.log(
      `Orders with production_status=${referenceStatus}, lamination=${referenceLamination}, same keyType, and quantity ending with "-tiles":`,
      ordersWithMeta
    );

    setLoading(false);
  },
  [supabase]
);

return (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent aria-description={undefined} className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Search Orders</DialogTitle>
      </DialogHeader>

      <div className="relative">
        <Input
          placeholder="Insert Order Id Here (Ex: 103320)"
          className="pl-10 rounded-md text-xs"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch(orderId);
          }}
          autoFocus
        />
        <button
          type="button"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          onClick={() => handleSearch(orderId)}
          aria-label="Search"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <Button onClick={() => handleSearch(orderId)} disabled={!orderId.trim() || loading}>
        {loading ? "Searching..." : "Search"}
      </Button>

      {/* Results inside the dialog */}
      <div className="mt-3">
        {!hasSearched ? null : loading ? (
          <p className="text-sm text-gray-500">Searching...</p>
        ) : !orders || orders.length === 0 ? (
          <p className="text-sm text-gray-500">No orders found for "{orderId.trim()}".</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="h-.5 [&>th]:py-0 text-xs">
                <TableHead className="w-[60%] border-r border-gray-200">File ID</TableHead>
                <TableHead className="w-[20%] border-r border-gray-200">Production Status</TableHead>
                <TableHead className="w-[20%]">Material</TableHead>
                <TableHead className="w-[30%]">Key Type</TableHead>
                <TableHead className="w-[20%]">fake Index</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow
                  key={order.name_id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    router.push(
                      getCorrectPage(order.production_status ?? "", order.material ?? "", order.name_id ?? "")
                    );
                    // console.log("Navigating to order:", order.name_id);
                    if (onOpenChange) onOpenChange(false);
                  }}
                >
                  <TableCell className="w-[60%] break-words break-all whitespace-pre-wrap text-xs">
                    {convertToSpaces(order.name_id)}
                  </TableCell>
                  <TableCell className="w-[20%] text-xs">{order.production_status}</TableCell>
                  <TableCell className="w-[20%] text-xs">{order.material}</TableCell>
                  <TableCell className="w-[20%] text-xs">{order.keyType}</TableCell>
                  <TableCell className="w-[20%] text-xs">{order.fakeIndex}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </DialogContent>
  </Dialog>
);
}