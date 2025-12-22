"use client";

import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "./ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Viewer {
  user_id: string;
}

interface ViewersRowProps {
  activeViewers: Viewer[];
  idleViewers: Viewer[];
  totalRecentViewers: number;
  profilesById: Map<string, { name: string; color?: string | null; identifier?: string | null }>;
}

export function ViewersDropdown({ activeViewers, idleViewers, totalRecentViewers, profilesById }: ViewersRowProps) {
  const all = [
    ...activeViewers.map((v) => ({ ...v, idle: false })),
    ...idleViewers.map((v) => ({ ...v, idle: true })),
  ];

  const combined = all.slice(0, 5);
  const overflow = all.slice(5);

  const leftOverAfterCombined = totalRecentViewers - combined.length;

  const getAvatarInfo = (user_id: string) => {
    const p = profilesById.get(user_id);

    const label = p?.identifier ?? p?.name ?? user_id;
    const trimmed = label.trim();
    const firstLetter = trimmed ? trimmed[0].toUpperCase() : "?";
    const secondLetter = trimmed && trimmed.length > 1 ? trimmed[1].toUpperCase() : "";
    const firstLetterCombined = `${firstLetter}${secondLetter}`;

    let color: string = p?.color ?? "#e5e7eb";
    if (typeof color === "string" && /^\d{1,3}\/\d{1,3}\/\d{1,3}$/.test(color)) {
      color = "rgb(" + color.split("/").join(",") + ")";
    }

    return { firstLetterCombined, color, label };
  };

  if (totalRecentViewers === 0) return <></>;

  return (
    <TooltipProvider>
      <div className="flex items-center space-x-2">
        {/* Overflow dropdown trigger */}
        {leftOverAfterCombined > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 px-2 text-sm text-muted-foreground rounded-full"
              >
                +{leftOverAfterCombined}
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent side="bottom" align="start" className="w-64">
              <DropdownMenuLabel>Other viewers</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <ScrollArea className="h-72 w-full">
                <div className="p-1">
                  {overflow.map((v) => {
                    const { firstLetterCombined, color, label } = getAvatarInfo(v.user_id);
                    return (
                      <div
                        key={v.user_id}
                        className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted"
                        style={{ opacity: v.idle ? 0.6 : 1 }}
                      >
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white/80"
                          style={{ backgroundColor: color }}
                        >
                          {firstLetterCombined}
                        </div>
                        <div className="flex items-center justify-between w-full">
                          <div className="text-sm truncate">{label}</div>
                          {v.idle && <div className="text-xs text-muted-foreground">idle</div>}
                        </div>
                      </div>
                    );
                  })}
                  {/* If totalRecentViewers > all.length (mismatch), still show something */}
                  {overflow.length === 0 && leftOverAfterCombined > 0 && (
                    <div className="px-2 py-2 text-sm text-muted-foreground rounded-full">
                      {leftOverAfterCombined} more
                    </div>
                  )}
                </div>
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Avatars row (first 5) */}
        <div className="flex items-center space-x-1">
          {combined.map((v) => {
            const { firstLetterCombined, color, label } = getAvatarInfo(v.user_id);
            return (
              <Tooltip key={v.user_id}>
                <TooltipTrigger asChild>
                  <Button
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-white/70"
                    style={{
                      backgroundColor: color,
                      opacity: v.idle ? 0.4 : 1,
                    }}
                  >
                    {firstLetterCombined}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{label}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}