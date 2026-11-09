import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/auth";

/**
 * Protège /admin et les routes d'écriture. La page de connexion et la lecture
 * des fichiers locaux (mode développement) restent publiques.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/admin/login") return NextResponse.next();
  if (pathname.startsWith("/api/dev-storage/") && (req.method === "GET" || req.method === "HEAD")) {
    return NextResponse.next();
  }

  const ok = await verifySessionToken(req.cookies.get(ADMIN_COOKIE)?.value, process.env.ADMIN_PASSWORD);
  if (ok) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = pathname === "/admin" ? "" : `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/api/dev-storage/:path*"],
};
