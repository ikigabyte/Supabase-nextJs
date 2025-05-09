"use client";

import React from "react";
import { Button } from "@/components/ui/button";
// import { getButtonColor  } from "@/types/buttons";

const getButtonColor = (category: string) => {
  switch (category) {
    case 'rush':
      return 'bg-red-800 text-white';
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
      return 'bg-gray-900 text-white';
  }
};

export function ButtonOrganizer({
  categories = [], counts = {},
  onCategoryClick,
}: {
  categories?: string[];
  counts?: Record<string, number>;
  onCategoryClick: (category: string) => void;
}) {
  return (
    <div className="fixed bottom-4 left-4 flex flex-row gap-2">
      {categories.map((category) => {
        const color = getButtonColor(category.toLowerCase())
        // console.log("this is the color", color);
        return (
          <Button
            key={category}
            variant="default"
            className={`${color}`}
            // className="bg-red-500"
            // style={{ backgroundColor: color }}
            onClick={() => onCategoryClick(category)}
          >
            {category} ({counts[category] || 0})
          </Button>
        );
      })}
    </div>
  );
}
