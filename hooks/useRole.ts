import { useSession } from "next-auth/react";
import type { Role } from "@prisma/client";

export function useRole(): Role | null {
  const { data: session } = useSession();
  return session?.user?.role ?? null;
}

export function useCurrentUser() {
  const { data: session, status } = useSession();
  return {
    user: session?.user ?? null,
    role: session?.user?.role ?? null,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
  };
}
