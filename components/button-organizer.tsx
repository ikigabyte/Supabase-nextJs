"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
// import { getButtonColor } from "@/utils/colors";

export const getBorderColor = (category: string) => {
  switch (category) {
    case "rush":
      return "border-red-800";
    case "white":
      return "border-gray-800";
    case "glitter":
      return "border-yellow-400";
    case "holographic":
      return "border-green-500";
    case "clear":
      return "border-pink-300";
    case "20ptmag":
      return "border-green-800";
    case "30ptmag":
      return "border-blue-800";
    case "sheets":
      return "border-blue-600";
    case "arlon":
      return "border-teal-500";
    case "floor":
      return "border-yellow-800";
    case "roll":
      return "border-yellow-900";
    case "cling":
      return "border-red-300";
    case "reflective":
      return "border-green-300";
    case "special":
      return "border-yellow-500";
    default:
      return "border-black";
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
  onCategoryClick: (category: string) => Promise<void> | void;
  categoryViewing: string;
}) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const handleClick = async (category: string) => {
    setActiveCategory(category); // optimistic UI update
    onCategoryClick(category);
  };

  return (
    <div className="w-full flex justify-center">
      <div className="fixed bottom-0 left-0 right-0 w-full bg-gray-200 py-2 z-30 shadow-lg">
        <div className="flex flex-nowrap overflow-x-auto pl-5">
          {categories.map((category) => {
            const isActive = activeCategory === category || categoryViewing === category;
            const borderColor = getBorderColor(category.toLowerCase());
            return (
              <Button
                key={category}
                className={`
              relative px-3 py-2 mx-1
              ${isActive ? `bg-gray-600 border-2 ${borderColor}` : "border-2 bg-gray-500"}
              `}
                onClick={() => handleClick(category)}
              >
                {category.toUpperCase()} ({counts[category] || 0})
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
