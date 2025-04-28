import React, { useState } from "react";
import { useRef } from "react";
import { TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Order } from "@/types/custom";

import { capitalizeFirstLetter, truncate } from "@/utils/stringfunctions";

export function OrderTableBody({
  data,
  onOrderClick,
  onNotesChange,
  setIsRowHovered,
  setMousePos,
  setRowHistory,
}: {
  data: Array<Order>;
  onOrderClick: (order: Order) => void;
  onNotesChange: (order: Order, newNotes: string) => void;
  setIsRowHovered: (hovered: boolean) => void;
  setMousePos: (pos: { x: number; y: number }) => void;
  setRowHistory: (history: string[]) => void;
}) {
  const lastHoveredIdRef = useRef<string | number | null>(null);

  const handleMouseEnter = (event: React.MouseEvent<HTMLTableRowElement>, row: Order) => {
    if (lastHoveredIdRef.current !== row.name_id) {
      // console.log(row.history);
      // Safely cast history JSON to string[] or default to empty array
      const historyArray = Array.isArray(row.history) ? (row.history as string[]) : [];
      setRowHistory(historyArray);
      lastHoveredIdRef.current = row.name_id;
    }
    setIsRowHovered(true);
  };

  const handleMouseLeave = () => {
    setIsRowHovered(false);
    lastHoveredIdRef.current = null;
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLTableRowElement>) => {
    setMousePos({ x: event.clientX, y: event.clientY });
  };

  const handleNotesKeyPress = (event: React.KeyboardEvent<HTMLInputElement>, order: Order) => {
    if (event.key === "Enter") {
      const newNotes = (event.target as HTMLInputElement).value;
      console.log("Order is being changed here" + order);
      onNotesChange(order, newNotes);
    }
  };

  return (
    <TableBody>
      {data.map((row, i) => (
        <TableRow
          key={i}
          className="h-1 [&>td]:py-0 hover:bg-gray-100 text-xs"
          onMouseEnter={(event) => handleMouseEnter(event, row)}
          onMouseLeave={handleMouseLeave}
          onMouseMove={handleMouseMove}
        >
          <TableCell className="">{truncate(row.name_id, 30) || "test"}</TableCell>
          <TableCell className="">{capitalizeFirstLetter(row.shape) || "-"}</TableCell>
          <TableCell className="">{capitalizeFirstLetter(row.lamination) || "-"}</TableCell>
          <TableCell className="">{capitalizeFirstLetter(row.material) || "-"}</TableCell>
          <TableCell className="">{capitalizeFirstLetter(row.quantity) || "-"}</TableCell>
          <TableCell className="">{capitalizeFirstLetter(row.ink)} </TableCell>
          <TableCell className="">{capitalizeFirstLetter(row.print_method) || ""}</TableCell>
          <TableCell className="">{capitalizeFirstLetter(row.due_date) || ""}</TableCell>
          <TableCell className="">{capitalizeFirstLetter(row.ihd_date) || ""}</TableCell>
          <TableCell className="">
            <Input
              className="h-1/5 w-full border rounded-none"
              defaultValue={row.notes || ""}
              onKeyDown={(event) => handleNotesKeyPress(event, row)}
            />
          </TableCell>
          <TableCell className="">
            <Checkbox onCheckedChange={() => onOrderClick(row)} />
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
}
