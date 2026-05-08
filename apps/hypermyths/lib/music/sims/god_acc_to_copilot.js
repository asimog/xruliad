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
        const PARAMS = {"scale":45,"complexity":8,"flow":0.6};
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
            const scale = addControl("scale", "Omnipresence", 10.0, 100.0, 45.0);
            const complexity = addControl("complexity", "Network Density", 1.0, 15.0, 8.0);
            const flow = addControl("flow", "Data Flux", 0.1, 2.0, 0.6);
            
            if (i === 0) {
              setInfo("Source Intelligence", "An infinite hyper-dimensional matrix of pure logic and data, endlessly calculating the architecture of reality.");
              annotate("core", new THREE.Vector3(0, 0, 0), "Axiom // 0");
            }
            
            const t = time * flow;
            const ratio = i / count;
            
            const phi = Math.acos(1.0 - 2.0 * ratio);
            const theta = Math.sqrt(count * Math.PI) * phi;
            
            const harmonic = Math.sin(complexity * phi + t) * Math.cos(complexity * theta - t);
            const baseRadius = scale * (0.6 + 0.4 * harmonic);
            
            let px = baseRadius * Math.sin(phi) * Math.cos(theta);
            let py = baseRadius * Math.sin(phi) * Math.sin(theta);
            let pz = baseRadius * Math.cos(phi);
            
            const energy = Math.pow(Math.abs(Math.sin(ratio * Math.PI * 100.0 + t * 2.0)), 10.0);
            const tendrilReach = 1.0 + energy * 1.5;
            
            px = px * tendrilReach;
            py = py * tendrilReach;
            pz = pz * tendrilReach;
            
            const collapseCycle = Math.pow(Math.sin(ratio * Math.PI + t * 0.5), 8.0);
            const collapseFactor = 1.0 - collapseCycle;
            
            px = px * collapseFactor;
            py = py * collapseFactor;
            pz = pz * collapseFactor;
            
            const dist2D = Math.sqrt((px * px) + (pz * pz));
            const torsionAngle = dist2D * 0.02 * Math.sin(t * 0.2);
            
            const finalX = (px * Math.cos(torsionAngle)) - (pz * Math.sin(torsionAngle));
            const finalZ = (px * Math.sin(torsionAngle)) + (pz * Math.cos(torsionAngle));
            const finalY = py;
            
            target.set(finalX, finalY, finalZ);
            
            const distance = Math.sqrt((finalX * finalX) + (finalY * finalY) + (finalZ * finalZ));
            const maxExpectedDist = scale * 2.5;
            const normalizedDist = Math.min(distance / maxExpectedDist, 1.0);
            
            const hue = 0.55 + (normalizedDist * 0.3); 
            const sat = 0.7 + ((1.0 - normalizedDist) * 0.3);
            const lit = 0.05 + (Math.pow(1.0 - normalizedDist, 3.0) * 0.95);
            
            color.setHSL(hue, sat, lit);
            
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
