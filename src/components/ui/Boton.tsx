import clsx from "clsx";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: "primario" | "suave" | "fantasma";
  cargando?: boolean;
};

export default function Boton({
  variante = "primario",
  cargando = false,
  className,
  children,
  disabled,
  ...props
}: Props) {
  return (
    <button
      {...props}
      disabled={disabled || cargando}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta",
        "disabled:cursor-not-allowed disabled:opacity-60",
        variante === "primario" && "bg-tinta text-white hover:bg-tinta-suave active:scale-[0.98]",
        variante === "suave" && "bg-lienzo text-texto hover:bg-borde active:scale-[0.98]",
        variante === "fantasma" && "text-texto-2 hover:bg-lienzo hover:text-texto",
        className,
      )}
    >
      {cargando && (
        <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}
