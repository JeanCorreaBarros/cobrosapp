import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION, verificarSesion } from "@/lib/jwt";

const PUBLICAS = ["/login", "/api/auth/login"];

function construirCsp(nonce: string) {
  // 'unsafe-eval' solo hace falta para el hot-reload de Next en desarrollo;
  // en producción (npm run build / Dockerfile.prod) no se incluye.
  const evalDev = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${evalDev}`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src 'self' https://fonts.gstatic.com`,
    `img-src 'self' data:`,
    `connect-src 'self'`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
  ].join("; ");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const esPublica = PUBLICAS.some((ruta) => pathname.startsWith(ruta));
  const sesion = await verificarSesion(request.cookies.get(COOKIE_SESION)?.value);

  // btoa, no Buffer: el middleware corre en el Edge Runtime, que no tiene Buffer.
  const nonce = btoa(crypto.randomUUID());
  const csp = construirCsp(nonce);

  const headersConNonce = new Headers(request.headers);
  headersConNonce.set("x-nonce", nonce);
  headersConNonce.set("Content-Security-Policy", csp);

  if (!sesion && !esPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("desde", pathname);
    const respuesta = NextResponse.redirect(url);
    respuesta.headers.set("Content-Security-Policy", csp);
    return respuesta;
  }

  if (sesion && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    const respuesta = NextResponse.redirect(url);
    respuesta.headers.set("Content-Security-Policy", csp);
    return respuesta;
  }

  const respuesta = NextResponse.next({ request: { headers: headersConNonce } });
  respuesta.headers.set("Content-Security-Policy", csp);
  return respuesta;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
