"use client";

import { useEffect } from "react";

export function MenuToggle() {
  useEffect(() => {
    const btn = document.getElementById("btnMenu");
    if (!btn) return;

    const handler = (e: Event) => {
      e.preventDefault();
      document.body.classList.toggle("menuOpened");
    };

    btn.addEventListener("click", handler);
    return () => btn.removeEventListener("click", handler);
  }, []);

  return null;
}
