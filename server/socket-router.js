function registerSocketHandlers(io, { lobbyState, gameManager }) {
  io.on('connection', (socket) => {
    socket.on('unirse_al_juego', ({ nombre: nombreUsuario, personaje } = {}) => {
      const nombre = String(nombreUsuario || 'Jugador').slice(0, 20);
      const skin = lobbyState.addPlayer(socket.id, { nombre, personaje });
      gameManager.agregarJugador(socket.id, { nombre, skin });
      io.emit('estado_lobby', lobbyState.positions);
    });

    socket.on('host-iniciar-juego', (nombreJuego) => {
      gameManager.iniciarJuego(nombreJuego);
    });

    socket.on('solicitar_volver_lobby', () => {
      gameManager.volverAlLobby();
      io.emit('volver_lobby');
      io.emit('estado_lobby', lobbyState.positions);
    });

    socket.on('mover_lobby', (input = {}) => {
      lobbyState.move(socket.id, input);
    });

    socket.on('mover_joystick', ({ dx = 0, dy = 0 } = {}) => {
      gameManager.moverJugador(socket.id, dx, dy);
    });

    socket.on('disconnect', () => {
      lobbyState.removePlayer(socket.id);
      gameManager.eliminarJugador(socket.id);
      io.emit('estado_lobby', lobbyState.positions);
    });
  });
}

module.exports = { registerSocketHandlers };
