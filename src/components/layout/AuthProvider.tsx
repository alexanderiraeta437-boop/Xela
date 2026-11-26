"use client";

import React from "react";
import { useAuthSync } from "@/hooks/useAuth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  useAuthSync();
  return <>{children}</>;
}
