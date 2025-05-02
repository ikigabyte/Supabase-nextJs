import { SearchBar } from "@/components/search-bar";
import { Order } from "@/types/custom";
import { Table, TableHead, TableRow, TableHeader } from "@/components/ui/table";

import SearchResults from "@/components/searchresults";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { query?: string | string[] } | Promise<{ query?: string | string[] }>;
}) {
  const { query: rawQuery } = await searchParams;
  const query = Array.isArray(rawQuery) ? rawQuery[0] : rawQuery ?? '';
  console.log(query);
  return (
    <div className="p-2 pt-10 max-w-8xl w-[70%] flex flex-col items-center gap-2 relative">
      {/* <h2 className="font-bold text-lg">Completed</h2> */}
      <SearchResults initialQuery={query} />
    </div>
  );
}
