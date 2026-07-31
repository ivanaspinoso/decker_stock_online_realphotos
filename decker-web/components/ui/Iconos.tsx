/**
 * Iconografía de specs. Trazo de 1.5, sin relleno: legible a 14px en la
 * tarjeta y en la tabla. Decorativos por defecto (`aria-hidden`), porque el
 * dato siempre va acompañado de texto.
 */

type Props = React.SVGProps<SVGSVGElement>;

function Base({ children, ...props }: Props & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

/** Año. */
export function IconoCalendario(props: Props) {
  return (
    <Base {...props}>
      <rect x="3" y="5" width="18" height="16" rx="1" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </Base>
  );
}

/** Kilometraje. */
export function IconoMedidor(props: Props) {
  return (
    <Base {...props}>
      <path d="M4 18a8 8 0 1 1 16 0" />
      <path d="M12 18v-1" />
      <path d="m14.5 11.5-2.5 4" />
      <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none" />
    </Base>
  );
}

/** Sucursal. */
export function IconoPin(props: Props) {
  return (
    <Base {...props}>
      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </Base>
  );
}

/** Potencia / motor. */
export function IconoPotencia(props: Props) {
  return (
    <Base {...props}>
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
    </Base>
  );
}

/** Tipo de unidad. */
export function IconoCamion(props: Props) {
  return (
    <Base {...props}>
      <path d="M2 17V7a1 1 0 0 1 1-1h11v11" />
      <path d="M14 9h3.5l3.5 4v4h-2" />
      <circle cx="7" cy="17.5" r="2" />
      <circle cx="17" cy="17.5" r="2" />
      <path d="M9 17.5h6" />
    </Base>
  );
}

/** Transmisión. */
export function IconoCaja(props: Props) {
  return (
    <Base {...props}>
      <path d="M6 4v16M12 4v16M18 4v10" />
      <path d="M6 4h12" />
      <circle cx="6" cy="20" r="1.5" />
      <circle cx="12" cy="20" r="1.5" />
      <circle cx="18" cy="14" r="1.5" />
    </Base>
  );
}

/** Carga / capacidad. */
export function IconoCarga(props: Props) {
  return (
    <Base {...props}>
      <path d="M3 8.5 12 4l9 4.5v7L12 20l-9-4.5v-7Z" />
      <path d="M3 8.5 12 13l9-4.5M12 13v7" />
    </Base>
  );
}

/** Tractor / cabeza tractora. */
export function IconoTractor(props: Props) {
  return (
    <Base {...props}>
      <path d="M3 17V8a1 1 0 0 1 1-1h6v10" />
      <path d="M10 10h4l3 4v3h-2" />
      <circle cx="6.5" cy="17.5" r="2" />
      <circle cx="15" cy="17.5" r="2" />
      <path d="M8.5 17.5H13M19 17.5h2v-3" />
    </Base>
  );
}

/** Semirremolque. */
export function IconoSemi(props: Props) {
  return (
    <Base {...props}>
      <rect x="2" y="7" width="15" height="8" rx="0.5" />
      <path d="M17 15h5" />
      <circle cx="8" cy="17.5" r="1.8" />
      <circle cx="13" cy="17.5" r="1.8" />
      <path d="M2 15v2.5" />
    </Base>
  );
}

/** Batea volcadora. */
export function IconoBatea(props: Props) {
  return (
    <Base {...props}>
      <path d="M3 7h14l3 7H6L3 7Z" />
      <path d="M6 14v1.5M17 14v1.5" />
      <circle cx="8" cy="17.5" r="1.8" />
      <circle cx="15" cy="17.5" r="1.8" />
    </Base>
  );
}

/** Utilitario / furgón. */
export function IconoFurgon(props: Props) {
  return (
    <Base {...props}>
      <path d="M2 16V8a1 1 0 0 1 1-1h10v9" />
      <path d="M13 10h4l4 3.5V16h-2" />
      <circle cx="7" cy="17.5" r="1.8" />
      <circle cx="17" cy="17.5" r="1.8" />
      <path d="M9 17.5h6" />
    </Base>
  );
}

/** Camioneta / pick-up. */
export function IconoCamioneta(props: Props) {
  return (
    <Base {...props}>
      <path d="M2 16v-4h4l2.5-4H13l2 4h7v4h-2" />
      <circle cx="7" cy="17.5" r="1.8" />
      <circle cx="17" cy="17.5" r="1.8" />
      <path d="M9 17.5h6M2 16h1.5" />
    </Base>
  );
}

/** Escudo: garantía, respaldo. */
export function IconoEscudo(props: Props) {
  return (
    <Base {...props}>
      <path d="M12 3 4.5 6v5.5c0 4.3 3.1 7.9 7.5 9.5 4.4-1.6 7.5-5.2 7.5-9.5V6L12 3Z" />
      <path d="m9 12 2 2 4-4" />
    </Base>
  );
}

export function IconoWhatsapp(props: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.65-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.47s1.06 2.86 1.21 3.06c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35Z" />
      <path d="M12.04 2C6.6 2 2.18 6.42 2.18 11.86c0 1.74.46 3.44 1.32 4.93L2 22l5.35-1.4a9.8 9.8 0 0 0 4.69 1.2h.01c5.43 0 9.85-4.42 9.85-9.86A9.79 9.79 0 0 0 12.04 2Zm0 17.96h-.01a8.2 8.2 0 0 1-4.17-1.14l-.3-.18-3.1.81.83-3.02-.2-.31a8.16 8.16 0 0 1-1.25-4.36c0-4.52 3.68-8.2 8.2-8.2a8.15 8.15 0 0 1 8.19 8.2c0 4.52-3.68 8.2-8.19 8.2Z" />
    </svg>
  );
}

export function IconoBuscar(props: Props) {
  return (
    <Base {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </Base>
  );
}

export function IconoGrilla(props: Props) {
  return (
    <Base {...props}>
      <rect x="3" y="3" width="7.5" height="7.5" rx="0.5" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="0.5" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="0.5" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="0.5" />
    </Base>
  );
}

export function IconoLista(props: Props) {
  return (
    <Base {...props}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </Base>
  );
}

export function IconoFlecha(props: Props) {
  return (
    <Base {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Base>
  );
}

export function IconoCheck(props: Props) {
  return (
    <Base {...props}>
      <path d="M4 12.5 9 17.5 20 6.5" />
    </Base>
  );
}

export function IconoCerrar(props: Props) {
  return (
    <Base {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Base>
  );
}

export function IconoMenu(props: Props) {
  return (
    <Base {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Base>
  );
}
