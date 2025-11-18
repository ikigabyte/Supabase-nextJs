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

type DropdownAssigneeProps = {
  users: { email: string; color: string }[];
};

export function DropdownAssignee({
  currentUser,
  users,
  setCurrentUser,
  userRows
}: {
  currentUser: string;
  users: { email: string; color: string }[];
    setCurrentUser: (user: string) => void;
  userRows: Map<string, string>;
  }) {
  

  // console.log("Rendering DropdownAssignee with currentUser:", currentUser);
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
            .map(part => part[0]?.toUpperCase())
            .join("")
            .slice(0, 2)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-100" side="right" align="end">
        <DropdownMenuLabel>Select a user</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          data-ignore-selection="true"
          value={currentUser}
          onValueChange={(value) => {
        console.log("Radio changed to:", value);
        setCurrentUser(value);
          }}
        >
          {users.map(({ email, color }) => (
            <DropdownMenuRadioItem key={email} value={email} className="flex items-center gap-3">
              <span
              className={`flex items-center justify-center rounded-full w-6 h-6 min-w-6 min-h-6 text-white text-sm text-center leading-6 select-none`}
              style={{ backgroundColor: color }}
              >
              {email.split("@")[0]
                .split(/[.\-_]/)
                .map(part => part[0]?.toUpperCase())
                .join("")
                .slice(0, 2)}
              </span>
              {email.split("@")[0]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
