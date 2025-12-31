"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { convertToSpaces } from "@/lib/utils";
import { useState } from "react";


export function ReprintDialog({
  open,
  onOpenChange,
  nameId,
  onReprint,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  nameId: string;
  onReprint: (nameId: string, quantity: number) => void;
}) {
  const [quantity, setQuantity] = useState<string>("");

  const handleReprint = () => {
    const qty = Number(quantity);
    if (!isNaN(qty) && qty > 0) {
      onReprint(nameId, qty);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} data-ignore-selection="true">
      <DialogContent
        data-ignore-selection="true"
        aria-description={undefined}
        className="sm:max-w-md max-w-lg flex flex-col"
        style={{ minHeight: "auto" }}
      >
        <DialogHeader>
          <DialogTitle className="whitespace-normal break-words font-bold">
            Send {convertToSpaces(nameId)} to Reprint
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col justify-center">
          <Input
            data-ignore-selection="true"
            placeholder="Insert Quantity Number Here"
            className="pl-10 rounded-md text-xs"
            autoFocus
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            type="number"
            min={1}
          />
            <Button
            data-ignore-selection="true"
            type="button"
            aria-label="Reprint"
            className="mt-4"
            onClick={() => {
              handleReprint();
              if (onOpenChange) {
              onOpenChange(false);
              }
            }}
            disabled={!quantity || Number(quantity) <= 0}
            >
            Reprint
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
