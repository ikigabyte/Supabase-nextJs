"use client";

import React from "react";
import { Button } from "@/components/ui/button";
// import { ScrollArea, ScrollBar } from "@radix-ui/react-scroll-area";
// import { getButtonColor  } from "@/types/buttons";

const getButtonColor = (category: string) => {
  switch (category) {
    case "rush":
      return "bg-red-800 text-white";
    // case 'white':
    //   return 'bg-gray-800 text-white';
    // case 'glitter':
    //   return 'bg-yellow-300 text-black';
    // case 'holographic':
    //   return 'bg-green-500 text-white';
    // case 'clear':
    //   return 'bg-pink-300 text-black';
    // case 'mag20pt':
    //   return 'bg-green-800 text-white';
    // case 'mag30pt':
    //   return 'bg-blue-800 text-white';
    // case 'reflective':
    //   return 'bg-green-200 text-black';
    // case 'arlon':
    //   return 'bg-teal-500 text-white';
    // case 'floor':
    //   return 'bg-yellow-800 text-white';
    // case 'roll':
    //   return 'bg-orange-300 text-black';
    default:
      return "bg-gray-900 text-white";
  }
};

export function ButtonOrganizer({
  categories = [],
  counts = {},
  onCategoryClick,
  categoryViewing,
}: {
  categories?: string[];
  counts?: Record<string, number>;
  onCategoryClick: (category: string) => void;
  categoryViewing: string;
}) {
  return (
    <div className="w-full flex justify-center">
      <div className="fixed bottom-0 left-0 right-0 w-full bg-gray-500 py-2 z-30 shadow-lg">
        <div className="flex flex-nowrap overflow-x-auto pl-5">
          {categories.map((category) => {
            const isActive = category === categoryViewing;
            const color = getButtonColor(category.toLowerCase());

            // For active: add white border, for inactive: no extra border
            const buttonClass = `${color} px-3 py-2 mx-1 ${isActive ? "border-2 border-white" : ""}`;

            return (
              <Button key={category} variant="default" className={buttonClass} onClick={() => onCategoryClick(category)}>
                {category} ({counts[category] || 0})
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
