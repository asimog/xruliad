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
        const PARAMS = {"scale":75,"speed":0.4,"morph":1,"hueOffset":0.65};
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
            const scale = addControl("scale", "Hyper Scale", 10, 150, 75);
            const speed = addControl("speed", "Phase Speed", 0.01, 2.0, 0.4);
            const morph = addControl("morph", "4D Morph", 0.0, 2.0, 1.0);
            const hueOffset = addControl("hueOffset", "Hue Rotation", 0.0, 1.0, 0.65);
            
            const t = time * speed;
            const n = i / count;
            
            const a = n * Math.PI * 2.0;
            const b = i * 2.399963229728653;
            
            const w = Math.sin(t * 0.7 + n * Math.PI * 4.0) * morph;
            const cosW = Math.sqrt(Math.max(0.001, 1.0 - w * w * 0.25));
            
            const r1 = scale * (0.6 + 0.4 * Math.sin(b * 3.0 + t));
            const r2 = scale * (0.6 + 0.4 * Math.cos(a * 5.0 - t));
            
            const x = r1 * Math.cos(a) * cosW;
            const y = r1 * Math.sin(a) * cosW;
            const z = r2 * Math.cos(b + t * 1.5) + (w * scale * 0.6);
            
            const foldX = x * Math.cos(t * 0.3) - z * Math.sin(t * 0.3);
            const foldZ = x * Math.sin(t * 0.3) + z * Math.cos(t * 0.3);
            const foldY = y * Math.cos(t * 0.4) - foldZ * Math.sin(t * 0.4);
            const finalZ = y * Math.sin(t * 0.4) + foldZ * Math.cos(t * 0.4);
            
            target.set(foldX, foldY, finalZ);
            
            const h = (hueOffset + n * 0.3 + w * 0.25 + t * 0.15) - Math.floor(hueOffset + n * 0.3 + w * 0.25 + t * 0.15);
            const s = 0.6 + 0.4 * Math.abs(Math.sin(a * 3.0 - t));
            const l = 0.2 + 0.7 * Math.max(0.0, Math.min(1.0, (finalZ + scale * 1.5) / (scale * 3.0)));
            
            color.setHSL(h, s, l);
            
            if (i === 0) {
            setInfo("Hyper-Dimensional Tesseract", "A breathing projection of a 4D Clifford Torus folding through 3D space.");
            annotate("center", new THREE.Vector3(0, 0, 0), "Dimensional Rift");
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
