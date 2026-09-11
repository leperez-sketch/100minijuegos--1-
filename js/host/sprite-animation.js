// Animación compartida de personajes para lobby y minijuegos.
// Los spritesheets de carrera están diseñados mirando hacia la DERECHA.
const RUN_SHEETS = {
    noctis: { src: '/img/noctis-run.png', cols: 5, rows: 5, frames: 24, frameMs: 70 },
    dorian: { src: '/img/dorian-run.png', cols: 5, rows: 5, frames: 25, frameMs: 75 }
};

export function getCharacterSkin(player, fallback = 'noctis') {
    return player?.skin || player?.color || player?.personaje || fallback;
}

export function applyCharacterSprite(element, {
    skin,
    moving = false,
    facing = 1,
    now = performance.now()
} = {}) {
    if (!element) return;

    const safeSkin = skin || 'noctis';
    const sheet = RUN_SHEETS[safeSkin];
    const safeFacing = facing < 0 ? -1 : 1;

    // +1 = imagen original mirando a la derecha; -1 = espejo hacia la izquierda.
    element.style.setProperty('--flip', String(safeFacing));

    if (moving && sheet) {
        const frame = Math.floor(now / sheet.frameMs) % sheet.frames;
        const col = frame % sheet.cols;
        const row = Math.floor(frame / sheet.cols);
        const x = sheet.cols > 1 ? (col / (sheet.cols - 1)) * 100 : 0;
        const y = sheet.rows > 1 ? (row / (sheet.rows - 1)) * 100 : 0;

        element.classList.add('sprite-sheet-running');
        element.style.setProperty('background-image', `url('${sheet.src}')`, 'important');
        element.style.setProperty('background-size', `${sheet.cols * 100}% ${sheet.rows * 100}%`, 'important');
        element.style.setProperty('background-position', `${x}% ${y}%`, 'important');
        element.style.setProperty('background-repeat', 'no-repeat', 'important');
        return;
    }

    element.classList.remove('sprite-sheet-running');
    element.style.setProperty('background-image', `url('/img/${safeSkin}.png')`, 'important');
    element.style.setProperty('background-size', 'contain', 'important');
    element.style.setProperty('background-position', 'center bottom', 'important');
    element.style.setProperty('background-repeat', 'no-repeat', 'important');
}

export function hasRunSheet(skin) {
    return Boolean(RUN_SHEETS[skin]);
}
