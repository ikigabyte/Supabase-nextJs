import { getServerClient } from "@/utils/supabase/server";
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
import { Table } from "@/components/ui/table";
import { OrderTableHeader } from "@/components/order-table-header";
import { CompletedOrganizer } from "@/components/completed-organizer";
import { CompletedOrderLookup } from "@/components/completed-order-lookup";

type CompletedSearchParams = {
  page?: string;
  order?: string;
};

export default async function CompletedPage({
  searchParams,
}: {
  searchParams?: Promise<CompletedSearchParams>;
}) {
  const sp = (await searchParams) ?? {};

  const supabase = await getServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return redirect("/database/login");

  const orderParamRaw = (sp.order ?? "").replace(/\D/g, "").slice(0, 7);
  const orderId = orderParamRaw ? Number(orderParamRaw) : null;

  const pageRaw = sp.page ?? "1";
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
  const maxVisiblePages = 5;
  const windowStart = Math.max(1, Math.min(page - 2, pages - maxVisiblePages + 1));
  const windowEnd = Math.min(pages, windowStart + maxVisiblePages - 1);
  const middlePages = Array.from({ length: windowEnd - windowStart + 1 }, (_, idx) => windowStart + idx);

  const hrefFor = (p: number) => {
    const params = new URLSearchParams();
    params.set("page", String(p));
    if (orderParamRaw) params.set("order", orderParamRaw);
    return `?${params.toString()}`;
  };

  return (
    <section className="p-1 pt-10 w-[95%] flex flex-col gap-2 mb-40 mx-auto">
      <h1 className="font-bold text-3xl">COMPLETED</h1>
      <p>Click on a row to open the corresponding Zendesk ticket.</p>
      <CompletedOrderLookup />

      <Table>
        <OrderTableHeader
          tableHeaders={[
            "file name (click to view on zendesk)",
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
        <PaginationPrevious href={hrefFor(Math.max(page - 1, 1))}>
          Previous
        </PaginationPrevious>

        <PaginationContent>
          {windowStart > 1 && (
            <PaginationItem className={page === 1 ? "active" : ""}>
              <PaginationLink href={hrefFor(1)}>1</PaginationLink>
            </PaginationItem>
          )}

          {windowStart > 2 && (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          )}

          {middlePages.map((p) => (
            <PaginationItem key={p} className={p === page ? "active" : ""}>
              <PaginationLink href={hrefFor(p)}>{p}</PaginationLink>
            </PaginationItem>
          ))}

          {windowEnd < pages - 1 && (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          )}

          {windowEnd < pages && (
            <PaginationItem className={page === pages ? "active" : ""}>
              <PaginationLink href={hrefFor(pages)}>{pages}</PaginationLink>
            </PaginationItem>
          )}
        </PaginationContent>

        <PaginationNext href={hrefFor(Math.min(page + 1, pages))}>
          Next
        </PaginationNext>
      </Pagination>
    </section>
  );
}
