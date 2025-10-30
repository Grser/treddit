import { getSessionUser } from "@/lib/auth";

import NavbarClient from "./NavbarClient";

export default async function Navbar() {
  const session = await getSessionUser();
  return <NavbarClient session={session} />;
}
