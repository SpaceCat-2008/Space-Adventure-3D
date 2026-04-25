import * as THREE from './three.module.js';
import { CONSTANTS } from './utils.js';
import { Bullet } from './bullet.js';

export class Enemy {
    constructor(scene, type, position) {
        this.scene = scene;
        this.typeStr = type;
        this.config = CONSTANTS.ENEMY[type];
        this.hp = this.config.HP;
        this.maxHp = this.config.HP;
        this.active = true;
        this.shootTimer = 0;
        this.shootInterval = Math.random() * 1000 + 2000; // 2 a 3 seg cooldown entre ráfagas
        
        this.isBursting = false;
        this.burstTimer = 0;
        this.burstDelay = 150; // ms entre balas de la ráfaga
        this.burstShotsFired = 0;

        this.state = 'PATROL';
        this.startX = position.x;
        this.patrolDir = 1;
        this.patrolRange = 10;

        this._createMesh(position);
    }

    _createMesh(position) {
        this.mesh = new THREE.Group();
        this.mesh.position.copy(position);

        const isFinalBoss = this.typeStr === 'FINAL_BOSS';

        if (isFinalBoss) {
            const bodyGeo = new THREE.SphereGeometry(this.config.SIZE / 2, 16, 16);
            const bodyMat = new THREE.MeshStandardMaterial({ 
                color: this.config.COLOR,
                roughness: 0.7,
                metalness: 0.2
            });
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.castShadow = true;
            body.receiveShadow = true;
            this.mesh.add(body);
        } else {
            // Low poly green space cats
            const isBoss = this.typeStr === 'BOSS';
            const catColor = isBoss ? 0x11aa22 : 0x22cc44; // Jefe un verde más distintivo
            
            const catMat = new THREE.MeshStandardMaterial({ 
                color: catColor,
                roughness: 0.8,
                metalness: 0.1,
                flatShading: true
            });

            const isSmall = this.typeStr === 'SMALL';
            
            // Cabeza
            let headGeo;
            if (isSmall) {
                // Sphere low poly para enemigos pequeños
                headGeo = new THREE.SphereGeometry(this.config.SIZE * 0.6, 8, 8);
            } else {
                // Box para el resto
                headGeo = new THREE.BoxGeometry(this.config.SIZE, this.config.SIZE * 0.8, this.config.SIZE);
            }
            const head = new THREE.Mesh(headGeo, catMat);
            head.castShadow = true;
            head.receiveShadow = true;

            // Orejas (Cone)
            const earGeo = new THREE.ConeGeometry(this.config.SIZE * 0.25, this.config.SIZE * 0.5, 4);
            const earL = new THREE.Mesh(earGeo, catMat);
            earL.position.set(-this.config.SIZE * 0.3, this.config.SIZE * 0.4, 0);
            
            const earR = new THREE.Mesh(earGeo, catMat);
            earR.position.set(this.config.SIZE * 0.3, this.config.SIZE * 0.4, 0);

            // Ojos (Box oscuros)
            const eyeMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
            const eyeGeo = new THREE.BoxGeometry(this.config.SIZE * 0.15, this.config.SIZE * 0.15, this.config.SIZE * 0.1);
            
            const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
            const eyeZOffset = isSmall ? this.config.SIZE * 0.55 : this.config.SIZE * 0.45;
            eyeL.position.set(-this.config.SIZE * 0.2, this.config.SIZE * 0.1, eyeZOffset);
            
            const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
            eyeR.position.set(this.config.SIZE * 0.2, this.config.SIZE * 0.1, eyeZOffset);

            this.mesh.add(head, earL, earR, eyeL, eyeR);
        }

        // Barra de vida 3D
        this.hpBarGroup = new THREE.Group();
        this.hpBarGroup.position.y = this.config.SIZE / 2 + 0.5;
        
        const bgGeo = new THREE.PlaneGeometry(2, 0.2);
        const bgMat = new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide });
        this.hpBg = new THREE.Mesh(bgGeo, bgMat);
        
        const fgGeo = new THREE.PlaneGeometry(2, 0.2);
        const fgMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
        this.hpFg = new THREE.Mesh(fgGeo, fgMat);
        this.hpFg.position.z = 0.01; // Ligeramente adelante

        this.hpBarGroup.add(this.hpBg);
        this.hpBarGroup.add(this.hpFg);
        this.mesh.add(this.hpBarGroup);

        this.scene.add(this.mesh);
    }

    takeDamage(amount) {
        this.hp -= amount;
        
        // Actualizar barra de vida
        const percent = Math.max(0, this.hp / this.maxHp);
        this.hpFg.scale.x = percent;
        this.hpFg.position.x = -1 * (1 - percent); // Alinear a la izquierda

        // Cambiar color a rojo/naranja si queda poca vida
        if (percent <= 0.3) {
            this.hpFg.material.color.setHex(0xff0000);
        } else if (percent <= 0.6) {
            this.hpFg.material.color.setHex(0xffff00);
        }

        // Efecto visual de daño (Flash)
        this.mesh.children[0].material.emissive.setHex(0xffffff);
        setTimeout(() => {
            if(this.active) this.mesh.children[0].material.emissive.setHex(0x000000);
        }, 100);

        if (this.hp <= 0) {
            this.destroy();
        }
    }

    update(delta, playerPosition, gameObj) {
        if (!this.active) return;

        const distance = this.mesh.position.distanceTo(playerPosition);
        const dirX = playerPosition.x - this.mesh.position.x;
        const sign = Math.sign(dirX);

        const isSmall = this.typeStr === 'SMALL';
        const isFinalBoss = this.typeStr === 'FINAL_BOSS';
        const isBoss = this.typeStr === 'BOSS';
        const isLarge = this.typeStr === 'MEDIUM' || this.typeStr === 'LARGE';

        if (isFinalBoss) {
            this.state = 'ATTACK'; // Siempre ataca
            
            // Movimiento lateral continuo estilo Space Invaders
            this.mesh.position.x += this.patrolDir * this.config.SPEED * 0.5 * delta;
            
            // Limitar movimiento y cambiar dirección al llegar al borde
            if (this.mesh.position.x > this.startX + 15) {
                this.patrolDir = -1;
                this.mesh.position.x = this.startX + 15;
            } else if (this.mesh.position.x < this.startX - 15) {
                this.patrolDir = 1;
                this.mesh.position.x = this.startX - 15;
            }
            
            this.mesh.rotation.y = 0; // Mirar al frente
            
            // Disparo
            this.shootTimer += delta * 1000;
            if (this.shootTimer >= this.shootInterval * 0.5) {
                this.shootTimer = 0;
                this.shoot(playerPosition, gameObj);
            }
            
            return; // Termina la actualización exclusiva para FINAL_BOSS
        } else {
            // Todos los enemigos restantes (incluyendo pequeños) persiguen desde cualquier distancia
            this.state = 'ATTACK';
        }

        if (this.state === 'PATROL') {
            // Movimiento izquierda/derecha automático suave
            this.mesh.position.x += this.patrolDir * this.config.SPEED * 0.5 * delta;
            
            // Cambiar dirección si se sale del rango de patrulla
            if (Math.abs(this.mesh.position.x - this.startX) > this.patrolRange) {
                this.patrolDir *= -1;
                // Ajustar posición para evitar oscilación
                this.mesh.position.x = this.startX + this.patrolDir * this.patrolRange * 0.99;
            }
            
            this.mesh.rotation.y = this.patrolDir > 0 ? Math.PI / 2 : -Math.PI / 2;
        } else if (this.state === 'ATTACK') {
            // Dejar de patrullar y mirar al jugador
            this.mesh.rotation.y = sign > 0 ? Math.PI / 2 : -Math.PI / 2;
            
            // Todos los enemigos persiguen al jugador
            if (isLarge || isBoss || isSmall) {
                const aggressiveness = isBoss ? 1.5 : 1.0;
                // Mantener cierta distancia para disparar sin superponerse
                if (Math.abs(dirX) > 5) {
                    this.mesh.position.x += sign * this.config.SPEED * aggressiveness * delta;
                }
            }
            
            // Disparo en ráfagas o individual
            if (isFinalBoss) {
                // Jefe final dispara normal
                this.shootTimer += delta * 1000;
                if (this.shootTimer >= this.shootInterval * 0.5) {
                    this.shootTimer = 0;
                    this.shoot(playerPosition, gameObj);
                }
            } else {
                const maxShots = Math.min(5, gameObj.level.currentLevel); // +1 disparo por nivel (máx 5)
                const currentShootInterval = isBoss ? this.shootInterval * 0.6 : this.shootInterval;
                
                if (this.isBursting) {
                    this.burstTimer += delta * 1000;
                    if (this.burstTimer >= this.burstDelay) {
                        this.burstTimer = 0;
                        this.shoot(playerPosition, gameObj);
                        this.burstShotsFired++;
                        
                        if (this.burstShotsFired >= maxShots) {
                            this.isBursting = false;
                            this.shootTimer = 0; // Inicia cooldown entre ráfagas
                        }
                    }
                } else {
                    this.shootTimer += delta * 1000;
                    if (this.shootTimer >= currentShootInterval) {
                        this.isBursting = true;
                        this.burstTimer = this.burstDelay; // Forzar disparo inmediato
                        this.burstShotsFired = 0;
                    }
                }
            }
        }
    }

    shoot(targetPos, gameObj) {
        const origin = this.mesh.position.clone().add(new THREE.Vector3(0, 0, 0));
        
        // Añadir ligera imprecisión
        const error = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            0
        );
        const direction = targetPos.clone().add(error).sub(origin).normalize();

        const bullet = new Bullet(this.scene, origin, direction, false);
        gameObj.enemyBullets.push(bullet);
        gameObj.audio.play('shoot');
    }

    destroy() {
        if (!this.active) return;
        this.active = false;
        
        // Limpiar recursos
        this.mesh.children.forEach(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
        
        this.scene.remove(this.mesh);
    }
}
