import { cookies } from "next/headers";
import {
  COOKIE_SESION,
  DURACION_SEGUNDOS,
  firmarSesion,
  verificarSesion,
  type Sesion,
} from "@/lib/jwt";

export { COOKIE_SESION, firmarSesion, verificarSesion, type Sesion };

// Estas tres funciones usan next/headers, así que solo sirven en Server
// Components / Route Handlers (runtime Node) — nunca en middleware.ts.

export async function crearCookieSesion(sesion: Sesion) {
  const token = await firmarSesion(sesion);
  (await cookies()).set(COOKIE_SESION, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACION_SEGUNDOS,
  });
}

export async function borrarCookieSesion() {
  (await cookies()).delete(COOKIE_SESION);
}

export async function sesionActual(): Promise<Sesion | null> {
  const token = (await cookies()).get(COOKIE_SESION)?.value;
  return verificarSesion(token);
}
