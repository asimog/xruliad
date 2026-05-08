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
        const PARAMS = {"amplitude":3.5,"complexity":8,"flowSpeed":0.5};
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
            const amplitude = addControl("amplitude", "Vortex Strength", 0.1, 10.0, 3.5);
            const complexity = addControl("complexity", "Harmonic Density", 1.0, 20.0, 8.0);
            const flowSpeed = addControl("flowSpeed", "Temporal Drift", 0.1, 2.0, 0.5);
            
            const ratio = i / count;
            const phi = Math.acos(1 - 2 * ratio);
            const theta = Math.sqrt(count * Math.PI) * phi;
            
            const pulse = Math.sin(time * flowSpeed + ratio * complexity);
            const radius = 15 + pulse * amplitude;
            
            const x = radius * Math.sin(phi) * Math.cos(theta + time);
            const y = radius * Math.sin(phi) * Math.sin(theta + time);
            const z = radius * Math.cos(phi) + Math.cos(ratio * 50 + time) * 2.0;
            
            const attractorX = x + Math.sin(y * 0.2 + time) * amplitude;
            const attractorY = y + Math.cos(x * 0.2 + time) * amplitude;
            const attractorZ = z + Math.sin(time * 0.5) * 5.0;
            
            target.set(attractorX, attractorY, attractorZ);
            
            const hue = (ratio + (time * 0.05)) % 1.0;
            const saturation = 0.6 + Math.sin(ratio * 10 + time) * 0.4;
            const lightness = 0.4 + Math.cos(phi + time) * 0.2;
            color.setHSL(hue, saturation, lightness);
            
            if (i === 0) {
                setInfo("Quantum Chrysalis", "An organic spherical field governed by harmonic interference and temporal phase shifts.");
                annotate("origin", new THREE.Vector3(0, 0, 0), "Gravitational Anchor");
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
