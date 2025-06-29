"use client";

import React, { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Table, TableBody, TableRow, TableCell, TableHead, TableHeader } from "@/components/ui/table";
import { SearchBar } from "./search-bar";
import { Order } from "@/types/custom";
import { useRouter } from "next/navigation";

export default function SearchResults() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [query, setQuery] = useState<string>("");

  const supabase = createClientComponentClient();

  async function handleSearch(newQuery: string) {
    setQuery(newQuery);
    if (!newQuery) {
      setOrders([]);
      return;
    }

    const { data, error } = await supabase.from("orders").select("*").eq("order_id", parseInt(newQuery, 10));

    if (error) {
      console.error("Error fetching orders:", error);
      setOrders([]);
    } else {
      setOrders(data);
    }
  }

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
              <TableHead className="border-r border-gray-200">Order ID</TableHead>
              <TableHead className="border-r border-gray-200">Production Status</TableHead>
              <TableHead className="border-r border-gray-200">Material</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {orders?.map((order) => (
              <TableRow
                key={order.name_id}
                className="hover:bg-gray-50"
                onClick={() =>
                  router.push(
                    getCorrectPage(order.production_status ?? "", order.material ?? "", order.order_id.toString() ?? "")
                  )
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
