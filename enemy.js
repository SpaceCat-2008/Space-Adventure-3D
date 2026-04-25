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
        this.shootInterval = Math.random() * 1000 + 1500; // 1.5 a 2.5 seg

        this._createMesh(position);
    }

    _createMesh(position) {
        this.mesh = new THREE.Group();
        this.mesh.position.copy(position);

        // Cuerpo principal (ej. una esfera simulando la cabeza del gato alienígena)
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

        // Orejas
        const earGeo = new THREE.ConeGeometry(this.config.SIZE / 5, this.config.SIZE / 2, 8);
        const earL = new THREE.Mesh(earGeo, bodyMat);
        earL.position.set(-this.config.SIZE / 4, this.config.SIZE / 2.5, 0);
        earL.rotation.z = Math.PI / 6;
        
        const earR = new THREE.Mesh(earGeo, bodyMat);
        earR.position.set(this.config.SIZE / 4, this.config.SIZE / 2.5, 0);
        earR.rotation.z = -Math.PI / 6;

        this.mesh.add(earL);
        this.mesh.add(earR);

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

        // Moverse lentamente hacia el jugador (solo en el eje X para no meterse en la profundidad)
        const dirX = playerPosition.x - this.mesh.position.x;
        const sign = Math.sign(dirX);
        
        // Solo acercarse si está en rango
        if (Math.abs(dirX) > 2) {
            this.mesh.position.x += sign * this.config.SPEED * delta;
        }

        // Hacer que miren hacia el jugador (voltear la malla visualmente)
        this.mesh.rotation.y = sign > 0 ? Math.PI / 2 : -Math.PI / 2;

        // Disparo
        this.shootTimer += delta * 1000;
        if (this.shootTimer >= this.shootInterval && Math.abs(dirX) < 30) {
            this.shootTimer = 0;
            this.shoot(playerPosition, gameObj);
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
