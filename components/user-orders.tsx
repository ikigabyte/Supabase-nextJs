"use client";
import React, { useState, useEffect } from "react";
import { History } from "@/types/custom";
import { getBrowserClient } from "@/utils/supabase/client";
import { Table, TableBody, TableRow, TableCell, TableHead, TableHeader } from "@/components/ui/table";

const supabase = getBrowserClient();

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
};
export function UserOrders() {
  const [orders, setOrders] = useState<History[]>([]);
  const [user, setUser] = useState<string>("Guest");

  useEffect(() => {
    let cancelled = false;

    const loadMyOrders = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        if (!cancelled) {
          setUser("Guest");
          setOrders([]);
        }
        return;
      }

      if (!cancelled) {
        setUser(authUser.email ?? "Guest");
      }

      const { data } = await supabase
        .from("history")
        .select("id, inserted_at, name_id, production_change, user_id")
        .eq("user_id", authUser.id)
        .order("inserted_at", { ascending: false });

      if (!cancelled) {
        setOrders((data ?? []) as History[]);
      }
    };

    void loadMyOrders();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <section className="p-2 pt-10 max-w-8xl w-[80%] flex flex-col gap-2">
        <h1 className="font-bold text-3xl "> {user} History </h1>
        <Table>
          {/* Use the same headers styling */}
          <TableHeader>
            <TableRow className="h-.5 [&>th]:py-0 text-xs">
              <TableHead>Order Name</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Date</TableHead>
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
          {/* <CompletedOrganizer orders={orders} /> */}m
        </Table>
      </section>
      {/* <h1> Recently clicked orders</h1> */}
    </>
  );
}
