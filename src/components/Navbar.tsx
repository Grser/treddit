import type { SessionUser } from "@/lib/auth";

import NavbarClient from "./NavbarClient";

type NavbarProps = {
  session?: SessionUser | null;
};

export default function Navbar({ session }: NavbarProps) {
  return <NavbarClient session={session} />;
}
