import * as THREE from './three.module.js';
import { CONSTANTS, MathUtils } from './utils.js';
import { Enemy } from './enemy.js';

export class Level {
    constructor(scene, gameObj) {
        this.scene = scene;
        this.game = gameObj;
        this.currentLevel = 1;
        this.length = 200; // Longitud base del nivel en X
        
        this.platforms = [];
        this.enemiesToSpawn = [];
        this.shipPart = null;
        this.bossActive = false;

        this.floorMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.9 });
        this.platformMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.8 });

        this.generateLevel();
    }

    generateLevel() {
        this.cleanUp();
        
        const numPlatforms = 5 + this.currentLevel * 2;
        const numEnemies = 5 + (this.currentLevel * 5); // Dificultad progresiva
        
        // Ajustar longitud para asegurar espacio para todo sin superposición
        this.length = Math.max(150 + (this.currentLevel * 50), 40 + (numPlatforms * 20), 40 + (numEnemies * 25));
        
        this.bossActive = false;
        
        // Suelo principal
        const floorGeo = new THREE.BoxGeometry(this.length, 2, 10);
        this.floor = new THREE.Mesh(floorGeo, this.floorMat);
        this.floor.position.set(this.length / 2 - 10, CONSTANTS.LEVEL.FLOOR_Y - 1, 0);
        this.floor.receiveShadow = true;
        this.scene.add(this.floor);

        // Plataformas móviles
        let lastPlatformEndX = 10;
        for (let i = 0; i < numPlatforms; i++) {
            const width = MathUtils.randFloat(3, 8);
            const space = MathUtils.randFloat(10, 18); // Mantener distancia mínima y separación clara
            const spawnX = lastPlatformEndX + space + (width / 2);
            lastPlatformEndX = spawnX + (width / 2);

            const platGeo = new THREE.BoxGeometry(width, 1, 3);
            const plat = new THREE.Mesh(platGeo, this.platformMat);
            plat.position.set(
                spawnX,
                MathUtils.randFloat(2, 10),
                0
            );
            plat.receiveShadow = true;
            plat.castShadow = true;
            
            this.platforms.push({
                mesh: plat,
                minY: plat.position.y - 2,
                maxY: plat.position.y + 4,
                speed: MathUtils.randFloat(1, 3),
                dir: 1
            });
            this.scene.add(plat);
        }

        // Programar spawn de enemigos a lo largo del nivel
        let lastEnemyX = 20;
        for (let i = 0; i < numEnemies; i++) {
            // Distribuir para evitar grupos (min 15 a 25 unidades de distancia)
            const spawnX = lastEnemyX + MathUtils.randFloat(15, 25);
            lastEnemyX = spawnX;
            
            let type = 'SMALL';
            const rand = Math.random();
            if (this.currentLevel > 1 && rand > 0.6) type = 'MEDIUM';
            if (this.currentLevel > 2 && rand > 0.85) type = 'LARGE';

            this.enemiesToSpawn.push({ x: spawnX, type: type, spawned: false });
        }
    }

    update(delta, playerPos) {
        // Mover plataformas
        this.platforms.forEach(p => {
            p.mesh.position.y += p.speed * p.dir * delta;
            if (p.mesh.position.y > p.maxY) { p.mesh.position.y = p.maxY; p.dir = -1; }
            if (p.mesh.position.y < p.minY) { p.mesh.position.y = p.minY; p.dir = 1; }
        });

        // Spawn progresivo basado en la posición del jugador
        this.enemiesToSpawn.forEach(e => {
            if (!e.spawned && playerPos.x > e.x - 40) { // Spawnear cuando esté a 40 unidades
                e.spawned = true;
                const enemy = new Enemy(this.scene, e.type, new THREE.Vector3(e.x, 2, 0));
                this.game.enemies.push(enemy);
            }
        });

        // Trigger jefe final de nivel
        if (!this.bossActive && playerPos.x > this.length - 20) {
            this.bossActive = true;
            const boss = new Enemy(this.scene, 'BOSS', new THREE.Vector3(this.length, 3, 0));
            // Ajustar HP del boss si se desea escalar por nivel, pero el requerimiento 
            // pidió 5 hits fijos, lo dejaremos con los stats del CONSTANTS.
            this.game.enemies.push(boss);
        }

        // Rotar parte de nave si existe
        if (this.shipPart) {
            this.shipPart.rotation.y += delta;
        }
    }

    spawnShipPart(position) {
        const geo = new THREE.OctahedronGeometry(1);
        const mat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 1, roughness: 0.1 });
        this.shipPart = new THREE.Mesh(geo, mat);
        this.shipPart.position.copy(position);
        this.shipPart.position.y += 1;
        
        // Luz brillante
        const light = new THREE.PointLight(0xffaa00, 2, 10);
        this.shipPart.add(light);

        this.scene.add(this.shipPart);
    }

    cleanUp() {
        if (this.floor) {
            this.scene.remove(this.floor);
            this.floor.geometry.dispose();
            this.floor.material.dispose();
        }
        this.platforms.forEach(p => {
            this.scene.remove(p.mesh);
            p.mesh.geometry.dispose();
        });
        this.platforms = [];
        this.enemiesToSpawn = [];
        if (this.shipPart) {
            this.scene.remove(this.shipPart);
            this.shipPart.geometry.dispose();
            this.shipPart.material.dispose();
            this.shipPart = null;
        }
    }

    nextLevel() {
        this.currentLevel++;
        if (this.currentLevel > CONSTANTS.LEVEL.TOTAL_LEVELS) {
            return false; // Juego terminado / Victoria
        }
        this.generateLevel();
        return true;
    }
}

