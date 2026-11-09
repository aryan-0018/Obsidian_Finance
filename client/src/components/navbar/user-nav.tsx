import { ChevronDown, LogOut } from "lucide-react"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../ui/avatar"
import { Button } from "../ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"

export function UserNav({
  userName,
  profilePicture,
  onLogout,
}: {
  userName: string;
  profilePicture: string;
  onLogout: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative !bg-transparent h-8 w-8 rounded-full !gap-0"
        >
          <Avatar className="h-10 w-10 !cursor-pointer ">
            <AvatarImage
              src={profilePicture || ""}
              className="!cursor-pointer "
            />
            <AvatarFallback
              className="!bg-white/[0.08] border !border-white/[0.12] !text-white font-medium"
            >
              {userName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <ChevronDown className="!w-3 !h-3 ml-1 text-[#8e8e93]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-60 obsidian-card bg-[#0e0e13]/95 backdrop-blur-2xl text-[#f5f5f7] border border-white/[0.09] rounded-2xl shadow-[0_24px_50px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.12)] p-1.5 duration-150 ease-out"
        align="end"
        forceMount
      >
        <DropdownMenuLabel className="flex flex-col items-start gap-1 px-3 py-2">
          <span className="font-semibold text-sm text-white">{userName}</span>
          <span className="text-[10px] text-[#e5c158] font-medium tracking-widest uppercase">Personal Account</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/[0.08] my-1" />
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="rounded-xl px-3 py-2 text-xs font-medium text-[#fcfcfc] hover:bg-white/[0.08] hover:text-[#e5c158] transition-all cursor-pointer select-none"
            onClick={onLogout}
          >
            <LogOut className="w-4 h-4 mr-2 text-[#e5c158]" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}