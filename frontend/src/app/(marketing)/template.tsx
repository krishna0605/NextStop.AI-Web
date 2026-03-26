"use client";

import { motion } from "framer-motion";

/**
 * Page transition template for marketing pages.
 * Each page fades in on enter.
 */
export default function MarketingTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
