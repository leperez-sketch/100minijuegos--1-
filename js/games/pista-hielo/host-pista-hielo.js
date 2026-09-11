import { applyCharacterSprite, getCharacterSkin } from '../../host/sprite-animation.js';

// --- SISTEMA DE AUDIO ---
const musicaPista = new Audio('/sounds/musica-pista-hielo.mp3');
musicaPista.loop = true; // Hacemos que la música se repita infinitamente
let volumenMusicaPista = 0.4;
musicaPista.volume = volumenMusicaPista;

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

            /* TEMPORIZADOR: blanco, grande y con marco verde de alto contraste */
            #timer-pista {
                position: absolute;
                top: 18px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 100;
                min-width: 190px;
                padding: 8px 24px 10px;
                box-sizing: border-box;
                text-align: center;
                font-family: 'HappyTreeFriends', sans-serif;
                font-size: clamp(64px, 4.2vw, 82px);
                line-height: 0.95;
                color: #ffffff;
                background: rgba(5, 12, 14, 0.82);
                border: 5px solid #39ff7a;
                border-radius: 18px;
                box-shadow: 0 0 10px rgba(57,255,122,.9), 0 0 26px rgba(57,255,122,.58), inset 0 0 14px rgba(57,255,122,.16);
                text-shadow: 0 3px 5px rgba(0,0,0,.95), 0 0 7px rgba(255,255,255,.35);
                letter-spacing: 3px;
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

            /* MONEDA: un único elemento DOM, sin duplicación por frame. */
            .moneda-juego {
                position: absolute; width: 46px; height: 46px;
                background: radial-gradient(circle at 35% 30%, #fff8a6 0 12%, #ffe436 13% 42%, #f7a600 43% 72%, #b96500 73% 100%);
                border: 3px solid #fff048;
                border-radius: 50%;
                box-shadow: 0 0 10px #fff38a, 0 0 22px #ffca19;
                transform: translate(-50%, -50%); z-index: 50;
                animation: flotarMoneda 0.8s infinite alternate ease-in-out;
            }
            .moneda-juego::after {
                content: '★'; position: absolute; inset: 0;
                display: grid; place-items: center;
                color: #fff7a8; font: 900 23px/1 Arial, sans-serif;
                text-shadow: 0 2px 0 #c67900;
            }
            @keyframes flotarMoneda {
                from { transform: translate(-50%, -50%) scale(1) rotate(-5deg); }
                to { transform: translate(-50%, -50%) scale(1.12) rotate(5deg); }
            }

            /* CONTROL DE VOLUMEN DE LA MÚSICA */
            #volumen-pista-control {
                position: absolute; right: 30px; bottom: 24px; z-index: 120;
                display: flex; align-items: center; gap: 10px;
                padding: 9px 13px;
                border: 2px solid rgba(255,255,255,.72);
                border-radius: 12px;
                background: rgba(4, 12, 18, .78);
                color: #fff;
                font-family: 'HappyTreeFriends', sans-serif;
                font-size: 18px;
                box-shadow: 0 0 14px rgba(57,255,122,.22);
            }
            #volumen-pista-slider { width: 145px; cursor: pointer; accent-color: #39ff7a; }
            #volumen-pista-valor { min-width: 40px; text-align: right; }
        </style>
        
        <div id="escena-juego">
            <div id="pista-visual"></div>
            <div id="marcador-monedas" class="marcador">💰 MONEDAS</div>
            <div id="timer-pista">0:00</div>
            <div id="marcador-muertes" class="marcador">💀 MUERTES</div>
            <div id="volumen-pista-control">
                <span aria-hidden="true">🔊</span><span>MÚSICA</span>
                <input id="volumen-pista-slider" type="range" min="0" max="1" step="0.05" value="0.4" aria-label="Volumen de música">
                <span id="volumen-pista-valor">40%</span>
            </div>
            <div id="capa-personajes"></div>
        </div>
    `;

    const sliderMusica = document.getElementById('volumen-pista-slider');
    const valorMusica = document.getElementById('volumen-pista-valor');
    if (sliderMusica) {
        sliderMusica.value = String(volumenMusicaPista);
        if (valorMusica) valorMusica.textContent = `${Math.round(volumenMusicaPista * 100)}%`;
        sliderMusica.addEventListener('input', () => {
            volumenMusicaPista = Math.max(0, Math.min(1, Number(sliderMusica.value)));
            musicaPista.volume = volumenMusicaPista;
            if (valorMusica) valorMusica.textContent = `${Math.round(volumenMusicaPista * 100)}%`;
        });
    }
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
                // Los spritesheets originales miran a la derecha.
                if (j.x > memoriaDireccion[j.id].xAnterior + 0.02) memoriaDireccion[j.id].escala = 1;
                else if (j.x < memoriaDireccion[j.id].xAnterior - 0.02) memoriaDireccion[j.id].escala = -1;
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
        pElem.style.setProperty('--flip', memoriaDireccion[j.id].escala);

        const skin = getCharacterSkin(j);
        const moving = !j.cayendo && (Math.abs(j.vx || 0) > 0.04 || Math.abs(j.vy || 0) > 0.04);
        applyCharacterSprite(pElem, {
            skin,
            moving,
            facing: memoriaDireccion[j.id].escala,
            now: performance.now()
        });

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