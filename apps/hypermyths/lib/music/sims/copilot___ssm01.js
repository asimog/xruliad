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
        const PARAMS = {"rotSpeed":1.2,"breathAmp":0.8,"twist":3.14,"spread":80,"colorShift":0.2};
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
            const rotSpeed = addControl("rotSpeed", "Rotation Speed", 0.0, 4.0, 1.2);
            const breathAmp = addControl("breathAmp", "Breath Amplitude", 0.0, 2.0, 0.8);
            const twist = addControl("twist", "Hyper Twist", 0.0, 6.28, 3.14);
            const spread = addControl("spread", "Spatial Spread", 10.0, 200.0, 80.0);
            const colorShift = addControl("colorShift", "Color Shift", 0.0, 1.0, 0.2);
            
            const safeCount = count > 0 ? count : 1;
            let nSide = Math.floor(Math.pow(safeCount, 0.25));
            if (nSide < 1) nSide = 1;
            
            const n2 = nSide * nSide;
            const n3 = n2 * nSide;
            
            const t = time * rotSpeed;
            const breathing = 1.0 + Math.sin(time * 0.8) * 0.25 * breathAmp;
            
            let idx = i;
            const wIndex = idx % nSide;
            idx = (idx - wIndex) / nSide;
            const zIndex = idx % nSide;
            idx = (idx - zIndex) / nSide;
            const yIndex = idx % nSide;
            const xIndex = (idx - yIndex) / nSide;
            
            const half = (nSide - 1) * 0.5;
            let x4 = (xIndex - half) / nSide;
            let y4 = (yIndex - half) / nSide;
            let z4 = (zIndex - half) / nSide;
            let w4 = (wIndex - half) / nSide;
            
            const baseR = Math.sqrt(x4 * x4 + y4 * y4 + z4 * z4 + w4 * w4);
            const r4 = baseR > 0.0001 ? baseR : 0.0001;
            
            const angle1 = t + twist * w4;
            const ca1 = Math.cos(angle1);
            const sa1 = Math.sin(angle1);
            
            // Rotate in X–W plane
            const x4r = x4 * ca1 - w4 * sa1;
            const w4r = x4 * sa1 + w4 * ca1;
            
            // Rotate in Y–Z plane
            const angle2 = t * 0.7 + twist * x4;
            const ca2 = Math.cos(angle2);
            const sa2 = Math.sin(angle2);
            const y4r = y4 * ca2 - z4 * sa2;
            const z4r = y4 * sa2 + z4 * ca2;
            
            // Project 4D → 3D with breathing
            const depth = 1.0 / (1.0 + Math.abs(w4r) * 1.5);
            const s = spread * breathing * depth;
            
            const angle3 = t * 0.5 + r4 * 2.0;
            const ca3 = Math.cos(angle3);
            const sa3 = Math.sin(angle3);
            
            const px = (x4r * ca3 - y4r * sa3) * s;
            const py = (x4r * sa3 + y4r * ca3) * s;
            const pz = (z4r + w4r * 0.5) * s;
            
            target.set(px, py, pz);
            
            // Color: hyper-shell interference
            const shell = Math.sin(r4 * 12.0 + time * 1.5);
            const hue = (0.6 + shell * 0.15 + colorShift + i / safeCount * 0.2) % 1.0;
            const sat = 0.7 + 0.3 * Math.sin(time + r4 * 8.0);
            const lum = 0.45 + 0.25 * shell;
            
            color.setHSL(hue < 0 ? hue + 1.0 : hue, sat, lum);
            
            if (i === 0) {
              setInfo(
                "Breathing 4D Tesseract Swarm",
                "A hyper-dimensional lattice projected into 3D, pulsing and twisting as a living tesseract."
              );
              annotate("core", new THREE.Vector3(0, 0, 0), "4D Projection Core");
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
