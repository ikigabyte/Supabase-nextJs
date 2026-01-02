"use client";

import React, { useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Eye, Trash, Trash2, RotateCcw, Printer } from "lucide-react";
import { convertToSpaces } from "@/lib/utils";
import { ReprintDialog } from "./reprint-dialog";

type OrderViewerProps = {
  currentRow: { name_id: string } | null;
  status: string;
  isAdmin: boolean;
  onRevertStatus: () => void;
  onViewZendesk: () => void;
  onDeleteLine: () => void;
  onDeleteAll: () => void;
  onCreateReprint: (nameId: string, quantity: number) => void;
};

export function OrderViewer({
  currentRow,
  status,
  isAdmin,
  onRevertStatus,
  onViewZendesk,
  onDeleteLine,
  onDeleteAll,
  onCreateReprint
}: OrderViewerProps) {
  const label = useMemo(() => {
    if (!currentRow?.name_id) return "No row selected";
    return convertToSpaces(currentRow.name_id);
  }, [currentRow]);
  // console.log(currentRow.quantity);

  const [reprintOpen, setReprintOpen] = useState(false);

  if (!currentRow) return null;
  console.log(currentRow);
  // console.log("Rendering OrderViewer for:", currentRow.quantity);
  // if (currentRow.quantity === undefined) return null;
  // console.log("Rendering OrderViewer for:", currentRow.quantity);
  return (
    <>
      <div>
        <ReprintDialog open={reprintOpen} onOpenChange={setReprintOpen} nameId={currentRow.name_id} onReprint={onCreateReprint} />
      </div>
      <div
        data-ignore-selection="true"
        className="
      fixed
      bottom-[70px]
      left-4
      z-50
      bg-black/80
      text-white
      ring-1 ring-inset ring-gray-300
      shadow-md
      rounded-full
      p-5
      h-11
      flex items-center gap-2
      max-w-[420px]
      "
      >
        <TooltipProvider>
          {/* Label */}
          <div className="min-w-0">
            <p className="text-xs text-gray-200 leading-none">Selected</p>
            <p className="text-sm font-semibold truncate">{label}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {status !== "print" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRevertStatus();
                    }}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" align="center">
                  Revert status
                </TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewZendesk();
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" align="center">
                View on Zendesk
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    setReprintOpen(true);
                    // onViewZendesk();
                  }}
                >
                  <Printer className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" align="center">
                Send to Reprint
              </TooltipContent>
            </Tooltip>

            {isAdmin && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-full text-red-600 hover:text-red-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteLine();
                      }}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" align="center">
                    Delete line item
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-full text-red-600 hover:text-red-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteAll();
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" align="center">
                    Delete all line items
                  </TooltipContent>
                </Tooltip>
              </>
            )}
          </div>
        </TooltipProvider>
      </div>
    </>
  );
}
