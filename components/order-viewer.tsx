"use client";

import React from "react";
import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";

const quantityColumnIndex = 2;
function extractNumber(str: string) {
  // Remove "QTY" (case-insensitive) and trim whitespace
  const cleaned = str.replace(/qty/gi, "").trim();
  // Extract the first number found in the string
  const match = cleaned.match(/\d+/);
  return match ? match[0] : "";
}

// const function convertMapToArray = (map: Map<string, string | null>) => {
//   const result: { key: string; value: string | null }[] = [];
//   map.forEach((value, key) => {
//     result.push({ key, value });
//   });
//   return result;
// }

export function OrderViewer({
  dragSelections,
}: {
  dragSelections: React.MutableRefObject<Map<HTMLTableElement, { startRow: number; endRow: number }>>;
}) {
  let sumValue = 0;
  let showDifferent = false;
  const rows: string[] = [];

  dragSelections.current.forEach((selection, table) => {
    const tbody = table.querySelector("tbody");
    if (!tbody) return;
    // Only data rows (exclude separators)
    const dataRows = Array.from(tbody.children).filter(
      (el) => el.nodeName === "TR" && el.getAttribute("datatype") === "data"
    );
    // Calculate correct range regardless of drag direction
    const rowStart = Math.min(selection.startRow, selection.endRow);
    const rowEnd = Math.max(selection.startRow, selection.endRow);

    for (let i = rowStart; i <= rowEnd; i++) {
      const row = dataRows[i];
      if (!row) continue;
      const cell = row.children[quantityColumnIndex]; // second column (index 1)
      if (cell) {
        const cellValue = cell.textContent ?? "";
        // console.log(cellValue);
        if (cellValue.toLowerCase().includes("tiles")) {
          showDifferent = true;
        }
        rows.push(cellValue);
      }
    }
  });
  // Now calculate sumValue only if not showDifferent
  if (!showDifferent) {
    for (const value of rows) {
      const number = parseFloat(extractNumber(value));
      if (!isNaN(number)) {
        sumValue += number;
      }
    }
  }

  const rowValue = showDifferent ? "Different values selected" : "Total: " + sumValue;

  // rows.forEach((value, key) => {
  //   if (typeof value === "string" && value.toLowerCase().includes("tiles")) {
  //     // Ignore this value
  //     sumValue = 0;
  //     return;
  //   }
  //   if (value === null || value === undefined) {
  //     return;
  //   }
  //   const number = parseFloat(extractNumber(value));
  //   if (!isNaN(number)) {
  //     sumValue += number; // Add the number to sumValue
  //   }
  // });
  // let rowValue = "Total: " + sumValue;
  // if (sumValue === 0) {
  //   rowValue = "Rows selected of different values";
  // }
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
