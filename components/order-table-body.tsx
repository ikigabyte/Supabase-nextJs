import React, { useEffect, useRef } from "react";
import { useState } from "react";
import { TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Order } from "@/types/custom";
import { capitalizeFirstLetter, truncate } from "@/utils/stringfunctions";
import { Separator } from "./ui/separator";
import { headers } from "next/headers";
import { convertToSpaces } from "@/lib/utils";
import { Textarea } from "./ui/textarea";
import { Button } from "@/components/ui/button";
import { getCorrectUserColor } from "@/lib/utils";

// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuGroup,
//   DropdownMenuItem,
//   DropdownMenuLabel,
//   DropdownMenuPortal,
//   DropdownMenuSeparator,
//   DropdownMenuShortcut,
//   DropdownMenuSub,
//   DropdownMenuSubContent,
//   DropdownMenuSubTrigger,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu"
// import { DropdownAsignee } from "./dropdown";

// A controlled input that only commits on Enter

// const allowedColors = [
//   "bg-red-100",
//   "bg-teal-100",
//   "bg-green-100",
//   "bg-blue-100",
//   "bg-yellow-100",
//   "bg-black-100"
// ];

const convertColorStringToValue = (colorString: string | null): string => {
  // console.log(colorString)
  if (!colorString || colorString == null) return ""; // Default color if no color is provided
  // Convert color string to a value, e.g., "red-100" to "red"
  switch (colorString.toLowerCase()) {
    case "red":
      return "bg-red-101";
    case "teal":
      return "bg-teal-101";
    case "green":
      return "bg-green-101";
    case "blue":
      return "bg-orange-101";
    case "orange":
      return "bg-orange-101";
    case "yellow":
      return "bg-yellow-101";
    default:
      return "bg-green-101"; // Default color if no match
  }
};

// const convertToRandomColor = (colorString: string | null): string => {
//   if (!colorString) return allowedColors[0]; // Default to first color
//   const color = colorString.toLowerCase();
//   switch (color) {
//     case "red":
//       return "bg-red-100";
//     case "teal":
//       return "bg-teal-100";
//     case "green":
//       return "bg-green-100";
//     case "blue":
//       return "bg-blue-100";
//     case "yellow":
//       return "bg-yellow-100";
//     default:
//       // Pick a random allowed color if not matched
//       return allowedColors[Math.floor(Math.random() * allowedColors.length)];
//   }
// };

const convertToDayOfTheWeek = (dateString: string | null) => {
  if (!dateString) return null;
  // Parse as local date
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day); // monthIndex is 0-based
  const dayNumber = date.getDay();
  if (dayNumber === 0) {
    console.log(dateString);
    console.log("Sunday detected, returning 0");
    return 0;
  }
  return dayNumber;
};

const displayCorrectQuantity = (quantity: string | null) => {
  if (quantity == null || quantity === "") {
    return "-";
  }
  const cleanedQuantity = quantity.toLowerCase().replace(/qty/gi, ""); // Remove "qty" (case-insensitive)
  if (cleanedQuantity.includes("-")) {
    const splitPart = cleanedQuantity.split("-");
    const quantityPart = splitPart[0];
    // const sizePart = splitPart[1];
    // const testPart = splitPart[2] || "";

    return `${quantityPart} Tiles`;
  } else {
    return cleanedQuantity;
  }
};

function boldUntilDash(text: string) {
  const dashIndex = text.indexOf("-");
  // console.log("Dash index:", dashIndex);
  if (dashIndex === -1) {
    return text;
  }
  return (
    <>
      <b>{text.slice(0, dashIndex)}</b>
      {text.slice(dashIndex)}
    </>
  );
}

const ignoredSections: { [key: string]: string[] } = {
  white: ["print method"],
  holographic: ["print method"],
  mag20pt: ["print method"],
};
const subtractBusinessDays = (date: Date, days: number): Date => {
  let result = new Date(date);
  let count = 0;
  while (count < days) {
    result.setDate(result.getDate() - 1);
    // 0 = Sunday, 6 = Saturday
    if (result.getDay() !== 0 && result.getDay() !== 6) {
      count++;
    }
  }
  return result;
};

const convertToOrderTypeDate = (date: string | null, orderType: string | undefined): string => {
  if (!date) return "-";
  if (!orderType) return "-"; // If no order type, return original date
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;

  let businessDays = 0;
  switch (orderType) {
    case "print":
      businessDays = 3;
      break;
    case "cut":
      businessDays = 2;
      break;
    case "pack":
      businessDays = 1;
      break;
    default:
      return date;
  }

  const originalDate = new Date(year, month - 1, day);
  const newDate = subtractBusinessDays(originalDate, businessDays);

  // Format as YYYY-MM-DD
  const formatted = [
    newDate.getFullYear(),
    String(newDate.getMonth() + 1).padStart(2, "0"),
    String(newDate.getDate()).padStart(2, "0"),
  ].join("-");
  return formatted;
};

const isSectionIgnored = (material: string | null, section: string): boolean => {
  if (!material || material == null) return false;
  const lowerCaseMaterial = material.toLowerCase();
  return ignoredSections[lowerCaseMaterial]?.includes(section) || false;
};

const dayOfTheWeekColor: { [key: number]: string } = {
  1: "bg-gray-302", // Monday
  2: "bg-gray-301", // Tuesday // change this to friday
  3: "bg-gray-303", // Wednesday
  4: "bg-gray-302", // Thursday
  5: "bg-gray-305", // Friday
};

const inkColors: { [key: string]: string } = {
  metallic: "bg-purple-100",
  "white-ink": "bg-pink-100",
  "3": "bg-yellow-200",
  "4": "bg-orange-200",
  "6": "bg-green-200",
  "12": "bg-blue-200",
};

const materialColors: { [key: string]: string } = {
  "clear-roll": "bg-teal-100",
};

const convertDateToReadableDate = (dateString: string | null): string => {
  if (!dateString) return "-";
  // Expecting format "YYYY-MM-DD"
  const parts = dateString.split("-");
  if (parts.length !== 3) return dateString;
  const [_, month, day] = parts;
  return `${month}-${day}`;
};

function NoteInput({ note, onCommit }: { note: string; onCommit: (value: string) => void }) {
  const [value, setValue] = useState(note);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setValue(note);
    }
  }, [note]);

  // Auto-resize on input
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = inputRef.current.scrollHeight + "px";
    }
  };

  // Initial auto-resize
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = inputRef.current.scrollHeight + "px";
    }
  }, [value]);

  const handleBlur = () => {
    if (value !== note) {
      console.log("Committing note change:", value);
      onCommit(value);
    } else {
      console.log("No change in note, not committing.");
    }
  };

  return (
    <>
      <Textarea
        ref={inputRef}
        className="overflow-y-hidden resize-none bg-transparent border-0 focus:bg-gray-200 text-[11px]"
        value={value}
        rows={1}
        onInput={handleInput}
        onChange={handleInput}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onCommit(value);
          }
        }}
      />
    </>
  );
}

export function OrderTableBody({
  data,
  productionStatus,
  onOrderClick,
  onNotesChange,
  setIsRowHovered,
  setMousePos,
  setRowHistory,
  setScrollAreaName,
  onRowClick,
  selectedNameId,
  isSpecialSection,
  multiSelectedRows = new Map<string, string | null>(),
  setMultiSelectedRows,
  hashValue,
  handleDoubleClick,
  dragSelections = useRef<Map<HTMLTableElement, { startRow: number; endRow: number }>>(new Map()),
  getRowRef,
  onAsigneeClick,
  userColors,
}: {
  data: Array<Order>;
  productionStatus?: string; // Optional prop to filter by production status
  onOrderClick: (order: Order) => void;
  onNotesChange: (order: Order, newNotes: string) => void;
  setIsRowHovered: (hovered: boolean) => void;
  setMousePos: (pos: { x: number; y: number }) => void;
  setRowHistory: (history: string[]) => void;
  setScrollAreaName: (name: string) => void;
  onRowClick: (rowEl: HTMLTableRowElement, row: Order | null, copiedText: boolean) => void;
  selectedNameId: string | null;
  isSpecialSection?: boolean; // Optional prop to indicate if this is a special section
  multiSelectedRows?: Map<string, string | null>;
  setMultiSelectedRows: React.Dispatch<React.SetStateAction<Map<string, string | null>>>;
  hashValue?: string | null; // Optional prop to track hash value
  handleDoubleClick: (fileName: string) => void;
  dragSelections?: React.MutableRefObject<Map<HTMLTableElement, { startRow: number; endRow: number }>>;
  getRowRef?: (name_id: string) => (el: HTMLTableRowElement | null) => void;
  onAsigneeClick: (row: Order) => void;
  userColors: Map<string, string>;
}) {
  // Example usage for setting userRows from data:
  // const simplifiedRows = (data ?? []).map((row) => ({
  //   email: row.identifier,
  //   color: row.color,
  // }));
  // console.log("Users with colors:", simplifiedRows);
  // setUserRows(simplifiedRows);
  // Ensure multiSelectedRows is never nullish
  if (!multiSelectedRows) {
    console.warn("multiSelectedRows was null or undefined, defaulting to empty Map");
    multiSelectedRows = new Map<string, string | null>();
  }
  // track which rows are checked by name_id
  const [checkedRows, setCheckedRows] = useState<Set<string>>(new Set());
  const lastHoveredIdRef = useRef<string | number | null>(null);
  const tableRef = useRef<HTMLTableSectionElement>(null);
  const clickTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastClickTime = useRef<number>(0);

  // Handling the dragging here

  // useEffect(() => {
  //   const handleClickOutside = (e: MouseEvent) => {
  //     const target = e.target as HTMLElement;
  //     console.log("Target" , target);
  //     // If click is outside the table and not on the context menu, clear selection
  //     if (
  //       tableRef.current &&
  //       !tableRef.current.contains(target) &&
  //       !target.closest('.context-menu')
  //     ) {
  //       onRowClick(e, null);
  //     }
  //   };
  //   document.addEventListener('click', handleClickOutside);
  //   return () => document.removeEventListener('click', handleClickOutside);
  // }, []);

  // console.log(hoveredCells?.current ? Array.from(hoveredCells.current) : "No hovered cells");
  const handleShiftClickRows = (selectedRows: Array<Order>) => {
    selectedRows.forEach((row) => {
      console.log(row.quantity);
    });
  };
  // console.log("user colors" , userColors);
  const handleMouseEnter = (event: React.MouseEvent<HTMLTableCellElement>, row: Order, type: string) => {
    if (lastHoveredIdRef.current !== row.name_id) {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      setMousePos({ x: rect.right, y: rect.bottom });
      if (type === "history") {
        const historyArray = Array.isArray(row.history) ? (row.history as string[]) : [];
        setRowHistory(historyArray);
        setScrollAreaName("History");
        lastHoveredIdRef.current = row.name_id;
      } else if (type === "quantity") {
        // console.log("Quantity hovered");
        const quantity = row.quantity || "";
        const cleanedQuantity = quantity.toLowerCase().replace(/qty/gi, ""); // Remove "qty" (case-insensitive)
        if (!cleanedQuantity.includes("tiles")) {
          // console.log("This is not a tile quantity");
          // setRowHistory()
          return;
        }
        // console.log("Cleaned quantity", cleanedQuantity);
        const splitPart = cleanedQuantity.split("-");
        // const removedTilePart = splitpart

        // console.log("Split part", removedTilePart);

        const quantityPart = splitPart[0];
        const sizePart = splitPart[2];
        const multiplication = parseInt(quantityPart) * parseInt(sizePart);
        // console.log("Size part", sizePart);
        // const testPart = splitPart[2] || "";
        const multiplicationInFeet = multiplication / 12;
        const combinedString = `${quantityPart} x ${sizePart}" H = ${multiplication}" or ${multiplicationInFeet}" ft`;
        setRowHistory([combinedString]);
        // setRowHistory(["Tile: " + row.quantity]);
        setScrollAreaName("Tile Size");
        lastHoveredIdRef.current = row.name_id;
      }
      setIsRowHovered(true);
    } else {
      // If the same row is hovered again, reset the state
      setIsRowHovered(false);
      lastHoveredIdRef.current = null;
    }
  };

  const handleMouseLeave = () => {
    setIsRowHovered(false);
    lastHoveredIdRef.current = null;
  };

  // console.log("the notes have changed here")
  // const handleMouseMove = (event: React.MouseEvent<HTMLTableRowElement>) => {
  // };

  // Track previous row's order_id to detect changes
  let prevOrderId: string | number | null = null;
  let differentOrderId: boolean | null = null;

  const cellRefs = useRef<Array<Array<HTMLTableCellElement | null>>>([]);

  const tableEl = tableRef.current?.closest("table") as HTMLTableElement | null;
  const dragSelection = dragSelections?.current && tableEl ? dragSelections.current.get(tableEl) : null;

  // const lastSelectedIndexRef = useRef<number | null>(null);

  // let isRowClicked = false;
  return (
    // <div className={isTableClicked ? 'border border-black' : ''} onClick={() => setIsTableClicked(true)}>
    <TableBody ref={tableRef} className="py-5">
      {data.map((row, i) => {
        // const nameCellRef = useRef<HTMLTableCellElement>(null);

        // Move checkbox state out of the map, see below
        const isChecked = checkedRows.has(row.name_id);
        const currentDay = convertToDayOfTheWeek(row.due_date);
        const safeName = convertToSpaces(row.name_id);
        const isSelected = row.name_id === selectedNameId;
        const isHighlighted =
          !!dragSelection &&
          Math.min(dragSelection.startRow, dragSelection.endRow) <= i &&
          i <= Math.max(dragSelection.startRow, dragSelection.endRow);

        differentOrderId = prevOrderId !== row.order_id;
        if (i === 0 && data.length > 1) {
          const nextOrder = data[i + 1];
          if (row.order_id !== nextOrder.order_id) {
            differentOrderId = true;
          }
        }
        const prev = data[i - 1];
        const showSeparator = i > 0 && row.order_id !== prev.order_id && row.production_status !== "print";

        //* Took this out of line 309
        // ${multiSelectedRows.has(row.name_id) ? " ring-1 ring-black relative" : ""}
        // ${String(row.order_id) === hashValue ? "bg-yellow-200 !hover:bg-yellow-300" : ""}
        // console.log(currentDay)
        return (
          <React.Fragment key={row.name_id}>
            {showSeparator && (
              <TableRow key={`sep-${row.name_id}`} className="h-full" datatype="seperator">
                <TableCell colSpan={5} className="h-4 bg-transparent" />
              </TableRow>
            )}
            <TableRow
              ref={getRowRef ? getRowRef(row.name_id) : undefined}
              datatype="data"
              key={row.name_id}
              name-id={row.name_id}
              className={`
              [&>td]:py-1 align-top max-h-[14px] text-xs whitespace-nowrap break-all border-y-2 border-white
              ${currentDay ? dayOfTheWeekColor[currentDay] : "bg-blue-300"}
                ${isHighlighted ? "bg-blue-300 hover:bg-blue-300" : ""}`}
              onClick={(e) => {
                // Toggle multi-selection on left click, storing name_id and quantity
                // setMultiSelectedRows((prev) => {
                //   const next = new Map(prev);
                //   if (next.has(row.name_id)) {
                //     next.delete(row.name_id);
                //   } else {
                //     next.set(row.name_id, row.quantity);
                //   }
                //   return next;
                // });
                // Preserve original click behavior
                // onRowClick(e.currentTarget, row, false);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                console.log("Context menu clicked on row", row.name_id);
                onRowClick(e.currentTarget, row, false);
              }}
            >
              {/* This is the file name cell / first cell */}
              <TableCell
                ref={(el) => {
                  if (!cellRefs.current[i]) cellRefs.current[i] = [];
                  cellRefs.current[i][0] = el;
                }}
                // className={
                //   hoveredCells?.current &&
                //   cellRefs.current[i] &&
                //   cellRefs.current[i][0] &&
                //   hoveredCells.current.has(cellRefs.current[i][0]!)
                //     ? "bg-blue-100"
                //     : ""
                // }
                onMouseEnter={(event) => handleMouseEnter(event, row, "history")}
                onMouseLeave={handleMouseLeave}
                className={
                  "whitespace-normal break-all " +
                  (isHighlighted
                    ? "bg-blue-300 hover:bg-blue-300"
                    : row.production_status === "print"
                    ? convertColorStringToValue(row.color)
                    : "")
                }
                onClick={(e) => {
                  // console.log("Clicked on row", row.color);
                  const now = Date.now();
                  if (now - lastClickTime.current < 350) {
                    console.log("Double click detected on", safeName);
                    // 350ms threshold for double click
                    if (clickTimeout.current) clearTimeout(clickTimeout.current);
                    lastClickTime.current = 0;
                    handleDoubleClick(safeName); // Call your double click handler
                  } else {
                    lastClickTime.current = now;
                    if (clickTimeout.current) clearTimeout(clickTimeout.current);
                    clickTimeout.current = setTimeout(() => {
                      lastClickTime.current = 0;
                    }, 400);
                  }
                }}
              >
                {isHighlighted ? boldUntilDash(safeName) : boldUntilDash(truncate(safeName, 30)) || "-"}
                {/* {boldUntilDash(multiSelectedRows.has(row.name_id) ? safeName : truncate(safeName, 40) || "-")} */}
              </TableCell>
              <TableCell
                ref={(el) => {
                  if (!cellRefs.current[i]) cellRefs.current[i] = [];
                  cellRefs.current[i][1] = el;
                }}
                // className={
                //   hoveredCells?.current &&
                //   cellRefs.current[i] &&
                //   cellRefs.current[i][1] &&
                //   hoveredCells.current.has(cellRefs.current[i][1]!)
                //     ? "bg-blue-100"
                //     : ""
                // }
              >
                {capitalizeFirstLetter(row.shape) || "-"}
              </TableCell>
              <TableCell
                onMouseEnter={(event) => handleMouseEnter(event, row, "quantity")}
                onMouseLeave={handleMouseLeave}
                // className={
                //   hoveredCells?.current && cellRefs.current[i] && hoveredCells.current.has(cellRefs.current[i]!)
                //     ? "bg-blue-100"
                //     : ""
                // }
              >
                {displayCorrectQuantity(row.quantity) || "-"}
              </TableCell>

              <TableCell
              // className={
              //   hoveredCells?.current && cellRefs.current[i] && hoveredCells.current.has(cellRefs.current[i]!)
              //     ? "bg-blue-100"
              //     : ""
              // }
              >
                {capitalizeFirstLetter(row.lamination) || "-"}
              </TableCell>
              <TableCell
                className={`${
                  row.material && materialColors[row.material.toLowerCase()]
                    ? materialColors[row.material.toLowerCase()]
                    : ""
                }`}
              >
                {capitalizeFirstLetter(row.material) || "-"}
              </TableCell>
              <TableCell className="">{capitalizeFirstLetter(row.ink)}</TableCell>
              <TableCell className={`text-[11px] truncate`}>
                {isSectionIgnored(row.material, "print method") ? "-" : capitalizeFirstLetter(row.print_method) || ""}
              </TableCell>
              <TableCell
                className={(() => {
                  const convertedOrderTypeDate = convertToOrderTypeDate(row.due_date, productionStatus);
                  if (
                    convertedOrderTypeDate &&
                    convertedOrderTypeDate !== "-" &&
                    !isHighlighted // Don't highlight if row is highlighted
                  ) {
                    const today = new Date();
                    const [year, month, day] = convertedOrderTypeDate.split("-").map(Number);
                    const dueDate = new Date(year, month - 1, day);
                    // Remove time part for comparison
                    today.setHours(0, 0, 0, 0);
                    dueDate.setHours(0, 0, 0, 0);
                    if (dueDate < today) {
                      return "bg-yellow-200";
                    }
                  }
                  return "";
                })()}
              >
                {convertDateToReadableDate(convertToOrderTypeDate(row.due_date, productionStatus))}
              </TableCell>
              <TableCell className="">
                {productionStatus === "ship"
                  ? convertDateToReadableDate(row.ihd_date)
                  : convertDateToReadableDate(row.due_date)}
              </TableCell>
              <TableCell
                className=""
                onClick={(e) => {
                  e.stopPropagation();
                  onAsigneeClick(row);
                }}
              >
                <Button
                  className={`h-5 w-8 rounded-full px-0 py-0 text-xs ${
                    !row.asignee ? "border border-dotted border-gray-400 text-gray-400 bg-transparent" : ""
                  }`}
                  style={row.asignee ? getCorrectUserColor(userColors, row.asignee) : undefined}
                >
                  {row.asignee && row.asignee.length >= 2
                    ? row.asignee.slice(0, 2).toUpperCase()
                    : row.asignee && row.asignee.length === 1
                    ? row.asignee[0].toUpperCase()
                    : "N/A"}
                </Button>
              </TableCell>
              <TableCell className={`text-[11px] truncate`}>
                {capitalizeFirstLetter(row.shipping_method) || ""}
              </TableCell>
              <TableCell className={``}>
                {/* <Textarea ></Textarea> */}
                <NoteInput note={row.notes ?? ""} onCommit={(value) => onNotesChange(row, value)} />
              </TableCell>
              <TableCell>
                <Checkbox
                  checked={isChecked}
                  disabled={isChecked}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setCheckedRows((prev) => {
                        const next = new Set(prev);
                        next.add(row.name_id);
                        return next;
                      });
                      setTimeout(() => {
                        onOrderClick(row);
                        setCheckedRows((prev) => {
                          const next = new Set(prev);
                          next.delete(row.name_id);
                          return next;
                        });
                      }, 3000); // 3 seconds
                    }
                  }}
                />
              </TableCell>
            </TableRow>
          </React.Fragment>
        );
      })}
    </TableBody>
  );
}

            {/* className={`h-5 w-8 rounded-full px-0 py-0 text-xs ${
                      row.asignee
                        ? getCorrectUserColor(row.asignee ?? "")
                        : "border bg-transparent border-dotted border-gray-400 text-gray-400"
                    }`} */}
                    