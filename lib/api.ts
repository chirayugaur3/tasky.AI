import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import type { Session } from "next-auth";
import type { Role } from "@prisma/client";
import { ZodError, type ZodSchema } from "zod";

export type ApiResponse<T> = {
  data: T | null;
  error: string | null;
  status: number;
};

export function ok<T>(res: NextApiResponse, data: T, status = 200): void {
  res.status(status).json({ data, error: null, status } satisfies ApiResponse<T>);
}

export function fail(
  res: NextApiResponse,
  error: string,
  status = 400
): void {
  res.status(status).json({ data: null, error, status } satisfies ApiResponse<null>);
}

/**
 * Returns the session if authenticated, otherwise writes a 401 and returns null.
 * Callers should `return` when null is returned.
 */
export async function requireAuth(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<Session | null> {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    fail(res, "Unauthorized", 401);
    return null;
  }
  return session;
}

/**
 * Asserts the session role is in `allowed`. Writes 403 if not.
 */
export function requireRole(
  res: NextApiResponse,
  session: Session,
  allowed: Role[]
): boolean {
  if (!allowed.includes(session.user.role)) {
    fail(res, "Forbidden — insufficient role", 403);
    return false;
  }
  return true;
}

/**
 * Restricts to one of a fixed set of HTTP methods. Sends 405 + Allow header if not.
 */
export function requireMethod(
  req: NextApiRequest,
  res: NextApiResponse,
  methods: string[]
): boolean {
  if (!req.method || !methods.includes(req.method)) {
    res.setHeader("Allow", methods.join(", "));
    fail(res, `Method ${req.method} not allowed`, 405);
    return false;
  }
  return true;
}

/**
 * Safe Zod parse — returns parsed data, or writes a 400 with the issues.
 */
export function parseBody<T>(
  res: NextApiResponse,
  schema: ZodSchema<T>,
  body: unknown
): T | null {
  const result = schema.safeParse(body);
  if (!result.success) {
    const msg = (result.error as ZodError).issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    fail(res, `Invalid request — ${msg}`, 400);
    return null;
  }
  return result.data;
}

/**
 * Convenience for routes that don't need a return value from the handler.
 */
export type ApiHandler = (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void;
