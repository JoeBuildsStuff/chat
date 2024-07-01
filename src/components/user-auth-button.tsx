import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ChevronDown,
  CircleUser,
  DollarSign,
  LogOut,
  Settings,
  User,
} from "lucide-react";
import { ModeToggle } from "./mode-toggle";

type AuthButtonProps = {
  size?: "default" | "small" | "tiny";
  user?: {
    avatar_url: string;
    full_name: string;
    initials: string;
    email: string;
  } | null; // Allow user to be null
};

export default function AuthButton({
  size = "default",
  user = null,
}: //   user = {
//     avatar_url: "",
//     full_name: "John Doe",
//     initials: "JD",
//     email: "john.doe@example.com",
//   },
AuthButtonProps) {
  const signOut = async () => {
    "use server";
    // Implement sign out logic here
    return redirect("/");
  };

  const avatarSizeClass =
    size === "tiny" ? "w-5 h-5" : size === "small" ? "w-7 h-7" : "w-10 h-10";

  return user ? (
    <DropdownMenu>
      <DropdownMenuTrigger className="w-full">
        <Button
          variant="ghost"
          className="w-full flex flex-row justify-between items-center gap-2"
        >
          <div className="flex flex-row items-center gap-4">
            <Avatar className={avatarSizeClass}>
              <AvatarImage src={user.avatar_url} alt={user.initials} />
              <AvatarFallback>
                {user.initials ? user.initials : <User className="" />}
              </AvatarFallback>
            </Avatar>
            <p className="">{user.full_name}</p>
          </div>
          <ChevronDown
            strokeWidth={1}
            className="w-5 h-5 text-muted-foreground"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[20rem]">
        <DropdownMenuLabel>
          <div className="flex items-center gap-5">
            <Avatar className={avatarSizeClass}>
              <AvatarImage src={user.avatar_url} alt={user.initials} />
              <AvatarFallback>
                {user.initials ? user.initials : <User className="" />}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <div>{user.full_name}</div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Link href="/profile/account">
            <div className="flex items-center gap-5">
              <Settings className="mx-2" />
              <div className="flex flex-col">
                <div>Account Settings</div>
                <div className="text-sm text-muted-foreground">
                  Manage your account
                </div>
              </div>
            </div>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Link href="/profile">
            <div className="flex items-center gap-5">
              <CircleUser className="mx-2" />
              <div className="flex flex-col">
                <div>My Profile</div>
                <div className="text-sm text-muted-foreground">
                  Explore your profile
                </div>
              </div>
            </div>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Link href="/profile/subscription">
            <div className="flex items-center gap-5">
              <DollarSign className="mx-2" />
              <div className="flex flex-col">
                <div>Subscription</div>
                <div className="text-sm text-muted-foreground">
                  Manage your subscription
                </div>
              </div>
            </div>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <div className="flex items-center gap-5">
            <ModeToggle />
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem>
          <form action={signOut}>
            <button type="submit" className="flex items-center gap-5">
              <LogOut className="mx-2" />
              <div className="flex flex-col items-start justify-start">
                <div>Sign out</div>
                <div className="text-sm text-muted-foreground">
                  Catch you on the flip side!
                </div>
              </div>
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : (
    <div className="flex items-center gap-4">
      {/* <Button asChild className="font-semibold text-lg">
        <Link href="/signin">Get Started</Link>
      </Button> */}
      <ModeToggle />
    </div>
  );
}
