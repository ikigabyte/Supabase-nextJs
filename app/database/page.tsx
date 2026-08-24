'use server'

import { redirect } from "next/navigation";
import { getServerClient } from "@/utils/supabase/server";
import { assignKeyType } from "@/utils/orderKeyAssigner";
import type { Order } from "@/types/custom";
import type { OrderTypes } from "@/utils/orderTypes";

type DatabaseSearchParams = {
  query?: string | string[];
};

function getOrderQueueUrl(order: Order) {
  const productionStatus = order.production_status as OrderTypes;
  const category = (assignKeyType(order, productionStatus) ?? "unassigned").split("-")[0].toLowerCase();
  const nameId = encodeURIComponent(order.name_id);

  switch (productionStatus) {
    case "print":
      return `/database/toprint?${category}=${nameId}`;
    case "cut":
      return `/database/tocut?${category}=${nameId}`;
    case "prepack":
      return `/database/toprepack?${category}=${nameId}`;
    case "pack":
      return `/database/topack?${category}=${nameId}`;
    case "ship":
      return `/database/toship?${category}=${nameId}`;
    default:
      return null;
  }
}

export default async function DatabaseHome({
  searchParams,
}: {
  searchParams?: Promise<DatabaseSearchParams>;
}) {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/database/login");
  }

  const query = (await searchParams)?.query;
  const nameId = (Array.isArray(query) ? query[0] : query)?.trim();

  if (nameId) {
    const { data, error } = await supabase.from("orders").select("*").eq("name_id", nameId).maybeSingle();
    const destination = !error && data ? getOrderQueueUrl(data as Order) : null;

    if (destination) {
      redirect(destination);
    }

    redirect("/database/toprint?rush&orderNotFound=1");
  }

  redirect("/database/toprint?rush");
}
