"use client";

import React, { useState } from "react";
// import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
// import { redirect } from "next/dist/server/api-utils";

import {Search} from "lucide-react";
import { redirect } from "next/navigation";

export function SearchBar() {
  const [query, setQuery] = useState("");

  const onSearchClick = (query: string) => {
    redirect("/search" + `?query=${query}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onSearchClick(query);
      // onSearch(query);
    }
  };

  // onSearch(query);

  return (
    <div className="flex items-center space-x-2">
      <Input
        placeholder="🔍 Search..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1"
      />
    </div>
  );
}
