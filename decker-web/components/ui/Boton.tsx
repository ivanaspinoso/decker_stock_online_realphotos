import Link from 'next/link';

/**
 * Botón único del sistema. Se usa como `<button>`, `<Link>` o `<a>` según se le
 * pase `href`.
 *
 * Texto en caja normal, no en mayúsculas: las mayúsculas con tracking en cada
 * botón de la página es lo que la hacía leer como plantilla vieja. Se reservan
 * para etiquetas chicas y badges.
 */

type Variante = 'primario' | 'secundario' | 'oscuro' | 'fantasma' | 'sutil';
type Tamano = 'sm' | 'md' | 'lg';

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-rojo text-white hover:bg-rojo-700 active:bg-rojo-700',
  secundario: 'bg-negro text-white hover:bg-negro-800 active:bg-negro-800',
  oscuro: 'bg-white text-negro hover:bg-gris-100',
  fantasma: 'bg-white/0 text-white ring-1 ring-inset ring-white/25 hover:bg-white/10 hover:ring-white/50',
  sutil: 'bg-white text-negro ring-1 ring-inset ring-gris-200 hover:ring-gris-400 hover:bg-gris-50',
};

const TAMANOS: Record<Tamano, string> = {
  sm: 'h-9 px-3.5 text-[13px] gap-1.5 rounded-sm',
  md: 'h-11 px-5 text-sm gap-2 rounded',
  lg: 'h-[52px] px-7 text-[15px] gap-2.5 rounded',
};

const BASE =
  'inline-flex select-none items-center justify-center font-semibold ' +
  'transition-[background-color,box-shadow,transform] duration-150 ease-suave ' +
  'active:translate-y-px disabled:pointer-events-none disabled:opacity-40';

interface PropsComunes {
  variante?: Variante;
  tamano?: Tamano;
  ancho?: boolean;
  className?: string;
  children: React.ReactNode;
}

type Props = PropsComunes &
  (
    | ({ href: string; externo?: boolean } & Omit<
        React.AnchorHTMLAttributes<HTMLAnchorElement>,
        keyof PropsComunes | 'href'
      >)
    | ({ href?: undefined } & Omit<
        React.ButtonHTMLAttributes<HTMLButtonElement>,
        keyof PropsComunes
      >)
  );

export default function Boton({
  variante = 'primario',
  tamano = 'md',
  ancho = false,
  className = '',
  children,
  ...props
}: Props) {
  const clases = [BASE, VARIANTES[variante], TAMANOS[tamano], ancho ? 'w-full' : '', className]
    .filter(Boolean)
    .join(' ');

  if ('href' in props && props.href !== undefined) {
    const { href, externo, ...resto } = props;

    // Externo (WhatsApp, mapas) sale en pestaña nueva; interno usa el router.
    if (externo) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={clases} {...resto}>
          {children}
        </a>
      );
    }

    return (
      <Link href={href} className={clases} {...resto}>
        {children}
      </Link>
    );
  }

  const { ...resto } = props as React.ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button className={clases} {...resto}>
      {children}
    </button>
  );
}
