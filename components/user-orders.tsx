"use client";
import React, { useState, useEffect } from "react";
import { History } from "@/types/custom";
import { getBrowserClient } from "@/utils/supabase/client";
import { Table, TableBody, TableRow, TableCell, TableHead, TableHeader } from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "@/components/ui/pagination";

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
  const [page, setPage] = useState(1);
  const limit = 20;

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
        <p className="text-sm text-muted-foreground">Total actions committed: {orders.length}</p>
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
            {orders.slice((page - 1) * limit, page * limit).map((order) => (
              <TableRow key={order.id} className="h-5 text-sm">
                <TableCell className="text-left align-middle">{order.name_id}</TableCell>
                <TableCell className="text-left align-middle">{order.production_change}</TableCell>
                <TableCell className="text-left align-middle">{formatDate(order.inserted_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          {/* <CompletedOrganizer orders={orders} /> */}m
        </Table>
        {/* Pagination Controls */}
        {orders.length > limit && (
          <Pagination className="mt-4">
            <PaginationPrevious
              href="#"
              onClick={e => { e.preventDefault(); setPage(p => Math.max(1, p - 1)); }}
            />
            <PaginationContent>
              {(() => {
                const totalPages = Math.ceil(orders.length / limit);
                const maxVisiblePages = 5;
                const windowStart = Math.max(1, Math.min(page - 2, totalPages - maxVisiblePages + 1));
                const windowEnd = Math.min(totalPages, windowStart + maxVisiblePages - 1);
                const middlePages = Array.from({ length: windowEnd - windowStart + 1 }, (_, idx) => windowStart + idx);
                return (
                  <>
                    {windowStart > 1 && (
                      <PaginationItem>
                        <PaginationLink href="#" onClick={e => { e.preventDefault(); setPage(1); }}>1</PaginationLink>
                      </PaginationItem>
                    )}
                    {windowStart > 2 && (
                      <PaginationItem><PaginationEllipsis /></PaginationItem>
                    )}
                    {middlePages.map(p => (
                      <PaginationItem key={p}>
                        <PaginationLink href="#" isActive={p === page} onClick={e => { e.preventDefault(); setPage(p); }}>{p}</PaginationLink>
                      </PaginationItem>
                    ))}
                    {windowEnd < totalPages - 1 && (
                      <PaginationItem><PaginationEllipsis /></PaginationItem>
                    )}
                    {windowEnd < totalPages && (
                      <PaginationItem>
                        <PaginationLink href="#" onClick={e => { e.preventDefault(); setPage(totalPages); }}>{totalPages}</PaginationLink>
                      </PaginationItem>
                    )}
                  </>
                );
              })()}
            </PaginationContent>
            <PaginationNext
              href="#"
              onClick={e => { e.preventDefault(); setPage(p => Math.min(Math.ceil(orders.length / limit), p + 1)); }}
            />
          </Pagination>
        )}
      </section>
      {/* <h1> Recently clicked orders</h1> */}
    </>
  );
}
