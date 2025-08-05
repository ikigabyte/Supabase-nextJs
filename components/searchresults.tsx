"use client";

import React, { useState, useEffect, useCallback } from "react";
// import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Table, TableBody, TableRow, TableCell, TableHead, TableHeader } from "@/components/ui/table";
import { SearchBar } from "./search-bar";
import { Order } from "@/types/custom";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/utils/supabase/client";

export default function SearchResults() {
  const router = useRouter();
  // const searchParams = useSearchParams();

  const [orders, setOrders] = useState<Order[] | null>(null);
  const [query, setQuery] = useState<string>("");
  // const initialQuery = searchParams.get("query") || "";

  const supabase = getBrowserClient();

  const handleSearch = useCallback(
    async (newQuery: string) => {
      setQuery(newQuery);
      if (!newQuery) {
        setOrders([]);
        return;
      }

      // detect “all digits”
      const isNumeric = /^\d+$/.test(newQuery);

      // build the right supabase query
      let builder = supabase.from("orders").select("*");

      if (isNumeric) {
        // exact match on order_id
        builder = builder.eq("order_id", parseInt(newQuery, 10));
      } else {
        // exact (or you could use ilike for partial) on name_id
        builder = builder.eq("name_id", newQuery);
        // or for partial matches:
        // builder = builder.ilike("name_id", `%${newQuery}%`)
      }

      const { data, error } = await builder;

      if (error) {
        console.error("Search error:", error);
        setOrders([]);
      } else {
        setOrders(data ?? []);
      }
    },
    [supabase]
  );

  useEffect(() => {
    const q = new URL(window.location.href).searchParams.get("query") || "";
    setQuery(q);
    handleSearch(q);
    // we only want to run on mount, so we disable exhaustive-deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getCorrectPage = (productionStatus: string, material: string, orderQuery: string) => {
    // Only allow "regular" or "roll" for cut, pack, ship
    const normalizedMaterial = material === "regular" || material === "roll" ? material : "regular";

    switch (productionStatus) {
      case "print":
        return `toprint?${encodeURIComponent(material)}` + (orderQuery ? `=${orderQuery}` : "");
      case "cut":
        return `tocut?${encodeURIComponent(normalizedMaterial)}` + (orderQuery ? `=${orderQuery}` : "");
      case "pack":
        return `topack?${encodeURIComponent(normalizedMaterial)}` + (orderQuery ? `=${orderQuery}` : "");
      case "ship":
        return `toship?${encodeURIComponent(normalizedMaterial)}` + (orderQuery ? `=${orderQuery}` : "");
      default:
        return `search?${orderQuery ? `order=${orderQuery}` : ""}`; // Fallback
    }
  };
  // useEffect(() => {
  //   if (initialQuery) {
  //     handleSearch(initialQuery);
  //   }
  // }, [initialQuery, handleSearch]);

  // now change it so that if it's clicked then it can redirect to the page
  return (
    <section className="p-2 pt-10 max-w-8xl w-[90%] flex flex-col gap-2">
      <h1 className="font-bold text-3xl">Search Orders</h1>
      <SearchBar onSearch={handleSearch} />

      {!query ? (
        <p className="text-gray-500">Please enter an Order ID to search.</p>
      ) : orders && orders.length === 0 ? (
        <p>No orders found for "{query}", Try checking the completed section.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="h-.5 [&>th]:py-0 text-xs">
              <TableHead className="border-r border-gray-200">File ID</TableHead>
              <TableHead className="border-r border-gray-200">Production Status</TableHead>
              <TableHead className="border-r border-gray-200">Material</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {orders?.map((order) => (
              <TableRow
                key={order.name_id}
                className="hover:bg-gray-50"
                onClick={
                  () =>
                    router.push(
                      // how do we get the
                      getCorrectPage(order.production_status ?? "", order.material ?? "", order.name_id ?? "")
                    )
                  // console.log("Clicked order:", order.name_id)
                }
              >
                <TableCell>{order.name_id}</TableCell>
                <TableCell>{order.production_status}</TableCell>
                <TableCell>{order.material}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
