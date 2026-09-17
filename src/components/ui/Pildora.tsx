import clsx from "clsx";

const TONOS = {
  lila: "bg-lila text-lila-ink",
  menta: "bg-menta text-menta-ink",
  rosa: "bg-rosa text-rosa-ink",
  durazno: "bg-durazno text-durazno-ink",
  cielo: "bg-cielo text-cielo-ink",
  neutro: "bg-lienzo text-texto-2",
} as const;

export default function Pildora({
  tono = "neutro",
  punto = true,
  children,
  className,
}: {
  tono?: keyof typeof TONOS;
  punto?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap",
        TONOS[tono],
        className,
      )}
    >
      {punto && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
