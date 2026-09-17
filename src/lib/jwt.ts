import { SignJWT, jwtVerify } from "jose";

// Sin `next/headers` a propósito: este módulo lo importa el middleware, que
// corre en el Edge Runtime, y next/headers ahí rompe el middleware en
// silencio (Next lo descarta sin avisar, en vez de dar un error visible).

export const COOKIE_SESION = "cobro_sesion";
export const DURACION_SEGUNDOS = 60 * 60 * 8;

export type Sesion = {
  id: string;
  usuario: string;
  nombre: string;
  rol: "ADMIN" | "COBRADOR" | "CONSULTA";
};

function clave() {
  const secreto = process.env.AUTH_SECRET;
  if (!secreto || secreto.length < 32) {
    throw new Error("AUTH_SECRET debe existir y tener al menos 32 caracteres");
  }
  return new TextEncoder().encode(secreto);
}

export async function firmarSesion(sesion: Sesion) {
  return new SignJWT({ ...sesion })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DURACION_SEGUNDOS}s`)
    .sign(clave());
}

export async function verificarSesion(token: string | undefined): Promise<Sesion | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, clave());
    return {
      id: payload.id as string,
      usuario: payload.usuario as string,
      nombre: payload.nombre as string,
      rol: payload.rol as Sesion["rol"],
    };
  } catch {
    return null;
  }
}
