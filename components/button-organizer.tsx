"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { ClipboardCopy } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { DropdownAssignee } from "./dropdown";
import { getCorrectUserColor } from "@/lib/utils";

export const getBorderColor = (category: string) => {
  switch (category) {
    case "rush":
      return "border-red-800";
    case "white":
      return "border-gray-800";
    case "glitter":
      return "border-yellow-400";
    case "holographic":
      return "border-green-500";
    case "clear":
      return "border-pink-300";
    case "20ptmag":
      return "border-green-800";
    case "30ptmag":
      return "border-blue-800";
    case "sheets":
      return "border-blue-600";
    case "arlon":
      return "border-teal-500";
    case "floor":
      return "border-yellow-800";
    case "roll":
      return "border-yellow-900";
    case "cling":
      return "border-red-300";
    case "reflective":
      return "border-green-300";
    case "special":
      return "border-yellow-500";
    default:
      return "border-black";
  }
};

const quantityColumnIndex = 3;

// same behavior you had in OrderViewer
function extractNumber(str: string) {
  const cleaned = str.replace(/qty/gi, "").trim();
  const match = cleaned.match(/\d+/);
  return match ? match[0] : "";
}

function computeTotalQuantity(dragSelections: React.MutableRefObject<Map<HTMLTableElement, any>>) {
  let sumValue = 0;
  let showDifferent = false;
  const rows: string[] = [];

  dragSelections.current.forEach((selection: any, table: HTMLTableElement) => {
    const tbody = table.querySelector("tbody");
    if (!tbody) return;

    const dataRows = Array.from(tbody.children).filter(
      (el) => el.nodeName === "TR" && el.getAttribute("datatype") === "data"
    );

    const rowStart = Math.min(selection.startRow, selection.endRow);
    const rowEnd = Math.max(selection.startRow, selection.endRow);

    for (let i = rowStart; i <= rowEnd; i++) {
      const row = dataRows[i] as HTMLTableRowElement | undefined;
      if (!row) continue;

      const cell = row.children[quantityColumnIndex] as HTMLElement | undefined;
      if (!cell) continue;

      const cellValue = cell.textContent ?? "";
      if (cellValue.toLowerCase().includes("tiles")) showDifferent = true;
      rows.push(cellValue);
    }
  });

  if (!showDifferent) {
    for (const value of rows) {
      const number = parseFloat(extractNumber(value));
      if (!isNaN(number)) sumValue += number;
    }
  }

  return showDifferent ? "N/A" : sumValue;
}

export function ButtonOrganizer({
  categories = [],
  counts = {},
  onCategoryClick,
  categoryViewing,
  dragSelections,
  isAdmin,
  userRows,
  currentUserSelected,
  setCurrentUser,
  copyPrintData,
}: {
  categories?: string[];
  counts?: Record<string, number>;
  onCategoryClick: (category: string) => Promise<void> | void;
  categoryViewing: string;
  dragSelections: React.MutableRefObject<
    Map<HTMLTableElement, { startRow: number; endRow: number; extras?: Set<number> }>
  >;
  isAdmin: boolean;
  userRows: Map<string, string>; // key: email, value: color
  currentUserSelected: string;
  setCurrentUser: (user: string) => void;
  copyPrintData: () => void;
}) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const handleClick = async (category: string) => {
    setActiveCategory(category);
    onCategoryClick(category);
  };

  const rowValue = useMemo(() => computeTotalQuantity(dragSelections), [dragSelections]);
  // console.log(dragSelections.current);
  const condensedUsers = useMemo(
    () =>
      Array.from(userRows.entries()).map(([email]) => ({
        email,
        color: getCorrectUserColor(userRows, email).backgroundColor,
      })),
    [userRows]
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 w-full bg-gray-200 shadow-lg">
      {/* Make both sides the same height */}
      <div className="flex h-14 w-full items-center">
        {/* LEFT: 88% */}
        <div className="min-w-0 flex-1 px-4">
          <div className="flex flex-nowrap items-center overflow-x-auto">
            {categories.map((category) => {
              const isActive = activeCategory === category || categoryViewing === category;
              const borderColor = getBorderColor(category.toLowerCase());
              return (
                <Button
                  key={category}
                  className={`
                  relative mx-1 px-3 py-2
                  ${isActive ? `bg-gray-600 border-2 ${borderColor}` : "border-2 bg-gray-500"}
                `}
                  onClick={() => handleClick(category)}
                >
                  {category.toUpperCase()} ({counts[category] || 0})
                </Button>
              );
            })}
          </div>
        </div>

        {/* GAP between buttons and right section */}
        <div className="w-4" />
        {/* RIGHT: only render if there is a selection */}
        {dragSelections.current.size > 0 && (
          <div
            className="
      flex-none
      w-[12vw]
      min-w-[220px]
      max-w-[380px]
      h-full
      border-l border-gray-300
      pl-6 pr-3
      flex items-center
      overflow-hidden
    "
            data-ignore-selection="true"
          >
            <div className="flex w-full items-center gap-2 min-w-0">
              {/* Total Quantity */}
              <div className="flex-1 min-w-0">
                <span className="block truncate font-semibold">Total: {rowValue}</span>
              </div>

              {/* Copy button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="default" size="sm" className="shrink-0" onClick={copyPrintData}>
                      <ClipboardCopy />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" align="center">
                    [CTRL + C] Copy Print Data
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Assignee */}
              {isAdmin && (
                <div className="shrink-0">
                  <DropdownAssignee
                    currentUser={currentUserSelected}
                    users={condensedUsers}
                    setCurrentUser={setCurrentUser}
                    userRows={userRows}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
