"use client";

import React from "react";
import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";

function extractNumber(str: string) {
  // Remove "QTY" (case-insensitive) and trim whitespace
  const cleaned = str.replace(/qty/gi, "").trim();
  // Extract the first number found in the string
  const match = cleaned.match(/\d+/);
  return match ? match[0] : "";
}

export function OrderViewer({ rows }: { rows: Map<string, string | null> }) {
  let sumValue = 0
  
  rows.forEach((value, key) => {
    if (typeof value === "string" && value.toLowerCase().includes("tiles")) {
      // Ignore this value
      sumValue = 0
      return;
    }
    if (value === null || value === undefined) {
      return;
    }
    const number = parseFloat(extractNumber(value));
    if (!isNaN(number)) {
      sumValue += number; // Add the number to sumValue
    }
  });
  let rowValue =  "Total: " + sumValue  
  if (sumValue === 0) {
    rowValue = "Rows selected of different values";
  }
  return (
    <div className="fixed left-[15px] bottom-[80px] z-50 w-auto shadow-lg">
      <Table className="w-full">
        <TableBody>
          <TableRow>
            <TableCell className="text-center bg-green-300 shadow-lg rounded-lg p-4 ">{rowValue}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
