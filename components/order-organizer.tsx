"use client";
import React, { Fragment, useEffect, useState, useMemo, useCallback } from "react";
import type { Session } from "@supabase/supabase-js";
import { useRouter, usePathname } from "next/navigation";
import { Table } from "@/components/ui/table";
import { Order } from "@/types/custom";
import { OrderTableHeader } from "./order-table-header";
import { OrderTableBody } from "./order-table-body";
import { groupOrdersByOrderType } from "@/utils/grouper";
import { ButtonOrganizer } from "./button-organizer";
// lib/supabase.ts

import { getButtonCategories } from "@/types/buttons";
import { updateOrderStatus, updateOrderNotes, removeOrderLine, removeOrderAll } from "@/utils/actions";
import { Separator } from "./ui/separator";
import { getMaterialHeaders } from "@/types/headers";
import { ScrollAreaDemo } from "./scroll-area";
import { orderKeys } from "@/utils/orderKeyAssigner";
import { OrderTypes } from "@/utils/orderTypes";
import { ContextMenu } from "./context-menu";
// import { Toaster } from "./ui/toaster";
// import { ToastAction } from "./ui/toast";
// import { useToast } from "@/hooks/use-toast";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

import { Toaster } from "@/components/ui/sonner"
import { toast } from "sonner"
import { flightRouterStateSchema } from "next/dist/server/app-render/types";

// import { filterOutOrderCounts } from "./order-organizer";
// import { updateOrderCounts } from "./order-organizer";

// import { useArticles } from "@/hooks/useArticles";

// export const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// )
// import { createClient } from "@/utils/supabase/server";

const handleNewProductionStatus = (status: string | null, reverse: boolean) => {
  if (reverse) {
    switch (status) {
      case "completed":
        return "ship";
      case "ship":
        return "pack";
      case "pack":
        return "cut";
      case "cut":
        return "print";
      default:
        return status;
    }
  } else {
    switch (status) {
      case "print":
        return "cut";
      case "cut":
        return "pack";
      case "pack":
        return "ship";
      case "ship":
        return "completed";
      default:
        return status;
    }
  }
};

const laminationHeaderColors = {
  "matte" : "text-purple-500",
  "gloss" : "text-blue-500",
}

function getCategoryCounts(orders: Order[], categories: string[], orderType: OrderTypes): Record<string, number> {
  return categories.reduce((acc, category) => {
    const lowerCat = category.toLowerCase();
    let count = 0;
    if (lowerCat === "rush") {
      // Count only rush orders matching the current status
      count = orders.filter((order) => order.production_status === orderType && order.rush === true).length;
    } else if (lowerCat === "regular") {
      count = orders.filter(
        (order) =>
          order.production_status === orderType && order.rush !== true && order.material?.toLowerCase() !== "roll"
      ).length;
    } else {
      count = orders.filter(
        (order) =>
          order.production_status === orderType && order.rush !== true && order.material?.toLowerCase() === lowerCat
      ).length;
    }
    acc[category] = count;
    return acc;
  }, {} as Record<string, number>);
}

function filterOutOrderCounts(orders: Order[]): Record<OrderTypes, number> {
  // Initialize counts for each status
  const initial: Record<OrderTypes, number> = {
    print: 0,
    ship: 0,
    cut: 0,
    pack: 0,
  };

  return orders.reduce((acc, order) => {
    if (order.production_status !== order.production_status) {
      return acc; // Skip this order if the production_status doesn't match the orderType
    }
    const status = order.production_status as OrderTypes;
    console.log("this is the status", status);
    if (status in acc) {
      acc[status]++;
    }
    return acc;
  }, initial);
}

// function updateOrderCounts(orderCounts: Record<string, number>) {
//   console.log("this is the order counts", orderCounts);
//   Object.entries(orderCounts).forEach(([orderType, count]) => {
//     const id = `to-${orderType}`;
//     const update = () => {
//       const navElement = document.getElementById(id);
//       if (navElement) {
//         const title = `To ${orderType.charAt(0).toUpperCase()}${orderType.slice(1)}`;
//         navElement.textContent = `${title} (${count})`;
//       } else {
//         requestAnimationFrame(update);
//       }
//     };
//     requestAnimationFrame(update);
//   });
// }
// const cookieHeader = req.headers.cookie || "";

// supabase.auth.getSession().then(({ data, error }) => {
//   console.log('Session data:', data);
// });
// console.log("here is the supabase client" , supabase);

export function OrderOrganizer({ orderType, defaultPage }: { orderType: OrderTypes; defaultPage: string }) {
  // const categories = getCategoryTypes(orderType);

  // console.log(supabaseClient.auth.getSession());
  const supabase = createClientComponentClient();
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log("Session:", session, "Error:", error);
      setSession(session);
    });
  }, []);

  // if (true)return

  // const supabase = supabaseClient;
  const router = useRouter();
  const pathname = usePathname();
  const [orders, setOrders] = useState<Order[]>([]);

  // Move these hooks above useEffect so they're in scope in subscription handlers
  const [isRowHovered, setIsRowHovered] = useState<boolean>(false);
  const [isRowClicked, setIsRowClicked] = useState<boolean>(false);
  const [currentRowClicked, setCurrentRowClicked] = useState<Order | null>(null);

  useEffect(() => {
    // Initial load
    supabase
      .from("orders")
      .select()
      // .eq("production_status", orderType)
      .order("due_date", { ascending: false })
      .order("order_id", { ascending: false })
      .then(({ data }) => setOrders(data ?? []));

    const channel = supabase
      .channel("orders_all")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        const newOrder = payload.new as Order;
        if (newOrder.production_status === orderType) {
          setOrders((prev) => {
            const next = [newOrder, ...prev];
            // If the inserted order is our clicked/hovered row, clear selection
            if (currentRowClicked?.name_id === newOrder.name_id) {
              setIsRowClicked(false);
              setCurrentRowClicked(null);
            }
            if (isRowHovered) {
              setIsRowHovered(false);
            }
            return next;
          });
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (payload) => {
        console.log("UPDATE event payload.old:", payload.old);
        console.log("UPDATE event payload.new:", payload.new);
        const updated = payload.new as Order;
        const oldRow = payload.old as Order;
        // If only notes changed, update that field
        if (oldRow.name_id === updated.name_id && oldRow.notes !== updated.notes) {
          console.log("Notes changed for order", updated.name_id);
          console.log(updated.notes);
          setOrders((prev) => prev.map((o) => (o.name_id === updated.name_id ? { ...o, notes: updated.notes } : o)));
          // Clear selection/hover on notes update
          if (currentRowClicked?.name_id === updated.name_id) {
            setIsRowClicked(false);
            setCurrentRowClicked(null);
          }
          if (isRowHovered) setIsRowHovered(false);
          return;
        }
        if (updated.production_status === orderType) {
          setOrders((prev) => {
            const next = prev.some((o) => o.name_id === updated.name_id)
              ? prev.map((o) => (o.name_id === updated.name_id ? updated : o))
              : [updated, ...prev];
            // Clear selection/hover on status change
            if (currentRowClicked?.name_id === updated.name_id) {
              setIsRowClicked(false);
              setCurrentRowClicked(null);
            }
            if (isRowHovered) setIsRowHovered(false);
            return next;
          });
        } else {
          setOrders((prev) => {
            const next = prev.filter((o) => o.name_id !== updated.name_id);
            // Clear selection/hover on removal
            if (currentRowClicked?.name_id === updated.name_id) {
              setIsRowClicked(false);
              setCurrentRowClicked(null);
            }
            if (isRowHovered) setIsRowHovered(false);
            return next;
          });
        }
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "orders" }, (payload) => {
        const removed = payload.old as Order;
        setOrders((prev) => {
          const next = prev.filter((o) => o.name_id !== removed.name_id);
          // Clear selection/hover if the removed order was selected/hovered
          if (currentRowClicked?.name_id === removed.name_id) {
            setIsRowClicked(false);
            setCurrentRowClicked(null);
          }
          if (isRowHovered) setIsRowHovered(false);
          return next;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderType, currentRowClicked, isRowHovered]);

  useEffect(() => {
    const counts = filterOutOrderCounts(orders);
    // updateOrderCounts(counts);
  }, [orders]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("table")) {
        setIsRowClicked(false);
        setCurrentRowClicked(null);
        // console.log("not a table");
        return;
      }
      // console.log("Target", target);
      // If click is outside the table and not on the context menu, clear selection
      // if (
      //   tableRef.current &&
      //   !tableRef.current.contains(target) &&
      //   !target.closest('.context-menu')
      // ) {
      //   onRowClick(e, null);
      // }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Memoized derived values
  const grouped = useMemo(() => groupOrdersByOrderType(orderType, orders), [orderType, orders]);
  const designatedCategories = useMemo(() => getButtonCategories(orderType)!, [orderType]);
  // const designatedColors = useMemo(() => getButtonColors(orderType)!, [orderType]);
  const categoryCounts = useMemo(
    () => getCategoryCounts(orders, designatedCategories, orderType),
    [orders, designatedCategories]
  );
  if (!designatedCategories) {
    console.error("designatedCategories is undefined");
    return null; // or handle the error as needed
  }

  // todo add it here so the first visible groups is the default category
  const [visibleGroups, setVisibleGroups] = useState<Record<string, boolean>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>(defaultPage);
  const [headers, setHeaders] = useState<string[]>(() => getMaterialHeaders(orderType, defaultPage));
  // const [scrollAreaName, setScrollAreaName] = useState<string>(orderType);
  const [rowHistory, setRowHistory] = useState<string[] | null>(null);
  const [scrollAreaName, setScrollAreaName] = useState<string>("History");
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

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

  const handleCategoryClick = useCallback(
    (category: string) => {
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
    },
    [pathname, orderType, designatedCategories]
  );

  useEffect(() => {
    if (defaultPage) {
      handleCategoryClick(defaultPage);
    }
  }, [defaultPage]);

  const handleCheckboxClick = useCallback(async (order: Order) => {
    console.log(`Order clicked: ${order.name_id}`);
    // Optimistically remove from local state
    // setOrders((prev) => prev.filter((o) => o.name_id !== order.name_id));
    // Persist the status change
    // currentRowClicked?.name_id === order.name_id
    await updateOrderStatus(order, false);
    toast("Order updated", {
      description: `Order ${order.name_id} has been moved to ${handleNewProductionStatus(order.production_status, false)}`,
      action: {
        label: "Undo",
        onClick: () => { revertStatus(order) },
        // onClick: () => {  },
      }
    })

    // Show a notification
    // toast({
    //   title: "Order updated",
    //   description: `Order ${order.name_id} moved to production_status.`,
    // });
  }, []);

  const revertStatus = useCallback(async (order: Order) => {
    console.log("Reverting status for order", order.name_id);
    // Optimistically update local state
    // setOrders((prev) => prev.map((o) => (o.name_id === order.name_id ? { ...o, production_status: orderType } : o)));
    // Persist change
    await updateOrderStatus(order, false, orderType);
  }, []);

  const handleNoteChange = useCallback(async (order: Order, newNotes: string) => {
    console.log("Updating notes for order", order.name_id, "to", newNotes);
    // Optimistically update local state
    setOrders((prev) => prev.map((o) => (o.name_id === order.name_id ? { ...o, notes: newNotes } : o)));
    // Persist change
    await updateOrderNotes(order, newNotes);
  }, []);

  const handleMenuOptionClick = useCallback(
    async (option: string) => {
      if (currentRowClicked == null) {
        console.warn("No row clicked, skipping menu option handling.");
        return;
      }
      if (option == "revert") {
        await updateOrderStatus(currentRowClicked!, true);
        toast(
          "Order reverted",
          {
            description: `Order ${currentRowClicked!.name_id} has been moved back to ${orderType}`,
            action: {
              label: "Undo",
              onClick: () => {
                revertStatus(currentRowClicked!);
              },
            },
          }
          // toast({
        );
        setIsRowClicked(false);
        setCurrentRowClicked(null);
        return;
      }
      if (option == "delete") {
        console.log("Deleting line:", currentRowClicked);
        await removeOrderLine(currentRowClicked!);
        toast("Order line deleted", {
          description: `Deleted line ${currentRowClicked!.name_id}.`,
          action: {
            label: "Undo",
            onClick: () => {},
          },
        });
        // toast({
        //   title: "Order line deleted",
        //   description: `Deleted line ${currentRowClicked!.name_id}.`,
        //   // action: <ToastAction altText="Undo delete">Undo</ToastAction>,
        // });
        return;
      }
      if (option == "deleteAll") {
        console.log("Deleting line:", currentRowClicked);
        await removeOrderAll(currentRowClicked?.order_id!);
        toast("All orders deleted", {
          description: `Deleted all items for order ${currentRowClicked!.order_id}.`,
          action: {
            label: "Undo",
            onClick: () => {},
          },
        });
        // toast({
        //   title: "All orders deleted",
        //   description: `Deleted all items for order ${currentRowClicked!.order_id}.`,
        //   // action: <ToastAction altText="Undo delete all">Undo</ToastAction>,
        // });
        return;
      }
      // Example async operation
      await new Promise((resolve) => setTimeout(resolve, 1000));
      window.open(`https://stickerbeat.zendesk.com/agent/tickets/${currentRowClicked?.order_id}`, "_blank");
    },
    [currentRowClicked, orderType]
  );

  if (headers.length === 0) {
    console.error("Headers are not defined, please add some headers for these buttons here");
    return null;
  }

  const handleRowClick = useCallback(
    (event: MouseEvent | React.MouseEvent<HTMLTableRowElement, MouseEvent>, row: Order | null) => {
      if (!row) {
        console.warn("Row is null, skipping click handling.");
        return;
      }
      console.log("Row clicked:", row);
      console.log("Event:", event);
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      setMenuPos({ x: rect.right, y: rect.bottom });

      if (!isRowClicked) {
        setIsRowClicked(true);
      }
      // if (isRowClicked){
      // setIsRowClicked(false);
      // setCurrentRowClicked(null);
      // return;
      // }
      setCurrentRowClicked(row);
      // await updateOrderStatus(row, "production_status");
    },
    [isRowClicked]
  );
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
            const keySplit = key.split("-")
            var headerColor = '';
            if (keySplit.length > 1 && (keySplit.includes("gloss") || keySplit.includes("matte"))) {
              console.log("this has the matte or gloss thing here");
              const laminationType = keySplit[keySplit.length - 2];
              headerColor = laminationHeaderColors[laminationType as keyof typeof laminationHeaderColors];
            }
            console.log("this is the header color", headerColor);
            return (
              <Fragment key={key}>
              {selectedCategory.toLowerCase() === key.split("-")[0] && (
                <>
                <h2 className={`font-bold text-lg ${headerColor}`}>{convertKeyToTitle(key)}</h2>
                    <Table className="bg-gray-50 mb-5">
                      <OrderTableHeader tableHeaders={headers}/>
                      <OrderTableBody
                        data={group}
                        onOrderClick={handleCheckboxClick}
                        onNotesChange={handleNoteChange}
                        setIsRowHovered={setIsRowHovered}
                        setMousePos={setMousePos}
                        setRowHistory={setRowHistory}
                        setScrollAreaName={setScrollAreaName}
                        onRowClick={handleRowClick}
                        selectedNameId={currentRowClicked?.name_id || null}
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
            <ScrollAreaDemo historySteps={rowHistory ?? undefined} scrollName={scrollAreaName} />
          </div>
        )}
        {isRowClicked && (
          <div
            className="context-menu"
            style={{
              position: "fixed",
              top: menuPos.y,
              left: menuPos.x - 150,
              zIndex: 1000,
            }}
          >
            <ContextMenu handleMenuOptionClick={handleMenuOptionClick} orderType={orderType} />
          </div>
        )}
        {/* <This is for displaying the notifications */}
      </div>
      <Toaster />
    </>
  );
}
