import Image from "next/image";

import { cn } from "@/lib/utils";

export function BrandLogoIcon({
  className,
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/brand/icon-256.png"
      alt="NextStop"
      width={64}
      height={64}
      priority={priority}
      className={cn("h-11 w-11 rounded-2xl object-cover", className)}
    />
  );
}
