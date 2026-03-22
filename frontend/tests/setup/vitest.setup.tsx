import React from "react";

import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

vi.mock("framer-motion", async () => {
  const ReactModule = await import("react");

  const motion = new Proxy(
    {},
    {
      get: (_, tag: string) =>
        ReactModule.forwardRef(function MotionStub(props: Record<string, unknown>, ref) {
          const { children, ...rest } = props;
          return ReactModule.createElement(tag, { ...rest, ref }, children);
        }),
    }
  );

  return { motion };
});

vi.mock("server-only", () => ({}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
  }),
}));

vi.mock("@heroui/react", async () => {
  const ReactModule = await import("react");

  return {
    Button: ReactModule.forwardRef(function ButtonStub(
      props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
        isLoading?: boolean;
        isDisabled?: boolean;
        startContent?: React.ReactNode;
        endContent?: React.ReactNode;
        onPress?: () => void | Promise<void>;
      },
      ref
    ) {
      const {
        children,
        isLoading,
        isDisabled,
        startContent,
        endContent,
        onPress,
        ...rest
      } = props;

      return (
        <button
          {...rest}
          ref={ref}
          disabled={Boolean(isDisabled || isLoading || rest.disabled)}
          onClick={() => void onPress?.()}
          type={rest.type || "button"}
        >
          {startContent}
          {children}
          {endContent}
        </button>
      );
    }),
  };
});
