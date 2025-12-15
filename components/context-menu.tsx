// import * as React from "react"
import { Button } from "./ui/button";
import { SkipBack, Eye, MailOpen, Trash } from "lucide-react";
import { Separator } from "./ui/separator";
import { OrderTypes } from "@/utils/orderTypes";
import { capitalizeFirstLetter, truncate } from "@/utils/stringfunctions";
import { convertToSpaces } from "@/lib/utils";
import React, { useRef, useEffect, useState } from "react";

export function OptionsMenu({
  handleMenuOptionClick,
  orderType,
  currentRow,
  anchorEl,
  isAdmin,
}: {
  handleMenuOptionClick: (option: string) => void;
  orderType: OrderTypes;
  currentRow: any; // Replace 'any' with the actual type of your row data
    anchorEl: HTMLElement | null;
  isAdmin: boolean;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  // const OFFSET_FROM_CORNER = 500;

  useEffect(() => {
    if (!anchorEl) return;

    const update = () => {
      const rect = anchorEl.getBoundingClientRect();

      // Use fixed so it’s in viewport coords (no scrollY math needed)
      const GAP = 8; // space between row edge and menu edge
      const PAD = 8; // minimum padding from viewport edges

      let top = rect.bottom + 4;

      // anchor at the row's right edge, but keep menu fully inside viewport
      let left = rect.right - GAP; // this is the anchor point (row's right)
      const menu = menuRef.current;

      if (menu) {
        const menuRect = menu.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // shift left so the menu's right edge sits at `left`
        left = left - menuRect.width;

        // clamp horizontally into viewport
        left = Math.min(Math.max(left, PAD), vw - menuRect.width - PAD);

        // clamp vertically (your existing logic is fine)
        if (top + menuRect.height > vh - PAD) top = rect.top - menuRect.height - 4;
        top = Math.max(top, PAD);
      }

      setPosition({ top, left });
    };

    update();

    // Track movement when scrolling/resizing (including scrollable parents)
    // window.addEventListener("scroll", update, true);
    // window.addEventListener("resize", update);

    // return () => {
    //   window.removeEventListener("scroll", update, true);
    //   window.removeEventListener("resize", update);
    // };
  }, [anchorEl]);
  const revertStatus =
    orderType === "cut"
      ? "Revert to Print"
      : orderType === "prepack"
      ? "Revert to Cut"
      : orderType === "pack"
      ? "Revert to Prepack"
      : orderType === "ship"
      ? "Revert to Pack"
      : "";

  return (
    <div
      ref={menuRef}
      className="w-50 flex flex-col space-y-3 border border-gray-300 shadow-sm w-45 rounded-md bg-white p-3"
      style={{
        position: "fixed", // <-- key change
        top: position.top,
        left: position.left,
        zIndex: 1000,
      }}
    >
      <p className="text-sm text-center">{truncate(currentRow.name_id, 24)}</p>
      {orderType !== "print" && (
        <>
          <Button
            datatype="menu-option"
            className="bg-gray-100 text-[12px] text-black hover:bg-gray-200"
            onClick={() => {
              handleMenuOptionClick("revert");
            }}
          >
            <SkipBack className="mr-3" /> {revertStatus}
          </Button>
        </>
      )}

      <Button
        datatype="menu-option"
        className="bg-gray-100 text-[12px] text-black hover:bg-gray-200"
        onClick={() => {
          handleMenuOptionClick("view");
        }}
      >
        <Eye className="mr-3" /> Zendesk Page
      </Button>
      {isAdmin && (
        <>
          <Button
        datatype="menu-option"
        className="bg-gray-100 text-[12px] text-red-500 hover:bg-gray-100"
        onClick={() => {
          handleMenuOptionClick("delete");
        }}
          >
        <Trash className="mr-3 text-red-500" size={16} /> Remove Line Item
          </Button>
          <Button
        datatype="menu-option"
        className="bg-gray-100 text-[12px] text-red-500 hover:bg-gray-100"
        onClick={() => {
          handleMenuOptionClick("deleteAll");
        }}
          >
        <Trash className="mr-3 text-red-500" size={16} /> Remove All Order Items
          </Button>
        </>
      )}
        </div>
      );
    }
