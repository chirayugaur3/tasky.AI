import type { Session } from "next-auth";

/**
 * Strip undefineds from a NextAuth session so it survives getServerSideProps
 * serialization. Next.js's serializer rejects undefined values.
 */
export function serializableSession(session: Session): Session {
  return {
    ...session,
    user: {
      ...session.user,
      name: session.user.name ?? null,
      email: session.user.email ?? null,
      image: session.user.image ?? null,
    },
  };
}
