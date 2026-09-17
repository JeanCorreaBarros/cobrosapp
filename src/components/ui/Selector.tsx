type Props = React.SelectHTMLAttributes<HTMLSelectElement> & {
  etiqueta: string;
};

export default function Selector({ etiqueta, id, name, children, ...props }: Props) {
  const idCampo = id ?? name;
  return (
    <div className="space-y-1.5">
      <label htmlFor={idCampo} className="block text-sm font-medium text-texto-2">
        {etiqueta}
      </label>
      <select
        {...props}
        id={idCampo}
        name={name}
        className="w-full rounded-2xl border border-borde bg-superficie px-4 py-3.5 text-sm text-texto focus:outline-none focus:ring-2 focus:ring-tinta/15"
      >
        {children}
      </select>
    </div>
  );
}
