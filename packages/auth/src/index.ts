import type { User } from "@hypermyths/types";
export type Session = { user: User | null; expiresAt?: string };
export function requireSession(session: Session): User {
  if (!session.user) throw new Error("Authentication required.");
  return session.user;
}
