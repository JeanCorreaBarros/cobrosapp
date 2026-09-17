import clsx from "clsx";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  etiqueta: string;
  error?: string;
  complemento?: React.ReactNode;
};

export default function Campo({ etiqueta, error, complemento, className, id, ...props }: Props) {
  const idCampo = id ?? props.name;
  return (
    <div className="space-y-1.5">
      <label htmlFor={idCampo} className="block text-sm font-medium text-texto-2">
        {etiqueta}
      </label>
      <div className="relative">
        <input
          {...props}
          id={idCampo}
          aria-invalid={Boolean(error)}
          className={clsx(
            "w-full rounded-2xl border bg-superficie px-4 py-3.5 text-sm text-texto",
            "placeholder:text-texto-3 focus:outline-none focus:ring-2 focus:ring-tinta/15",
            error ? "border-rosa-ink/40" : "border-borde",
            complemento && "pr-12",
            className,
          )}
        />
        {complemento && (
          <div className="absolute inset-y-0 right-2 flex items-center">{complemento}</div>
        )}
      </div>
      {error && <p className="text-xs text-rosa-ink">{error}</p>}
    </div>
  );
}
