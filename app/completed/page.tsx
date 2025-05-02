"use server";

// import { ButtonOrganizer } from "@/components/button-organizer";
import { OrderOrganizer } from "@/components/order-organizer";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { OrderTableHeader } from "@/components/order-table-header";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

import { CompletedOrganizer } from "@/components/completed-organizer";

export default async function CompletedPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.log("User not found, redirecting to login");
    return redirect("/login");
  }
  // console.log("User found:", user);

  // Paginated fetch from "Completed" table
  const page = 1; // Default to page 1
  const limit = 100;
  const from = (page - 1) * limit;
  const to = page * limit - 1;
  const { data: orders, count } = await supabase
    .from("completed")
    .select("*", { count: "exact" })
    .order("due_date", { ascending: false })
    .range(from, to);

  // console.log(orders);

  // console.log("Fetched Completed orders:", orders);

  const total = count || 0;
  const pages = Math.ceil(total / limit);
  return (
    <section className="p-2 pt-10 max-w-8xl w-[80%] flex flex-col gap-2">
      <h1 className="font-bold text-3xl">Completed</h1>
      <Table>
        {/* Use the same headers styling */}
        <OrderTableHeader
          tableHeaders={[
            "name_id",
            "shape",
            "lamination",
            "material",
            "quantity",
            "ink",
            "print_method",
            "ship date",
            "ihd_date",
            "shipping speed",
            "notes",
            "Zendesk",
          ]}
        />
        <CompletedOrganizer orders={orders} />
      </Table>
      <Pagination>
        <PaginationPrevious href={`?page=${Math.max(page - 1, 1)}`}>Previous</PaginationPrevious>
        <PaginationContent>
          {Array.from({ length: pages }).map((_, idx) => {
            const p = idx + 1;
            return (
              <PaginationItem key={p} className={p === page ? "active" : ""}>
                <PaginationLink href={`?page=${p}`}>{p}</PaginationLink>
              </PaginationItem>
            );
          })}
        </PaginationContent>
        <PaginationNext href={`?page=${Math.min(page + 1, pages)}`}>Next</PaginationNext>
      </Pagination>
    </section>
  );
}
