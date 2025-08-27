import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function DialogSearch({
  onSearch,
  open,
  onOpenChange,
}: {
  onSearch: (searchTerm: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [orderId, setOrderId] = useState("");
  const [fileName, setFileName] = useState("");

  // Reset input when dialog closes
  useEffect(() => {
    if (!open) setOrderId("");
  }, [open]);

  const handleSearch = (searchTerm: string) => {
    onSearch(searchTerm);
    setOrderId("");
    if (onOpenChange) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Search Orders</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Input
            placeholder="Insert Order Id Here (Ex: 103320)"
            className="pl-10 rounded-md text-xs"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch(orderId);
              }
            }}
            autoFocus
          />
          <div
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer"
            onClick={() => handleSearch(orderId)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>
        <Button onClick={() => handleSearch(orderId)} disabled={!orderId.trim()}>
          Search
        </Button>
      </DialogContent>
      <div className="flex justify-end mt-2 px-6"></div>
    </Dialog>
  );
}
