"use client";

import React, { useState } from "react";
import { TableCell, TableBody, TableRow } from "./ui/table";
import { HistoryIcon } from "lucide-react";
import { convertToSpaces } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { capitalizeFirstLetter } from "@/utils/stringfunctions";
import { off } from "process";

interface CompletedOrganizerProps {
  orders: any[] | null;
}

const convertInsertedDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString() + " " + date.toLocaleTimeString();
};

const breakHistoryByComma = (history: unknown) => {
  if (!history || typeof history !== "object") return "No history available.";
  // Try to find a string property in the object (commonly 'history' or 'value')
  const historyStr =
    (history as any).history ||
    (history as any).value ||
    Object.values(history as any).find((v) => typeof v === "string");

  if (!historyStr || typeof historyStr !== "string" || !historyStr.trim())
    return "No history available.";

  return historyStr.split(",").map((step) => step.trim()).join("\n");
};

export function CompletedOrganizer({ orders }: CompletedOrganizerProps) {
  const [openDialogIndex, setOpenDialogIndex] = useState<number | null>(null);

  return (
    <TableBody>
      {orders?.map((order, index) => (
        <TableRow
          key={order.name_id}
          className="[&>td]:py-1 align-top border-none ring-inset ring-1 ring-gray-100 max-h-[14px] text-xs whitespace-normal break-all"
        >
          <TableCell>{convertToSpaces(order.name_id)}</TableCell>
          <TableCell>{capitalizeFirstLetter(order.shape)}</TableCell>
          <TableCell>{capitalizeFirstLetter(order.lamination)}</TableCell>
          <TableCell>{capitalizeFirstLetter(order.material)}</TableCell>
          <TableCell>{order.quantity}</TableCell>
          <TableCell>{capitalizeFirstLetter(order.ink)}</TableCell>
          <TableCell>{capitalizeFirstLetter(order.print_method)}</TableCell>
          <TableCell>{order.due_date}</TableCell>
          <TableCell>{order.ihd_date}</TableCell>
          <TableCell>{capitalizeFirstLetter(order.shipping_method)}</TableCell>
          <TableCell>{capitalizeFirstLetter(order.notes)}</TableCell>
          <TableCell>{convertInsertedDate(order.inserted_date)}</TableCell>

          <TableCell className="p-0">
            <Dialog
              open={openDialogIndex === index}
              onOpenChange={(open) => setOpenDialogIndex(open ? index : null)}
            >
              <DialogHeader>
                <DialogTitle>
                  <button
                    type="button"
                    className="flex items-center bg-transparent border-none cursor-pointer"
                    aria-label="View History"
                    onClick={() => setOpenDialogIndex(index)}
                  >
                    <HistoryIcon className="mr-3 text-black" />
                  </button>
                </DialogTitle>
              </DialogHeader>
              <DialogContent>
                <div className="text-sm whitespace-pre-wrap">
                  {breakHistoryByComma(order.history)}
                </div>
              </DialogContent>
            </Dialog>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
}