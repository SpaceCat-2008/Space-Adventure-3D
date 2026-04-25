import { Game } from './game.js';

window.addEventListener('DOMContentLoaded', () => {
    // Inicializar juego. Se mantendrá en estado inactivo hasta que se presione Jugar.
    window.gameInstance = new Game();
});
