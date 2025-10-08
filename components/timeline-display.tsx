"use client";
// import * as React from "react"
import React, { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { redirect } from "next/navigation";
// import { OrderTypes } from "@/utils/orderTypes";
// import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { TimelineOrder } from "@/types/custom";
// import { OrderTableHeader } from "@/components/order-table-header";
// import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableRow, TableCell, TableHead, TableHeader } from "@/components/ui/table";
// Removed dialog imports since orders will render inline under each row
import { Order } from "@/types/custom";
import Papa from "papaparse";
import { getBrowserClient } from "@/utils/supabase/client";
import { Download } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Info, ExternalLink } from "lucide-react";
import { capitalizeFirstLetter } from "@/utils/stringfunctions";
import { Toaster } from "@/components/ui/sonner";
// const supabase = createClientComponentClient();
// import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";


import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const STATUS_ORDER = ["print", "cut", "ship", "pack"] as const;
type StatusType = (typeof STATUS_ORDER)[number];

function getStatusIndex(status: string): number {
  // Ensure the status is a valid member of STATUS_ORDER
  const normalized = status.toLowerCase();
  if (STATUS_ORDER.includes(normalized as StatusType)) {
    return STATUS_ORDER.indexOf(normalized as StatusType);
  }
  return -1;
}

function formatLastUpdated(isoString: string) {
  if (!isoString) return "";
  const date = new Date(isoString);
  // Format time as h:mm am/pm
  const time = date
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .toLowerCase();
  // Format date as MM-DD
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${time} on ${month}-${day}`;
}

function isDateBeforeOrEqual(dateA: string | Date, dateB: string | Date) {
  const a = new Date(dateA);
  const b = new Date(dateB);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return a.getTime() <= b.getTime();
}

// const formatDate = (dateString: string | null) => {
//   if (!dateString || dateString == null) {
//     return "";
//   }
//   const date = new Date(dateString);
//   const options: Intl.DateTimeFormatOptions = {
//     year: "numeric",
//     month: "2-digit",
//     day: "2-digit",
//     hour: "2-digit",
//     minute: "2-digit",
//     second: "2-digit",
//   };
//   return date.toLocaleDateString("en-US", options);
// };

const supabase = getBrowserClient();

export function TimelineOrders() {
  const [combinedOrders, setCombinedOrders] = useState<TimelineOrder[]>([]);
  // const [futureOrders, setFutureOrders] = useState<TimelineOrder[]>([]);
  const lastClickTime = useRef<number>(0);
  const [timeUpdated, setTimeUpdated] = useState<string>("");
  const clickTimeout = useRef<NodeJS.Timeout | null>(null);
  // at top of component state
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());
  const toggleOpen = (id: number, open: boolean) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      open ? next.add(id) : next.delete(id);
      return next;
    });

  // Inline orders rendering state: map order_id -> array of orders
  const [ordersById, setOrdersById] = useState<Record<number, Order[]>>({});
  const [ordersLoading, setOrdersLoading] = useState<boolean>(false);
  const [open, setOpen] = useState(false);

  // Fetch all orders for the visible timeline (due + future) in bulk and group by order_id
  useEffect(() => {
    const allIds = Array.from(
      new Set([...combinedOrders].map((o) => Number(o.order_id)).filter((id) => Number.isFinite(id)) as number[])
    );
    if (allIds.length === 0) {
      setOrdersById({});
      return;
    }

    setOrdersLoading(true);
    // Initialize base map so ids with no rows still render a message
    const base: Record<number, Order[]> = {};
    for (const id of allIds) base[id] = [];

    supabase
      .from("orders")
      .select("name_id, production_status, material, order_id")
      .in("order_id", allIds)
      .then(({ data, error }) => {
        if (error) {
          console.error("Error fetching orders for timeline:", error);
          setOrdersById(base);
          setOrdersLoading(false);
          return;
        }

        const grouped: Record<number, Order[]> = { ...base };
        (data ?? []).forEach((row: any) => {
          const id = Number(row.order_id);
          if (!Number.isFinite(id)) return;
          if (!grouped[id]) grouped[id] = [];
          grouped[id].push(row as Order);
        });
        setOrdersById(grouped);
        setOrdersLoading(false);
      });
  }, [combinedOrders]);

  // const [user, setUser] = useState<string>("Guest");
  // const clientUser = supabase.auth.getUser();

  // useEffect(() => {
  //   supabase.auth.getUser().then(({ data }) => {
  //     setUser(data.user?.email ?? "Guest");
  //   });
  // }, [user]);

  if (supabase === null) {
    console.error("Supabase client is null");
    redirect("/login");
    return null; // or handle the error as needed
  }

  useEffect(() => {
    supabase
      .from("timeline")
      .select()
      .order("ship_date", { ascending: false })
      .then(({ data }) => {
        if (!data) return;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Helper to check if order is within 30 days from today
        const isWithin7Days = (orderDate: Date) => {
          const diffTime = today.getTime() - orderDate.getTime();
          const diffDays = diffTime / (1000 * 60 * 60 * 24);
          return diffDays <= 7 && diffDays >= 0;
        };

        const sortAllOrders = (orders: TimelineOrder[]) => {
          return orders.sort((a, b) => {
            const shipDateA = new Date(a.ship_date ?? "").getTime();
            const shipDateB = new Date(b.ship_date ?? "").getTime();

            if (shipDateA !== shipDateB) {
              return shipDateA - shipDateB;
            }

            const ihdDateA = new Date(a.ihd_date ?? "").getTime();
            const ihdDateB = new Date(b.ihd_date ?? "").getTime();

            if (ihdDateA !== ihdDateB) {
              return ihdDateA - ihdDateB;
            }

            const shippingMethodOrder = (method: string) => {
              if (method.toLowerCase() === "express") return 0;
              if (method.toLowerCase() === "rush_shipping") return 1;
              if (method.toLowerCase() === "standard") return 2;
              return 3; // fallback for other methods
            };

            return shippingMethodOrder(a.shipping_method ?? "") - shippingMethodOrder(b.shipping_method ?? "");
          });
        };

        const combinedOrders = sortAllOrders(
          data.filter((order) => {
            const orderDate = new Date(order.ship_date ?? "");
            return !isNaN(orderDate.getTime()) && (orderDate >= today || isWithin7Days(orderDate));
          })
        );

        setCombinedOrders(combinedOrders);
      });
  }, []);

  useEffect(() => {
    supabase
      .from("timeline")
      .select()
      .eq("order_id", 0)
      .single()
      .then(({ data }) => {
        if (data) {
          setTimeUpdated(formatLastUpdated(data.production_status ?? ""));
        }
      });
  }, []);

  const HEADER_COLS = 6;

  const getStatus = (orders: Order[]): string => {
    // console.log(orders);
    if (orders.length === 0) return "No Data Found";

    const statusCounts: Record<StatusType, number> = {
      print: 0,
      pack: 0,
      cut: 0,
      ship: 0,
    };

    for (const order of orders) {
      const status = order.production_status ?? "";
      if (STATUS_ORDER.includes(status as StatusType)) {
        statusCounts[status as StatusType]++;
      }
    }

    for (const status of STATUS_ORDER) {
      if (statusCounts[status] > 0) {
        return status;
      }
    }

    return "No Data Found";
  };

  const handleClick = (orderId: string | number) => {
    navigator.clipboard.writeText(String(orderId));
    // alert(`Double clicked on Order ID: ${orderId}`);
    toast("Copied to clipboard", {
      description: `The order ${orderId} has been copied to clipboard.`,
    });
    // await new Promise((resolve) => setTimeout(resolve, 1000));
  };

  const openZendeskLink = (orderId: number) => {
    const url = `https://stickerbeat.zendesk.com/agent/tickets/${orderId}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleDownloadCSV = () => {
    if (combinedOrders.length === 0) {
      alert("No due orders to export.");
      return;
    }

    const csv = Papa.unparse(
      combinedOrders.map((order) => {
        const currentIdx = getStatusIndex(order.production_status ?? "");
        // Option 1: Use checkmark (✓) and blank
        // Option 2: Use TRUE/FALSE
        return {
          "Order ID": order.order_id,
          "Shipping Method": order.shipping_method,
          "Due Date": order.ship_date,
          "IHD Date": order.ihd_date,
          Print: currentIdx >= 0 ? "✓" : "",
          Cut: currentIdx >= 1 ? "✓" : "",
          Ship: currentIdx >= 2 ? "✓" : "",
          Pack: currentIdx >= 3 ? "✓" : "",
        };
      })
    );

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "due_orders.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  // console.log("Timeline Orders:", orders);

  // console.log("Due Orders:", dueOrders);
  // console.log("Future Orders:", futureOrders);

  // const order0 = dueOrders.find(order => order.order_id === 0);
  // let lastUpdatedDate = ""
  // if (order0) {
  //   console.log("order0", order0);
  //   console.log("order0.production_status", order0.production_status);
  //   lastUpdatedDate = new Date(order0.production_status + 'T00:00:00Z').toLocaleString();
  // }

  // console.log(orders);
  // How do we get the last updated thing, maybe we keep just an order
  return (
    <>
      <section className="p-2 pt-10 max-w-8xl w-[80%] flex flex-col gap-2">
        <h1 className="font-bold text-3xl "> Timeline Orders </h1>
        <p className="text-left font-regular text-sm">Last Scanned Zendesk: {timeUpdated} </p>
        <div className="w-full flex justify-end gap-2">
          <Button onClick={() => setOpen(true)}>
            <Info />
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Timeline</DialogTitle>
                <DialogDescription className="text-sm">
                  This scans Zendesk categories: To Print, To Cut, To Pack and To Ship every hour on Zendesk. It
                  organizes all the orders by due date and displays them here. Orders with ship dates longer then 30
                  days are not shown here
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
          <Button onClick={handleDownloadCSV}>
            <Download className="mr-2" />
            Download CSV
          </Button>
        </div>
        {/* Orders Due */}
        {combinedOrders.map((order) => {
          const orderIdNum = Number(order.order_id);
          const rows = ordersById[orderIdNum] ?? [];
          const hasRows = !ordersLoading && rows.length > 0;
          const isPastDue = order.ship_date ? isDateBeforeOrEqual(order.ship_date, new Date()) : false;
          const latestStatus = getStatus(rows);
          return (
            <React.Fragment key={`due-group-${orderIdNum}`}>
              {hasRows ? (
                <>
                  {/* TRIGGER ROW: spans full table */}
                  <TableRow
                    className={`${isPastDue ? "bg-red-200" : "bg-gray-200"} h-12`}
                    onClick={() => toggleOpen(orderIdNum, !openIds.has(orderIdNum))}
                  >
                    <TableCell colSpan={HEADER_COLS} className="p-0 overflow-hidden">
                      <Table className="w-full table-fixed min-w-0">
                        <TableBody>
                          <TableRow>
                            <TableCell className="w-[20%] px-3 py-2 font-semibold">
                              <div className="flex items-center">
                                <span className="mr-2">{openIds.has(orderIdNum) ? "▾" : "▸"}</span>
                                <span>{orderIdNum}</span>
                              </div>
                            </TableCell>
                            <TableCell className="w-[20%] px-3 py-2 font-semibold">
                              <div>{order.shipping_method ? capitalizeFirstLetter(order.shipping_method) : "-"}</div>
                            </TableCell>
                            <TableCell className="w-[20%] px-3 py-2 font-semibold">
                              <div> {order.ship_date || "-"}</div>
                            </TableCell>
                            <TableCell className="w-[20%] px-3 py-2 font-semibold">
                              <div> {order.ihd_date || "-"}</div>
                            </TableCell>
                            <TableCell className="w-[15%] px-3 py-2 font-semibold">
                              <div>Status: {capitalizeFirstLetter(latestStatus)}</div>
                            </TableCell>
                            <TableCell className="w-[5%] px-3 py-1">
                              <Button onClick={() => openZendeskLink(orderIdNum)}>
                                {" "}
                                <>
                                  <ExternalLink />
                                </>
                              </Button>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableCell>
                  </TableRow>
                  {/* DETAILS ROW */}
                  {openIds.has(orderIdNum) && (
                    <TableRow className="bg-gray-50">
                      <TableCell colSpan={HEADER_COLS} className="p-0 overflow-hidden">

                        <Table className="w-full table-fixed min-w-0">
                          <TableBody>
                            {rows.map((o) => (
                              <TableRow key={`${orderIdNum}-${o.name_id}`}>
                                <TableCell className="text-xs truncate">{o.name_id}</TableCell>
                                <TableCell className="text-xs w-[20%] text-left">
                                  To {capitalizeFirstLetter(o.production_status)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ) : (
                <>
                  <TableRow className={`${isPastDue ? "bg-red-200" : "bg-gray-200"} h-12`}>
                    <TableCell colSpan={HEADER_COLS} className="p-0 overflow-hidden">

                      <Table className="w-full table-fixed min-w-0">
                        <TableBody>
                          <TableRow>
                            <TableCell className="w-[20%] px-3 py-2 font-semibold">
                              <span>{orderIdNum}</span>
                            </TableCell>
                            <TableCell className="w-[20%] px-3 py-2 font-semibold">
                              <div>{order.shipping_method ? capitalizeFirstLetter(order.shipping_method) : "-"}</div>
                            </TableCell>
                            <TableCell className="w-[20%] px-3 py-2 font-semibold">
                              <div> {order.ship_date || "-"}</div>
                            </TableCell>
                            <TableCell className="w-[20%] px-3 py-2 font-semibold">
                              <div> {order.ihd_date || "-"}</div>
                            </TableCell>
                            <TableCell className="w-[15%] px-3 py-2 font-semibold">
                              <div>Not In Log</div>
                            </TableCell>
                            <TableCell className="w-[5%] px-3 py-2">
                              <Button onClick={() => openZendeskLink(orderIdNum)}>
                                {" "}
                                <>
                                  <ExternalLink />
                                </>
                              </Button>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableCell>
                  </TableRow>
                </>
              )}
              <Toaster theme={"dark"} richColors={true} />
            </React.Fragment>
            
          );
        })}
      </section>
    </>
  );
}
