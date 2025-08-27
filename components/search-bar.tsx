'use client'
import React, { useState } from "react";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
  onSearch: (query: string) => void;
}
export function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState("");

  // const onSearchClick = (query: string) => {
  //   redirect("/search" + `?query=${query}`);
  // };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSearch(query);
      // onSearch(query);
    }
  };

  // onSearch(query);

  return (
    <div className="flex items-center space-x-2">
      <Input
        placeholder="🔍 Search Orders"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1"
      />
    </div>
  );
}
