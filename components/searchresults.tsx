"use client";

import React, { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Table, TableBody, TableRow, TableCell, TableHead, TableHeader } from "@/components/ui/table";
import type { Order } from "@/types/custom";
import { OrderTableHeader } from "./order-table-header";

export default function SearchResults({ initialQuery }: { initialQuery: string }) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const supabase = createClientComponentClient();
  console.log("viewing orders for: ", initialQuery);
  useEffect(() => {
    if (!initialQuery) {
      setOrders([]);
      return;
    }
    supabase
      .from("orders")
      .select("*")
      .eq("order_id", parseInt(initialQuery, 10))
      .then(({ data, error }) => {
        if (error) {
          console.error("Error fetching orders:", error);
          setOrders([]);
        } else {
          setOrders(data);
        }
      });
  }, [initialQuery, supabase]);

  if (orders === null) {
    return <p>Loading...</p>;
  }
  if (orders.length === 0) {
    return <p>No orders found for "{initialQuery}", Try checking the completed section.</p>;
  }
  return (
    <section className="p-2 pt-10 max-w-8xl w-[90%] flex flex-col gap-2">
      <h1 className="font-bold text-3xl">Results for {initialQuery}</h1>
      <Table>
        {/* Use the same headers styling */}
            <TableHeader>
              <TableRow className="h-.5 [&>th]:py-0 text-xs">
                <TableHead className="border-r border-gray-200">Order ID</TableHead>
                {/* <TableHead className="border-r border-gray-200">Notes</TableHead> */}
                <TableHead className="border-r border-gray-200">Production Status</TableHead>
              </TableRow>
            </TableHeader>
      
        <TableBody>
          {orders?.map((order) => (
            <TableRow key={order.name_id} className="hover:bg-gray-50">
              <TableCell>{order.name_id}</TableCell>
              <TableCell>{order.production_status}</TableCell>
             
              {/* <TableCell>{order.notes}</TableCell> */}
              <TableCell />
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
