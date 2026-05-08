// @ts-nocheck`nimport * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export class ParticlesSwarm {
    constructor(container, count = 20000) {
        this.count = count;
        this.container = container;
        this.speedMult = 1;
        
        // SETUP
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x000000, 0.01);
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
        this.camera.position.set(0, 0, 100);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.container.appendChild(this.renderer.domElement);

        // POST PROCESSING
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
        bloomPass.strength = 1.8; bloomPass.radius = 0.4; bloomPass.threshold = 0;
        this.composer.addPass(bloomPass);

        // OBJECTS
        this.dummy = new THREE.Object3D();
        this.color = new THREE.Color();
        this.target = new THREE.Vector3();
        this.pColor = new THREE.Color();
        
        this.geometry = new THREE.TetrahedronGeometry(0.25);
        this.material = new THREE.MeshBasicMaterial({ color: 0xffffff });
        
        this.mesh = new THREE.InstancedMesh(this.geometry, this.material, this.count);
        this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.scene.add(this.mesh);
        
        this.positions = [];
        for(let i=0; i<this.count; i++) {
            this.positions.push(new THREE.Vector3((Math.random()-0.5)*100, (Math.random()-0.5)*100, (Math.random()-0.5)*100));
            this.mesh.setColorAt(i, this.color.setHex(0x00ff88));
        }
        
        this.clock = new THREE.Clock();
        this.animate = this.animate.bind(this);
        this.animate();
    }

    animate() {
        requestAnimationFrame(this.animate);
        const time = this.clock.getElapsedTime() * this.speedMult;
        
        if(this.material.uniforms && this.material.uniforms.uTime) {
            this.material.uniforms.uTime.value = time;
        }

        // API Stubs
        const PARAMS = {"speed":0.5,"scale":45,"bind":0.5,"chaos":0.1};
        const addControl = (id, l, min, max, val) => {
             return PARAMS[id] !== undefined ? PARAMS[id] : val;
        };
        const setInfo = () => {};
        const annotate = () => {};
        const THREE_LIB = THREE;
        const count = this.count; // Alias for user code
        
        for(let i=0; i<this.count; i++) {
            let target = this.target;
            let color = this.pColor;
            
            // INJECTED CODE
            const speed = addControl("speed", "Rotation Speed", 0.1, 3.0, 0.5);
            const scale = addControl("scale", "Scale", 20, 80, 45);
            const bind = addControl("bind", "Binding Pulse", 0, 1, 0.5);
            const chaos = addControl("chaos", "Chaos", 0, 0.5, 0.1);
            
            const t = time * speed;
            const norm = i / count;
            const layer = (i % 8) / 8.0;
            const ring = Math.floor(i / 30) * 0.0003;
            
            const phi = norm * Math.PI * 2.0 * 30.0 + layer * Math.PI * 0.25;
            const theta = norm * Math.PI * 15.0 + t * (0.3 + layer * 0.2);
            const rho = norm * Math.PI * 7.5 + t * 0.15;
            
            const r1 = scale * (0.6 + 0.4 * Math.sin(theta + layer * Math.PI));
            const r2 = scale * (0.5 + 0.5 * Math.cos(rho + layer * Math.PI * 0.5));
            
            const x1 = r1 * Math.cos(phi + t) * Math.sin(theta);
            const y1 = r1 * Math.sin(phi + t) * Math.sin(theta);
            const z1 = r1 * Math.cos(theta);
            
            const x2 = r2 * Math.cos(rho + t * 1.3) * Math.sin(phi * 0.7);
            const y2 = r2 * Math.sin(rho + t * 1.3) * Math.cos(phi * 0.3);
            const z2 = r2 * Math.cos(phi * 0.5 + t * 0.7);
            
            const pulse = Math.sin(t * 2.0 + norm * Math.PI * 4.0) * 0.5 + 0.5;
            const blend = bind * pulse + (1.0 - bind) * 0.5;
            
            const px = x1 * (1.0 - blend) + x2 * blend + Math.sin(norm * 137.5 + t) * chaos * scale;
            const py = y1 * (1.0 - blend) + y2 * blend + Math.cos(norm * 89.3 + t * 1.1) * chaos * scale;
            const pz = z1 * (1.0 - blend) + z2 * blend + Math.sin(norm * 213.7 + t * 0.9) * chaos * scale;
            
            target.set(px, py, pz);
            
            const hue = (layer + norm * 0.3 + t * 0.05) % 1.0;
            const sat = 0.6 + 0.4 * pulse;
            const lum = 0.35 + 0.3 * Math.abs(Math.sin(norm * Math.PI * 8.0 + t));
            
            color.setHSL(hue, sat, lum);
            
            if (i === 0) {
              setInfo("OMUO Genesis Lattice", "E8-inspired 240-direction polytope with algebraic binding pulses. 8 symmetry layers breathing through geometric phase space.");
              annotate("core", new THREE.Vector3(0, 0, 0), "Binding Core");
            }
            
            // UPDATE
            this.positions[i].lerp(this.target, 0.1);
            this.dummy.position.copy(this.positions[i]);
            this.dummy.updateMatrix();
            this.mesh.setMatrixAt(i, this.dummy.matrix);
            this.mesh.setColorAt(i, this.pColor);
        }
        this.mesh.instanceMatrix.needsUpdate = true;
        this.mesh.instanceColor.needsUpdate = true;
        
        this.composer.render();
    }
    
    dispose() {
        this.geometry.dispose();
        this.material.dispose();
        this.scene.remove(this.mesh);
        this.renderer.dispose();
    }
}
