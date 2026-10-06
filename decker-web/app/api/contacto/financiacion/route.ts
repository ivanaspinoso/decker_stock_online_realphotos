import { registrarConsultaGeneral } from '@/lib/rutasur/contacto';
import { idDeSlug } from '@/lib/rutasur/mapeo';
import { enviarASheet } from '@/lib/sheets';

/**
 * `POST /api/contacto/financiacion` — los datos que abren la calculadora y,
 * después, el plan que la persona eligió.
 *
 * Dos `tipo`, una sola fila en el Sheet:
 *
 *   lead → celular, email y nombre. Crea la fila.
 *   plan → "Quiero este plan". Completa las columnas de la simulación en la
 *          fila que tenga el mismo `id`.
 *
 * El lead va además al backend de Ruta Sur (`/contactos/contacto`), con la
 * misma regla que los otros POST de contacto: se suma, no reemplaza, y si
 * falla queda en el log.
 *
 * SIEMPRE CONTESTA 200, igual que las otras rutas de `/api/contacto/`: el
 * navegador no espera esta respuesta. Por eso la validación de acá no es para
 * mostrarle errores a nadie —eso lo hace el formulario— sino para que al Sheet
 * no entre basura de alguien que le pegue a la ruta a mano.
 */
export async function POST(pedido: Request) {
  let cuerpo: Record<string, unknown>;
  try {
    cuerpo = ((await pedido.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return Response.json({ registrada: false, motivo: 'cuerpo inválido' });
  }

  // Campo trampa: un humano no lo ve, un bot que llena todo sí lo completa.
  if (texto(cuerpo.web)) {
    return Response.json({ registrada: false, motivo: 'trampa' });
  }

  const id = texto(cuerpo.id).slice(0, 64);
  if (!id) return Response.json({ registrada: false, motivo: 'sin id' });

  if (cuerpo.tipo === 'plan') {
    const registrada = await enviarASheet({
      tipo: 'plan',
      id,
      modalidad: cuerpo.modalidad === 'leasing' ? 'Leasing' : 'Financiación estándar',
      unidad: texto(cuerpo.unidad).slice(0, 200),
      valorUsd: numero(cuerpo.valorUsd),
      entregaPesos: numero(cuerpo.entregaPesos),
      plazo: numero(cuerpo.plazo),
      cuotaPesos: numero(cuerpo.cuotaPesos),
    });
    return Response.json({ registrada });
  }

  const celular = texto(cuerpo.celular).replace(/\D/g, '');
  const email = texto(cuerpo.email).slice(0, 200);
  const nombre = texto(cuerpo.nombre).slice(0, 100);
  const apellido = texto(cuerpo.apellido).slice(0, 100);

  if (!/^[1-9]\d{9}$/.test(celular) || !email.includes('@') || !nombre) {
    return Response.json({ registrada: false, motivo: 'datos inválidos' });
  }

  const unidad = (cuerpo.unidad ?? null) as { slug?: unknown; nombre?: unknown } | null;
  const origen = (cuerpo.origen ?? {}) as Record<string, unknown>;
  const nombreUnidad = texto(unidad?.nombre).slice(0, 200);

  const [registrada] = await Promise.all([
    enviarASheet({
      tipo: 'lead',
      id,
      nombre,
      apellido,
      // Con el +54 9 adelante: así queda listo para tocar y abrir WhatsApp
      // desde el Sheet, y para la API de WhatsApp el día que se conecte.
      celular: `+549${celular}`,
      email,
      aceptaWhatsapp: cuerpo.aceptaWhatsapp === true,
      unidad: nombreUnidad,
      linkUnidad: texto(unidad?.slug)
        ? `${new URL(pedido.url).origin}/unidad/${texto(unidad?.slug)}`
        : '',
      pagina: texto(cuerpo.pagina).slice(0, 300),
      fuente: texto(origen.fuente).slice(0, 100),
      medio: texto(origen.medio).slice(0, 100),
      campania: texto(origen.campania).slice(0, 100),
      referrer: texto(origen.referrer).slice(0, 300),
      paginaDeEntrada: texto(origen.paginaDeEntrada).slice(0, 300),
    }),
    registrarConsultaGeneral({
      nombre: `${nombre} ${apellido}`.trim(),
      telefono: celular,
      email,
      mensaje: nombreUnidad
        ? `Simuló financiación de: ${nombreUnidad}`
        : 'Simuló financiación desde la home.',
      unidadId: idDeSlug(texto(unidad?.slug)) ?? undefined,
    }),
  ]);

  return Response.json({ registrada });
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : '';
}

function numero(valor: unknown): number | '' {
  return typeof valor === 'number' && Number.isFinite(valor) ? Math.round(valor) : '';
}
