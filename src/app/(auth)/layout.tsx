import { AmbientBackground } from "@/components/AmbientBackground";

import "../globals.css";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AmbientBackground />
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        {children}
      </div>
    </>
  );
}
