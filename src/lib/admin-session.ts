import "server-only";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifySessionToken } from "./auth";

export async function isAdmin(): Promise<boolean> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return verifySessionToken(token, process.env.ADMIN_PASSWORD);
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Session expirée : reconnectez-vous.");
  }
}

/**
 * À appeler au début de CHAQUE server action d'écriture : une server action
 * peut être invoquée depuis n'importe quelle route, le middleware ne suffit pas.
 */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) throw new UnauthorizedError();
}
