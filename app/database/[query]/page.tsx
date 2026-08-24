"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getBrowserClient } from "@/utils/supabase/client";
import { assignKeyType } from "@/utils/orderKeyAssigner";
import type { Order } from "@/types/custom";
import type { OrderTypes } from "@/utils/orderTypes";
import { convertToSpaces } from "@/lib/utils";

function normalizeOrderName(value: string) {
  return convertToSpaces(value).trim();
}

function getOrderIdPrefix(value: string) {
  const beforeDash = value.split("-")[0]?.trim() ?? "";
  return /^\d+$/.test(beforeDash) ? Number(beforeDash) : null;
}

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

export default function DatabaseQueryPage() {
  const params = useParams<{ query: string }>();
  const router = useRouter();
  const [orderNotFound, setOrderNotFound] = useState(false);

  useEffect(() => {
    const query = decodeURIComponent(params.query ?? "");
    const nameId = query.startsWith("query=") ? normalizeOrderName(query.slice("query=".length)) : "";
    let cancelled = false;

    const findOrder = async () => {
      if (!nameId) {
        setOrderNotFound(true);
        return;
      }

      const supabase = getBrowserClient();
      const orderId = getOrderIdPrefix(nameId);
      const lookup = supabase.from("orders").select("*");
      const { data, error } = orderId === null
        ? await lookup.eq("name_id", nameId)
        : await lookup.eq("order_id", orderId);

      if (cancelled) return;

      if (error) {
        console.error("Error finding queried order:", error);
      }

      const matchingOrder = !error
        ? data?.find((order) => normalizeOrderName(order.name_id) === nameId)
        : null;
      const destination = matchingOrder ? getOrderQueueUrl(matchingOrder as Order) : null;

      if (destination) {
        router.replace(destination);
        return;
      }

      setOrderNotFound(true);
    };

    void findOrder();

    return () => {
      cancelled = true;
    };
  }, [params.query, router]);

  return (
    <div className="flex min-h-[calc(100vh-57px)] w-full items-center justify-center">
      {orderNotFound && <p className="text-sm text-muted-foreground">Order is no longer in the log, it might be in the Completed Section</p>}
    </div>
  );
}
