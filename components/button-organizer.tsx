"use client";

import React from "react";
import { Button } from "@/components/ui/button";

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
      {categories.map((category) => (
        <Button key={category} variant="default" onClick={() => onCategoryClick(category)}>
          {category} ({counts[category] || 0})
        </Button>
      ))}
    </div>
  );
}
