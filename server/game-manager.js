// server/game-manager.js

const PistaHielo = require('./games/pista-hielo.js');

class GameManager {
    constructor(io) {
        this.io = io;
        this.jugadores = {};
        this.fase = 'lobby';
        this.juegoTerminado = false;
    }

    agregarJugador(id, datos) {
        this.jugadores[id] = {
            id: id,
            nombre: datos.nombre,
            skin: datos.skin,
            puntos: 0,
            muertes: 0,
            vx: 0, vy: 0, x: 0, y: 0,
            cayendo: false
        };
    }

    iniciarPistaHielo() {
        this.fase = 'pista-hielo';
        this.juegoTerminado = false;
        // PistaHielo.iniciar repartirá a los jugadores en las 4 esquinas
        this.jugadores = PistaHielo.iniciar(this.jugadores);
        this.io.emit('cambiar-fase', 'pista-hielo');
    }

    update() {
        if (this.fase === 'pista-hielo' && !this.juegoTerminado) {
            const estado = PistaHielo.actualizar(this.jugadores);

            if (estado.terminado && !this.juegoTerminado) {
                this.finalizarJuego();
            } else {
                this.io.emit('estado-pista-hielo', {
                    // EL FIX ESTÁ AQUÍ: Convertimos el diccionario en lista
                    jugadores: Object.values(estado.jugadores), 
                    moneda: estado.moneda,
                    tiempo: estado.tiempo
                });
            }
        }
    }

    finalizarJuego() {
        this.juegoTerminado = true;
        console.log("Juego terminado, volviendo al lobby en 5s...");
    
        const ganador = Object.values(this.jugadores).sort((a,b) => b.puntos - a.puntos)[0];
        this.io.emit('anunciar_ganador', ganador ? `¡GANADOR: ${ganador.nombre}!` : "TIEMPO AGOTADO");
    
        setTimeout(() => {
            this.fase = 'lobby';
            this.juegoTerminado = false;
            this.io.emit('volver_lobby'); // El host y los mandos deben escuchar esto para resetearse
        }, 5000);
    }
}

module.exports = GameManager;