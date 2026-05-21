import { redirect } from "next/navigation";

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
  const params = new URLSearchParams();

  if (sp.page) params.set("page", sp.page);
  if (sp.order) params.set("order", sp.order);
  if (sp.view) params.set("view", sp.view);

  const query = params.toString();
  return redirect(`/database/admin${query ? `?${query}` : ""}#history`);
}
