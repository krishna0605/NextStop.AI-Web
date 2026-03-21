import Image from "next/image";

import { cn } from "@/lib/utils";

export function BrandLogo({
  className,
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/brand/nextstop-wordmark.svg"
      alt="NextStop.ai"
      width={180}
      height={58}
      priority={priority}
      unoptimized
      className={cn("h-auto w-[150px] sm:w-[170px]", className)}
    />
  );
}
