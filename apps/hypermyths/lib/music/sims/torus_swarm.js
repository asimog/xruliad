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
        const PARAMS = {"scale":78,"twist":4.8,"chaos":0.18,"pulse":2.6,"wave":1.2};
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
            const n = count > 0 ? count : 1;
            const scale = addControl("scale", "Scale", 20, 180, 78);
            const twist = addControl("twist", "Twist", 0, 14, 4.8);
            const chaos = addControl("chaos", "Chaos", 0, 1, 0.18);
            const pulse = addControl("pulse", "Pulse", 0, 8, 2.6);
            const wave = addControl("wave", "Wave", 0, 4, 1.2);
            
            const u = i / n;
            const a = u * 6.283185307179586 * 120.0;
            const arm = (i & 1) ? 1.0 : -1.0;
            
            const t0 = time * (0.55 + chaos * 0.35);
            const spin = a * twist + t0 * (1.0 + chaos * 0.5);
            const ring = 0.68 + 0.16 * Math.sin(a * 3.0 + time * pulse);
            const puff = 0.10 + 0.22 * Math.sin(a * 0.5 - time * 0.7) * Math.sin(a * 0.13 + time * 0.9);
            
            const sx = Math.cos(a + t0 * 0.18) * ring;
            const sz = Math.sin(a + t0 * 0.18) * ring;
            const hx = Math.sin(spin) * (0.18 + 0.08 * Math.sin(a * 1.7 + time * 1.3));
            const hz = Math.cos(spin) * (0.18 + 0.08 * Math.cos(a * 1.9 - time * 1.1));
            const y = (Math.sin(a * 0.5 + time * 0.8) + Math.sin(a * 1.5 - time * 0.6) * 0.35) * wave * 0.55;
            
            const j = chaos * scale * 0.12;
            target.set(
            (sx + hx * arm) * scale + Math.sin(a * 13.0 + time * 2.0) * j,
            (y + puff * scale * 0.18) + Math.cos(a * 9.0 - time * 1.5) * j * 0.55,
            (sz + hz * arm) * scale + Math.cos(a * 11.0 + time * 1.7) * j
            );
            
            const h = u + 0.08 * Math.sin(time * 0.2 + a * 0.03);
            const hue = h - Math.floor(h);
            const light = 0.40 + 0.16 * Math.sin(a * 0.2 - time * 1.1) + 0.05 * Math.sin(u * 20.0 + time * 0.4);
            color.setHSL(hue, 0.82, light);
            
            if (i === 0) {
            setInfo("Breathing Torus Swarm", "A double-helix particle field with precession, pulse, and chromatic drift.");
            annotate("center", new THREE.Vector3(0, 0, 0), "Singularity");
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
