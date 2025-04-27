"use client";

import React from "react";
import { Button } from "@/components/ui/button";

export function ButtonOrganizer({
  categories = [],
  onCategoryClick,
}: {
  categories?: string[];
  onCategoryClick: (category: string) => void;
}) {
  return (
    <div className="fixed bottom-4 left-4 flex flex-row gap-2">
      {categories.map((category) => (
        <Button key={category} variant="default" onClick={() => onCategoryClick(category)}>
          {category}
        </Button>
      ))}
    </div>
  );
}
