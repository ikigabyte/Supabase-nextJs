// import * as React from "react"
import { Button } from "./ui/button";
import { SkipBack, Eye, MailOpen, Trash } from "lucide-react";
import { Separator } from "./ui/separator";
import { OrderTypes } from "@/utils/orderTypes";
import { capitalizeFirstLetter, truncate } from "@/utils/stringfunctions";
import { convertToSpaces } from "@/lib/utils";


export function ContextMenu({
  handleMenuOptionClick,
  orderType,
  currentRow
}: {
  handleMenuOptionClick: (option: string) => void;
  orderType: OrderTypes;
  currentRow: any; // Replace 'any' with the actual type of your row data
}) {
  // console.log("ContextMenu orderType:", orderType);
  return (
    <div className="flex flex-col space-y-3 border border-gray-300 shadow-sm w-60 rounded-md bg-white p-3">
      {orderType !== "print" && (
        <>
          <Button
            datatype="menu-option"
            className="bg-white text-[12px] text-black hover:bg-gray-100"
            onClick={(e) => {
              // e.stopPropagation();
              // e.preventDefault();
              // console.log("Context menu clicked for email");
              handleMenuOptionClick("revert");
              // if (orderType === "cut") {
              //   console.log("revert to print");
              //   handleMenuOptionClick("revert");
              // } else if (orderType === "pack") {
              //   handleMenuOptionClick("revert-to-cut");
              // } else if (orderType === "ship") {
              //   handleMenuOptionClick("revert-to-pack");
              // }
            }}
          >
            <SkipBack className="mr-3 " />
            {orderType === "cut" && "Revert to Print"}
            {orderType === "pack" && "Revert to Cut"}
            {orderType === "ship" && "Revert to Pack"}
          </Button>
          <Separator className="my-2" />
        </>
      )}
      <p
      className="text-sm font-medium justify-center"
      >Viewing {truncate(currentRow.name_id, 10)}</p>
      {/* <Separator className="my-2" /> */}
      <Button
        datatype="menu-option"
        className="bg-white text-[12px] text-black hover:bg-gray-100"
        onClick={() => {
          handleMenuOptionClick("view");
        }}
      >
        <Eye className="mr-3" /> Zendesk Page
      </Button>
      {/* <Separator className="my-2" /> */}
      <Button
        datatype="menu-option"
        className="bg-white text-[12px] text-red-500 hover:bg-gray-100"
        onClick={() => {
          handleMenuOptionClick("delete");
        }}
      >
        <Trash className="mr-3 text-red-500" size={16} /> Remove Item
      </Button>
      {/* <Separator className="my-2" /> */}
      <Button
        datatype="menu-option"
        className="bg-white text-[12px] text-red-500 hover:bg-gray-100"
        onClick={() => {
          handleMenuOptionClick("deleteAll");
        }}
      >
        <Trash className="mr-3 text-red-500" size={16} /> Remove Order
      </Button>
    </div>
  );
}
