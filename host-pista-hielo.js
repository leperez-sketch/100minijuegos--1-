// --- SISTEMA DE AUDIO ---
const musicaPista = new Audio('/sounds/musica-pista-hielo.mp3');
musicaPista.loop = true; // Hacemos que la música se repita infinitamente
musicaPista.volume = 0.4; // Ajusta entre 0.0 y 1.0 para no dejar sordos a tus amigos

const efectoMoneda = new Audio('/sounds/moneda.mp3');
efectoMoneda.volume = 0.8;

// --- VARIABLES DE CONTROL MENTAL ---
let ultimaPosMoneda = null;
let musicaIniciada = false;
let memoriaDireccion = {}; // <-- LA MEMORIA PARA SABER HACIA DÓNDE MIRAN
let elementosJugadores = {};
let inicioCaida = {};
let elementoMoneda = null;
let ultimaMonedaRenderizada = null;

// ==========================================
// 1. LA QUE CONSTRUYE EL ESCENARIO Y EL CSS
// ==========================================
export function montarPistaHielo(socket) {
    if (window.pausarLobby) window.pausarLobby();
    const contenedor = document.getElementById('contenedor-pista-hielo');
    
    // Reiniciamos variables al entrar al juego
    musicaIniciada = false;
    ultimaPosMoneda = null;
    memoriaDireccion = {}; // Vaciamos la memoria al iniciar
    elementosJugadores = {};
    inicioCaida = {};
    elementoMoneda = null;
    ultimaMonedaRenderizada = null;
    
    // Inyectamos el CSS y el HTML base del juego en la pantalla
    contenedor.innerHTML = `
        <style>
            #escena-juego {
                position: relative; width: 100vw; height: 100vh; overflow: hidden;
                /* AQUÍ VA EL FONDO CORRECTO DE LA CUEVA DE HIELO */
                background: url('/img/hielo-fondo.png') center center / cover no-repeat;
            }
            /* LA PLATAFORMA */
            #pista-visual {
                position: absolute;
                width: 80%; height: 60%;
                top: 70%; left: 50%;
                transform: translate(-50%, -50%);
                background: url('/img/hielo-pista.png') no-repeat center center / 100% 100%;
                z-index: 1;
            }
            /* MARCADORES LATERALES */
            .marcador {
                position: absolute; top: 20px; padding: 15px; border-radius: 10px;
                font-family: 'HappyTreeFriends', sans-serif; min-width: 150px; z-index: 100;
                font-size: 20px; text-shadow: 0 2px 4px black;
            }
            #marcador-monedas { left: 30px; border: 3px solid #ffd700; background: rgba(0,0,0,0.7); color: #ffd700; }
            #marcador-muertes { right: 30px; border: 3px solid #ff4444; background: rgba(0,0,0,0.7); color: #ff4444; }

            /* TEMPORIZADOR NEÓN */
            #timer-pista {
                position: absolute; top: 20px; left: 50%; transform: translateX(-50%);
                font-size: 60px; color: #00f2ff; text-shadow: 0 0 15px #00f2ff, 0 0 30px #00f2ff; z-index: 100;
                font-family: 'HappyTreeFriends', sans-serif;
            }

            /* CAÍDA: el personaje sigue visible, gira y sale de la pantalla. */
            .personaje {
                transform-origin: 50% 80%;
                will-change: transform, opacity, top;
            }
            .personaje-cayendo {
                animation: personaje-caida 2s cubic-bezier(.18,.72,.32,1) forwards;
            }
            @keyframes personaje-caida {
                0%   { transform: translate(-50%, -50%) translate(0, 0) rotate(0deg) scaleX(var(--direccion,1)); opacity:1; }
                25%  { transform: translate(-50%, -50%) translate(-4px, 12px) rotate(-10deg) scaleX(var(--direccion,1)); opacity:1; }
                55%  { transform: translate(-50%, -50%) translate(9px, 85px) rotate(28deg) scaleX(var(--direccion,1)) scale(.92); opacity:.95; }
                100% { transform: translate(-50%, -50%) translate(22px, 360px) rotate(105deg) scaleX(var(--direccion,1)) scale(.55); opacity:0; }
            }

            /* CAPA DONDE SE MUEVEN LOS PERSONAJES */
            #capa-personajes {
                position: absolute; inset: 0; z-index: 10;
            }

            /* LA MONEDA AMARILLA */
            .moneda-juego {
                position: absolute; width: 40px; height: 40px;
                background: radial-gradient(circle, #fffb00 0%, #ff9100 100%);
                border-radius: 50%; box-shadow: 0 0 20px #ffea00;
                transform: translate(-50%, -50%); z-index: 50;
                animation: flotarMoneda 1s infinite alternate ease-in-out;
            }
            @keyframes flotarMoneda {
                from { transform: translate(-50%, -50%) scale(1); }
                to { transform: translate(-50%, -50%) scale(1.2); }
            }
        </style>
        
        <div id="escena-juego">
            <div id="pista-visual"></div>
            <div id="marcador-monedas" class="marcador">💰 MONEDAS</div>
            <div id="timer-pista">0:00</div>
            <div id="marcador-muertes" class="marcador">💀 MUERTES</div>
            <div id="capa-personajes"></div>
        </div>
    `;
}

// ==========================================
// 2. LA QUE MUEVE LOS PERSONAJES Y EL RELOJ
// ==========================================
export function renderizarPistaHielo(jugadores, moneda, tiempo) {
    const capaPersonajes = document.getElementById('capa-personajes');
    const timerElem = document.getElementById('timer-pista');
    const tablaMonedas = document.getElementById('marcador-monedas');
    const tablaMuertes = document.getElementById('marcador-muertes');

    if (!capaPersonajes) return; // Seguridad por si no ha cargado el HTML

    // --- REPRODUCCIÓN SEGURA DE MÚSICA ---
    if (!musicaIniciada) {
        musicaPista.play().catch(error => console.log("Esperando interacción para reproducir audio", error));
        musicaIniciada = true;
    }

    // 1. Actualizar Reloj
    if (timerElem) {
        const min = Math.floor(tiempo / 60);
        const seg = tiempo % 60;
        timerElem.innerText = `${min}:${seg.toString().padStart(2, '0')}`;
    }

    // 2. Dibujar personajes sin recrear el DOM en cada tick.
    // Esto permite que las animaciones CSS de caída tengan continuidad.
    let htmlMonedas = '<div>💰 MONEDAS</div>';
    let htmlMuertes = '<div>💀 MUERTES</div>';
    const idsVisibles = new Set();

    const listaJugadores = Array.isArray(jugadores) ? jugadores : Object.values(jugadores);

    listaJugadores.forEach(j => {
        idsVisibles.add(j.id);

        if (!memoriaDireccion[j.id]) {
            memoriaDireccion[j.id] = { xAnterior: j.x, escala: 1 };
        } else {
            if (!j.cayendo) {
                if (j.x > memoriaDireccion[j.id].xAnterior + 0.02) memoriaDireccion[j.id].escala = -1;
                else if (j.x < memoriaDireccion[j.id].xAnterior - 0.02) memoriaDireccion[j.id].escala = 1;
            }
            memoriaDireccion[j.id].xAnterior = j.x;
        }

        let pElem = elementosJugadores[j.id];
        if (!pElem) {
            pElem = document.createElement('div');
            pElem.className = 'personaje';
            pElem.style.position = 'absolute';
            pElem.style.width = '120px';
            pElem.style.height = '120px';
            pElem.style.backgroundSize = 'contain';
            pElem.style.backgroundRepeat = 'no-repeat';
            pElem.style.backgroundPosition = 'center bottom';
            capaPersonajes.appendChild(pElem);
            elementosJugadores[j.id] = pElem;
        }

        pElem.style.left = j.x + '%';
        pElem.style.top = j.y + '%';
        pElem.style.setProperty('--direccion', memoriaDireccion[j.id].escala);

        const lobbySprite = document.getElementById(`sprite-${j.id}`);
        if (lobbySprite && lobbySprite.style.backgroundImage !== 'none') {
            pElem.style.backgroundImage = lobbySprite.style.backgroundImage;
        } else if (!pElem.style.backgroundImage) {
            pElem.style.backgroundImage = `url('/img/${j.color || j.personaje || 'noctis'}.png')`;
        }

        if (j.cayendo) {
            if (!inicioCaida[j.id]) inicioCaida[j.id] = performance.now();
            pElem.classList.add('personaje-cayendo');
            pElem.style.setProperty('--caida-progreso', Math.min(1, (performance.now() - inicioCaida[j.id]) / 2000));
        } else {
            delete inicioCaida[j.id];
            pElem.classList.remove('personaje-cayendo');
            pElem.style.transform = `translate(-50%, -50%) scaleX(${memoriaDireccion[j.id].escala})`;
        }

        htmlMonedas += `<div>${j.nombre}: ${j.puntos || 0}</div>`;
        htmlMuertes += `<div>${j.nombre}: ${j.muertes || 0}</div>`;
    });

    // Eliminar únicamente jugadores desconectados.
    Object.keys(elementosJugadores).forEach(id => {
        if (!idsVisibles.has(id)) {
            elementosJugadores[id].remove();
            delete elementosJugadores[id];
            delete memoriaDireccion[id];
            delete inicioCaida[id];
        }
    });

    // 3. Actualizar tablas de puntuación
    if (tablaMonedas) tablaMonedas.innerHTML = htmlMonedas;
    if (tablaMuertes) tablaMuertes.innerHTML = htmlMuertes;

    // 4. Dibujar la moneda usando UN SOLO elemento DOM.
    // Antes se creaba un <div> nuevo en cada tick (~30 veces/segundo),
    // acumulando cientos/miles de monedas fantasma y provocando lag.
    if (moneda && moneda.activa) {
        if (!elementoMoneda) {
            elementoMoneda = document.createElement('div');
            elementoMoneda.className = 'moneda-juego';
            capaPersonajes.appendChild(elementoMoneda);
        }

        if (ultimaPosMoneda &&
            (ultimaPosMoneda.x !== moneda.x || ultimaPosMoneda.y !== moneda.y)) {
            efectoMoneda.currentTime = 0;
            efectoMoneda.play().catch(e => {});
        }

        elementoMoneda.style.left = moneda.x + '%';
        elementoMoneda.style.top = moneda.y + '%';
        elementoMoneda.style.display = '';
        ultimaPosMoneda = { x: moneda.x, y: moneda.y };
        ultimaMonedaRenderizada = { x: moneda.x, y: moneda.y };
    } else if (elementoMoneda) {
        elementoMoneda.style.display = 'none';
        ultimaMonedaRenderizada = null;
    }
}

// ==========================================
// 3. LA QUE LIMPIA Y CIERRA EL JUEGO
// ==========================================
export function desmontarPistaHielo(socket) {
    const contenedor = document.getElementById('contenedor-pista-hielo');
    
    // Apagamos la música y reseteamos variables
    musicaPista.pause();
    musicaPista.currentTime = 0;
    musicaIniciada = false;
    ultimaPosMoneda = null;
    memoriaDireccion = {}; // Limpiamos la memoria al salir
    elementosJugadores = {};
    inicioCaida = {};
    elementoMoneda = null;
    ultimaMonedaRenderizada = null;

    if (contenedor) {
        contenedor.innerHTML = ''; // Limpiamos la pista
        contenedor.style.display = 'none'; // Ocultamos la pantalla
    }
    // 2. Volvemos a encender la música del Lobby
    if (window.reproducirLobby) window.reproducirLobby();
}