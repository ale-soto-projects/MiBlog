// BlogPersonal · Marlon Soto · v2
// Tema claro/oscuro, menú, recorrido interactivo, habilidades,
// álbum de fotos, mensaje de WhatsApp y animaciones.

const raiz = document.documentElement;
const reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

/* ---------- Tema claro / oscuro ---------- */
function aplicarTema(tema) {
  raiz.setAttribute("data-tema", tema);
  try { localStorage.setItem("tema", tema); } catch (e) { /* sin almacenamiento */ }
  $$(".tema-boton").forEach((b) => {
    const oscuro = tema === "oscuro";
    b.setAttribute("aria-pressed", String(oscuro));
    b.setAttribute("aria-label", oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro");
    b.title = oscuro ? "Modo claro" : "Modo oscuro";
  });
}
aplicarTema(raiz.getAttribute("data-tema") === "oscuro" ? "oscuro" : "claro");

$$(".tema-boton").forEach((boton) => {
  boton.addEventListener("click", () => {
    const nuevo = raiz.getAttribute("data-tema") === "oscuro" ? "claro" : "oscuro";
    if (!document.startViewTransition || reducirMovimiento) return aplicarTema(nuevo);
    const r = boton.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const radio = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const transicion = document.startViewTransition(() => aplicarTema(nuevo));
    transicion.ready.then(() => {
      raiz.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radio}px at ${x}px ${y}px)`] },
        { duration: 550, easing: "cubic-bezier(0.22, 0.75, 0.25, 1)", pseudoElement: "::view-transition-new(root)" }
      );
    }).catch(() => {});
  });
});

/* ---------- Menú móvil ---------- */
const menuBoton = $(".menu-boton");
const nav = $(".nav");
function cerrarMenu(foco = false) {
  if (!menuBoton) return;
  menuBoton.setAttribute("aria-expanded", "false");
  menuBoton.setAttribute("aria-label", "Abrir menú");
  nav.classList.remove("abierto");
  if (foco) menuBoton.focus();
}
if (menuBoton && nav) {
  menuBoton.addEventListener("click", () => {
    if (menuBoton.getAttribute("aria-expanded") === "true") return cerrarMenu();
    menuBoton.setAttribute("aria-expanded", "true");
    menuBoton.setAttribute("aria-label", "Cerrar menú");
    nav.classList.add("abierto");
    $("a", nav)?.focus();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && nav.classList.contains("abierto")) cerrarMenu(true); });
  document.addEventListener("click", (e) => {
    if (nav.classList.contains("abierto") && !nav.contains(e.target) && !menuBoton.contains(e.target)) cerrarMenu();
  });
  window.matchMedia("(min-width: 1101px)").addEventListener("change", (e) => { if (e.matches) cerrarMenu(); });
}

/* ---------- Borde del encabezado ---------- */
const encabezado = $(".encabezado");
if (encabezado) {
  const borde = () => encabezado.classList.toggle("con-borde", scrollY > 8);
  borde();
  addEventListener("scroll", borde, { passive: true });
}

/* ---------- Aparición al hacer scroll ---------- */
const revelar = $$(".revelar");
if ("IntersectionObserver" in window && !reducirMovimiento) {
  const obs = new IntersectionObserver((entradas) => {
    entradas.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("visible"); obs.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  revelar.forEach((el) => {
    if (el.dataset.retraso) el.style.transitionDelay = el.dataset.retraso + "ms";
    obs.observe(el);
  });
} else {
  revelar.forEach((el) => el.classList.add("visible"));
}

/* ---------- Aviso ---------- */
let tAviso;
function avisar(texto) {
  let a = $(".aviso");
  if (!a) {
    a = document.createElement("div");
    a.className = "aviso";
    a.setAttribute("role", "status");
    document.body.appendChild(a);
  }
  a.textContent = texto;
  void a.offsetWidth;
  a.classList.add("visible");
  clearTimeout(tAviso);
  tAviso = setTimeout(() => a.classList.remove("visible"), 2400);
}

$$("[data-copiar]").forEach((b) => {
  b.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(b.dataset.copiar);
      avisar("Correo copiado");
    } catch {
      avisar("No se pudo copiar. Selecciónalo manualmente.");
    }
  });
});

/* ---------- Año del pie ---------- */
$$("[data-anio]").forEach((el) => (el.textContent = new Date().getFullYear()));

/* ---------- Mini-ruta del sitio ("estás aquí") ---------- */
const rutaSitio = $(".ruta-sitio");
if (rutaSitio) {
  const actual = $(".ruta-parada.actual", rutaSitio);
  const yo = $(".ruta-yo", rutaSitio);
  const hecho = $(".hecho", rutaSitio);
  const destino = actual ? actual.style.left : "0%";
  const mover = () => { yo.style.left = destino; hecho.style.width = destino; };
  if (reducirMovimiento) mover();
  else requestAnimationFrame(() => requestAnimationFrame(mover));
}

/* =========================================================
   RECORRIDO: el visitante elige un hito y Marlon "corre"
   por la ruta hasta ese punto. La escena cambia de foto,
   el trazo se completa y aparece la historia de ese tramo.
   ========================================================= */
const recorrido = $(".recorrido[data-interactivo]");
if (recorrido) {
  // Coordenadas de la ruta en un lienzo de 1000 x 700
  const PUNTOS = [
    [80, 610], [200, 545], [175, 440], [330, 385], [300, 280], [470, 318],
    [545, 205], [690, 255], [760, 140], [905, 95],
  ];
  const PARADAS = [0, 2, 4, 6, 8, 9]; // índices de PUNTOS donde hay un hito
  const ANCHO = 1000, ALTO = 700;

  const hitos = $$(".hitos-lista > li", recorrido);
  const mapa = $(".mapa", recorrido);
  const trazoBase = $(".trazo-base", recorrido);
  const trazoHecho = $(".trazo-hecho", recorrido);
  const corredor = $(".corredor", recorrido);
  const capas = $$(".escena-capa", recorrido);
  const texto = $(".escena-texto", recorrido);
  const contador = $(".escena-contador", recorrido);
  const btnAnterior = $("[data-anterior]", recorrido);
  const btnSiguiente = $("[data-siguiente]", recorrido);

  recorrido.classList.add("con-js");

  // Largos acumulados
  const acumulado = [0];
  for (let i = 1; i < PUNTOS.length; i++) {
    const [x1, y1] = PUNTOS[i - 1], [x2, y2] = PUNTOS[i];
    acumulado.push(acumulado[i - 1] + Math.hypot(x2 - x1, y2 - y1));
  }
  const total = acumulado[acumulado.length - 1];
  const distParada = PARADAS.map((i) => acumulado[i]);

  const d = (pts) => "M " + pts.map((p) => p.join(" ")).join(" L ");
  trazoBase.setAttribute("d", d(PUNTOS));

  function puntoEn(dist) {
    dist = Math.max(0, Math.min(total, dist));
    let i = 1;
    while (i < acumulado.length - 1 && acumulado[i] < dist) i++;
    const t = (dist - acumulado[i - 1]) / (acumulado[i] - acumulado[i - 1] || 1);
    const [x1, y1] = PUNTOS[i - 1], [x2, y2] = PUNTOS[i];
    return { x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t, segmento: i };
  }

  // Botones de hito sobre el mapa
  const botones = hitos.map((li, n) => {
    const [x, y] = PUNTOS[PARADAS[n]];
    const b = document.createElement("button");
    b.type = "button";
    b.className = "hito-boton";
    b.style.left = (x / ANCHO) * 100 + "%";
    b.style.top = (y / ALTO) * 100 + "%";
    b.setAttribute("aria-label", `Hito ${n + 1}: ${li.dataset.titulo}`);
    b.innerHTML = `<span>${n + 1}</span>`;
    b.addEventListener("click", () => ir(n));
    mapa.appendChild(b);

    const nombre = document.createElement("span");
    nombre.className = "hito-nombre";
    nombre.setAttribute("aria-hidden", "true");
    nombre.style.left = b.style.left;
    nombre.style.top = b.style.top;
    nombre.textContent = li.dataset.corto;
    mapa.appendChild(nombre);
    return b;
  });

  let distActual = 0;
  let indice = 0;
  let animacion;

  function dibujar(dist) {
    const p = puntoEn(dist);
    const pts = PUNTOS.slice(0, p.segmento).concat([[p.x, p.y]]);
    trazoHecho.setAttribute("d", d(pts));
    const r = mapa.getBoundingClientRect();
    corredor.style.transform = `translate(${(p.x / ANCHO) * r.width}px, ${(p.y / ALTO) * r.height}px)`;
    botones.forEach((b, n) => b.classList.toggle("pasado", distParada[n] <= dist + 0.5));
  }

  function mostrarEscena(n) {
    const li = hitos[n];
    capas.forEach((c) => c.classList.toggle("activa", c.dataset.hito === li.dataset.id));
    texto.innerHTML = `<div class="escena-anim">${li.innerHTML}</div>`;
    contador.textContent = `${String(n + 1).padStart(2, "0")} / ${String(hitos.length).padStart(2, "0")}`;
    botones.forEach((b, i) => (i === n ? b.setAttribute("aria-current", "step") : b.removeAttribute("aria-current")));
    btnAnterior.disabled = n === 0;
    btnSiguiente.disabled = n === hitos.length - 1;
  }

  function ir(n) {
    n = Math.max(0, Math.min(hitos.length - 1, n));
    indice = n;
    mostrarEscena(n);
    const inicio = distActual, fin = distParada[n];
    cancelAnimationFrame(animacion);
    if (reducirMovimiento || inicio === fin) {
      distActual = fin;
      return dibujar(fin);
    }
    const duracion = Math.min(1600, 450 + Math.abs(fin - inicio) * 1.4);
    const t0 = performance.now();
    const paso = (ahora) => {
      const t = Math.min(1, (ahora - t0) / duracion);
      const suave = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      distActual = inicio + (fin - inicio) * suave;
      dibujar(distActual);
      if (t < 1) animacion = requestAnimationFrame(paso);
    };
    animacion = requestAnimationFrame(paso);
  }

  btnAnterior.addEventListener("click", () => ir(indice - 1));
  btnSiguiente.addEventListener("click", () => ir(indice + 1));
  recorrido.addEventListener("keydown", (e) => {
    if (e.target.closest("a")) return;
    if (e.key === "ArrowRight") { e.preventDefault(); ir(indice + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); ir(indice - 1); }
  });
  addEventListener("resize", () => dibujar(distActual));

  mostrarEscena(0);
  dibujar(0);

  // Al entrar en pantalla por primera vez, avanza solo al segundo hito para invitar a explorar
  if ("IntersectionObserver" in window && !reducirMovimiento) {
    const obs = new IntersectionObserver((e) => {
      if (e[0].isIntersecting) { obs.disconnect(); setTimeout(() => { if (indice === 0) ir(1); }, 500); }
    }, { threshold: 0.45 });
    obs.observe(mapa);
  }
}

/* ---------- Habilidades: elige una y mira dónde la usé ---------- */
const habBotones = $$(".hab");
const evidencias = $(".evidencias");
const habTexto = $(".hab-explicacion");
if (habBotones.length && evidencias) {
  const textoInicial = habTexto.innerHTML;
  habBotones.forEach((b) => {
    b.addEventListener("click", () => {
      const activo = b.getAttribute("aria-pressed") === "true";
      habBotones.forEach((x) => x.setAttribute("aria-pressed", "false"));
      if (activo) {
        evidencias.classList.remove("filtrando");
        $$(".evidencia", evidencias).forEach((ev) => ev.classList.remove("coincide"));
        habTexto.innerHTML = textoInicial;
        return;
      }
      b.setAttribute("aria-pressed", "true");
      const ids = b.dataset.donde.split(" ");
      evidencias.classList.add("filtrando");
      $$(".evidencia", evidencias).forEach((ev) => ev.classList.toggle("coincide", ids.includes(ev.dataset.id)));
      habTexto.innerHTML = `<strong>${b.dataset.nombre}:</strong> ${b.dataset.texto}`;
    });
  });
}

/* ---------- Álbum de fotos (pila) ---------- */
const pila = $(".pila");
if (pila) {
  const fotos = $$(".pila-foto", pila);
  const info = $(".album-info");
  const titulo = $("h2", info), lugar = $(".lugar", info), cont = $(".contador", info);
  const minis = $$(".miniaturas button");
  let orden = fotos.map((_, i) => i);
  const giros = [-2, 3, -4, 2, -3, 4];

  function pintar() {
    orden.forEach((idx, pos) => {
      const f = fotos[idx];
      f.style.zIndex = String(fotos.length - pos);
      f.style.transform = pos === 0
        ? "rotate(0deg)"
        : `translate(${pos * 10}px, ${pos * 8}px) rotate(${giros[idx % giros.length]}deg) scale(${1 - pos * 0.035})`;
      f.setAttribute("aria-hidden", pos === 0 ? "false" : "true");
      f.tabIndex = pos === 0 ? 0 : -1;
    });
    const arriba = fotos[orden[0]];
    titulo.textContent = arriba.dataset.titulo;
    lugar.textContent = arriba.dataset.lugar;
    cont.textContent = `Foto ${orden[0] + 1} de ${fotos.length}`;
    minis.forEach((m, i) => m.setAttribute("aria-current", String(i === orden[0])));
  }

  let ocupado = false;
  function siguiente() {
    if (ocupado) return;
    const arriba = fotos[orden[0]];
    if (reducirMovimiento) { orden.push(orden.shift()); return pintar(); }
    ocupado = true;
    arriba.classList.add("saliendo");
    setTimeout(() => {
      orden.push(orden.shift());
      arriba.classList.remove("saliendo");
      pintar();
      ocupado = false;
    }, 300);
  }
  function anterior() { orden.unshift(orden.pop()); pintar(); }
  function traer(i) { orden = [i, ...orden.filter((x) => x !== i)]; pintar(); }

  $("[data-album-siguiente]")?.addEventListener("click", siguiente);
  $("[data-album-anterior]")?.addEventListener("click", anterior);
  minis.forEach((m, i) => m.addEventListener("click", () => traer(i)));
  fotos.forEach((f) => f.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); siguiente(); }
    if (e.key === "ArrowRight") siguiente();
    if (e.key === "ArrowLeft") anterior();
  }));

  // Deslizar con el dedo o el mouse
  let x0 = null, dx = 0, arrastrada = null;
  pila.addEventListener("pointerdown", (e) => {
    arrastrada = fotos[orden[0]];
    if (!arrastrada.contains(e.target)) return (arrastrada = null);
    x0 = e.clientX; dx = 0;
    arrastrada.classList.add("arrastrando");
    pila.setPointerCapture(e.pointerId);
  });
  pila.addEventListener("pointermove", (e) => {
    if (x0 === null) return;
    dx = e.clientX - x0;
    arrastrada.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg)`;
  });
  const soltar = () => {
    if (x0 === null) return;
    arrastrada.classList.remove("arrastrando");
    if (Math.abs(dx) > 70 || Math.abs(dx) < 4) siguiente(); else pintar();
    x0 = null; arrastrada = null;
  };
  pila.addEventListener("pointerup", soltar);
  pila.addEventListener("pointercancel", () => { if (arrastrada) { arrastrada.classList.remove("arrastrando"); pintar(); } x0 = null; });

  // Ver en grande
  const visor = $(".visor");
  $("[data-album-ampliar]")?.addEventListener("click", (e) => {
    const f = fotos[orden[0]];
    $("img", visor).src = $("img", f).src;
    $("img", visor).alt = $("img", f).alt;
    $("p", visor).textContent = `${f.dataset.titulo} · ${f.dataset.lugar}`;
    visor.showModal();
    visor._origen = e.currentTarget;
  });
  visor?.addEventListener("close", () => visor._origen?.focus());
  $(".visor .cerrar")?.addEventListener("click", () => visor.close());
  visor?.addEventListener("click", (e) => { if (e.target === visor) visor.close(); });

  pintar();
}

/* ---------- Mensaje de WhatsApp ---------- */
const compositor = $(".compositor");
if (compositor) {
  const NUMERO = "51997940406";
  const opciones = $$(".tema-opcion", compositor);
  const area = $("textarea", compositor);
  const burbuja = $(".burbuja", compositor);
  const enlace = $("[data-enviar]", compositor);

  const actualizar = () => {
    const txt = area.value.trim() || "Hola Marlon";
    burbuja.textContent = txt;
    enlace.href = `https://wa.me/${NUMERO}?text=${encodeURIComponent(txt)}`;
  };
  const elegir = (b) => {
    opciones.forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
    area.value = b.dataset.mensaje;
    actualizar();
    if (!reducirMovimiento) { burbuja.classList.remove("pulso"); void burbuja.offsetWidth; burbuja.classList.add("pulso"); }
  };
  opciones.forEach((b) => b.addEventListener("click", () => elegir(b)));
  area.addEventListener("input", actualizar);

  const pedido = new URLSearchParams(location.search).get("tema");
  const inicial = opciones.find((o) => o.dataset.tema === pedido) || opciones[0];
  elegir(inicial);
}
