// CHIVATO DE CONSOLA: Si no ves esto al presionar F12, la importación de abajo está fallando.
        console.log("🟢 host.html: Inicializando script...");

        import { renderizarPistaHielo, montarPistaHielo, desmontarPistaHielo } from '../games/pista-hielo/host-pista-hielo.js';  

        const pantallaInicio = document.getElementById('pantalla-inicio');
const listaJugadores = document.getElementById('lobby-lista-jugadores');
const pantallaBienvenida = document.getElementById('pantalla-bienvenida');
const overlayFlash = document.getElementById('overlay-flash');
const letsGoSign = document.getElementById('letsgo-sign');

const audioLobby = new Audio('/sounds/musica-lobby.mp3'); 
audioLobby.loop = true; 
audioLobby.volume = 0.5;

// LAS FUNCIONES GLOBALES PARA APAGAR/PRENDER EL LOBBY
window.pausarLobby = () => {
    audioLobby.pause();
};

window.reproducirLobby = () => {
    audioLobby.play().catch(e => console.log("Esperando interacción para el lobby"));
};

const audioLetsGo = new Audio('/sounds/lets-go.mp3'); audioLetsGo.volume = 0.85;
const audioIntro = new Audio('/sounds/super_party_intro.mp3'); audioIntro.loop = true; audioIntro.volume = 0.65;
const audioWelcomeButton = new Audio('/sounds/welcome_button.mp3'); audioWelcomeButton.volume = 0.85;

        const bienvenidaTexto = document.getElementById('bienvenida-texto');
        let introStep = 0; 
        let introTerminada = false;

        function cerrarPantallaBienvenida() {
            if (introTerminada) return;
            introTerminada = true;
            audioIntro.pause(); audioIntro.currentTime = 0;
            pantallaBienvenida.style.transition = 'opacity 0.45s ease';
            pantallaBienvenida.style.opacity = '0';
            setTimeout(() => {
                pantallaBienvenida.style.display = 'none';
                audioLobby.play().catch(() => {});
            }, 450);
        }

        function manejarIntroInput() {
            if (introTerminada) return;
            if (introStep === 0) {
                introStep = 1;
                audioIntro.currentTime = 0; audioIntro.play().catch(() => {});
                bienvenidaTexto.textContent = 'Presiona cualquier botón para continuar';
                return; // AQUÍ SE DETIENE HASTA EL SEGUNDO CLIC
            }
            audioWelcomeButton.currentTime = 0; audioWelcomeButton.play().catch(() => {});
            cerrarPantallaBienvenida();
            
        }

        document.addEventListener('keydown', manejarIntroInput);
        document.addEventListener('click', manejarIntroInput);

        const mandoURL = window.location.origin + '/mando';
        document.getElementById('qr-inicio-url').textContent = mandoURL;
        if (typeof QRCode !== 'undefined') {
            new QRCode(document.getElementById('qr-inicio'), { text: mandoURL, width: 140, height: 140, colorDark: '#000', colorLight: '#fff', correctLevel: QRCode.CorrectLevel.M });
        }

        const socket = typeof io !== 'undefined' ? io() : null;

        const juegos = [{ nombre: 'Patinaje sobre Hielo', imagen: '/img/book-display.png' }];
        let juegoIdx = 0; let cartridgeAnimating = false;
        function actualizarSelector() {
            document.getElementById('game-name').textContent = juegos[juegoIdx].nombre;
            document.getElementById('cartridge-img').src = juegos[juegoIdx].imagen;
        }
        actualizarSelector();

        function switchCartridge(dir) {
            if (cartridgeAnimating) return;
            cartridgeAnimating = true;
            juegoIdx = (juegoIdx + dir + juegos.length) % juegos.length;
            actualizarSelector();
            setTimeout(() => { cartridgeAnimating = false; }, 200);
        }
        document.getElementById('btn-prev-game').onclick = () => switchCartridge(-1);
        document.getElementById('btn-next-game').onclick = () => switchCartridge(1);

        const btnVolOn = document.getElementById('btn-vol-off');
        const btnVolOff = document.getElementById('btn-vol-on');
        const volSliderLobby = document.getElementById('vol-slider-lobby');
        let lobbyMuted = false; let lobbyVolPrev = 0.5;

        function setLobbyMute(muted) {
            lobbyMuted = muted;
            if (muted) { lobbyVolPrev = audioLobby.volume || 0.5; audioLobby.volume = 0; volSliderLobby.value = 0; } 
            else { audioLobby.volume = lobbyVolPrev; volSliderLobby.value = lobbyVolPrev; }
        }
        btnVolOn.onclick = () => setLobbyMute(true);
        btnVolOff.onclick = () => setLobbyMute(false);
        volSliderLobby.addEventListener('input', () => {
            audioLobby.volume = parseFloat(volSliderLobby.value);
            if (audioLobby.volume === 0 !== lobbyMuted) { lobbyMuted = (audioLobby.volume === 0); }
        });

        document.getElementById("btn-iniciar").onclick = (e) => {
            e.preventDefault(); 
            const cartImg = document.getElementById("cartridge-img");
            cartImg.classList.remove("glowing"); void cartImg.offsetWidth; cartImg.classList.add("glowing");
            audioLetsGo.currentTime = 0; audioLetsGo.play().catch(() => {});
            overlayFlash.style.opacity = "1"; overlayFlash.style.pointerEvents = "all";

            setTimeout(() => {
                document.getElementById('pantalla-inicio').style.display = 'none'; 
                document.getElementById('contenedor-pista-hielo').style.display = 'flex';
                montarPistaHielo(socket); // <--- Llama a la función para que inyecte el HTML
                socket?.emit("host-iniciar-juego", "pista-hielo");
            }, 700);

            setTimeout(() => {
                overlayFlash.style.transition = "opacity 0.5s ease-out"; overlayFlash.style.opacity = "0";
                if (typeof letsGoSign !== 'undefined') letsGoSign.classList.remove("visible");
                setTimeout(() => { overlayFlash.style.transition = "opacity 0.35s ease-in"; overlayFlash.style.pointerEvents = "none"; }, 520);
            }, 1100);
        };

        const lobbyContenedor = document.getElementById('lobby-personajes');
const LOBBY_W = 1000; 
const lobbyEls = {};

if (socket) {
    // --- EVENTO: ESTADO DEL LOBBY ---
    socket.on('estado_lobby', (posiciones) => {
        // Actualizar lista de nombres
        if (typeof listaJugadores !== 'undefined' && listaJugadores) {
            listaJugadores.innerHTML = '';
            for (const id in posiciones) {
                const row = document.createElement('div'); 
                row.className = 'fila-jugador';
                row.innerHTML = `<span class="jug-nombre">${posiciones[id].nombre}</span>`;
                listaJugadores.appendChild(row);
            }
        }

        const seen = new Set();
        for (const id in posiciones) {
            const l = posiciones[id]; 
            seen.add(id);
            const moving = Math.abs(l.vx) > 0.4; 
            const estado = (l.saltando || moving) ? 'caminando' : 'idle';
            
            if (!lobbyEls[id]) {
                const wrap = document.createElement('div'); 
                wrap.className = 'lobby-jugador-wrap';
                const label = document.createElement('div'); 
                label.className = 'lobby-etiqueta';
                const sprite = document.createElement('div');
                sprite.id = `sprite-${id}`;
                wrap.appendChild(label); 
                wrap.appendChild(sprite); 
                lobbyContenedor.appendChild(wrap);
                lobbyEls[id] = { wrap, sprite, label, ultimoPersonaje: '' };
            }
            
            const { wrap, sprite, label } = lobbyEls[id];
            label.textContent = l.nombre;
            
            if (lobbyEls[id].ultimoPersonaje !== l.color) {
                lobbyEls[id].ultimoPersonaje = l.color; 
                sprite.className = 'sprite-personaje lobby-sprite';
                sprite.style.backgroundImage = `url('/img/${l.color}.png')`;
            }

            // POSICIONAMIENTO RESPONSIVO (Sin muros invisibles)
            const xPct = (l.x / LOBBY_W) * 100;
            const saltoReal = l.jumpHeight || 0;
            const jumpPx = Math.round(saltoReal * 0.85);

            wrap.style.left = xPct + '%';
            wrap.style.bottom = `calc(0vh + ${jumpPx}px)`; // cambiar distancia del suelo
            wrap.style.top = 'auto'; 
            wrap.style.transform = 'translate(-50%, 0)';

            const baseClasses = sprite.className.split(' ').filter(c => !['idle', 'caminando'].includes(c)).join(' ');
            sprite.className = baseClasses + ' ' + estado;
            sprite.style.setProperty('--flip', l.vx >= 0 ? -1 : 1);
        }

        // Limpieza de desconectados
        for (const id in lobbyEls) {
            if (!seen.has(id)) { 
                lobbyEls[id].wrap.remove(); 
                delete lobbyEls[id]; 
            }
        }
    });


    // --- ESCUCHA ACTIVA DEL JUEGO ---
    socket.on('estado-pista-hielo', (data) => {
            // Este evento se recibe muchas veces por segundo desde el servidor
            // data contiene: { jugadores: [], moneda: {}, tiempo: 120 }
            
            const contenedor = document.getElementById('contenedor-pista-hielo');
            
            // Solo renderizamos si el juego está visible en pantalla
            if (contenedor && contenedor.style.display !== 'none') {
                renderizarPistaHielo(data.jugadores, data.moneda, data.tiempo);
            }
        });




    // --- EVENTO: ANUNCIAR GANADOR ---
    socket.on('anunciar_ganador', (msg) => {
        const old = document.getElementById('anuncio-final');
        if (old) old.remove();

        const div = document.createElement('div');
        div.id = "anuncio-final";
        div.style = "position:fixed; inset:0; background:rgba(0,0,0,0.95); color:gold; display:flex; flex-direction:column; align-items:center; justify-content:center; z-index:10000;";
        
        div.innerHTML = `
            <h1 style="font-size:80px; margin-bottom:20px;">${msg}</h1>
            <button id="btn-volver-manual" style="padding:20px 50px; font-size:30px; cursor:pointer; background:white; border:none; border-radius:10px; font-weight:bold;">
                VOLVER AL LOBBY
            </button>
        `;
        document.body.appendChild(div);

        document.getElementById('btn-volver-manual').onclick = () => {
            socket.emit('solicitar_volver_lobby');
        };
    });

    // --- EVENTO: VOLVER AL LOBBY ---
    socket.on('volver_lobby', () => {
        const anuncio = document.getElementById('anuncio-final');
        if (anuncio) anuncio.remove();

        desmontarPistaHielo(socket); // <--- Elimina todo el HTML y los eventos de memoria

        document.getElementById('pantalla-inicio').style.display = 'flex';
    });
}
