// js/host/main.js
import { cargarEstilosPista } from '../games/pista-hielo/host-pista-hielo.js';

// Inicializamos la conexión con el servidor
const socket = io();

// 1. CAPTURAR EL CLIC DEL BOTÓN INICIAR
const btnIniciar = document.getElementById('btn-iniciar');

if (btnIniciar) {
    btnIniciar.addEventListener('click', () => {
        console.log("¡Botón Iniciar presionado!");
        
        // Como aún no programamos el "carrusel" de juegos (game-selector),
        // por ahora forzaremos a que siempre elija la pista de hielo para probar.
        const juegoSeleccionado = 'pista-hielo'; 
        
        // Le enviamos la orden al servidor
        socket.emit('host-iniciar-juego', juegoSeleccionado);
    });
}

// 2. ESCUCHAR LA ORDEN DEL SERVIDOR PARA CAMBIAR DE PANTALLA
socket.on('cambiar-fase', (data) => {
    console.log("Cambiando a fase:", data.fase);

    if (data.fase === 'pista-hielo') {
        // A. Cargamos el CSS de la pista
        cargarEstilosPista();

        // B. Apagamos el Lobby
        document.getElementById('pantalla-inicio').style.display = 'none';

        // C. Encendemos la Pista
        document.getElementById('contenedor-pista-hielo').style.display = 'block';
    }
});