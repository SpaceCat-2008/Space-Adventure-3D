// audio.js
// Gestor de sonido seguro (no se rompe si faltan archivos)

export class AudioController {
    constructor() {
        this.enabled = true;
        this.sounds = {
            shoot: new Audio('assets/sounds/shoot.wav'),
            explosion: new Audio('assets/sounds/explosion.wav'),
            bg: new Audio('assets/sounds/bg.mp3')
        };

        // Configurar loop para la música de fondo
        this.sounds.bg.loop = true;
        this.sounds.bg.volume = 0.5;

        // Manejar errores de carga silenciosamente
        Object.values(this.sounds).forEach(audio => {
            audio.addEventListener('error', () => {
                console.warn(`[Audio] No se pudo cargar el archivo: ${audio.src}. Coloca el archivo en la ruta indicada para habilitar este sonido.`);
            });
        });
    }

    play(soundName) {
        if (!this.enabled || !this.sounds[soundName]) return;
        
        try {
            // Clonar nodo para permitir reproducción simultánea rápida (ej. disparos)
            if (soundName !== 'bg') {
                const clone = this.sounds[soundName].cloneNode();
                clone.volume = 0.5;
                clone.play().catch(e => {}); // Ignorar errores si no hay archivo
            } else {
                this.sounds.bg.play().catch(e => {});
            }
        } catch (error) {
            // Falla silenciosa si no existe el archivo localmente
        }
    }

    stop(soundName) {
        if (this.sounds[soundName]) {
            this.sounds[soundName].pause();
            this.sounds[soundName].currentTime = 0;
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        if (!this.enabled) {
            this.stop('bg');
        } else {
            this.play('bg');
        }
        return this.enabled;
    }
}
