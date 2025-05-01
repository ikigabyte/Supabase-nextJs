import React from "react";
import { TableHead, TableRow, TableHeader } from "@/components/ui/table";

const widths: string[] = ["20%", "5%", "5%", "5%", "5%", "5%", "5%", "9%", "9%", "6%", "15%", "5%"];

export function OrderTableHeader({ tableHeaders }: { tableHeaders: string[] }) {
  return (
    <TableHeader>
      <TableRow className="h-.5 [&>th]:py-0 text-xs">
        {widths.map((w, index) => (
          <TableHead
            key={index}
            className="border-r border-gray-200"
            style={{ width: w }}>
            {tableHeaders[index]
              ? tableHeaders[index].charAt(0).toUpperCase() + tableHeaders[index].slice(1)
              : ""}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
}