"use client";

import {
  type ReactNode,
  useEffect,
  useState,
} from "react";

type Props = {
  children: ReactNode;
  delayMs?: number;
  fallback?: ReactNode;
};

export default function DeferredMount({
  children,
  delayMs = 1500,
  fallback = null,
}: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setReady(true);
    }, delayMs);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [delayMs]);

  if (!ready) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
