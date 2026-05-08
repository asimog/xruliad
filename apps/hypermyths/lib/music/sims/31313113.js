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
        const PARAMS = {"radius":50,"tube":18,"speed":0.8,"chaos":3.5};
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
            const radius = addControl("radius", "Core Radius", 10, 150, 50);
            const tube = addControl("tube", "Plasma Thickness", 1, 50, 18);
            const speed = addControl("speed", "Energy Flow Speed", 0.1, 5.0, 0.8);
            const chaos = addControl("chaos", "Quantum Fluctuation", 0.0, 20.0, 3.5);
            
            if (i === 0) {
              setInfo("Quantum Toroidal Attractor", "A hyper-dimensional plasma flow twisting through its own magnetic field.");
              annotate("singularity", new THREE.Vector3(0, 0, 0), "Zero-Point Core");
            }
            
            const n = i / count;
            const t = time * speed;
            
            const u = n * Math.PI * 2 * 13.0 + t * 0.3;
            const v = n * Math.PI * 2 * 412.0 - t * 1.5;
            
            const harmonicTwist = Math.sin(u * 3.0 + t);
            const dynamicTube = tube * (0.5 + 0.5 * harmonicTwist);
            
            const noise = Math.sin(i * 789.123) * chaos;
            const structureMod = Math.cos(u * 5.0) * chaos * 0.5;
            
            const cx = (radius + dynamicTube * Math.cos(v) + noise) * Math.cos(u);
            const cy = (radius + dynamicTube * Math.cos(v) + noise) * Math.sin(u);
            const cz = dynamicTube * Math.sin(v) + noise + Math.sin(u * 4.0) * structureMod;
            
            target.set(cx, cy, cz);
            
            const hue = (0.55 + 0.35 * Math.sin(v * 0.2 + t * 0.5) + 0.1 * Math.cos(u * 2.0)) % 1.0;
            const saturation = 0.8 + 0.2 * Math.cos(v);
            const lightness = 0.3 + 0.5 * Math.abs(harmonicTwist) + (noise * 0.05);
            
            color.setHSL(hue, saturation, Math.max(0.1, Math.min(1.0, lightness)));
            
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
