import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getCorrectUserColor } from "@/lib/utils";

import { ScrollArea } from "@/components/ui/scroll-area";

type DropdownAssigneeProps = {
  users: { email: string; color: string }[];
};

export function DropdownAssignee({
  currentUser,
  users,
  setCurrentUser,
  userRows,
}: {
  currentUser: string;
  users: { email: string; color: string }[];
  setCurrentUser: (user: string) => void;
  userRows: Map<string, string>;
}) {
  // Triple the users for testing
  // const tripledUsers = [...users, ...users, ...users, ...users, ...users, ...users];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild data-ignore-selection="true">
        <Button
          variant="outline"
          className="rounded-full w-8 h-8 p-0 flex items-center justify-center text-white text-sm"
          style={{ backgroundColor: getCorrectUserColor(userRows, currentUser).backgroundColor }}
        >
          {currentUser
            .split("@")[0]
            .split(/[.\-_]/)
            .map((p) => p[0]?.toUpperCase())
            .join("")
            .slice(0, 2)}
        </Button>
      </DropdownMenuTrigger>

      {/* Ensure menu width is stable */}
      <DropdownMenuContent className="w-56" side="right" align="end">
        <DropdownMenuLabel>Select a User</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* Correct ScrollArea: must have max height */}
        <ScrollArea className="max-h-72 w-full overflow-auto">
            <DropdownMenuRadioGroup data-ignore-selection="true" value={currentUser} onValueChange={setCurrentUser}>
              {users.map(({ email, color }, idx) => (
                <DropdownMenuRadioItem key={`${email}-${idx}`} value={email} className="flex items-center gap-3">
                  <span
                    className="flex items-center justify-center rounded-full w-6 h-6 min-w-6 min-h-6 text-white text-sm"
                    style={{ backgroundColor: color }}
                  >
                    {email
                      .split("@")[0]
                      .split(/[.\-_]/)
                      .map((p) => p[0]?.toUpperCase())
                      .join("")
                      .slice(0, 2)}
                  </span>
                  {email.split("@")[0]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
