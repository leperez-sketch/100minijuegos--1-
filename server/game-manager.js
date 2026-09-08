const PistaHielo = require('./games/pista-hielo.js');

const JUEGOS = {
  'pista-hielo': PistaHielo
};

class GameManager {
  constructor(io) {
    this.io = io;
    this.jugadores = {};
    this.fase = 'lobby';
    this.juegoTerminado = false;
    this.juegoActual = null;
    this.finalizacionProgramada = null;
  }

  agregarJugador(id, datos) {
    this.jugadores[id] = {
      id,
      nombre: datos.nombre,
      skin: datos.skin,
      puntos: 0,
      muertes: 0,
      vx: 0,
      vy: 0,
      x: 0,
      y: 0,
      cayendo: false
    };
  }

  eliminarJugador(id) {
    delete this.jugadores[id];
  }

  iniciarJuego(nombreJuego) {
    const juego = JUEGOS[nombreJuego];
    if (!juego) {
      console.warn(`Juego no registrado: ${nombreJuego}`);
      return false;
    }

    if (this.fase !== 'lobby') return false;

    this.fase = nombreJuego;
    this.juegoActual = juego;
    this.juegoTerminado = false;
    this.jugadores = juego.iniciar(this.jugadores);

    // Contrato único: todos los clientes reciben un objeto.
    this.io.emit('cambiar-fase', { fase: nombreJuego });
    return true;
  }

  moverJugador(id, dx, dy) {
    const jugador = this.jugadores[id];
    if (!jugador || jugador.cayendo || this.fase === 'lobby') return;

    const magnitud = Math.hypot(dx, dy);
    if (magnitud < 0.7) return;

    const velocidadBase = 0.85;
    jugador.vx = dx * velocidadBase;
    jugador.vy = dy * velocidadBase;
  }

  update() {
    if (!this.juegoActual || this.fase === 'lobby' || this.juegoTerminado) return;

    const estado = this.juegoActual.actualizar(this.jugadores);

    if (estado.terminado) {
      this.finalizarJuego();
      return;
    }

    this.io.emit(`estado-${this.fase}`, {
      jugadores: Object.values(estado.jugadores),
      moneda: estado.moneda,
      tiempo: estado.tiempo
    });
  }

  finalizarJuego() {
    if (this.juegoTerminado) return;
    this.juegoTerminado = true;

    const jugadores = Object.values(this.jugadores);
    const ganador = jugadores.sort((a, b) => b.puntos - a.puntos)[0];
    this.io.emit(
      'anunciar_ganador',
      ganador ? `¡GANADOR: ${ganador.nombre}!` : 'TIEMPO AGOTADO'
    );

    clearTimeout(this.finalizacionProgramada);
    this.finalizacionProgramada = setTimeout(() => {
      this.volverAlLobby();
      this.io.emit('volver_lobby');
    }, 5000);
  }

  volverAlLobby() {
    clearTimeout(this.finalizacionProgramada);
    this.finalizacionProgramada = null;

    this.fase = 'lobby';
    this.juegoActual = null;
    this.juegoTerminado = false;

    for (const jugador of Object.values(this.jugadores)) {
      jugador.vx = 0;
      jugador.vy = 0;
      jugador.puntos = 0;
      jugador.muertes = 0;
      jugador.cayendo = false;
    }
  }
}

module.exports = GameManager;
