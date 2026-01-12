"use server";

import { getServerClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Table } from "@/components/ui/table";
import { OrderTableHeader } from "@/components/order-table-header";
import { CompletedOrganizer } from "@/components/completed-organizer";
import { CompletedOrderLookup } from "@/components/completed-order-lookup";

export default async function CompletedPage({
  searchParams,
}: {
  searchParams?: { page?: string; order?: string };
}) {
  const supabase = await getServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return redirect("/login");

  const orderParamRaw = (searchParams?.order ?? "").replace(/\D/g, "").slice(0, 7);
  const orderId = orderParamRaw ? Number(orderParamRaw) : null;

  const pageRaw = searchParams?.page ?? "1";
  const page = Math.max(parseInt(pageRaw, 10) || 1, 1);

  const limit = 100;
  const from = (page - 1) * limit;
  const to = page * limit - 1;

  let q = supabase
    .from("completed")
    .select("*", { count: "exact" })
    .order("inserted_date", { ascending: false });

  if (orderId !== null && Number.isFinite(orderId)) {
    q = q.eq("order_id", orderId);
  }

  const { data: orders, count } = await q.range(from, to);

  const total = count || 0;
  const pages = Math.max(Math.ceil(total / limit), 1);

  const hrefFor = (p: number) => {
    const params = new URLSearchParams();
    params.set("page", String(p));
    if (orderParamRaw) params.set("order", orderParamRaw);
    return `?${params.toString()}`;
  };

  return (
    <section className="p-1 pt-10 w-[95%] flex flex-col gap-2 mb-40 mx-auto">
      <h1 className="font-bold text-3xl">COMPLETED</h1>

      <CompletedOrderLookup />

      <Table>
        <OrderTableHeader
          tableHeaders={[
            "file name",
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
            "completed_at",
            "history",
          ]}
          ignoreAssignee={true}
          ignoreIndex={true}
        />
        <CompletedOrganizer orders={orders} />
      </Table>

      <Pagination>
        <PaginationPrevious href={hrefFor(Math.max(page - 1, 1))}>Previous</PaginationPrevious>

        <PaginationContent>
          {Array.from({ length: pages }).map((_, idx) => {
            const p = idx + 1;
            return (
              <PaginationItem key={p} className={p === page ? "active" : ""}>
                <PaginationLink href={hrefFor(p)}>{p}</PaginationLink>
              </PaginationItem>
            );
          })}
        </PaginationContent>

        <PaginationNext href={hrefFor(Math.min(page + 1, pages))}>Next</PaginationNext>
      </Pagination>
    </section>
  );
}