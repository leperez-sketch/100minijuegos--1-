function startLobbyLoop(io, lobbyState, fps = 30) {
  const interval = 1000 / fps;
  return setInterval(() => {
    const positions = lobbyState.update();
    io.emit('estado_lobby', positions);
  }, interval);
}

module.exports = { startLobbyLoop };
