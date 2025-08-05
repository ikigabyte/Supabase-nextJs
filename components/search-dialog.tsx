import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DialogSearch({ onSearch }: { onSearch: (searchTerm: string) => void }) {
  const [orderId, setOrderId] = useState("");
  const [fileName, setFileName] = useState("");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="link" className="pd-0">
          Search
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:maxd-w-md">
        <DialogHeader>
          <DialogTitle>Search</DialogTitle>
        </DialogHeader>
        {/* single‐row flex: label, input, close button */}
        {/* Order ID: numbers only */}
        <div className="flex items-center space-x-2 mb-4">
          <Label htmlFor="orderId" className="whitespace-nowrap">
            Search by Order ID
          </Label>
          <Input
            id="orderId"
            type="number"
            inputMode="numeric"
            pattern="\d*"
            className="flex-1"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
          />
          <DialogClose asChild>
            <Button size="sm" onClick={() => onSearch(orderId)}>
              Search
            </Button>
          </DialogClose>
        </div>

        {/* File Name: letters only */}
        <div className="flex items-center space-x-2">
          <Label htmlFor="fileName" className="whitespace-nowrap">
            Search by File Name
          </Label>
          <Input
            id="fileName"
            type="text"
            className="flex-1"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
          />
          <DialogClose asChild>
            <Button size="sm" onClick={() => onSearch(fileName)}>
              Search
            </Button>
          </DialogClose>
        </div>
        <DialogFooter className="sm:justify-start">
          <DialogClose asChild></DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
