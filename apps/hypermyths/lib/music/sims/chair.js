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
        const PARAMS = {"scale":50,"thickness":4};
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
            const scale = addControl("scale", "Chair Scale", 10, 100, 50);
            const legThick = addControl("thickness", "Leg Thickness", 1, 10, 4);
            
            const r = i / count;
            let x = 0, y = 0, z = 0;
            let h = 0.08, s = 0.5, l = 0.2; // Dark wood aesthetic
            
            if (r < 0.4) {
            // Seat: A flat horizontal plane
            const localR = r / 0.4;
            const row = Math.floor(Math.sqrt(count * 0.4));
            x = ((Math.floor(i) % row) / row - 0.5) * scale;
            z = ((Math.floor(i / row) % row) / row - 0.5) * scale;
            y = 0;
            l = 0.3;
            } else if (r < 0.6) {
            // Backrest: A vertical plane
            const localR = (r - 0.4) / 0.2;
            const row = Math.floor(Math.sqrt(count * 0.2));
            x = ((Math.floor(i) % row) / row - 0.5) * scale;
            y = ((Math.floor(i / row) % row) / row) * scale;
            z = -scale * 0.5;
            l = 0.25;
            } else {
            // Legs: Four vertical pillars
            const legIdx = Math.floor((r - 0.6) / 0.1); // 4 legs
            const legX = (legIdx < 2 ? 0.45 : -0.45) * scale;
            const legZ = (legIdx % 2 === 0 ? 0.45 : -0.45) * scale;
            const segmentR = ((r - 0.6) % 0.1) / 0.1;
            
            // Cylinder math for legs
            const angle = segmentR * Math.PI * 20;
            x = legX + Math.cos(angle) * legThick;
            z = legZ + Math.sin(angle) * legThick;
            y = -segmentR * scale;
            l = 0.15;
            }
            
            target.set(x, y, z);
            color.setHSL(h, s, l);
            
            if (i === 0) {
            setInfo("The Minimalist Chair", "Static Euclidean geometry composed of 20k points.");
            annotate("seat", new THREE.Vector3(0, 0, 0), "Support Surface");
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
