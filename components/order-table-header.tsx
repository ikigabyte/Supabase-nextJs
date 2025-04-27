import React from "react";
import { TableHead, TableRow, TableHeader } from "@/components/ui/table";

const widths: string[] = ["26%", "8%", "8%", "8%", "8%", "8%", "6%", "6%", "12%", "8%"];

export function OrderTableHeader({
  tableHeaders,
}: {
  tableHeaders: string[];
}) {
  // console.log("the table headers are ", tableHeaders);
  return (
    <TableHeader>
      <TableRow>
        {tableHeaders.map((header, index) => (
          <TableHead
            key={index}
            className={widths[index] ? `w-[${widths[index]}]` : ""}
          >
            {header.charAt(0).toUpperCase() + header.slice(1)}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
}