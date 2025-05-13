import React, { useEffect, useRef } from "react";
import { useState } from "react";
import { TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Order } from "@/types/custom";
import { capitalizeFirstLetter, truncate } from "@/utils/stringfunctions";
import { Separator } from "./ui/separator";
// A controlled input that only commits on Enter
function NoteInput({ note, onCommit }: { note: string; onCommit: (value: string) => void }) {
  const [value, setValue] = useState(note);
  const inputRef = useRef<HTMLInputElement>(null);
  // Sync remote note changes when not focused
  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setValue(note);
    }
  }, [note]);
  return (
    <Input
      ref={inputRef}
      className="h-1/3 w-full bg-transparent border-0 focus:bg-gray-200"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
          onCommit(value);
        }
      }}
    />
  );
}
// import {DayOfTheWeekColor} from "@/utils/dayOfTheWeekColor";

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
};

const materialColors: { [key: string]: string } = {
  "clear-roll": "bg-teal-100",
};

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
        console.log("Multiplication", multiplication);
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
        differentOrderId = prevOrderId !== row.order_id;
        if (i === 0 && data.length > 1) {
          const nextOrder = data[i + 1];
          if (row.order_id !== nextOrder.order_id) {
            differentOrderId = true;
          }
        }
        prevOrderId = row.order_id;
        const showSeparator = differentOrderId && i !== 0;
        return (
          <React.Fragment key={row.name_id}>
            {showSeparator && (
              <TableRow key={`sep-${row.name_id}`} className="h-1 border-none">
                <TableCell colSpan={13} className="h-1 bg-white hover:bg-white" />
              </TableRow>
            )}
            <TableRow
              key={row.name_id}
              className={`[&>td]:py-0 bg-transparent hover:bg-transparent text-xs whitespace-normal break-all ${
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
                    console.log("Copying name_id to clipboard:", row.name_id);
                    navigator.clipboard.writeText(String(row.name_id)).catch(console.error);
                  }
                }}
                className="cursor-copy"
              >
                {row.name_id === selectedNameId ? row.name_id : truncate(row.name_id, 30) || "-"}
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
                onMouseEnter={(event) => handleMouseEnter(event, row, "quantity")}
                onMouseLeave={handleMouseLeave}
                className=""
              >
                {displayCorrectQuantity(row.quantity) || "-"}
              </TableCell>
              <TableCell
                className={`${row.ink && inkColors[row.ink.toLowerCase()] ? inkColors[row.ink.toLowerCase()] : ""}`}
              >
                {capitalizeFirstLetter(row.ink)}v
              </TableCell>
              <TableCell className="">{capitalizeFirstLetter(row.print_method) || ""}</TableCell>
              <TableCell className={currentDay ? dayOfTheWeekColor[currentDay] : ""}>
                {capitalizeFirstLetter(row.due_date) || ""}
              </TableCell>
              <TableCell className="">{capitalizeFirstLetter(row.ihd_date) || ""}</TableCell>
              <TableCell className="">{capitalizeFirstLetter(row.shipping_method) || ""}</TableCell>
              <TableCell className="">
                <NoteInput note={row.notes ?? ""} onCommit={(value) => onNotesChange(row, value)} />
              </TableCell>
              <TableCell className="">
                <Checkbox
                  checked={isChecked}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  onCheckedChange={(checked) => {
                    setCheckedRows((prev) => {
                      const next = new Set(prev);
                      if (checked) next.add(row.name_id);
                      else next.delete(row.name_id);
                      return next;
                    });
                    onOrderClick(row);
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
