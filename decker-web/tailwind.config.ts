import type { Config } from 'tailwindcss';

/**
 * Sistema de diseño Decker.
 *
 * Criterio: claridad antes que densidad decorativa. Las superficies se separan
 * con elevación suave y aire, no con bordes de 1px en todo; los bordes quedan
 * para donde de verdad hace falta leer una grilla (la tabla del catálogo).
 * El rojo es marca y CTA; el amarillo es señalética (0 km), nunca decoración.
 */
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Superficies oscuras: nav, hero, footer.
        negro: {
          DEFAULT: '#0B0B0C',
          950: '#0B0B0C',
          900: '#121316',
          800: '#1A1C20',
          700: '#24262B',
          600: '#32353B',
        },
        // Neutros de contenido. Menos escalones, más contraste entre ellos.
        gris: {
          50: '#FAFAFA',
          100: '#F4F5F6',
          200: '#E8E9EB',
          300: '#D3D5D9',
          400: '#9CA0A8',
          500: '#6B6F76',
          600: '#4E5259',
          700: '#33363B',
        },
        rojo: {
          DEFAULT: '#D6001C',
          600: '#D6001C',
          700: '#B00017',
          50: '#FFF1F2',
        },
        // Señalética industrial. Reservado para 0 km.
        amarillo: {
          DEFAULT: '#FFC400',
          600: '#E0AC00',
          50: '#FFF8E1',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Oswald', 'Impact', 'sans-serif'],
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        none: '0',
        sm: '6px',
        DEFAULT: '10px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '28px',
      },
      boxShadow: {
        // Dos capas: una de contacto, una de profundidad. Nunca una sombra
        // grande y difusa sola, que es lo que da aspecto de plantilla.
        tarjeta: '0 1px 2px rgba(11,11,12,.04), 0 4px 16px rgba(11,11,12,.05)',
        'tarjeta-hover': '0 2px 4px rgba(11,11,12,.06), 0 16px 40px rgba(11,11,12,.12)',
        flotante: '0 8px 32px rgba(11,11,12,.12)',
      },
      maxWidth: {
        // Ancho útil del sitio. A 1440 el contenido llega a ~1376px: la grilla
        // de tres tarjetas respira y la página se lee extendida en vez de
        // encajonada. Frena en 1520 para que en monitores muy anchos los
        // párrafos no se estiren a líneas ilegibles.
        contenido: '1520px',
      },
      transitionTimingFunction: {
        suave: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'aparecer': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        aparecer: 'aparecer 180ms cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
