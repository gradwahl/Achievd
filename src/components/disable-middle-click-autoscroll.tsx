"use client";

import { useEffect } from "react";

export function DisableMiddleClickAutoscroll() {
  useEffect(() => {
    let dragging = false;
    let lastY = 0;

    function isInteractive(target: EventTarget | null) {
      return (
        target instanceof Element &&
        Boolean(
          target.closest(
            "a, button, input, textarea, select, option, [role='button']",
          ),
        )
      );
    }

    function stopAutoscroll(event: MouseEvent) {
      if (event.button === 1) {
        event.preventDefault();
      }
    }

    function startDragScroll(event: MouseEvent) {
      if (event.button !== 0 || isInteractive(event.target)) return;
      dragging = true;
      lastY = event.clientY;
    }

    function dragScroll(event: MouseEvent) {
      if (!dragging || event.buttons !== 1) return;
      const deltaY = event.clientY - lastY;
      if (Math.abs(deltaY) > 1) {
        window.scrollBy({ top: -deltaY });
        lastY = event.clientY;
        event.preventDefault();
      }
    }

    function stopDragScroll() {
      dragging = false;
    }

    document.addEventListener("mousedown", stopAutoscroll, true);
    document.addEventListener("auxclick", stopAutoscroll, true);
    document.addEventListener("mousedown", startDragScroll, true);
    document.addEventListener("mousemove", dragScroll, true);
    document.addEventListener("mouseup", stopDragScroll, true);
    return () => {
      document.removeEventListener("mousedown", stopAutoscroll, true);
      document.removeEventListener("auxclick", stopAutoscroll, true);
      document.removeEventListener("mousedown", startDragScroll, true);
      document.removeEventListener("mousemove", dragScroll, true);
      document.removeEventListener("mouseup", stopDragScroll, true);
    };
  }, []);

  return null;
}
