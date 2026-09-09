const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const GameManager = require('./game-manager');
const LobbyState = require('./lobby-state');
const { startLobbyLoop } = require('./lobby-loop');
const { registerSocketHandlers } = require('./socket-router');

function createServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server);

  const root = path.resolve(__dirname, '..');
  app.use(express.static(root));
  app.get('/', (_req, res) => res.sendFile(path.join(root, 'host.html')));
  app.get('/mando', (_req, res) => res.sendFile(path.join(root, 'mando.html')));

  const lobbyState = new LobbyState();
  const gameManager = new GameManager(io);

  registerSocketHandlers(io, { lobbyState, gameManager });
  startLobbyLoop(io, lobbyState, 30);
  setInterval(() => gameManager.update(), 1000 / 30);

  return { app, server, io, lobbyState, gameManager };
}

function start(port = process.env.PORT || 5000) {
  const instance = createServer();
  instance.server.listen(port, '0.0.0.0', () => {
    console.log(`Servidor escuchando en puerto ${port}`);
  });
  return instance;
}

module.exports = { createServer, start };
