import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth";

export default async function RedirectMyProfileEditPage() {
  const me = await getSessionUser();

  if (!me) {
    redirect("/auth/login");
  }

  redirect(`/u/${me.username}/edit#age-verification`);
}
