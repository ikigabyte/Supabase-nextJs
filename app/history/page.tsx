import { getServerClient } from "@/utils/supabase/server";
import Link from "next/link";
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
import { Button } from "@/components/ui/button";
import { HistoryOrderLookup } from "@/components/history-order-lookup";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const ALLOWED_POSITIONS = new Set(["prepress", "printing"]);

type HistorySearchParams = {
  page?: string;
  order?: string;
  view?: "all" | "mine";
};

export default async function HistoryPage({
  searchParams,
}: {
  searchParams?: Promise<HistorySearchParams>;
}) {
  const sp = (await searchParams) ?? {};
  const supabase = await getServerClient();

  const pageRaw = sp.page ?? "1";
  const page = Math.max(parseInt(pageRaw, 10) || 1, 1);
  const rawOrderQuery = (sp.order ?? "").trim();
  const parsedSearchKey = rawOrderQuery.split("-")[0].trim().replace(/[^a-zA-Z0-9]/g, "");
  const orderParamRaw = parsedSearchKey.slice(0, 32);
  const viewMode = sp.view === "mine" ? "mine" : "all";

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  const { data: profile } = await supabase.from("profiles").select("role, position").eq("id", user.id).maybeSingle();
  const normalizedPosition = (profile?.position ?? "").trim().toLowerCase().replace(/[^a-z]/g, "");
  const isAdminRole = profile?.role === "admin";
  console.log(isAdminRole)
  console.log(normalizedPosition, ALLOWED_POSITIONS.has(normalizedPosition))
  if (!isAdminRole && !ALLOWED_POSITIONS.has(normalizedPosition)) {
    return redirect("/");
  }

  const limit = 100;
  const from = (page - 1) * limit;
  const to = page * limit - 1;

  let q = supabase
    .from("history")
    .select("id, name_id, production_change, inserted_at", { count: "exact" })
    .order("inserted_at", { ascending: false });

  if (orderParamRaw) {
    q = q.or(`name_id.eq.${orderParamRaw},name_id.ilike.${orderParamRaw}-%`);
  }
  if (viewMode === "mine") {
    q = q.eq("user_id", user.id);
  }

  const { data: historyRows, count } = await q.range(from, to);

  const formatTimestamp = (value: string | null) => {
    if (!value) return "No history yet";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    const hour = String(d.getHours()).padStart(2, "0");
    const minute = String(d.getMinutes()).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${hour}:${minute} ${day}/${month}`;
  };

  const latestInsertedAt = formatTimestamp(historyRows?.[0]?.inserted_at ?? null);
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
    if (viewMode === "mine") params.set("view", "mine");
    return `?${params.toString()}`;
  };

  const viewHrefFor = (nextView: "all" | "mine") => {
    const params = new URLSearchParams();
    params.set("page", "1");
    if (orderParamRaw) params.set("order", orderParamRaw);
    if (nextView === "mine") params.set("view", "mine");
    return `?${params.toString()}`;
  };

  return (
    <section className="p-1 pt-10 w-[95%] flex flex-col gap-2 mb-40 mx-auto">
      <h1 className="font-bold text-3xl">HISTORY</h1>
      <p>View the most recent actions, last updated: {latestInsertedAt}</p>
      <div className="flex items-center gap-2">
        <Button asChild variant={viewMode === "mine" ? "default" : "outline"}>
          <Link href={viewHrefFor("mine")}>View my orders</Link>
        </Button>
        <Button asChild variant={viewMode === "all" ? "default" : "outline"}>
          <Link href={viewHrefFor("all")}>View all orders</Link>
        </Button>
      </div>
      <HistoryOrderLookup />

      <Table>
        <TableHeader>
          <TableRow className="h-5">
            <TableHead className="h-5 py-1 text-xs">Name ID</TableHead>
            <TableHead className="h-5 py-1 text-xs">Production Change</TableHead>
            <TableHead className="h-5 py-1 text-xs">Inserted At</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(historyRows ?? []).map((row) => (
            <TableRow key={row.id} className="h-5">
              <TableCell className="py-1 text-xs">{row.name_id ?? "-"}</TableCell>
              <TableCell className="py-1 text-xs">{row.production_change}</TableCell>
              <TableCell className="py-1 text-xs">{formatTimestamp(row.inserted_at)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
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
