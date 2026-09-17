import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION, verificarSesion } from "@/lib/jwt";

const PUBLICAS = ["/login", "/api/auth/login"];

// CSP fija (sin nonce por request): un nonce distinto en cada respuesta se
// rompe en cuanto hay cualquier proxy/balanceador entre el navegador y la
// app (EasyPanel, Cloudflare, etc.) — el nonce del header y el que quedó
// grabado en el HTML dejan de coincidir y el navegador bloquea TODOS los
// scripts, incluido el propio login. Esta versión es más simple y estable;
// como React ya escapa todo el texto que renderiza y no hay
// dangerouslySetInnerHTML en el proyecto, el riesgo real de XSS que se
// pierde con 'unsafe-inline' es bajo.
// 'unsafe-eval' solo en desarrollo: Next.js lo necesita para el hot-reload
// (next dev). El build de producción (next build / next start) no lo usa.
const evalDev = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";

const CSP = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'${evalDev}`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
  `font-src 'self' https://fonts.gstatic.com`,
  `img-src 'self' data:`,
  `connect-src 'self'`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `object-src 'none'`,
].join("; ");

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const esPublica = PUBLICAS.some((ruta) => pathname.startsWith(ruta));
  const sesion = await verificarSesion(request.cookies.get(COOKIE_SESION)?.value);

  if (!sesion && !esPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("desde", pathname);
    const respuesta = NextResponse.redirect(url);
    respuesta.headers.set("Content-Security-Policy", CSP);
    return respuesta;
  }

  if (sesion && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    const respuesta = NextResponse.redirect(url);
    respuesta.headers.set("Content-Security-Policy", CSP);
    return respuesta;
  }

  const respuesta = NextResponse.next();
  respuesta.headers.set("Content-Security-Policy", CSP);
  return respuesta;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
