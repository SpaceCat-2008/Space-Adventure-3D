import * as THREE from '../libs/three.module.js';
import { CONSTANTS } from './utils.js';

export class Bullet {
    constructor(scene, position, direction, isPlayerBullet = true) {
        this.scene = scene;
        this.isPlayerBullet = isPlayerBullet;
        this.active = true;
        this.lifetime = CONSTANTS.BULLET.LIFETIME;

        // Crear geometría visual del láser
        const geometry = new THREE.CylinderGeometry(0.1, 0.1, 1, 8);
        geometry.rotateX(Math.PI / 2); // Alinear con el eje Z o dirección de disparo
        
        const material = new THREE.MeshBasicMaterial({ 
            color: isPlayerBullet ? 0x00ffff : 0xff0000 
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        
        // Orientar la bala hacia la dirección
        const targetPoint = position.clone().add(direction);
        this.mesh.lookAt(targetPoint);
        
        this.scene.add(this.mesh);

        // Calcular velocidad vectorial
        this.velocity = direction.clone().normalize().multiplyScalar(CONSTANTS.BULLET.SPEED);
        
        // Añadir una luz puntual a la bala para efecto visual
        this.light = new THREE.PointLight(isPlayerBullet ? 0x00ffff : 0xff0000, 1, 10);
        this.mesh.add(this.light);
    }

    update(delta) {
        if (!this.active) return;

        this.lifetime -= delta * 1000;
        if (this.lifetime <= 0) {
            this.destroy();
            return;
        }

        // Mover bala
        this.mesh.position.addScaledVector(this.velocity, delta);
    }

    destroy() {
        if (!this.active) return;
        this.active = false;
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }
}
