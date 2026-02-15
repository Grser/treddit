import { getSessionUser } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth";

import NavbarClient from "./NavbarClient";

type NavbarProps = {
  session?: SessionUser | null;
};

export default async function Navbar({ session: initialSession }: NavbarProps) {
  const session = initialSession ?? (await getSessionUser());
  return <NavbarClient session={session} />;
}
