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
        /**
         * Superficies oscuras: nav, hero, footer, simulador.
         *
         * Ya no es un gris casi negro sino AZUL DE MARCA. La rampa se construyó
         * desde #002040 —hsl(210, 100%, 12.5%)— replicando los saltos de
         * luminosidad que tenía la vieja, y aflojando la saturación a medida
         * que sube para que los escalones claros no queden eléctricos.
         *
         * El nombre sigue siendo `negro` porque es el ROL —la superficie oscura
         * del sitio— y renombrarlo tocaría un centenar de clases sin mover un
         * píxel. Lo que hay adentro es azul.
         *
         * Blanco encima: 16.4:1 en el 950, 12.7:1 en el 800 (campos oscuros).
         */
        negro: {
          DEFAULT: '#002040',
          950: '#002040',
          900: '#02294F',
          800: '#07335F',
          700: '#103E6B',
          600: '#1F4D7B',
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
        /**
         * Acento de marca. UN amarillo, #FEC700, donde antes había dos colores
         * —el rojo del CTA y el amarillo de señalética—.
         *
         * `rojo` y `amarillo` son el MISMO color: los dos nombres se conservan
         * porque están escritos en ~60 clases y renombrarlos no cambiaría nada
         * en pantalla. El que importa es el escalón, no el nombre.
         *
         * Un amarillo no se comporta como un rojo, y por eso la escala tiene un
         * escalón más:
         *
         * - DEFAULT / 600 (#FEC700) — SUPERFICIE. Va de fondo, con texto
         *   `negro` encima: 10.4:1. Blanco encima da 1.6:1, así que el texto
         *   sobre amarillo NUNCA es blanco. También sirve como texto sobre las
         *   superficies oscuras, donde da esos mismos 10.4:1.
         * - 700 (#DFAF00) — el hover de esa superficie. Un escalón, no un salto.
         * - 800 (#806400) — TEXTO Y TRAZO sobre fondo claro, que es lo que el
         *   amarillo plano no puede hacer: sobre blanco da 1.6:1 y desaparece.
         *   Este oro oscuro mantiene el tono y pasa sobre TODAS las superficies
         *   claras del sitio: 5.6:1 en blanco, 5.1:1 en el lienzo gris y 4.6:1
         *   en gris-200. Se eligio contra el lienzo y no contra el blanco: un
         *   oro calculado solo sobre blanco daba 4.3:1 sobre el gris y fallaba
         *   justo en las volantas, que viven sobre el lienzo.
         * - 50 (#FEF9E6) — fondo tenue de badge.
         */
        rojo: {
          DEFAULT: '#FEC700',
          600: '#FEC700',
          700: '#DFAF00',
          800: '#806400',
          50: '#FEF9E6',
        },
        amarillo: {
          DEFAULT: '#FEC700',
          600: '#DFAF00',
          700: '#DFAF00',
          800: '#806400',
          50: '#FEF9E6',
        },
      },
      /**
       * UNA familia para todo el sitio: Overpass, más su monoespaciada.
       *
       * `display` y `sans` apuntan al MISMO archivo a propósito. Ya no son dos
       * dibujos distintos —antes eran la condensada y la normal de IBM Plex—:
       * ahora la diferencia entre un título y un párrafo la hace el peso, que
       * es de donde tiene que salir. Se conservan las dos claves porque
       * `font-display` sigue nombrando un ROL —"esto es un título"— y eso vale
       * aunque hoy las dos resuelvan al mismo lugar.
       *
       * El respaldo es Helvetica/Arial y no una condensada: Overpass es una
       * grotesca de ancho normal, así que si la fuente todavía no llegó el
       * texto tiene que ocupar más o menos lo mismo. Un respaldo angosto haría
       * saltar el ancho de cada titular al cargar.
       */
      fontFamily: {
        display: ['var(--font-overpass)', 'Helvetica Neue', 'Arial', 'system-ui', 'sans-serif'],
        sans: ['var(--font-overpass)', 'Helvetica Neue', 'Arial', 'system-ui', 'sans-serif'],
        // `mono` NO es una segunda cara: apunta a Overpass como el resto. La
        // clave se conserva porque el preflight de Tailwind la usa para
        // `code`, `kbd` y `pre`; si se borrara, esos elementos caerían en la
        // monoespaciada del sistema y volvería a haber dos tipografías.
        mono: ['var(--font-overpass)', 'Helvetica Neue', 'Arial', 'system-ui', 'sans-serif'],
      },

      /**
       * Escala tipográfica del sitio. DOCE escalones, ninguno más.
       *
       * Antes convivían veinte tamaños distintos escritos a mano
       * (`text-[34px]`, `text-[36px]`, `text-[38px]`…): diferencias de 2px que
       * nadie lee como jerarquía, sólo como descuido. Acá cada paso es
       * ~1,15-1,25x el anterior, que es la distancia mínima para que el ojo
       * registre "esto es otro nivel".
       *
       * Los interlineados obedecen una regla, no un capricho: NINGÚN escalón de
       * texto corrido baja de 1.5, y todos los titulares grandes caen entre 1.15
       * y 1.2. El aire entre renglones es la mitad de lo que hace que una página
       * densa de datos se lea cómoda; la otra mitad es el espacio entre bloques.
       *
       * El escalón más chico es la excepción declarada: son rótulos en
       * versalitas de una sola línea, donde 1.5 abriría un renglón que nunca
       * llega a existir.
       *
       * Los títulos traen tracking negativo incorporado —a mayor cuerpo, más
       * cerrado— así no hay que acordarse de agregarlo en cada uso.
       */
      fontSize: {
        '2xs': ['11px', { lineHeight: '16px' }],
        xs: ['12px', { lineHeight: '18px' }],
        sm: ['14px', { lineHeight: '22px' }],
        base: ['16px', { lineHeight: '24px' }],
        md: ['18px', { lineHeight: '28px' }],
        lg: ['20px', { lineHeight: '28px' }],
        xl: ['22px', { lineHeight: '30px', letterSpacing: '-0.01em' }],
        '2xl': ['26px', { lineHeight: '32px', letterSpacing: '-0.01em' }],
        '3xl': ['32px', { lineHeight: '38px', letterSpacing: '-0.015em' }],
        '4xl': ['40px', { lineHeight: '46px', letterSpacing: '-0.02em' }],
        '5xl': ['52px', { lineHeight: '60px', letterSpacing: '-0.02em' }],
        '6xl': ['64px', { lineHeight: '72px', letterSpacing: '-0.025em' }],
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

      /**
       * Elevación: TRES niveles, y ninguna sombra escrita a mano fuera de acá.
       *
       * - nivel-1: reposo. Una tarjeta apoyada sobre el lienzo.
       * - nivel-2: foco. La misma tarjeta bajo el cursor, o un panel activo.
       * - nivel-3: flotante. Lo que se despega del plano: el simulador, el
       *   panel de búsqueda abierto.
       *
       * Cada nivel son dos capas —contacto + profundidad— porque una sola
       * sombra grande y difusa es lo que da aspecto de plantilla. La diferencia
       * entre nivel 1 y 2 se nota, pero no salta: la tarjeta sube, no despega.
       */
      boxShadow: {
        'nivel-1': '0 1px 2px rgba(11,11,12,.04), 0 4px 16px rgba(11,11,12,.05)',
        'nivel-2': '0 2px 4px rgba(11,11,12,.06), 0 16px 40px rgba(11,11,12,.12)',
        'nivel-3': '0 4px 8px rgba(11,11,12,.08), 0 24px 64px rgba(11,11,12,.16)',
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

      /**
       * Duraciones. El sitio tiene DOS: 150ms para lo que responde al dedo o al
       * cursor (color, sombra, foco) y 200ms para lo que además se mueve. Nada
       * de 300 ni 500: en un teléfono viejo una transición larga no se lee como
       * elegante, se lee como que el sitio tarda.
       */
      transitionDuration: {
        DEFAULT: '150ms',
        rapido: '150ms',
        medio: '200ms',
      },

      keyframes: {
        aparecer: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        // Entrada de las tarjetas del catálogo. 8px, no 24: a más recorrido,
        // más se parece a una presentación y menos a una lista que se acomoda.
        entrar: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        // Barrido del esqueleto de carga. Recorre el doble del ancho del
        // bloque, así el brillo entra y sale en vez de latir en el lugar.
        brillo: {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(100%)' },
        },
        // Un dígito girando en su casilla. Entra desde arriba y lo recorta la
        // caja del número: es un tambor de odómetro, no un texto que aparece.
        tick: {
          from: { opacity: '0', transform: 'translateY(-60%)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        // Panel de búsqueda. La escala arranca en 0.985 y no en 0.9: a 0.9 se
        // lee como una ventana que "explota" hacia el usuario; a 0.985 se lee
        // como una superficie que se acomoda en su lugar.
        'entrar-panel': {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.985)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        // El velo entra solo y más rápido que el panel: primero se apaga el
        // fondo, después se apoya la ventana. Los dos juntos leen como un corte.
        velo: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        // Acuse de que el toque entró, en el corazón de guardar. Un solo golpe
        // de ida y vuelta: crece 20% y baja. Sin rebote —nada de pasar de largo
        // y volver—, que es lo que separa una confirmación de un juguete.
        pop: {
          '0%': { transform: 'scale(1)' },
          '45%': { transform: 'scale(1.2)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        aparecer: 'aparecer 180ms cubic-bezier(0.22, 1, 0.36, 1)',
        entrar: 'entrar 260ms cubic-bezier(0.22, 1, 0.36, 1) both',
        brillo: 'brillo 1.4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        // Curva casi lineal con frenada seca al final: el dígito no flota.
        tick: 'tick 110ms cubic-bezier(0.2, 0, 0, 1) both',
        'entrar-panel': 'entrar-panel 200ms cubic-bezier(0.22, 1, 0.36, 1) both',
        velo: 'velo 150ms linear both',
        pop: 'pop 150ms cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
