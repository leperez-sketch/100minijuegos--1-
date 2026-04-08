const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

// 1. IMPORTACIONES MODULARES
const GameManager = require('./server/game-manager.js');

app.use(express.static(__dirname));
app.get('/', (req, res) => { res.sendFile(__dirname + '/host.html'); });
app.get('/mando', (req, res) => { res.sendFile(__dirname + '/mando.html'); });

// 2. VARIABLES DE ESTADO
let lobbyPositions = {}; 
const LOBBY_W = 1000;
const LOBBY_FLOOR = 500;
const LOBBY_GRAV = 1;
const LOBBY_JUMP = -15;
const LOBBY_VX = 7;

const TODOS_PERSONAJES = ['rojo','azul','verde','amarillo','morado','naranja','ninja','astronauta','caballero','hada','mecanico','samurai'];

function colorAleatorio() {
  return TODOS_PERSONAJES[Math.floor(Math.random() * TODOS_PERSONAJES.length)];
}

// 3. INICIALIZACIÓN DEL MOTOR
const gm = new GameManager(io);

// --- MONITOR DE FINAL DE JUEGO ---
setInterval(() => {
    if (gm.juegoActivo && gm.tiempoRestante <= 0) {
        gm.juegoActivo = false; 
        let ganador = { nombre: "Nadie", puntos: -1 };
        for (const id in gm.jugadores) {
            if (gm.jugadores[id].puntos > ganador.puntos) {
                ganador = gm.jugadores[id];
            }
        }
        io.emit('anunciar_ganador', `¡GANADOR: ${ganador.nombre}!`);

        setTimeout(() => {
            gm.fase = 'lobby'; 
            io.emit('volver_lobby');
            for (const id in gm.jugadores) {
                gm.jugadores[id].puntos = 0;
                gm.jugadores[id].muertes = 0;
            }
        }, 6000); 
    }
}, 1000);

io.on('connection', (socket) => {
  socket.on('unirse_al_juego', ({ nombre: nombreUsuario, personaje }) => {
    const skinEscogida = personaje || colorAleatorio();
    const numLobby = Object.keys(lobbyPositions).length;
    
    lobbyPositions[socket.id] = {
      nombre: nombreUsuario, 
      color: skinEscogida,
      x: 80 + (numLobby * 160) % (LOBBY_W - 200),
      y: LOBBY_FLOOR, 
      vx: 0, vy: 0, 
      flip: 1, 
      saltando: false
    };

    gm.agregarJugador(socket.id, { nombre: nombreUsuario, skin: skinEscogida });
    io.emit('estado_lobby', lobbyPositions);
  });

  socket.on('host-iniciar-juego', (nombreJuego) => {
    if (nombreJuego === 'pista-hielo') {
      gm.iniciarPistaHielo(); 
      io.emit('cambiar-fase', 'pista-hielo'); 
    }
  });

  socket.on('solicitar_volver_lobby', () => {
    gm.juegoActivo = false;
    gm.fase = 'lobby'; 
    for (const id in gm.jugadores) {
        gm.jugadores[id].vx = 0; gm.jugadores[id].vy = 0;
        gm.jugadores[id].puntos = 0; gm.jugadores[id].muertes = 0;
        gm.jugadores[id].cayendo = false;
    }
    io.emit('volver_lobby');
  });

  socket.on('mover_lobby', ({ dx, dy }) => {
    const l = lobbyPositions[socket.id];
    if (!l) return;
    if (Math.abs(dx) > 0.15) {
        l.vx = dx * LOBBY_VX;
        l.flip = dx > 0 ? 1 : -1;
    } else {
        l.vx *= 0.55;
    }
    if (dy < -0.4 && !l.saltando) {
        l.vy = LOBBY_JUMP;
        l.saltando = true;
    }
  });

  socket.on('mover_joystick', ({ dx, dy }) => {
    const j = gm.jugadores[socket.id];
    if (!j || j.cayendo) return;
    
    // --- DEADZONE (Zona Muerta) ---
    // Calculamos qué tanto se está empujando el joystick
    const magnitud = Math.hypot(dx, dy);
    
    // Si el empuje es muy leve (menor al 20%), lo ignoramos por completo
    if (magnitud < 0.7) {
        return; 
    }

    // Si pasó la zona muerta, aplicamos la velocidad normal
    const VELOCIDAD_BASE = 0.85; 
    j.vx = dx * VELOCIDAD_BASE;
    j.vy = dy * VELOCIDAD_BASE;
  });

  socket.on('disconnect', () => {
    delete lobbyPositions[socket.id];
    delete gm.jugadores[socket.id]; 
    io.emit('estado_lobby', lobbyPositions);
  });
});

// index.js -> 4. BUCLE FÍSICO DEL LOBBY
setInterval(() => {
  for (const id in lobbyPositions) {
    const l = lobbyPositions[id];
    l.vy += LOBBY_GRAV; 
    l.x += l.vx;
    l.y += l.vy;

    if (l.y >= LOBBY_FLOOR) { 
      l.y = LOBBY_FLOOR;
      l.vy = 0;
      l.saltando = false;
    }
    if (!l.saltando) l.vx *= 0.72;
    if (l.x < 50) l.x = 50;
    if (l.x > LOBBY_W - 50) l.x = LOBBY_W - 50;

    // ¡ESTA LÍNEA ES VITAL PARA QUE NO SE QUEDEN PEGADOS ARRIBA!
    l.jumpHeight = Math.max(0, LOBBY_FLOOR - l.y);
  }
  io.emit('estado_lobby', lobbyPositions);
}, 1000 / 30);

// 5. BUCLE GAME MANAGER (Pista de Hielo)
setInterval(() => {
  gm.update(); // Que el GameManager se encargue de todo
}, 1000 / 30);

const PORT = process.env.PORT || 5000;
http.listen(PORT, '0.0.0.0', () => { console.log(`Servidor en puerto: ${PORT}`); });