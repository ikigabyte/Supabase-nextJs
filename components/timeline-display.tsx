"use client";
// import * as React from "react"
import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { SkipBack, Eye, MailOpen, Trash } from "lucide-react";
import { Separator } from "./ui/separator";
// import { OrderTypes } from "@/utils/orderTypes";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { TimelineOrder } from "@/types/custom";
// import { OrderTableHeader } from "@/components/order-table-header";
// import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableRow, TableCell, TableHead, TableHeader } from "@/components/ui/table";

const supabase = createClientComponentClient();

function isDateBeforeOrEqual(dateA: string | Date, dateB: string | Date) {
  const a = new Date(dateA);
  const b = new Date(dateB);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return a.getTime() <= b.getTime();
}

// const formatDate = (dateString: string | null) => {
//   if (!dateString || dateString == null) {
//     return "";
//   }
//   const date = new Date(dateString);
//   const options: Intl.DateTimeFormatOptions = {
//     year: "numeric",
//     month: "2-digit",
//     day: "2-digit",
//     hour: "2-digit",
//     minute: "2-digit",
//     second: "2-digit",
//   };
//   return date.toLocaleDateString("en-US", options);
// };

export function TimelineOrders() {
  const [dueOrders, setDueOrders] = useState<TimelineOrder[]>([]);
  const [futureOrders, setFutureOrders] = useState<TimelineOrder[]>([]);
  // const [user, setUser] = useState<string>("Guest");
  // const clientUser = supabase.auth.getUser();

  // useEffect(() => {
  //   supabase.auth.getUser().then(({ data }) => {
  //     setUser(data.user?.email ?? "Guest");
  //   });
  // }, [user]);

  useEffect(() => {
    supabase
      .from("timeline")
      .select()
      .order("ship_date", { ascending: false })
      .then(({ data }) => {
        if (!data) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        console.log("today is", today);

        const due = data
          .filter((order) => {
            const orderDate = new Date(order.ship_date + 'T00:00:00Z');
            return orderDate <= new Date(new Date().toISOString().split('T')[0] + 'T00:00:00Z');
          })
          .sort((a, b) => new Date(a.ship_date).getTime() - new Date(b.ship_date).getTime());

        const future = data
          .filter((order) => {
            const orderDate = new Date(order.ship_date + 'T00:00:00Z');
            return orderDate > new Date(new Date().toISOString().split('T')[0] + 'T00:00:00Z');
          })
          .sort((a, b) => new Date(a.ship_date).getTime() - new Date(b.ship_date).getTime());

        setDueOrders(due);
        setFutureOrders(future);
      });
  }, []);

  // console.log("Timeline Orders:", orders);

  // console.log("Due Orders:", dueOrders);
  // console.log("Future Orders:", futureOrders);

  // console.log(orders);
  return (
    <>
      <section className="p-2 pt-10 max-w-8xl w-[80%] flex flex-col gap-2">
        <h1 className="font-bold text-3xl "> Timeline Orders </h1>
        <h1 className="text-center font-bold text-lg">Orders Due</h1>
        <Table>
          {/* Use the same headers styling */}
          <TableHeader>
            <TableRow className="h-.5 [&>th]:py-0 text-xs">
              <TableHead>Order Id</TableHead>
              <TableHead>Shipping Method</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>IHD Date</TableHead>
              <TableHead>Production Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dueOrders.map((order) => {
              const orderDate = new Date(order.ship_date + 'T00:00:00');
              // const orderDate = order.ship_date ? new Date(order.ship_date + 'T00:00:00Z') : new Date(new Date().toISOString().split('T')[0] + 'T00:00:00Z');
             
              const isPastDue = isDateBeforeOrEqual(orderDate, new Date(new Date().toISOString().split('T')[0] + 'T00:00:00Z'));
              console.log(orderDate, isPastDue);
              // console.log("orderDate", orderDate);
              // const isPastDue = orderDate < new Date();
              // console.log("isPastDue", isPastDue);
              return (
                <TableRow key={`due-${order.order_id}`} className={isPastDue ? "bg-red-100" : ""}>
                  <TableCell className="text-left">{order.order_id}</TableCell>
                  <TableCell className="text-left">{order.shipping_method}</TableCell>
                  <TableCell className="text-left">{order.ship_date}</TableCell>
                  <TableCell className="text-left">{order.ihd_date}</TableCell>

                  <TableCell className="text-left">{order.production_status}</TableCell>

                </TableRow>
              );
            })}

            {/* Separator and Future Orders Label */}
            <TableRow>
              <TableCell colSpan={5}>
                <Separator className="my-4" />
                <h1 className="text-center font-bold text-lg">Future Orders</h1>
              </TableCell>
            </TableRow>

            {futureOrders.map((order) => (
              <TableRow key={`future-${order.order_id}`}>
                <TableCell className="text-left">{order.order_id}</TableCell>
                <TableCell className="text-left">{order.shipping_method}</TableCell>
                <TableCell className="text-left">{order.ship_date}</TableCell>
                <TableCell className="text-left">{order.ihd_date}</TableCell>
                <TableCell className="text-left">{order.production_status}</TableCell>

              </TableRow>
            ))}
          </TableBody>

          {/* <CompletedOrganizer orders={orders} /> */}
        </Table>
      </section>
    </>
  );
}
