import * as THREE from './three.module.js';
import { CONSTANTS } from './utils.js';
import { AudioController } from './audio.js';
import { UI } from './ui.js';
import { Player } from './player.js';
import { Level } from './level.js';

export class Game {
    constructor() {
        this.audio = new AudioController();
        this.ui = new UI();
        
        this.input = {
            keys: {},
            mouse: new THREE.Vector2(),
            isClicking: false
        };
        
        this.enemies = [];
        this.playerBullets = [];
        this.enemyBullets = [];
        this.collectedParts = 0;
        
        this.clock = new THREE.Clock();
        this.isRunning = false;

        this._initThreeJS();
        this._initEvents();
    }

    _initThreeJS() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050510);
        this.scene.fog = new THREE.Fog(0x050510, 20, 80);

        // Estrellas de fondo
        const starsGeo = new THREE.BufferGeometry();
        const starsCount = 1000;
        const posArray = new Float32Array(starsCount * 3);
        for(let i=0; i<starsCount*3; i++) {
            posArray[i] = (Math.random() - 0.5) * 200;
        }
        starsGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        const starsMat = new THREE.PointsMaterial({size: 0.1, color: 0xffffff});
        this.starsMesh = new THREE.Points(starsGeo, starsMat);
        this.starsMesh.position.z = -20;
        this.scene.add(this.starsMesh);

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 5, 20);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);

        // Luces
        const ambient = new THREE.AmbientLight(0x404040, 1);
        this.scene.add(ambient);

        this.dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
        this.dirLight.position.set(50, 100, 50);
        this.dirLight.castShadow = true;
        this.dirLight.shadow.camera.left = -50;
        this.dirLight.shadow.camera.right = 50;
        this.dirLight.shadow.camera.top = 50;
        this.dirLight.shadow.camera.bottom = -50;
        this.scene.add(this.dirLight);
    }

    _initEvents() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        window.addEventListener('keydown', (e) => this.input.keys[e.code] = true);
        window.addEventListener('keyup', (e) => this.input.keys[e.code] = false);

        window.addEventListener('mousemove', (e) => {
            // Normalizar coordenadas del mouse de -1 a 1
            this.input.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.input.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        });

        window.addEventListener('mousedown', (e) => {
            if (e.button === 0 && this.isRunning) {
                this.shoot();
            }
        });

        document.getElementById('btn-play').addEventListener('click', () => {
            this.start();
        });

        document.getElementById('btn-restart').addEventListener('click', () => {
            this.resetLevel();
            this.ui.hideGameOver();
            this.isRunning = true;
        });
    }

    start() {
        this.ui.hideStartScreen();
        this.player = new Player(this.scene, this.ui);
        this.level = new Level(this.scene, this);
        
        this.ui.updateLevel(this.level.currentLevel);
        this.ui.updateParts(this.collectedParts);
        
        this.audio.play('bg');
        this.isRunning = true;
        this.clock.start();
        this.loop();
    }

    resetLevel() {
        // Limpiar balas y enemigos
        this.playerBullets.forEach(b => b.destroy());
        this.enemyBullets.forEach(b => b.destroy());
        this.enemies.forEach(e => e.destroy());
        this.playerBullets = [];
        this.enemyBullets = [];
        this.enemies = [];

        // Reset player
        this.player.mesh.position.set(0, 5, 0);
        this.player.velocity.set(0,0,0);
        this.player.hp = CONSTANTS.PLAYER.MAX_HP;
        this.player.jetpackEnergy = CONSTANTS.PLAYER.JETPACK_MAX_TIME;
        this.ui.updateHealth(this.player.hp, CONSTANTS.PLAYER.MAX_HP);
        
        // Regenerar el mismo nivel
        this.level.generateLevel();
    }

    shoot() {
        // Proyectar mouse al plano Z=0
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(this.input.mouse, this.camera);
        const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        const target = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, target);

        if (target) {
            const bullet = this.player.shoot(target);
            this.playerBullets.push(bullet);
            this.audio.play('shoot');
        }
    }

    checkCollisions() {
        // Bala Jugador vs Enemigos
        for (let i = this.playerBullets.length - 1; i >= 0; i--) {
            const b = this.playerBullets[i];
            if (!b.active) continue;
            
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const e = this.enemies[j];
                if (!e.active) continue;

                // Colisión simple por distancia
                if (b.mesh.position.distanceTo(e.mesh.position) < e.config.SIZE) {
                    b.destroy();
                    e.takeDamage(CONSTANTS.BULLET.DAMAGE); // 1 hit
                    
                    if (e.hp <= 0) {
                        this.audio.play('explosion');
                        if (e.typeStr === 'BOSS') {
                            this.level.spawnShipPart(e.mesh.position);
                        }
                    }
                    break; // La bala ya colisionó
                }
            }
        }

        // Bala Enemigo vs Jugador
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            const b = this.enemyBullets[i];
            if (!b.active) continue;

            // El jugador es más alto, usamos hitbox aproximada
            const dist = b.mesh.position.distanceTo(this.player.mesh.position);
            if (dist < 1.2) {
                b.destroy();
                // ¿Cuánto daño? Podríamos guardar el tipo de enemigo en la bala, pero
                // como simplificación asignaremos un daño fijo o buscar quién disparó.
                // Como las balas no guardan su originador, daremos un daño estándar
                // o iteramos balas con daño adjunto. Añadamos daño fijo medio (15) si no hay origen.
                this.player.takeDamage(15);
            }
        }

        // Enemigo toca al jugador
        this.enemies.forEach(e => {
            if (e.active && e.mesh.position.distanceTo(this.player.mesh.position) < e.config.SIZE + 0.5) {
                // Empujar al jugador un poco para evitar daño continuo instantáneo
                this.player.takeDamage(e.config.DAMAGE);
                this.player.velocity.y = 10;
                this.player.velocity.x = (this.player.mesh.position.x - e.mesh.position.x) * 5;
            }
        });

        // Plataformas vs Jugador
        this.player.isGrounded = false;
        if (this.player.velocity.y <= 0) {
            this.level.platforms.forEach(p => {
                // Chequear si cae sobre la plataforma
                if (Math.abs(this.player.mesh.position.x - p.mesh.position.x) < p.mesh.geometry.parameters.width / 2 + 0.4) {
                    if (this.player.mesh.position.y - 0.6 >= p.mesh.position.y && 
                        this.player.mesh.position.y - 0.6 + this.player.velocity.y * 0.016 <= p.mesh.position.y + 0.5) {
                        this.player.mesh.position.y = p.mesh.position.y + 0.5 + 0.6;
                        this.player.velocity.y = p.speed * p.dir; // Mover con la plataforma
                        this.player.isGrounded = true;
                    }
                }
            });
        }

        // Recoger parte de nave
        if (this.level.shipPart && this.player.mesh.position.distanceTo(this.level.shipPart.position) < 2) {
            this.collectedParts++;
            this.ui.updateParts(this.collectedParts);
            
            if (this.level.nextLevel()) {
                // Reset pos jugador
                this.player.mesh.position.set(0, 5, 0);
                this.player.velocity.set(0,0,0);
                this.ui.updateLevel(this.level.currentLevel);
                // Limpiar enemigos residuales
                this.enemies.forEach(e => e.destroy());
                this.enemies = [];
            } else {
                // Victoria
                this.isRunning = false;
                this.ui.showVictory();
            }
        }

        // Lógica de muerte
        if (this.player.hp <= 0) {
            this.isRunning = false;
            this.ui.showGameOver();
        }
    }

    loop() {
        if (!this.isRunning) return;
        requestAnimationFrame(() => this.loop());

        const delta = Math.min(this.clock.getDelta(), 0.1); // Cap delta a 0.1s para evitar fallos si la tab se oculta

        this.player.update(delta, this.input);
        this.level.update(delta, this.player.mesh.position);

        // Actualizar entidades
        this.enemies = this.enemies.filter(e => e.active);
        this.enemies.forEach(e => e.update(delta, this.player.mesh.position, this));

        this.playerBullets = this.playerBullets.filter(b => b.active);
        this.playerBullets.forEach(b => b.update(delta));

        this.enemyBullets = this.enemyBullets.filter(b => b.active);
        this.enemyBullets.forEach(b => b.update(delta));

        this.checkCollisions();

        // Cámara sigue al jugador
        this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, this.player.mesh.position.x + 5, delta * 5);
        this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, Math.max(5, this.player.mesh.position.y + 2), delta * 5);
        this.camera.lookAt(this.camera.position.x, this.camera.position.y - 2, 0);

        // Luz sigue al jugador para sombras dinámicas locales
        this.dirLight.position.x = this.player.mesh.position.x + 10;

        // Limitar jugador al nivel por la izquierda
        if (this.player.mesh.position.x < -10) this.player.mesh.position.x = -10;

        // Render
        this.renderer.render(this.scene, this.camera);
    }
}
