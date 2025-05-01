import { Separator } from "@/components/ui/separator";
import { SearchBar } from "@/components/search-bar";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Order } from "@/types/custom";
import { Fragment } from "react";
import { Table, TableHead, TableRow, TableHeader } from "@/components/ui/table";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { query?: string | string[] };
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.log("User not found, redirecting to login");
    return redirect("/login");
  }

  const query = searchParams.query ?? "";

  // Fetch orders matching property_id === query
  let ordersData: Order[] = [];
  if (query == null) {
    console.log("No query provided");
    // return redirect("/search");
  }

  if (query && typeof query === "string") {
    const supabase = await createClient();
    const { data, error } = await supabase.from("orders").select("*").eq("order_id", parseInt(query));
    if (error) {
      console.error("Error fetching orders:", error);
    } else {
      ordersData = data;
    }
  }

  // console.log("ordersData", ordersData);
  
  return (
    <section className="p-3 pt-6 max-w-2xl w-full flex flex-col gap-4">
      <SearchBar />
      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
        {query ? `Looking for Order matching "${query}"` : "Enter a search term"}
      </h1>
      <Separator className="w-full" />
      {query && ordersData.length === 0 && <h3>No orders found during query</h3>}
      {/* ordersData.foreach */}
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
          {ordersData.map((order) => (
            <TableRow key={order.name_id} className="h-5 [&>td]:py-0 text-xs">
              <td className="text-left text-xs font-bold">{order.name_id}</td>
              <td className="text-left text-xs font-bold">{order.production_status}</td>
              <td className="text-left text-xs font-bold">{order.order_id}</td>
              {/* <td className="text-left text-xs font-bold">{order.due_date}</td> */}
            </TableRow>
          ))}
        </Table>
      </Fragment>

      {/* You can render results here, e.g. a list filtered by `query` */}
    </section>
  );
}
