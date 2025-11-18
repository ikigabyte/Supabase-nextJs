"use client";

import React from "react";
import { Button } from "./ui/button";
import { getCorrectUserColor, getNameToColor } from "@/lib/utils";
import { DropdownAssignee } from "./dropdown";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { ClipboardCopy } from "lucide-react";
import { TableBody, TableRow, TableCell , Table} from "@/components/ui/table";


// import {
//   Item,
//   ItemActions,
//   ItemContent,
//   ItemDescription,
//   ItemMedia,
//   ItemTitle,
// } from "@/components/ui/item"

const quantityColumnIndex = 3; // * Adjust this to where the quantity is
function extractNumber(str: string) {
  // Remove "QTY" (case-insensitive) and trim whitespace
  const cleaned = str.replace(/qty/gi, "").trim();
  // Extract the first number found in the string
  const match = cleaned.match(/\d+/);
  return match ? match[0] : "";
}
export function OrderViewer({
  dragSelections,
  isAdmin,
  userRows,
  currentUserSelected,
  setCurrentUser,
  copyPrintData,
}: {
  dragSelections: React.MutableRefObject<Map<HTMLTableElement, { startRow: number; endRow: number }>>;
  isAdmin: boolean;
  userRows: Map<string, string>; // key: email, value: color
  currentUserSelected: string;
    setCurrentUser: (user: string) => void;
  copyPrintData: () => void;
}) {
  let sumValue = 0;
  let showDifferent = false;
  const rows: string[] = [];
  // console.log("Current user" + currentUserSelected);
  dragSelections.current.forEach((selection, table) => {
    const tbody = table.querySelector("tbody");
    if (!tbody) return;
    const dataRows = Array.from(tbody.children).filter(
      (el) => el.nodeName === "TR" && el.getAttribute("datatype") === "data"
    );
    const rowStart = Math.min(selection.startRow, selection.endRow);
    const rowEnd = Math.max(selection.startRow, selection.endRow);

    for (let i = rowStart; i <= rowEnd; i++) {
      const row = dataRows[i];
      if (!row) continue;
      const cell = row.children[quantityColumnIndex];
      if (cell) {
        const cellValue = cell.textContent ?? "";
        if (cellValue.toLowerCase().includes("tiles")) {
          showDifferent = true;
        }
        rows.push(cellValue);
      }
    }
  });

  if (!showDifferent) {
    for (const value of rows) {
      const number = parseFloat(extractNumber(value));
      if (!isNaN(number)) {
        sumValue += number;
      }
    }
  }
  const rowValue = showDifferent ? "N/A" : sumValue;

  const condensedUsers = Array.from(userRows.entries()).map(([email, color]) => ({
    email,
    color: getCorrectUserColor(userRows, email).backgroundColor,
  }));



return (
  <div className="fixed left-[20px] bottom-[80px] max-w-xs rounded-lg max-w-[300px] z-50 flex flex-col gap-2">
    <Table className="bg-white/90 shadow-lg rounded-full px-4 py-2 ring-1 ring-gray-300 w-full" data-ignore-selection="true"
    >
      <TableBody>
        <TableRow>
          <TableCell className="font-semibold pr-4">Total Quantity: {rowValue}</TableCell>
          <TableCell>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="default" size="sm" onClick={copyPrintData}>
                    <ClipboardCopy />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" align="center">
                  [CTRL + C] Copy Print Data
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </TableCell>
          {isAdmin && (
            <TableCell>
              <DropdownAssignee
                currentUser={currentUserSelected}
                users={condensedUsers}
                setCurrentUser={setCurrentUser}
                userRows={userRows}
              />
            </TableCell>
          )}
        </TableRow>
      </TableBody>
    </Table>
  </div>
);}


  //  <ItemActions>
  //         <Button variant="muted" size="sm">
  //           Copy Print Data
  //         </Button>
  //  </ItemActions>
        
// {Array.from(userRows.entries()).map(([key, user]) => (
//           <Button
//             key={key}
//             type="button"
//             data-ignore-selection="true"
//             style={{
//               backgroundColor: getNameToColor(user.color ?? user.name).backgroundColor,
//               color: "#fff",
//             }}
//             className="w-6 h-6 rounded-full p-0 flex items-center justify-center"
//             title={user.name}
//           >
//             {user.name[0].toUpperCase()}
//           </Button>
//         ))}
