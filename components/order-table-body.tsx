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
// A controlled input that only commits on Enter

const convertToDayOfTheWeek = (dateString: string | null) => {
  if (!dateString || dateString == null) {
    return 1;
  }
  const date = new Date(dateString);
  const dayNumber = date.getDay();
  // console.log(dayNumber);
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

const ignoredSections: { [key: string]: string[] } = {
  white: ["print method"],
  holographic: ["print method"],
  mag20pt: ["print method"],
};

const isSectionIgnored = (material: string | null, section: string): boolean => {
  if (!material || material == null) return false;
  const lowerCaseMaterial = material.toLowerCase();
  return ignoredSections[lowerCaseMaterial]?.includes(section) || false;
};

const dayOfTheWeekColor: { [key: number]: string } = {
  1: "bg-gray-100", // Monday
  2: "bg-gray-300", // Friday
  3: "bg-gray-200", // Wednesday
  4: "bg-gray-250", // Thursday
  5: "bg-gray-300", // Thursday
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

  return (
    <>
      <Textarea
        ref={inputRef}
        className="overflow-y-hidden resize-none bg-transparent border-0 focus:bg-gray-200 text-[11px]"
        value={value}
        rows={1}
        onInput={handleInput}
        onChange={handleInput}
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
// import {DayOfTheWeekColor} from "@/utils/dayOfTheWeekColor";

export function OrderTableBody({
  data,
  onOrderClick,
  onNotesChange,
  setIsRowHovered,
  setMousePos,
  setRowHistory,
  setScrollAreaName,
  onRowClick,
  selectedNameId,
  isSpecialSection,
}: {
  data: Array<Order>;
  onOrderClick: (order: Order) => void;
  onNotesChange: (order: Order, newNotes: string) => void;
  setIsRowHovered: (hovered: boolean) => void;
  setMousePos: (pos: { x: number; y: number }) => void;
  setRowHistory: (history: string[]) => void;
  setScrollAreaName: (name: string) => void;
  onRowClick: (rowEl: HTMLTableRowElement, row: Order | null, copiedText: boolean) => void;
  selectedNameId: string | null;
  isSpecialSection?: boolean; // Optional prop to indicate if this is a special section
  // isTableClicked?: boolean; // Optional prop to indicate if the table is clicked
}) {
  // track which rows are checked by name_id
  const [checkedRows, setCheckedRows] = useState<Set<string>>(new Set());
  const lastHoveredIdRef = useRef<string | number | null>(null);
  const tableRef = useRef<HTMLTableSectionElement>(null);
  // const rowRef = useRef<HTMLTableRowElement>(null);

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
        const combinedString = `${quantityPart} x ${sizePart} = ${multiplication} "`;
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

  // let isRowClicked = false;
  return (
    // <div className={isTableClicked ? 'border border-black' : ''} onClick={() => setIsTableClicked(true)}>
    <TableBody ref={tableRef} className="">
      {data.map((row, i) => {
        // Move checkbox state out of the map, see below
        const isChecked = checkedRows.has(row.name_id);
        const currentDay = convertToDayOfTheWeek(row.due_date);
        const safeName = convertToSpaces(row.name_id);
        const isSelected = row.name_id === selectedNameId;

        differentOrderId = prevOrderId !== row.order_id;
        if (i === 0 && data.length > 1) {
          const nextOrder = data[i + 1];
          if (row.order_id !== nextOrder.order_id) {
            differentOrderId = true;
          }
        }
        const prev = data[i - 1];
        const showSeparator = i > 0 && row.order_id !== prev.order_id;

        return (
          <React.Fragment key={row.name_id}>
            {showSeparator && (
              <TableRow key={`sep-${row.name_id}`} className="h-full border-none">
                <TableCell colSpan={13} className="h-4 bg-transparent hover:bg-white" />
              </TableRow>
            )}
            <TableRow
              key={row.name_id}
              className={`[&>td]:py-1 align-top border-gray-300 border-b-2 bg-gray-100 max-h-[14px] hover:bg-gray-300 text-xs whitespace-normal break-all ${
                row.name_id === selectedNameId ? " ring-1 ring-black relative z-10" : ""
              }`}
              onClick={(e) => onRowClick(e.currentTarget, row, false)}
            >
              <TableCell
                onMouseEnter={(event) => handleMouseEnter(event, row, "history")}
                onMouseLeave={handleMouseLeave}
                onClick={(e) => {
                  e.stopPropagation();
                  onRowClick(e.currentTarget.closest("tr") as HTMLTableRowElement, row, true);
                  if (row.name_id) {
                    console.log("Copying name_id to clipboard:", safeName);
                    navigator.clipboard.writeText(String(safeName)).catch(console.error);
                  }
                }}
                className=""
              >
                {isSelected ? safeName : truncate(safeName, 40) || "-"}
              </TableCell>
              <TableCell
                onMouseEnter={(event) => handleMouseEnter(event, row, "quantity")}
                onMouseLeave={handleMouseLeave}
                className=""
              >
                {displayCorrectQuantity(row.quantity) || "-"}
              </TableCell>

              <TableCell className="">{capitalizeFirstLetter(row.shape) || "-"}</TableCell>
              <TableCell className="">{capitalizeFirstLetter(row.lamination) || "-"}</TableCell>
              <TableCell
                className={`${
                  row.material && materialColors[row.material.toLowerCase()]
                    ? materialColors[row.material.toLowerCase()]
                    : ""
                }`}
              >
                {capitalizeFirstLetter(row.material) || "-"}
              </TableCell>

              <TableCell
                className={`${row.ink && inkColors[row.ink.toLowerCase()] ? inkColors[row.ink.toLowerCase()] : ""}`}
              >
                {capitalizeFirstLetter(row.ink)}
              </TableCell>
              <TableCell className="text-[11px] truncate">
                {isSectionIgnored(row.material, "print method") ? "-" : capitalizeFirstLetter(row.print_method) || ""}
              </TableCell>
              <TableCell className={currentDay ? dayOfTheWeekColor[currentDay] : ""}>
                {capitalizeFirstLetter(row.due_date) || ""}
              </TableCell>
              <TableCell className="">{capitalizeFirstLetter(row.ihd_date) || ""}</TableCell>
              <TableCell className="text-[11px] truncate">{capitalizeFirstLetter(row.shipping_method) || ""}</TableCell>
              <TableCell className="">
                {/* <Textarea ></Textarea> */}
                <NoteInput note={row.notes ?? ""} onCommit={(value) => onNotesChange(row, value)} />
              </TableCell>
              <TableCell className="">
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
