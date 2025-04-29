"use client";

import React, { Fragment, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Table } from "@/components/ui/table";
import { Order } from "@/types/custom";
import { OrderTableHeader } from "./order-table-header";
import { OrderTableBody } from "./order-table-body";
import { groupOrdersByOrderType } from "@/utils/grouper";
import { ButtonOrganizer } from "./button-organizer";
// lib/supabase.ts

import { createClient } from "@/utils/supabase/client";
import { OrderTypes } from "@/utils/orderTypes";
import { getButtonCategories } from "@/types/buttons";
import { updateOrderStatus, updateOrderNotes } from "@/app/toprint/actions";
import { Separator } from "./ui/separator";
import { getMaterialHeaders } from "@/types/headers";
import { ScrollAreaDemo } from "./scroll-area";
import { orderKeys } from "@/utils/orderKeyAssigner";

// import { useArticles } from "@/hooks/useArticles";

// export const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// )
// import { createClient } from "@/utils/supabase/server";

function getCategoryCounts(orders: Order[], categories: string[]): Record<string, number> {
  return categories.reduce((acc, category) => {
    if (category.toLowerCase() == "regular") {
      const count = orders.filter((order) => order.material?.toLowerCase() !== "roll").length;
      acc["regular"] = count;
      return acc;
    }
    const count = orders.filter((order) => order.material?.toLowerCase() === category.toLowerCase()).length;
    acc[category] = count;
    return acc;
  }, {} as Record<string, number>);
}

export function OrderOrganizer({ orderType, defaultPage }: { orderType: OrderTypes; defaultPage: string }) {
  // export function OrderOrganizer({ todos, categories }: { todos: Array<Order>; categories: string[] }) {
  const supabase = createClient();
  // const categories = getCategoryTypes(orderType);

  const router = useRouter();
  const pathname = usePathname();
  // console.log("this is the pathname", pathname);

  const [orders, setOrders] = useState<Order[]>([]);
  // console.log(orderType);

  useEffect(() => {
    // Initial load
    supabase
      .from("orders")
      .select()
      .eq("production_status", orderType)
      .order("due_date", { ascending: false })
      .order("order_id", { ascending: true })
      .then(({ data }) => setOrders(data ?? []));

    const channel = supabase
      .channel(`orders_${orderType}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders", filter: `production_status=eq.${orderType}` },
        (payload) => {
          const newOrder = payload.new as Order;
          setOrders((prev) => [newOrder, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `production_status=eq.${orderType}` },
        (payload) => {
          const newOrder = payload.new as Order;
          setOrders((prev) => prev.map((o) => (o.name_id === newOrder.name_id ? newOrder : o)));
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "orders", filter: `production_status=eq.${orderType}` },
        (payload) => {
          const oldOrder = payload.old as Order;
          setOrders((prev) => prev.filter((o) => o.name_id !== oldOrder.name_id));
        }
      )
      .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
  }, [orderType]);

  // const orderKeys =
  // console.log("this is supabase", supabase);

  const grouped = groupOrdersByOrderType(orderType, orders);
  const designatedCategories = getButtonCategories(orderType);
  // const designatedHeaders = GetD
  if (!designatedCategories) {
    console.error("designatedCategories is undefined");
    return null; // or handle the error as needed
  }

  const categoryCounts = getCategoryCounts(orders, designatedCategories);
  // console.log("the category counts are" + categoryCounts);

  // todo add it here so the first visible groups is the default category
  const [visibleGroups, setVisibleGroups] = useState<Record<string, boolean>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>(defaultPage);
  const [headers, setHeaders] = useState<string[]>(() => getMaterialHeaders(orderType, defaultPage));

  const [isRowHovered, setIsRowHovered] = useState<boolean>(false);
  const [rowHistory, setRowHistory] = useState<string[] | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // console.log("this is the headers", headers);
  // setHeaders(getMaterialHeaders(orderType, defaultPage));

  // const getAssignedHeaders = get(orderType, defaultPage);
  // console.log("this is the headers", getAssignedHeaders);

  useEffect(() => {
    const groupKeys = Object.keys(grouped);
    if (groupKeys.length > 0 && Object.keys(visibleGroups).length === 0) {
      const initial = groupKeys.reduce((acc, key) => {
        acc[key] = true;
        return acc;
      }, {} as Record<string, boolean>);
      setVisibleGroups(initial);
    }
  }, [grouped, visibleGroups]);

  // console.log("this is the visible groups", visibleGroups);

  const convertKeyToTitle = (key: string) => {
    return key
      .split("-") // Split the key by "-"
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each word
      .join(" "); // Join the words with a space
  };

  const handleCategoryClick = (category: string) => {
    console.log(`Category clicked: ${category}`);
    setSelectedCategory(category);
    setHeaders(getMaterialHeaders(orderType, category.toLowerCase()));
    router.push(`${pathname}?${category.toLowerCase()}`);
    const lowerCategory = category.toLowerCase();
    setVisibleGroups((prev) => {
      const newVisibility = {} as Record<string, boolean>;
      Object.keys(prev).forEach((key) => {
        // Compare first segment of each group key
        const prefix = key.split("-")[0];
        newVisibility[key] = prefix === lowerCategory;
      });
      return newVisibility;
    });
  };

  useEffect(() => {
    if (defaultPage) {
      handleCategoryClick(defaultPage);
    }
  }, [defaultPage]);

  const handleCheckboxClick = async (order: Order) => {
    console.log(`Order clicked: ${order.name_id}`);
    await updateOrderStatus(order, "production_status");
  };

  const handleNoteChange = async (order: Order, newNotes: string) => {
    // console.log(`Notes changed for order ID: ${orderId}`);
    // console.log(`New notes: ${newNotes}`);
    console.log("this is the order here", order);
    await updateOrderNotes(order, newNotes);
    // Add logic to update the notes for the given order ID in the database or state
  };

  if (headers.length === 0) {
    console.error("Headers are not defined, please add some headers for these buttons here");
    return null;
  }

  // Ensure we render a table for every possible key, even if group is empty
  const allKeys = orderKeys[orderType] || [];

  // console.log("this is the all keys", allKeys);
  // console.log(visibleGroups);
  // console.log(visibleGroups[key]);
  // console.log(designatedCategories);
  return (
    <>
      <div className="relative">
        <div>
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
            {"To " + orderType.charAt(0).toUpperCase() + orderType.slice(1)} -{" "}
            {selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}
          </h1>
          <Separator className="w-full mb-10" />
        </div>
        <Fragment>
          {allKeys.map((key) => {
            // console.log("this is the key", key);
            const group = grouped[key] || [];
            return (
              <Fragment key={key}>
                <div className="flex items-center justify-between"></div>
                {selectedCategory.toLowerCase() === key.split("-")[0] && (
                  <>
                    <h2 className="font-bold text-lg">{convertKeyToTitle(key)}</h2>
                    <Table className="mb-4 w-full table-fixed">
                      <OrderTableHeader tableHeaders={headers} />
                      <OrderTableBody
                        data={group}
                        onOrderClick={handleCheckboxClick}
                        onNotesChange={handleNoteChange}
                        setIsRowHovered={setIsRowHovered}
                        setMousePos={setMousePos}
                        setRowHistory={setRowHistory}
                      />
                    </Table>
                  </>
                )}
              </Fragment>
            );
          })}
        </Fragment>
        {/* Pass both categories and onCategoryClick to ButtonOrganizer */}
        <ButtonOrganizer
          categories={designatedCategories}
          counts={categoryCounts}
          onCategoryClick={handleCategoryClick}
        />
        {isRowHovered && (
          <div
            style={{
              position: "fixed",
              top: mousePos.y + 10,
              left: mousePos.x + 10,
              pointerEvents: "none",
            }}
          >
            <ScrollAreaDemo historySteps={rowHistory ?? undefined} />
          </div>
        )}
      </div>
    </>
  );
}
