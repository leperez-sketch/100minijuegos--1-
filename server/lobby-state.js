const LOBBY_W = 1000;
const LOBBY_FLOOR = 500;
const LOBBY_GRAV = 1;
const LOBBY_JUMP = -15;
const LOBBY_VX = 7;

const TODOS_PERSONAJES = [
  'rojo','azul','verde','amarillo','morado','naranja',
  'ninja','astronauta','caballero','hada','mecanico','samurai'
];

class LobbyState {
  constructor() {
    this.positions = {};
  }

  colorAleatorio() {
    return TODOS_PERSONAJES[Math.floor(Math.random() * TODOS_PERSONAJES.length)];
  }

  addPlayer(id, { nombre, personaje }) {
    const skin = personaje || this.colorAleatorio();
    const count = Object.keys(this.positions).length;
    this.positions[id] = {
      nombre,
      color: skin,
      x: 80 + (count * 160) % (LOBBY_W - 200),
      y: LOBBY_FLOOR,
      vx: 0,
      vy: 0,
      flip: 1,
      saltando: false,
      jumpHeight: 0
    };
    return skin;
  }

  removePlayer(id) {
    delete this.positions[id];
  }

  move(id, { dx = 0, dy = 0 }) {
    const player = this.positions[id];
    if (!player) return;

    if (Math.abs(dx) > 0.15) {
      player.vx = dx * LOBBY_VX;
      player.flip = dx > 0 ? 1 : -1;
    } else {
      player.vx *= 0.55;
    }

    if (dy < -0.4 && !player.saltando) {
      player.vy = LOBBY_JUMP;
      player.saltando = true;
    }
  }

  update() {
    for (const id in this.positions) {
      const player = this.positions[id];
      player.vy += LOBBY_GRAV;
      player.x += player.vx;
      player.y += player.vy;

      if (player.y >= LOBBY_FLOOR) {
        player.y = LOBBY_FLOOR;
        player.vy = 0;
        player.saltando = false;
      }

      if (!player.saltando) player.vx *= 0.72;
      player.x = Math.max(50, Math.min(LOBBY_W - 50, player.x));
      player.jumpHeight = Math.max(0, LOBBY_FLOOR - player.y);
    }

    return this.positions;
  }
}

module.exports = LobbyState;
