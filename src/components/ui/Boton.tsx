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
        "inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold",
        "transition-[transform,background-color,color,box-shadow] duration-150 ease-out",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta",
        "disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100",
        variante === "primario" &&
          "bg-tinta text-white shadow-[0_1px_2px_rgba(17,24,39,0.08)] hover:bg-tinta-suave hover:shadow-[0_4px_16px_rgba(17,24,39,0.18)] active:scale-[0.97]",
        variante === "suave" && "bg-lienzo text-texto hover:bg-borde active:scale-[0.97]",
        variante === "fantasma" && "text-texto-2 hover:bg-lienzo hover:text-texto active:scale-[0.97]",
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
