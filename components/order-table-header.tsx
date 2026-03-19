import React from "react";
import { TableHead, TableRow, TableHeader } from "@/components/ui/table";

const DEFAULT_COLUMN_WIDTH = "5%";
const widthByHeader: Record<string, string> = {
  "#": "1%",
  "file name": "18%",
  shape: "4%",
  quantity: "4%",
  lamination: "5%",
  material: "5%",
  ink: "5%",
  "print method": "5%",
  "print_method": "5%",
  "print date": "6%",
  "cut date": "6%",
  "prepack date": "6%",
  "pack date": "6%",
  "ship date": "6%",
  "ihd date": "6%",
  "shipping method": "6%",
  "shipping speed": "6%",
  notes: "25%",
  assignee: "2%",
  print: "5%",
  cut: "5%",
  prepack: "5%",
  pack: "5%",
  ship: "5%",
  completed_at: "5%",
  history: "5%",
};

const normalizeHeaderName = (label: string) => label.trim().toLowerCase().replace(/[-_]+/g, " ");
const resolveColumnWidth = (header: string): string => {
  const normalized = normalizeHeaderName(header);
  if (normalized.includes("date")) return "6%";
  return widthByHeader[normalized] ?? DEFAULT_COLUMN_WIDTH;
};

export function OrderTableHeader({
  tableHeaders,
  ignoreAssignee,
  ignoreIndex,
}: {
  tableHeaders: string[];
  ignoreAssignee?: boolean;
  ignoreIndex?: boolean;
}) {
  var laminationColor = "";
  let headers = ignoreIndex ? [...tableHeaders] : ["#", ...tableHeaders];
  let headerWidths = headers.map((h) => resolveColumnWidth(h));

  const findHeaderIndex = (label: string) =>
    headers.findIndex((h) => normalizeHeaderName(h) === normalizeHeaderName(label));
  const reduceWidth = (label: string, amount: number) => {
    if (amount <= 0) return;
    const idx = findHeaderIndex(label);
    if (idx === -1) return;
    const current = parseFloat(headerWidths[idx] ?? "0");
    if (Number.isNaN(current)) return;
    headerWidths[idx] = `${Math.max(current - amount, 1)}%`;
  };

  const shipDateIdx = findHeaderIndex("ship date");
  const ihdDateIdx = findHeaderIndex("ihd date");
  if (shipDateIdx !== -1 && ihdDateIdx !== -1) {
    const shipWidth = parseFloat(headerWidths[shipDateIdx] ?? "6");
    const ihdWidth = parseFloat(headerWidths[ihdDateIdx] ?? "5");
    if (!Number.isNaN(shipWidth) && !Number.isNaN(ihdWidth) && shipWidth !== ihdWidth) {
      if (shipWidth > ihdWidth) {
        const needed = shipWidth - ihdWidth;
        reduceWidth("notes", needed);
      }
      headerWidths[ihdDateIdx] = `${shipWidth}%`;
    }
  }

  if (!ignoreAssignee) {
    reduceWidth("notes", 2);
    const shippingMethodIdx = findHeaderIndex("shipping method");
    const assigneeInsertAt = shippingMethodIdx === -1 ? headers.length - 1 : shippingMethodIdx;
    headers = [...headers.slice(0, assigneeInsertAt), "ASSIGNEE", ...headers.slice(assigneeInsertAt)];
    headerWidths = [...headerWidths.slice(0, assigneeInsertAt), "2%", ...headerWidths.slice(assigneeInsertAt)];
  }

  return (
    <TableHeader>
      <TableRow className="h-.5 [&>th]:py-0 text-xs bg-gray-500 hover:bg-gray-500">
        {headerWidths.map((w, index) => (
          <TableHead
            key={index}
            className={`border-r border-gray-200 font-bold text-white truncate text-[11px]${
              headers[index]?.toLowerCase() === "lamination" && laminationColor ? laminationColor : ""
            }${index === 0 && !ignoreIndex ? " text-center" : ""}`}
            style={{ width: w }}
          >
            {headers[index]
              ? headers[index].toUpperCase() === "CUT"
                ? "CUT": 
                    headers[index].toUpperCase() === "HISTORY"
                ? "HISTORY" 
                : headers[index].toUpperCase() === "ZENDESK"
                ? "ZENDESK"
                : headers[index].toUpperCase() === "SHIP"
                ? "SHIPPED"
                : index === headers.length - 1
                ? headers[index].toUpperCase() + "ED"
                : headers[index].toUpperCase()
              : ""}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
}
