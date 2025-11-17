"use client";

import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "./ui/button";
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
  // Merge active + idle, tag idle, then limit to first 5
  const combined = [
    ...activeViewers.map((v) => ({ ...v, idle: false })),
    ...idleViewers.map((v) => ({ ...v, idle: true })),
  ].slice(0, 5);

  const getAvatarInfo = (user_id: string) => {
    const p = profilesById.get(user_id);

    // Use identifier (likely email) or fallback to user_id
    const label = p?.identifier ?? p?.name ?? user_id;
    const trimmed = label.trim();
    const firstLetter = trimmed ? trimmed[0].toUpperCase() : "?";
    const secondLetter = trimmed && trimmed.length > 1 ? trimmed[1].toUpperCase() : "";
    const firstLetterCombined = `${firstLetter}${secondLetter}`;

    // Default color
    let color: string = p?.color ?? "#e5e7eb";

    // Convert "255/255/255" → "rgb(255,255,255)"
    if (typeof color === "string" && /^\d{1,3}\/\d{1,3}\/\d{1,3}$/.test(color)) {
      color = "rgb(" + color.split("/").join(",") + ")";
    }

    return { firstLetterCombined, color, label };
  };

  if (totalRecentViewers === 0) {
    return <div className="flex items-center text-sm text-muted-foreground">No recent viewers</div>;
  }

  return (
    <TooltipProvider>
      <div className="flex items-center space-x-2">
        {/* Avatars row */}

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
                  {/* <Button variant="outline">Hover</Button> */}
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
