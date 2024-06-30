import { FC } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";
import { MenuIcon, MountainIcon } from "lucide-react";

const MobileNav: FC = () => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="md:hidden">
          <MenuIcon className="h-6 w-6" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right">
        <Link href="#" prefetch={false}>
          <MountainIcon className="h-6 w-6" />
          <span className="sr-only">Acme Inc</span>
        </Link>
        <div className="grid gap-2 py-6">
          <Link
            href="#"
            className="flex w-full items-center py-2 text-lg font-semibold"
            prefetch={false}
          >
            Home
          </Link>
          <Link
            href="#"
            className="flex w-full items-center py-2 text-lg font-semibold"
            prefetch={false}
          >
            Features
          </Link>
          <Link
            href="#"
            className="flex w-full items-center py-2 text-lg font-semibold"
            prefetch={false}
          >
            Pricing
          </Link>
          <Link
            href="#"
            className="flex w-full items-center py-2 text-lg font-semibold"
            prefetch={false}
          >
            Contact
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileNav;
