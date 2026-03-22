import { AmbientBackground } from "@/components/AmbientBackground";
import { Navbar } from "@/components/Navbar";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AmbientBackground />
      <Navbar />
      {children}
    </>
  );
}
