// utils.js
// Archivo de constantes y funciones de utilidad

export const CONSTANTS = {
    PLAYER: {
        MAX_HP: 100,
        SPEED: 15,
        JUMP_FORCE: 20,
        JETPACK_FORCE: 30,
        JETPACK_MAX_TIME: 2000, // 2 segundos
        JETPACK_RECHARGE_TIME: 2000,
        WIDTH: 1,
        HEIGHT: 2,
        DEPTH: 1
    },
    BULLET: {
        SPEED: 50,
        LIFETIME: 2000, // ms
        DAMAGE: 1 // Usado para calcular "hits para matar" a enemigos
    },
    ENEMY: {
        SMALL: { HP: 1, DAMAGE: 10, SPEED: 5, SCORE: 10, SIZE: 1, COLOR: 0xff0000 },
        MEDIUM: { HP: 2, DAMAGE: 15, SPEED: 4, SCORE: 20, SIZE: 1.5, COLOR: 0xff8800 },
        LARGE: { HP: 3, DAMAGE: 20, SPEED: 3, SCORE: 30, SIZE: 2, COLOR: 0xaa0000 },
        BOSS: { HP: 5, DAMAGE: 20, SPEED: 6, SCORE: 100, SIZE: 3, COLOR: 0x550000 },
        FINAL_BOSS: { HP: 50, DAMAGE: 30, SPEED: 10, SCORE: 1000, SIZE: 6, COLOR: 0xff00ff }
    },
    LEVEL: {
        GRAVITY: -50,
        FLOOR_Y: 0,
        TOTAL_LEVELS: 5
    }
};

export const MathUtils = {
    lerp: (a, b, t) => a + (b - a) * t,
    clamp: (val, min, max) => Math.max(min, Math.min(max, val)),
    randFloat: (min, max) => Math.random() * (max - min) + min,
    randInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
};
