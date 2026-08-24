import { redirect } from "next/navigation";

export default async function LegacyDatabaseQueryPage({
  params,
}: {
  params: Promise<{ query: string }>;
}) {
  const { query } = await params;

  if (query.startsWith("query=")) {
    redirect(`/database?query=${encodeURIComponent(query.slice("query=".length))}`);
  }

  redirect("/database/toprint?rush");
}
