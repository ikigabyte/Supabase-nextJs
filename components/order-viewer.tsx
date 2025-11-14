"use client";

import React from "react";
import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "./ui/button";
import { getNameToColor } from "@/lib/utils";

const quantityColumnIndex = 3; // * Adjust this to where the quantity is
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
  colorSelected,
  onColorSelected,
}: {
    dragSelections: React.MutableRefObject<Map<HTMLTableElement, { startRow: number; endRow: number }>>;
    colorSelected: string;
    onColorSelected?: (color: string) => void;
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
        if (cellValue.toLowerCase().includes("tiles")) {
          showDifferent = true; // Flag to show different values
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
  return (
    <div className="fixed left-[15px] bottom-[80px] z-50 flex gap-4 w-auto">
      {/* Total / message container */}
      <div className="shadow-lg">
      <Table className="w-full">
        <TableBody>
        <TableRow>
          <TableCell className="text-center bg-green-300 shadow-lg rounded-lg p-4">
          {rowValue}
          </TableCell>
        </TableRow>
        </TableBody>
      </Table>
      </div>

      {/* Circles container */}
      <div className="flex items-center justify-between gap-4 bg-white shadow-lg rounded-lg px-4 py-2">
        <h1>Asignee color:</h1>

        {/* Orange */}
        <Button
          type="button"
          data-ignore-selection="true" // <-- new
          onClick={() => onColorSelected?.("orange")}
          style={{ backgroundColor: getNameToColor("orange").backgroundColor }}
          className={`w-6 h-6 rounded-full p-0 ${
        colorSelected === "orange"
          ? "ring-2 ring-offset-2 ring-orange-500"
          : ""
          }`}
        />

        {/* Red */}
        <Button
          type="button"
          data-ignore-selection="true" // <-- new
          onClick={() => onColorSelected?.("red")}
          style={{ backgroundColor: getNameToColor("red").backgroundColor }}
          className={`w-6 h-6 rounded-full p-0 ${
        colorSelected === "red"
          ? "ring-2 ring-offset-2 ring-red-500"
          : ""
          }`}
        />

        {/* Blue */}
        <Button
          type="button"
          data-ignore-selection="true" // <-- new
          onClick={() => onColorSelected?.("blue")}
          style={{ backgroundColor: getNameToColor("blue").backgroundColor }}
          className={`w-6 h-6 rounded-full p-0 ${
        colorSelected === "blue"
          ? "ring-2 ring-offset-2 ring-blue-500"
          : ""
          }`}
        />
      </div>
    </div>
  );
}
