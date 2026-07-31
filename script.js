const WHATSAPP_GENERAL = "5492262414590";

const units = [
  {
    tipo: "Camión 0 km",
    marca: "Volvo",
    nombre: "Volvo FM 420 0 KM",
    sucursal: "Bahía Blanca",
    estado: "0 km",
    potencia: "420 CV",
    financiacion: "Disponible",
    descripcion: "Unidad 0 km, diseño actual, respaldo Decker y opciones de financiación.",
    image: "assets/stock-volvo-fm.png"
  },
  {
    tipo: "Batea",
    marca: "Randon",
    nombre: "Batea Randon 0 KM",
    sucursal: "Quequén",
    estado: "0 km",
    potencia: "Carga pesada",
    financiacion: "Disponible",
    descripcion: "Batea preparada para transporte de carga pesada.",
    image: "assets/stock-volvo-showroom.png"
  },
  {
    tipo: "Camión usado",
    marca: "Volvo",
    nombre: "Volvo FH 460 Usado Seleccionado",
    sucursal: "Mar del Plata",
    estado: "Usado seleccionado",
    potencia: "460 CV",
    financiacion: "Consultar",
    descripcion: "Unidad usada seleccionada, ideal para transporte de larga distancia.",
    image: "assets/stock-volvo-fh-road.png"
  },
  {
    tipo: "Semi",
    marca: "Randon",
    nombre: "Semi Randon Escalable",
    sucursal: "Bahía Blanca",
    estado: "Disponible",
    potencia: "2+1",
    financiacion: "Disponible",
    descripcion: "Semi para logística y transporte de carga general.",
    image: "assets/stock-volvo-fm.png"
  },
  {
    tipo: "Utilitario",
    marca: "Volvo",
    nombre: "Volvo FMX Aplicación Especial",
    sucursal: "Allen",
    estado: "Disponible",
    potencia: "Construcción",
    financiacion: "Consultar",
    descripcion: "Referencia visual de línea Volvo actual para aplicaciones especiales.",
    image: "assets/stock-volvo-fmx.png"
  },
  {
    tipo: "Auto/Camioneta",
    marca: "Volvo",
    nombre: "Volvo FH Electric Referencia",
    sucursal: "Comodoro Rivadavia",
    estado: "Línea actual",
    potencia: "Electric",
    financiacion: "Disponible",
    descripcion: "Referencia visual premium de la gama Volvo actual.",
    image: "assets/stock-volvo-electric.png"
  }
]

const agencyPhones = {
  "Bahía Blanca": "5492262414590",
  "Quequén": "5492262615392",
  "Mar del Plata": "5492235927668",
  "Allen": "5492994534291",
  "Comodoro Rivadavia": "5492974433415"
};

const stockGrid = document.getElementById("stockGrid");
const chips = document.querySelectorAll(".chip");
const quickSearch = document.getElementById("quickSearch");
const menuBtn = document.getElementById("menuBtn");
const navLinks = document.getElementById("navLinks");

function formatMoney(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(value);
}

function whatsappLink(phone, message) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function renderUnits(list) {
  stockGrid.innerHTML = "";

  if (!list.length) {
    stockGrid.innerHTML = `<p class="empty">No encontramos unidades con esos filtros. Probá cambiar la búsqueda.</p>`;
    return;
  }

  list.forEach((unit) => {
    const phone = agencyPhones[unit.sucursal] || WHATSAPP_GENERAL;
    const msg = `Hola Decker, quiero consultar por ${unit.nombre}. Sucursal: ${unit.sucursal}.`;
    const card = document.createElement("article");
    card.className = "stock-card";
    card.innerHTML = `
      <div class="stock-image" style="background-image: linear-gradient(180deg, rgba(0,0,0,.10), rgba(0,0,0,.72)), url('${unit.image}')"><span>${unit.tipo}</span></div>
      <div class="stock-content">
        <h3>${unit.nombre}</h3>
        <p>${unit.descripcion}</p>
        <div class="meta">
          <div><span>Marca</span><strong>${unit.marca}</strong></div>
          <div><span>Sucursal</span><strong>${unit.sucursal}</strong></div>
          <div><span>Estado</span><strong>${unit.estado}</strong></div>
          <div><span>Potencia / Uso</span><strong>${unit.potencia}</strong></div>
        </div>
        <div class="badges">
          <span class="badge">Financiación: ${unit.financiacion}</span>
          <span class="badge">Consulta online</span>
        </div>
        <div class="card-actions">
          <a class="btn primary" target="_blank" rel="noopener" href="${whatsappLink(phone, msg)}">Consultar por WhatsApp</a>
          <a class="btn secondary" href="#financiacion">Simular financiación</a>
        </div>
      </div>
    `;
    stockGrid.appendChild(card);
  });
}

function filterByType(type) {
  if (type === "todos") {
    renderUnits(units);
    return;
  }
  renderUnits(units.filter((unit) => unit.tipo === type));
}

chips.forEach((chip) => {
  chip.addEventListener("click", () => {
    chips.forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    filterByType(chip.dataset.filter);
  });
});

quickSearch.addEventListener("submit", (event) => {
  event.preventDefault();

  const tipo = document.getElementById("tipoFiltro").value;
  const marca = document.getElementById("marcaFiltro").value;
  const sucursal = document.getElementById("sucursalFiltro").value;

  const filtered = units.filter((unit) => {
    const matchTipo = !tipo || unit.tipo === tipo;
    const matchMarca = !marca || unit.marca === marca;
    const matchSucursal = !sucursal || unit.sucursal === sucursal;
    return matchTipo && matchMarca && matchSucursal;
  });

  document.getElementById("stock").scrollIntoView({ behavior: "smooth" });
  chips.forEach((c) => c.classList.remove("active"));
  renderUnits(filtered);
});

document.getElementById("calcForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const valor = Number(document.getElementById("valorUnidad").value);
  const entrega = Number(document.getElementById("entregaInicial").value);
  const plazo = Number(document.getElementById("plazo").value);
  const tasaAnual = Number(document.getElementById("tasa").value);

  if (!valor || valor <= 0) {
    document.getElementById("calcResult").innerHTML = "Ingresá un valor de unidad válido.";
    return;
  }

  const capital = Math.max(valor - entrega, 0);
  const tasaMensual = tasaAnual / 100 / 12;
  let cuota;

  if (tasaMensual === 0) {
    cuota = capital / plazo;
  } else {
    cuota = capital * (tasaMensual * Math.pow(1 + tasaMensual, plazo)) / (Math.pow(1 + tasaMensual, plazo) - 1);
  }

  const resultText = `
    Monto a financiar: ${formatMoney(capital)}
    Cuota aproximada: ${formatMoney(cuota)}
    Plazo: ${plazo} cuotas
    Tasa anual orientativa: ${tasaAnual}%
  `;

  document.getElementById("calcResult").innerHTML = `
    Monto a financiar:
    <strong>${formatMoney(capital)}</strong>
    Cuota aproximada:
    <strong>${formatMoney(cuota)}</strong>
    <small>Plazo: ${plazo} cuotas · Tasa anual orientativa: ${tasaAnual}%</small>
  `;

  document.getElementById("financeWhatsapp").href = whatsappLink(
    WHATSAPP_GENERAL,
    `Hola Decker, quiero consultar financiación. Valor unidad: ${formatMoney(valor)}. Entrega: ${formatMoney(entrega)}. Plazo: ${plazo} cuotas. Tasa orientativa: ${tasaAnual}%. Cuota simulada: ${formatMoney(cuota)}.`
  );
});

document.getElementById("usedForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const nombre = document.getElementById("nombre").value;
  const telefono = document.getElementById("telefono").value;
  const marca = document.getElementById("marcaUsado").value;
  const modelo = document.getElementById("modeloUsado").value;
  const anio = document.getElementById("anioUsado").value;
  const km = document.getElementById("kmUsado").value;
  const estado = document.getElementById("estadoUsado").value;
  const sucursal = document.getElementById("sucursalUsado").value;
  const phone = agencyPhones[sucursal] || WHATSAPP_GENERAL;

  const message = `
Hola Decker, quiero cotizar mi usado como parte de pago.

Nombre: ${nombre}
Teléfono: ${telefono}
Unidad: ${marca} ${modelo}
Año: ${anio}
Kilómetros: ${km}
Estado general: ${estado}
Sucursal preferida: ${sucursal}
  `;

  window.open(whatsappLink(phone, message), "_blank");
});

menuBtn.addEventListener("click", () => {
  navLinks.classList.toggle("open");
});

renderUnits(units);
