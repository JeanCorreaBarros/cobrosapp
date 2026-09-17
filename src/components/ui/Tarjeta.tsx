import clsx from "clsx";

export function Tarjeta({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={clsx("tarjeta p-5 sm:p-6", className)}>{children}</div>;
}

export function TarjetaOscura({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={clsx("tarjeta-oscura p-5 sm:p-6", className)}>{children}</div>;
}
