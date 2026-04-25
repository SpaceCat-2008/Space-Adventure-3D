import * as THREE from '../libs/three.module.js';
import { CONSTANTS } from './utils.js';
import { Bullet } from './bullet.js';

export class Player {
    constructor(scene, ui) {
        this.scene = scene;
        this.ui = ui; // Referencia a UI para actualizar barras
        
        this.hp = CONSTANTS.PLAYER.MAX_HP;
        this.jetpackEnergy = CONSTANTS.PLAYER.JETPACK_MAX_TIME;
        this.isJetpackActive = false;
        
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.isGrounded = false;
        this.canJump = true;
        
        this._createMesh();
    }

    _createMesh() {
        this.mesh = new THREE.Group();

        // Materiales
        const suitMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.1 });
        const visorMat = new THREE.MeshStandardMaterial({ color: 0x00aaff, roughness: 0.1, metalness: 0.8 });
        const packMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.5 });

        // Cuerpo principal
        const bodyGeo = new THREE.CylinderGeometry(0.4, 0.4, 1.2, 16);
        const body = new THREE.Mesh(bodyGeo, suitMat);
        body.position.y = 0.6;
        body.castShadow = true;

        // Cabeza (Casco)
        const headGeo = new THREE.SphereGeometry(0.35, 16, 16);
        const head = new THREE.Mesh(headGeo, suitMat);
        head.position.y = 1.4;

        // Visor
        const visorGeo = new THREE.SphereGeometry(0.25, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2.5);
        const visor = new THREE.Mesh(visorGeo, visorMat);
        visor.position.set(0, 1.45, 0.2);
        visor.rotation.x = -Math.PI / 2;

        // Mochila (Jetpack)
        const packGeo = new THREE.BoxGeometry(0.5, 0.7, 0.3);
        const pack = new THREE.Mesh(packGeo, packMat);
        pack.position.set(0, 0.9, -0.4);

        // Fuego del jetpack (Partículas simuladas con conos que cambian de tamaño)
        const fireGeo = new THREE.ConeGeometry(0.15, 0.5, 8);
        const fireMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
        this.fireL = new THREE.Mesh(fireGeo, fireMat);
        this.fireL.position.set(-0.15, 0.4, -0.4);
        this.fireL.rotation.x = Math.PI;
        this.fireL.visible = false;

        this.fireR = new THREE.Mesh(fireGeo, fireMat);
        this.fireR.position.set(0.15, 0.4, -0.4);
        this.fireR.rotation.x = Math.PI;
        this.fireR.visible = false;

        this.mesh.add(body, head, visor, pack, this.fireL, this.fireR);
        this.scene.add(this.mesh);
    }

    update(delta, input) {
        // Movimiento Horizontal (A / D)
        if (input.keys['KeyA']) {
            this.velocity.x = -CONSTANTS.PLAYER.SPEED;
            this.mesh.rotation.y = -Math.PI / 2;
        } else if (input.keys['KeyD']) {
            this.velocity.x = CONSTANTS.PLAYER.SPEED;
            this.mesh.rotation.y = Math.PI / 2;
        } else {
            this.velocity.x = 0;
        }

        // Gravedad
        this.velocity.y += CONSTANTS.LEVEL.GRAVITY * delta;

        // Asegurar que reconozca el piso antes del salto (game.js lo resetea a false)
        if (this.mesh.position.y <= CONSTANTS.LEVEL.FLOOR_Y) {
            this.isGrounded = true;
        }

        // Salto / Jetpack (ESPACIO)
        this.isJetpackActive = false;
        if (input.keys['Space']) {
            if (this.isGrounded && this.canJump) {
                // Salto inicial
                this.velocity.y = CONSTANTS.PLAYER.JUMP_FORCE;
                this.isGrounded = false;
                this.canJump = false; // Requiere soltar para volver a saltar
            } else if (!this.isGrounded && this.jetpackEnergy > 0) {
                // Jetpack
                // Compensar la gravedad para poder elevarse
                this.velocity.y += (Math.abs(CONSTANTS.LEVEL.GRAVITY) + CONSTANTS.PLAYER.JETPACK_FORCE) * delta;
                this.jetpackEnergy -= delta * 1000;
                this.isJetpackActive = true;
            }
        } else {
            this.canJump = true; // Soltó espacio, puede volver a saltar si toca el piso
            // Recargar jetpack
            if (this.jetpackEnergy < CONSTANTS.PLAYER.JETPACK_MAX_TIME) {
                this.jetpackEnergy += (CONSTANTS.PLAYER.JETPACK_MAX_TIME / CONSTANTS.PLAYER.JETPACK_RECHARGE_TIME) * delta * 1000;
            }
        }

        // Limitar energía
        this.jetpackEnergy = Math.max(0, Math.min(this.jetpackEnergy, CONSTANTS.PLAYER.JETPACK_MAX_TIME));

        // Efecto visual jetpack
        if (this.isJetpackActive) {
            this.fireL.visible = true;
            this.fireR.visible = true;
            this.fireL.scale.y = Math.random() * 0.5 + 0.5;
            this.fireR.scale.y = Math.random() * 0.5 + 0.5;
        } else {
            this.fireL.visible = false;
            this.fireR.visible = false;
        }

        // Actualizar UI
        this.ui.updateJetpack(this.jetpackEnergy / CONSTANTS.PLAYER.JETPACK_MAX_TIME);

        // Aplicar velocidad a posición
        this.mesh.position.addScaledVector(this.velocity, delta);

        // Colisión básica con el piso (Y=0 por ahora, el level.js ajustará colisiones precisas)
        if (this.mesh.position.y <= CONSTANTS.LEVEL.FLOOR_Y) {
            this.mesh.position.y = CONSTANTS.LEVEL.FLOOR_Y;
            this.velocity.y = 0;
            this.isGrounded = true;
        } else {
            // isGrounded se evalúa en game.js basado en plataformas
        }
    }

    shoot(targetPos) {
        // Disparo sale del centro del jugador
        const origin = this.mesh.position.clone().add(new THREE.Vector3(0, 1, 0));
        
        // Dirección hacia el objetivo (targetPos viene de proyectar el mouse)
        // Ignoramos el eje Z para mantener el disparo en el plano 2D principal
        targetPos.z = 0;
        origin.z = 0;
        
        const direction = targetPos.clone().sub(origin).normalize();

        const bullet = new Bullet(this.scene, origin, direction, true);
        return bullet;
    }

    takeDamage(amount) {
        this.hp -= amount;
        this.ui.updateHealth(this.hp, CONSTANTS.PLAYER.MAX_HP);

        // Flash visual de daño
        this.mesh.children.forEach(child => {
            if (child.material && child.material.emissive) {
                child.material.emissive.setHex(0xff0000);
            }
        });

        setTimeout(() => {
            this.mesh.children.forEach(child => {
                if (child.material && child.material.emissive) {
                    child.material.emissive.setHex(0x000000);
                }
            });
        }, 150);

        if (this.hp <= 0) {
            // Manejado en game.js
        }
    }

    heal(amount) {
        this.hp = Math.min(this.hp + amount, CONSTANTS.PLAYER.MAX_HP);
        this.ui.updateHealth(this.hp, CONSTANTS.PLAYER.MAX_HP);
        
        // Flash visual verde
        this.mesh.children.forEach(child => {
            if (child.material && child.material.emissive) {
                child.material.emissive.setHex(0x00ff00);
            }
        });
        setTimeout(() => {
            this.mesh.children.forEach(child => {
                if (child.material && child.material.emissive) {
                    child.material.emissive.setHex(0x000000);
                }
            });
        }, 150);
    }
}
