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

import { updateOrder } from "@/app/toprint/actions";
import { Separator } from "./ui/separator";
import { getMaterialHeaders } from "@/types/headers";
import { ScrollAreaDemo } from "./scroll-area";

// import { useArticles } from "@/hooks/useArticles";

// export const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// )
// import { createClient } from "@/utils/supabase/server";

export function OrderOrganizer({ orderType, defaultPage }: { orderType: OrderTypes; defaultPage: string }) {
  // export function OrderOrganizer({ todos, categories }: { todos: Array<Order>; categories: string[] }) {
  const supabase = createClient();
  // const categories = getCategoryTypes(orderType);

  const router = useRouter();
  const pathname = usePathname();
  // console.log("this is the pathname", pathname);

  const [orders, setOrders] = useState<Order[]>([]);
  console.log(orderType);
  // Event * listens for all changes
  const subscribeToOrders = () => {
    supabase
      .channel("orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `production_status=eq.${orderType}`,
        },
        (payload: any) => {
          const { eventType, new: newOrder, old: oldOrder } = payload;
          if (eventType === "INSERT") {
            console.log("New order inserted:", newOrder);
            setOrders((prev) => [newOrder, ...prev]);
          } else if (eventType === "UPDATE") {
            console.log("New order updated:", newOrder);
            setOrders((prev) => prev.map((o) => (o.name_id === newOrder.id ? newOrder : o)));
          } else if (eventType === "DELETE") {
            setOrders((prev) => prev.filter((o) => o.name_id !== oldOrder.id));
          }
        }
      )
      .subscribe();
  };

  useEffect(() => {
    // Initial load
    supabase
      .from("orders")
      .select()
      .eq("production_status", orderType)
      .order("due_date", { ascending: false })
      .then(({ data }) => setOrders(data ?? []));
    console.log("this is the orders", orders);
    // Start real-time listener
    subscribeToOrders();
  }, []);

  // console.log("this is supabase", supabase);
  const grouped = groupOrdersByOrderType(orderType, orders);
  const designatedCategories = getButtonCategories(orderType);
  // const designatedHeaders = GetD
  if (!designatedCategories) {
    console.error("designatedCategories is undefined");
    return null; // or handle the error as needed
  }

  // todo add it here so the first visible groups is the default category
  const [visibleGroups, setVisibleGroups] = useState<Record<string, boolean>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>(defaultPage);
  const [headers, setHeaders] = useState<string[]>(() => getMaterialHeaders(orderType, defaultPage));

  const [isRowHovered, setIsRowHovered] = useState<boolean>(false);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // console.log("this is the headers", headers);
  // setHeaders(getMaterialHeaders(orderType, defaultPage));

  // const getAssignedHeaders = get(orderType, defaultPage);
  // console.log("this is the headers", getAssignedHeaders);

  // Update visibleGroups only when grouped gains keys and visibleGroups is still empty
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
    // console.log(`Category clicked: ${category}`);
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

  const handleOrderClick = async (order: Order) => {
    console.log(`Order clicked: ${order.name_id}`);
    await updateOrder(order);
  };

  const handleNoteChange = async (orderId: string, newNotes: string) => {
    console.log(`Notes changed for order ID: ${orderId}`);
    console.log(`New notes: ${newNotes}`);
    // Add logic to update the notes for the given order ID in the database or state
  };

  if (headers.length === 0) {
    console.error("Headers are not defined");
    return null;
  }

  return (
    <>
      <div className="relative">
        <div>
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
            {"To " + orderType.charAt(0).toUpperCase() + orderType.slice(1)} -{" "}
            {selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}
          </h1>
          <Separator className="w-full " />
        </div>
        <Fragment>
          {Object.entries(grouped).map(([key, group]) => (
            <Fragment key={key}>
              <div className="flex items-center justify-between mb-2"></div>
              {visibleGroups[key] && (
                <>
                  <h2 className="font-bold text-lg">{convertKeyToTitle(key)}</h2>
                  <Table>
                    <OrderTableHeader tableHeaders={headers} />
                    <OrderTableBody
                      data={group}
                      onOrderClick={handleOrderClick}
                      onNotesChange={handleNoteChange}
                      setIsRowHovered={setIsRowHovered}
                      setMousePos={setMousePos}
                    />
                  </Table>
                </>
              )}
            </Fragment>
          ))}
        </Fragment>
        {/* Pass both categories and onCategoryClick to ButtonOrganizer */}
        <ButtonOrganizer categories={designatedCategories} onCategoryClick={handleCategoryClick} />
        {isRowHovered && (
          <div
            style={{
              position: "fixed",
              top: mousePos.y + 10,
              left: mousePos.x + 10,
              pointerEvents: "none",
            }}
          >
            <ScrollAreaDemo />
          </div>
        )}
      </div>
    </>
  );
}
