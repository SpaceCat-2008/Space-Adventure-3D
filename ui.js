import * as THREE from './three.module.js';

export class UI {
    constructor() {
        this.hpBarInner = document.getElementById('hp-bar-inner');
        this.jetpackBarInner = document.getElementById('jetpack-bar-inner');
        this.weaponBarInner = document.getElementById('weapon-bar-inner');
        this.levelText = document.getElementById('level-text');
        this.partsText = document.getElementById('parts-text');
        this.startScreen = document.getElementById('start-screen');
        this.gameOverScreen = document.getElementById('game-over-screen');
        this.victoryScreen = document.getElementById('victory-screen');
        this.crosshair = document.getElementById('crosshair');

        this._initCrosshair();
    }

    _initCrosshair() {
        document.addEventListener('mousemove', (e) => {
            this.crosshair.style.left = e.clientX + 'px';
            this.crosshair.style.top = e.clientY + 'px';
        });
    }

    updateHealth(currentHp, maxHp) {
        const percent = Math.max(0, (currentHp / maxHp) * 100);
        this.hpBarInner.style.width = percent + '%';
        
        if (percent > 50) {
            this.hpBarInner.style.background = 'linear-gradient(90deg, #00ff88, #00bb55)';
        } else if (percent > 20) {
            this.hpBarInner.style.background = 'linear-gradient(90deg, #ffdd00, #ff8800)';
        } else {
            this.hpBarInner.style.background = 'linear-gradient(90deg, #ff0000, #aa0000)';
        }
    }

    updateJetpack(percent) {
        this.jetpackBarInner.style.width = (percent * 100) + '%';
    }

    updateWeapon(percent) {
        if (this.weaponBarInner) {
            this.weaponBarInner.style.width = (percent * 100) + '%';
        }
    }

    updateLevel(level) {
        this.levelText.innerText = `Nivel: ${level}/5`;
    }

    updateParts(parts) {
        this.partsText.innerText = `Partes: ${parts}`;
    }

    hideStartScreen() {
        this.startScreen.style.display = 'none';
        this.crosshair.style.display = 'block';
    }

    showGameOver() {
        this.gameOverScreen.style.display = 'flex';
        this.crosshair.style.display = 'none';
    }

    hideGameOver() {
        this.gameOverScreen.style.display = 'none';
        this.crosshair.style.display = 'block';
    }

    showVictory() {
        this.victoryScreen.style.display = 'flex';
        this.crosshair.style.display = 'none';
    }
}
