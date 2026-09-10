"use client";

import React, { useLayoutEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, CirclePause, Eye, Play, Trash, Trash2, RotateCcw, Printer, ClipboardCopy, User, SquarePen, Palette } from "lucide-react";
import { ReprintDialog } from "./reprint-dialog";
import { DropdownAssignee } from "./dropdown";
import { getCorrectUserColor } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ProductionStatus = "print" | "cut" | "prepack" | "pack" | "ship" | "completed";
const productionStatusOptions: Array<{ value: Exclude<ProductionStatus, "completed">; label: string }> = [
  { value: "print", label: "Print" },
  { value: "cut", label: "Cut" },
  { value: "prepack", label: "Prepack" },
  { value: "pack", label: "Pack" },
  { value: "ship", label: "Ship" },
];

const quantityColorOptions = [
  { label: "Blue 1", value: "#cfe2f3" },
  { label: "Blue 2", value: "#a5e6f6ff" },
  { label: "Blue 3", value: "#90c5f3ff" },
  { label: "Pink 1", value: "#ead1dc" },
  { label: "Pink 2", value: "#e8b8cdff" },
  { label: "Pink 3", value: "#e39ebcff" },
] as const;

type OrderViewerProps = {
  currentRow: { name_id: string; production_status?: string | null; asignee?: string | null } | null;
  anchorEl: HTMLElement | null;
  status: string;
  role: string;
  onRevertStatus: () => void;
  onViewZendesk: () => void;
  onDeleteLine: () => void;
  onDeleteAll: () => void;
  onCreateReprint: (nameId: string, quantity: number) => void;
  onCopyPrintData: () => void;
  onAssigneeChange: (user: string) => void;
  currentUserSelected: string;
  userRows: Map<string, { color: string; position: string | null }>;
  onProductionStatusChange: (status: ProductionStatus) => void;
  onPauseOrder: () => void;
  onQuantityColorChange: (color: string | null) => void;
};

export function OrderViewer({
  currentRow,
  anchorEl,
  status,
  role,
  onRevertStatus,
  onViewZendesk,
  onDeleteLine,
  onDeleteAll,
  onCreateReprint,
  onCopyPrintData,
  onAssigneeChange,
  currentUserSelected,
  userRows,
  onProductionStatusChange,
  onPauseOrder,
  onQuantityColorChange,
}: OrderViewerProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  const [reprintOpen, setReprintOpen] = useState(false);
  const permissionLevel = role === "admin" ? 3 : role === "manager" ? 2 : 1;
  const currentProductionStatus = currentRow?.production_status ?? status;
  const isPaused = currentRow?.asignee?.trim().toUpperCase() === "HOLD";
  const assigneeUsers = [
    { email: "N/A", color: "white", position: "" },
    ...Array.from(userRows.entries()).map(([email, user]) => ({
      email,
      color: getCorrectUserColor(userRows, email).backgroundColor,
      position: user.position || "",
    })),
  ];

  useLayoutEffect(() => {
    if (!anchorEl) return;

    const updatePosition = () => {
      const rowRect = anchorEl.getBoundingClientRect();
      const fileNameCell = anchorEl.querySelectorAll("td")[1];
      const fileNameRect = fileNameCell?.getBoundingClientRect() ?? rowRect;
      const toolbarRect = toolbarRef.current?.getBoundingClientRect();
      const toolbarHeight = toolbarRect?.height ?? 224;
      const toolbarWidth = toolbarRect?.width ?? 256;
      const viewportPadding = 8;
      const gap = 8;

      const belowRow = rowRect.bottom + gap;
      const top =
        belowRow + toolbarHeight <= window.innerHeight - viewportPadding
          ? belowRow
          : Math.max(viewportPadding, rowRect.top - toolbarHeight - gap);
      const left = Math.min(
        Math.max(fileNameRect.right - toolbarWidth, viewportPadding),
        window.innerWidth - toolbarWidth - viewportPadding,
      );

      setPosition({ top, left });
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [anchorEl]);
  // console.log("Permission Level:", permissionLevel);
  // const isAdmin = permissionLevel === 3;
  // const isManager = permissionLevel === 2;

  if (!currentRow) return null;
  // console.log(currentRow);
  // console.log("Rendering OrderViewer for:", currentRow.quantity);
  // if (currentRow.quantity === undefined) return null;
  // console.log("Rendering OrderViewer for:", currentRow.quantity);
  return (
    <>
      <div>
        <ReprintDialog
          open={reprintOpen}
          onOpenChange={setReprintOpen}
          nameId={currentRow.name_id}
          onReprint={onCreateReprint}
        />
      </div>
      <div
        ref={toolbarRef}
        data-ignore-selection="true"
        className="
      fixed z-50
      origin-top-right animate-in zoom-in-0 duration-150
      w-64 rounded-md border-2 border-gray-400 bg-white p-1.5
      text-gray-800 shadow-lg
      "
        style={{
          top: position?.top ?? 0,
          left: position?.left ?? 0,
          visibility: position ? "visible" : "hidden",
        }}
      >

  <Button
            variant="ghost"
            className="h-8 justify-start gap-2.5 px-2.5 text-xs font-normal"
            onClick={(e) => {
              e.stopPropagation();
              onViewZendesk();
            }}
          >
            <Eye className="h-3.5 w-3.5 shrink-0" />
            <span>View on Zendesk</span>
          </Button>

        <div className="flex flex-col">
          {currentProductionStatus === "print" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-8 w-full justify-start gap-2.5 px-2.5 text-xs font-normal"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Palette className="h-3.5 w-3.5 shrink-0" />
                  <span>Change Quantity Color</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-44" side="right" align="start" data-ignore-selection="true">
                <DropdownMenuLabel>Quantity Color</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {quantityColorOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    data-ignore-selection="true"
                    onSelect={() => onQuantityColorChange(option.value)}
                  >
                    <span className="h-3.5 w-3.5 rounded-full border border-black/15" style={{ backgroundColor: option.value }} />
                    {option.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem data-ignore-selection="true" onSelect={() => onQuantityColorChange(null)}>
                  Remove Color
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

         

          {status !== "print" && (
            <Button
              variant="ghost"
              className="h-8 justify-start gap-2.5 px-2.5 text-xs font-normal"
              onClick={(e) => {
                e.stopPropagation();
                onRevertStatus();
              }}
            >
              <RotateCcw className="h-3.5 w-3.5 shrink-0" />
              <span>Revert status</span>
            </Button>
          )}



    <Button
            variant="ghost"
            className="h-8 justify-start gap-2.5 px-2.5 text-xs font-normal"
            onClick={(e) => {
              e.stopPropagation();
              onCopyPrintData();
            }}
          >
            <ClipboardCopy className="h-3.5 w-3.5 shrink-0" />
            <span>Copy Print Data</span>
          </Button>

<Separator className="my-1.5" />

          {permissionLevel > 1 && (
            <>
                    <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 w-full justify-start gap-2.5 px-2.5 text-xs font-normal"
              onClick={(e) => e.stopPropagation()}
            >
              <SquarePen className="h-3.5 w-3.5 shrink-0" />
              <span>Change Production Status</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-52" side="right" align="start" data-ignore-selection="true">
            <DropdownMenuLabel>Production Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {productionStatusOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                disabled={currentProductionStatus === option.value}
                data-ignore-selection="true"
                onSelect={() => onProductionStatusChange(option.value)}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={currentProductionStatus === "completed"}
              data-ignore-selection="true"
              onSelect={() => onProductionStatusChange("completed")}
            >
              <CheckCircle2 className="h-4 w-4" />
              Complete Order
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>


              <Button
                variant="ghost"
                className="h-8 justify-start gap-2.5 px-2.5 text-xs font-normal"
                onClick={(e) => {
                  e.stopPropagation();
                  setReprintOpen(true);
                }}
              >
                <Printer className="h-3.5 w-3.5 shrink-0" />
                <span>Reprint Line Item</span>
              </Button>

              <DropdownAssignee
                currentUser={currentUserSelected}
                users={assigneeUsers}
                setCurrentUser={onAssigneeChange}
                userRows={userRows}
                trigger={
                  <Button
                    variant="ghost"
                    className="h-8 w-full justify-start gap-2.5 px-2.5 text-xs font-normal"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <User className="h-3.5 w-3.5 shrink-0" />
                    <span>Change Assignee</span>
                  </Button>
                }
              />
            </>
          )}

          <Button
            variant="ghost"
            className="h-8 justify-start gap-2.5 px-2.5 text-xs font-normal"
            onClick={(e) => {
              e.stopPropagation();
              onPauseOrder();
            }}
          >
            {isPaused ? (
              <Play className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <CirclePause className="h-3.5 w-3.5 shrink-0" />
            )}
            <span>{isPaused ? "Unpause Order" : "Pause Order"}</span>
          </Button>


          {permissionLevel > 2 && (
            <>
              <Separator className="my-1.5" />
              <Button
                variant="ghost"
                className="h-8 justify-start gap-2.5 px-2.5 text-xs font-normal text-red-600 hover:text-red-700"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteLine();
                }}
              >
                <Trash className="h-3.5 w-3.5 shrink-0" />
                <span>Delete Line Item</span>
              </Button>
              <Button
                variant="ghost"
                className="h-8 justify-start gap-2.5 px-2.5 text-xs font-normal text-red-600 hover:text-red-700"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteAll();
                }}
              >
                <Trash2 className="h-3.5 w-3.5 shrink-0" />
                <span>Delete Entire Order</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
