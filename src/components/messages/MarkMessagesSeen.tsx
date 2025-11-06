"use client";

import { useEffect } from "react";

export default function MarkMessagesSeen() {
  useEffect(() => {
    fetch("/api/messages/summary", { method: "POST" })
      .then(() => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("treddit:messages-read"));
        }
      })
      .catch(() => undefined);
  }, []);
  return null;
}
