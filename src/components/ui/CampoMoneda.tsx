import clsx from "clsx";

function formatearMiles(digitos: string) {
  return digitos.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Deja solo dígitos y, como mucho, una coma decimal. */
function limpiar(texto: string) {
  const soloValido = texto.replace(/[^\d,]/g, "");
  const [primero, ...resto] = soloValido.split(",");
  return resto.length > 0 ? `${primero},${resto.join("")}` : primero;
}

/** Convierte lo que el usuario ve ("1.200.000,50") al texto de un número
 *  normal ("1200000.50") para que el resto del formulario siga trabajando
 *  con números como siempre. */
function aNumeroTexto(limpio: string) {
  const [entero, decimal] = limpio.split(",");
  return decimal !== undefined ? `${entero || "0"}.${decimal}` : entero || "";
}

function aTextoVisible(valor: string | number) {
  const texto = String(valor ?? "");
  if (!texto) return "";
  const [entero, decimal] = texto.split(".");
  const soloDigitos = entero.replace(/\D/g, "");
  return formatearMiles(soloDigitos) + (decimal !== undefined ? `,${decimal}` : "");
}

type Props = {
  etiqueta: string;
  name?: string;
  value: string | number;
  onChange: (valorNumerico: string) => void;
  placeholder?: string;
  simbolo?: string;
  error?: string;
  className?: string;
};

/** Igual que Campo, pero para montos: muestra puntos de miles mientras se
 *  escribe (1.200.000) para que las cifras grandes se lean de un vistazo,
 *  sin cambiar el tipo de dato que recibe el formulario (sigue siendo un
 *  string numérico normal, ej. "1200000.5"). */
export default function CampoMoneda({
  etiqueta,
  name,
  value,
  onChange,
  placeholder,
  simbolo = "$",
  error,
  className,
}: Props) {
  const idCampo = name;

  function manejarCambio(e: React.ChangeEvent<HTMLInputElement>) {
    const limpio = limpiar(e.target.value);
    onChange(aNumeroTexto(limpio));
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor={idCampo} className="block text-sm font-medium text-texto-2">
        {etiqueta}
      </label>
      <div className="relative">
        <span className="absolute inset-y-0 left-4 flex items-center text-sm text-texto-3">
          {simbolo}
        </span>
        <input
          id={idCampo}
          name={name}
          type="text"
          inputMode="decimal"
          value={aTextoVisible(value)}
          onChange={manejarCambio}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          className={clsx(
            "w-full rounded-2xl border bg-superficie py-3.5 pr-4 pl-9 text-sm text-texto",
            "placeholder:text-texto-3 focus:outline-none focus:ring-2 focus:ring-tinta/15",
            error ? "border-rosa-ink/40" : "border-borde",
            className,
          )}
        />
      </div>
      {error && <p className="text-xs text-rosa-ink">{error}</p>}
    </div>
  );
}
