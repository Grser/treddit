export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { isUserAgeVerified } from "@/lib/ageVerification";

export async function GET() {
  const me = await getSessionUser();
  const isVerified = me?.id ? await isUserAgeVerified(me.id) : false;
  return NextResponse.json({ is_age_verified: isVerified }, { headers: { "Cache-Control": "no-store" } });
}
