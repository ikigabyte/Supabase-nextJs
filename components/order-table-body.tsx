import React, { useState } from "react";
import { TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Order } from "@/types/custom";

import { capitalizeFirstLetter, truncate } from "@/utils/stringfunctions";

export function OrderTableBody({ data, onOrderClick, onNotesChange, setIsRowHovered, setMousePos }: { data: Array<Order>; onOrderClick: (order: Order) => void; onNotesChange: (orderId: string, newNotes: string) => void; setIsRowHovered: (hovered: boolean) => void; setMousePos: (pos: { x: number; y: number }) => void }) {
  const handleMouseEnter = (event: React.MouseEvent<HTMLTableRowElement>, row: Order) => {
    setIsRowHovered(true);
    setMousePos({ x: event.clientX, y: event.clientY });
    // onHover(row);
  };

  const handleMouseLeave = () => {
    setIsRowHovered(false);
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLTableRowElement>) => {
    setMousePos({ x: event.clientX, y: event.clientY });
  };

  const handleNotesKeyPress = (event: React.KeyboardEvent<HTMLInputElement>, orderId: string) => {
    if (event.key === "Enter") {
      const newNotes = (event.target as HTMLInputElement).value;
      onNotesChange(orderId, newNotes);
    }
  };

  return (
    <TableBody>
      {data.map((row, i) => (
        <TableRow
          key={i}
          className="h-1 [&>td]:py-0 hover:bg-gray-100"
          onMouseEnter={(event) => handleMouseEnter(event, row)}
          onMouseLeave={handleMouseLeave}
          onMouseMove={handleMouseMove}
        >
          <TableCell className="whitespace-nowrap">{truncate(row.name_id, 20) || "test"}</TableCell>
          <TableCell>{row.shape || "test"}</TableCell>
          <TableCell>{row.lamination || "test"}</TableCell>
          <TableCell>{row.material || "test"}</TableCell>
          <TableCell>{row.quantity || "test"}</TableCell>
          <TableCell>{row.print_method || ""}</TableCell>
          <TableCell>{row.due_date || ""}</TableCell>
          <TableCell>{row.ihd_date || ""}</TableCell>
          <TableCell>
            <Input
              className="h-1/5 p-1"
              defaultValue={row.notes || ""}
              onKeyDown={(event) => handleNotesKeyPress(event, row.name_id)}
            />
          </TableCell>
          <TableCell>
            <Checkbox
              onCheckedChange={() => onOrderClick(row)}
            />
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
}
