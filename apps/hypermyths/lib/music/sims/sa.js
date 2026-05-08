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
        const PARAMS = {"scale":60,"twist":3,"flow":1.2,"chaos":0.6};
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
            const scale = addControl("scale", "Structure Scale", 10, 150, 60);
            const twist = addControl("twist", "Twist Intensity", 0, 10, 3.0);
            const flow = addControl("flow", "Flow Speed", 0, 5, 1.2);
            const chaos = addControl("chaos", "Chaos", 0, 2, 0.6);
            
            const t = time * flow;
            
            // normalized index
            const p = i / count;
            
            // spherical distribution base
            const phi = Math.acos(1.0 - 2.0 * p);
            const theta = Math.PI * 2.0 * p * Math.sqrt(count);
            
            // radial deformation (breathing + waves)
            const wave = Math.sin(theta * twist + t) * 0.5 + Math.cos(phi * twist - t) * 0.5;
            const radius = scale * (1.0 + wave * 0.3);
            
            // chaotic perturbation (smooth, no branching)
            const cx = Math.sin(phi * 6.0 + t * 1.3) * chaos;
            const cy = Math.cos(theta * 4.0 - t * 1.1) * chaos;
            const cz = Math.sin(theta * 3.0 + phi * 2.0 + t) * chaos;
            
            // final position
            const x = Math.sin(phi) * Math.cos(theta) * radius + cx * 10.0;
            const y = Math.sin(phi) * Math.sin(theta) * radius + cy * 10.0;
            const z = Math.cos(phi) * radius + cz * 10.0;
            
            target.set(x, y, z);
            
            // color based on curvature + time
            const hue = (p + t * 0.05 + wave * 0.1) % 1.0;
            const sat = 0.7 + 0.3 * Math.sin(phi * 2.0 + t);
            const light = 0.5 + 0.25 * wave;
            
            color.setHSL(hue, sat, light);
            
            // UI info (only once)
            if (i === 0) {
            setInfo("Quantum Flux Sphere", "A living spherical field with wave interference, twisting geometry, and controlled chaos.");
            annotate("core", target, "Flux Core");
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
