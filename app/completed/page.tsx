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
} from "@/components/ui/pagination"
import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { OrderTableHeader } from "@/components/order-table-header";

export default async function ToPrintPage({ searchParams }: { searchParams?: { page?: string } }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.log("User not found, redirecting to login");
    return redirect("/login");
  }

  // Paginated fetch from "Completed" table
  const page = parseInt(searchParams?.page || "1", 10);
  const limit = 100;
  const from = (page - 1) * limit;
  const to = page * limit - 1;
  const { data: orders, count } = await supabase
    .from("completed")
    .select("*", { count: 'exact' })
    .order("due_date", { ascending: false })
    .range(from, to);
  console.log("Fetched Completed orders:", orders);

  const total = count || 0;
  const pages = Math.ceil(total / limit);
  return (
    <section className="p-2 pt-10 max-w-8xl w-[90%] flex flex-col gap-2">
      <Table>
        {/* Use the same headers styling */}
        <OrderTableHeader tableHeaders={[
          "name_id",
          "shape",
          "lamination",
          "material",
          "quantity",
          "ink",
          "print_method",
          "due_date",
          "ihd_date",
          "notes",
          ""
        ]} />
        <TableBody>
          {orders?.map((order) => (
            <TableRow key={order.name_id} className="hover:bg-gray-50">
              <TableCell>{order.name_id}</TableCell>
              <TableCell>{order.shape}</TableCell>
              <TableCell>{order.lamination}</TableCell>
              <TableCell>{order.material}</TableCell>
              <TableCell>{order.quantity}</TableCell>
              <TableCell>{order.ink}</TableCell>
              <TableCell>{order.print_method}</TableCell>
              <TableCell>{order.due_date}</TableCell>
              <TableCell>{order.ihd_date}</TableCell>
              <TableCell>{order.notes}</TableCell>
              <TableCell />
            </TableRow>
          ))}
        </TableBody>
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
