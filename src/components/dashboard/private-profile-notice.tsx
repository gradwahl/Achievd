import Link from "next/link";
import { EyeOff } from "lucide-react";
import { productConfig } from "@/config/product";
import { buttonClassName } from "@/components/ui/button";

export function PrivateProfileNotice() {
  return (
    <div className="rounded-lg border border-amber-300/40 bg-amber-300/10 p-6">
      <div className="flex gap-4">
        <EyeOff
          className="mt-1 h-6 w-6 shrink-0 text-amber-300"
          aria-hidden="true"
        />
        <div>
          <h1 className="text-xl font-semibold text-white">
            Your Steam achievement data is private
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-amber-50/80">
            {productConfig.name} can read your public profile basics, but owned
            games or achievement progress are unavailable. Make profile and game
            details public on Steam, then run a sync.
          </p>
          <Link
            href="/privacy"
            className={buttonClassName({
              variant: "secondary",
              className: "mt-4",
            })}
          >
            Privacy details
          </Link>
        </div>
      </div>
    </div>
  );
}
