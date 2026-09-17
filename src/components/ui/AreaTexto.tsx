type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  etiqueta: string;
};

export default function AreaTexto({ etiqueta, id, name, ...props }: Props) {
  const idCampo = id ?? name;
  return (
    <div className="space-y-1.5">
      <label htmlFor={idCampo} className="block text-sm font-medium text-texto-2">
        {etiqueta}
      </label>
      <textarea
        {...props}
        id={idCampo}
        name={name}
        className="w-full resize-none rounded-2xl border border-borde bg-superficie px-4 py-3.5 text-sm text-texto placeholder:text-texto-3 focus:outline-none focus:ring-2 focus:ring-tinta/15"
      />
    </div>
  );
}
