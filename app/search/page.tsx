"use client";

import { Separator } from "@/components/ui/separator";
import { SearchBar } from "@/components/search-bar";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Order } from "@/types/custom";
import React, { useState, useEffect } from "react";
import { Table, TableHead, TableRow, TableHeader } from "@/components/ui/table";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Fragment } from "react";
// ! temporarily disabled for now
import { useSearchParams } from "next/navigation";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("query");

  const [ordersData, setOrdersData] = useState<Order[] | null>(null);
  useEffect(() => {
    if (query && typeof query === "string") {
      const supabase = createClientComponentClient();
      supabase
        .from("orders")
        .select("*")
        .eq("order_id", parseInt(query))
        .then(({ data, error }) => {
          if (error) {
            console.error("Error fetching orders:", error);
            setOrdersData(null);
          } else {
            setOrdersData(data);
          }
        });
    } else {
      setOrdersData(null);
    }
  }, [query]);

  return (
    <div className="p-2 pt-10 max-w-8xl w-[70%] flex flex-col items-center gap-2 relative">
      <h1>Search Results for "{query}"</h1>
      {ordersData !== null ? (
        <div className="">
          <Fragment>
            <Table className="mb-4 w-full table-fixed">
              <TableHeader>
                <TableRow className="h.5 [&>th]:py-0 text-xs">
                  <TableHead className="text-left text-xs font-bold w-[50%]">File Name</TableHead>
                  <TableHead className="text-left text-xs font-bold">Category</TableHead>
                  <TableHead className="text-left text-xs font-bold">Order ID</TableHead>
                  {/* <TableHead className="text-left text-xs font-bold">Last Processed</TableHead> */}
                </TableRow>
              </TableHeader>
              <tbody>
                {ordersData.map((order) => (
                  <TableRow key={order.name_id} className="h-5 [&>td]:py-0 text-xs">
                    <td className="text-left text-xs font-bold">{order.name_id}</td>
                    <td className="text-left text-xs font-bold">{order.production_status}</td>
                    <td className="text-left text-xs font-bold">{order.order_id}</td>
                    {/* <td className="text-left text-xs font-bold">{order.due_date}</td> */}
                  </TableRow>
                ))}
              </tbody>
            </Table>
          </Fragment>
        </div>
      ) : (
        <p>No orders found.</p>
      )}
    </div>
  );
}

// export default async function SearchPage({
//   searchParams,
// }: {
//   searchParams: { query?: string | string[] };
// }) {
//   const supabase = await createClient();

//   const {
//     data: { user },
//   } = await supabase.auth.getUser();

//   if (!user) {
//     console.log("User not found, redirecting to login");
//     return redirect("/login");
//   }

//   const query = searchParams.query ?? "";

//   let ordersData: Order[] = [];
//   if (query == null) {
//     console.log("No query provided");
//     // return redirect("/search");
//   }
