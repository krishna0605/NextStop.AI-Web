"use client";

import { AnimatePresence, motion } from "framer-motion";
import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Toast = {
  id: number;
  message: string;
};

let toastId = 0;

const ToastContext = React.createContext<(message: string) => void>(() => {});

export function useToast() {
  return React.useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const showToast = useCallback((message: string) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {mounted &&
        createPortal(
          <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
            <AnimatePresence>
              {toasts.map((toast) => (
                <motion.div
                  key={toast.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                  className="flex items-center gap-3 rounded-xl border bg-zinc-950/95 px-5 py-3 text-sm font-medium text-zinc-200 shadow-2xl backdrop-blur-sm"
                  style={{
                    borderImage:
                      "linear-gradient(135deg, rgb(var(--brand-primary-rgb) / 0.4), rgb(var(--brand-highlight-rgb) / 0.2)) 1",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    borderColor: "rgb(var(--brand-primary-rgb) / 0.3)",
                  }}
                >
                  <span
                    className="flex h-2 w-2 rounded-full"
                    style={{
                      background: "var(--brand-highlight)",
                      boxShadow: "0 0 8px rgb(var(--brand-highlight-rgb) / 0.6)",
                    }}
                  />
                  {toast.message}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}
