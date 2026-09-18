"use client";

import { useEffect, useRef, useState } from "react";

const EASE_SALIDA = (t: number) => 1 - Math.pow(1 - t, 3);

/** Anima un número subiendo desde 0 hasta `valor` cuando aparece o cambia,
 *  en vez de aparecer de golpe. `formatear` recibe el valor intermedio ya
 *  redondeado en cada frame. */
export default function NumeroAnimado({
  valor,
  formatear,
  duracionMs = 700,
  className,
}: {
  valor: number;
  formatear: (v: number) => string;
  duracionMs?: number;
  className?: string;
}) {
  const [mostrado, setMostrado] = useState(0);
  const anterior = useRef(0);

  useEffect(() => {
    const desde = anterior.current;
    const hasta = valor;
    if (desde === hasta) return;

    let inicio: number | null = null;
    let cancelado = false;

    function tick(ahora: number) {
      if (cancelado) return;
      if (inicio === null) inicio = ahora;
      const progreso = Math.min((ahora - inicio) / duracionMs, 1);
      const actual = desde + (hasta - desde) * EASE_SALIDA(progreso);
      setMostrado(actual);
      if (progreso < 1) requestAnimationFrame(tick);
      else anterior.current = hasta;
    }

    const id = requestAnimationFrame(tick);
    return () => {
      cancelado = true;
      cancelAnimationFrame(id);
    };
  }, [valor, duracionMs]);

  return <span className={className}>{formatear(mostrado)}</span>;
}
