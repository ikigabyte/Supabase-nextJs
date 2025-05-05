'use client'
// import * as React from "react"
import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { SkipBack, Eye, MailOpen, Trash } from "lucide-react"
import { Separator } from "./ui/separator";
import { OrderTypes } from "@/utils/orderTypes";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { History } from "@/types/custom";
import { OrderTableHeader } from "@/components/order-table-header";

import { Table, TableBody, TableRow, TableCell, TableHead, TableHeader } from "@/components/ui/table";

const supabase = createClientComponentClient();

const formatDate = (dateString: string | null) => {

  if (!dateString || dateString == null) {
    return "";
  }
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  };
  return date.toLocaleDateString("en-US", options);

}
export function UserOrders() {
  const [orders, setOrders] = useState<History[]>([]);
  const [user, setUser] = useState<string>("Guest");
  // const clientUser = supabase.auth.getUser();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user?.email ?? "Guest");
    });
  }, [user]);
  
  useEffect(() => {
    supabase
      .from("history")
      .select()
      // .eq("production_status", orderType)
      .order("inserted_at", { ascending: false })
      .then(({ data }) => setOrders(data ?? []));
  }, [orders]);

  // console.log(orders);
  return (
    <>
      <section className="p-2 pt-10 max-w-8xl w-[80%] flex flex-col gap-2">
        <h1 className="font-bold text-3xl "> {user} Orders Touched</h1>
        <Table>
          {/* Use the same headers styling */}
          <TableHeader>
            <TableRow className="h-.5 [&>th]:py-0 text-xs">
              <TableHead>Order Touched</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Time Touched</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id} className="h-5 text-sm">
                <TableCell className="text-left align-middle">{order.name_id}</TableCell>
                <TableCell className="text-left align-middle">{order.production_change}</TableCell>
                <TableCell className="text-left align-middle">{formatDate(order.inserted_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          {/* <CompletedOrganizer orders={orders} /> */}
        </Table>
      </section>
      {/* <h1> Recently clicked orders</h1> */}
    </>
  );
}
