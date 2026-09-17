"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { resolverVista } from "@/lib/registro-vistas";
import type { NombreIcono } from "@/components/ui/Icono";

const ALMACEN = "cobro_pestanas_v1";
const MAXIMO = 10;
const INICIAL = "/dashboard";

export type Pestana = {
  id: string;
  ruta: string;
  titulo: string;
  icono: NombreIcono;
  fijada: boolean;
};

type Estado = { pestanas: Pestana[]; activa: string };

type ValorContexto = Estado & {
  abrir: (ruta: string) => void;
  activar: (id: string) => void;
  cerrar: (id: string) => void;
  cerrarOtras: (id: string) => void;
  cerrarTodas: () => void;
  mover: (desde: number, hasta: number) => void;
};

const Contexto = createContext<ValorContexto | null>(null);

function crearPestana(ruta: string): Pestana | null {
  const vista = resolverVista(ruta);
  if (!vista) return null;
  return {
    id: ruta,
    ruta,
    titulo: vista.titulo,
    icono: vista.definicion.icono,
    fijada: Boolean(vista.definicion.fijada),
  };
}

const PESTANA_INICIAL = crearPestana(INICIAL)!;

export function ProveedorPestanas({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const ruta = usePathname();
  const [estado, setEstado] = useState<Estado>({
    pestanas: [PESTANA_INICIAL],
    activa: PESTANA_INICIAL.id,
  });
  const hidratado = useRef(false);

  useEffect(() => {
    try {
      const guardado = localStorage.getItem(ALMACEN);
      if (guardado) {
        const datos = JSON.parse(guardado) as Estado;
        const validas = (datos.pestanas ?? [])
          .map((p) => crearPestana(p.ruta))
          .filter((p): p is Pestana => p !== null);
        if (validas.length) {
          const conInicial = validas.some((p) => p.id === PESTANA_INICIAL.id)
            ? validas
            : [PESTANA_INICIAL, ...validas];
          setEstado({
            pestanas: conInicial,
            activa: conInicial.some((p) => p.id === datos.activa)
              ? datos.activa
              : conInicial[0].id,
          });
        }
      }
    } catch {
      /* almacenamiento no disponible */
    }
    hidratado.current = true;
  }, []);

  useEffect(() => {
    if (!hidratado.current) return;
    try {
      localStorage.setItem(ALMACEN, JSON.stringify(estado));
    } catch {
      /* almacenamiento no disponible */
    }
  }, [estado]);

  useEffect(() => {
    if (!ruta) return;
    setEstado((previo) => {
      if (previo.activa === ruta && previo.pestanas.some((p) => p.id === ruta)) return previo;
      const existente = previo.pestanas.find((p) => p.id === ruta);
      if (existente) return { ...previo, activa: ruta };
      const nueva = crearPestana(ruta);
      if (!nueva) return previo;
      let lista = [...previo.pestanas, nueva];
      while (lista.length > MAXIMO) {
        const sacrificable = lista.findIndex((p) => !p.fijada && p.id !== nueva.id);
        if (sacrificable === -1) break;
        lista = lista.filter((_, i) => i !== sacrificable);
      }
      return { pestanas: lista, activa: nueva.id };
    });
  }, [ruta]);

  const abrir = useCallback((destino: string) => router.push(destino), [router]);

  const activar = useCallback(
    (id: string) => {
      setEstado((p) => ({ ...p, activa: id }));
      router.push(id);
    },
    [router],
  );

  const cerrar = useCallback(
    (id: string) => {
      const objetivo = estado.pestanas.find((p) => p.id === id);
      if (!objetivo || objetivo.fijada) return;

      const indice = estado.pestanas.findIndex((p) => p.id === id);
      const restantes = estado.pestanas.filter((p) => p.id !== id);
      if (!restantes.length) return;

      let activa = estado.activa;
      if (estado.activa === id) {
        activa = (restantes[indice - 1] ?? restantes[0]).id;
      }
      setEstado({ pestanas: restantes, activa });
      if (activa !== estado.activa) router.push(activa);
    },
    [estado, router],
  );

  const cerrarOtras = useCallback(
    (id: string) => {
      const restantes = estado.pestanas.filter((p) => p.id === id || p.fijada);
      setEstado({ pestanas: restantes, activa: id });
      router.push(id);
    },
    [estado, router],
  );

  const cerrarTodas = useCallback(() => {
    const fijadas = estado.pestanas.filter((p) => p.fijada);
    const lista = fijadas.length ? fijadas : [PESTANA_INICIAL];
    setEstado({ pestanas: lista, activa: lista[0].id });
    router.push(lista[0].id);
  }, [estado, router]);

  const mover = useCallback((desde: number, hasta: number) => {
    setEstado((previo) => {
      if (desde === hasta) return previo;
      const lista = [...previo.pestanas];
      const [movida] = lista.splice(desde, 1);
      lista.splice(hasta, 0, movida);
      return { ...previo, pestanas: lista };
    });
  }, []);

  const valor = useMemo(
    () => ({ ...estado, abrir, activar, cerrar, cerrarOtras, cerrarTodas, mover }),
    [estado, abrir, activar, cerrar, cerrarOtras, cerrarTodas, mover],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function usePestanas() {
  const valor = useContext(Contexto);
  if (!valor) throw new Error("usePestanas debe usarse dentro de ProveedorPestanas");
  return valor;
}
