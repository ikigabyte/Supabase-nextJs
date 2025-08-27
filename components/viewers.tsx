"use client";
// import React, { useState } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem } from "@/components/ui/select";
// import { getCorrectUserColor } from "@/lib/utils";

interface Viewer {
  user_id: string;
  // ...other fields if needed
}

interface ViewersDropdownProps {
  activeViewers: Viewer[];
  idleViewers: Viewer[];
  totalRecentViewers: number;
  profilesById: Map<string, { name: string; color?: string | null; identifier?: string | null }>;
}

export function ViewersDropdown({
  activeViewers,
  idleViewers,
  totalRecentViewers,
  profilesById,
}: ViewersDropdownProps) {
  // console.log(profilesById);
  // Helper for rendering each viewer row
  const renderViewerRow = (user_id: string, faded?: boolean) => {
    const p = profilesById.get(user_id);
    const name = p?.name ?? p?.identifier ?? user_id;
    let color = p?.color ?? "#e5e7eb";

    // Convert "255/255/255" to "rgb(255,255,255)"
    if (typeof color === "string" && /^\d{1,3}\/\d{1,3}\/\d{1,3}$/.test(color)) {
      color = "rgb(" + color.split("/").join(",") + ")";
    }

    const initials = name
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    return (
      <div
        className={`flex items-center justify-between space-x-2 px-2 py-1 ${faded ? "opacity-50" : ""}`}
        data-testid={`viewer-${user_id}`}
      >
        <div className="flex items-center space-x-2">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-black/70"
            style={{ backgroundColor: String(color) }}
          >
            {initials}
          </div>
          <span className="text-sm">{name}</span>
        </div>
        {faded && (
          <span className="text-xs text-muted-foreground ml-2">idle</span>
        )}
      </div>
    );
  };

  return (
    <Select>
      <SelectTrigger>
        <SelectValue placeholder={`Viewers (${totalRecentViewers})`} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {/* Active ≤30m first */}
          {activeViewers.map((v) => (
            <SelectItem key={v.user_id} value={v.user_id} >
              {renderViewerRow(v.user_id, false)}
            </SelectItem>
          ))}

          {/* Idle ≤2h shown with transparency */}
          {idleViewers.map((v) => (
            <SelectItem key={v.user_id} value={v.user_id} >
              {renderViewerRow(v.user_id, true)}
            </SelectItem>
          ))}

          {/* Empty state */}
          {totalRecentViewers === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">No recent viewers</div>}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
