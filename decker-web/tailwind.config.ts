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
       * LA MITAD DE ABAJO DE LA ESCALA SUBIÓ UN PUNTO —11/12/14/16/18 pasaron a
       * 12/13/15/17/19— y los titulares quedaron donde estaban.
       *
       * El que compra un camión para su flota no es el usuario de veintipico
       * que da por sentado el texto chico: es alguien de cincuenta o sesenta
       * años leyendo specs en un teléfono, muchas veces afuera y con la vista
       * cansada. En ese caso 14px no es "denso", es un dato que hay que acercar
       * la pantalla para leer, y un sitio donde eso pasa se abandona antes de
       * llegar al botón de WhatsApp.
       *
       * Los escalones grandes NO se tocaron a propósito: la jerarquía del sitio
       * ya funcionaba, y subir el cuerpo sin subir los títulos justamente cierra
       * la distancia donde sobraba —un párrafo de 17 contra un título de 32 se
       * sigue leyendo como dos niveles—. Subir todo habría sido agrandar la
       * página, no hacerla más legible.
       *
       * Los interlineados acompañan: `sm` pasó de 22 a 24 para no bajar de 1.5
       * ahora que el cuerpo es 15, y `xs` de 18 a 20 por lo mismo.
       *
       * Los títulos traen tracking negativo incorporado —a mayor cuerpo, más
       * cerrado— así no hay que acordarse de agregarlo en cada uso.
       */
      fontSize: {
        '2xs': ['12px', { lineHeight: '16px' }],
        xs: ['13px', { lineHeight: '20px' }],
        sm: ['15px', { lineHeight: '24px' }],
        base: ['17px', { lineHeight: '26px' }],
        md: ['19px', { lineHeight: '29px' }],
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
