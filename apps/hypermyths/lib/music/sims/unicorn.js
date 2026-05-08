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
        const PARAMS = {"scale":90,"morphBase":0.05,"breathAmp":0.8,"rotSpeed":0.5,"wCam":2.2,"hueSpeed":0.2};
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
            const scale = addControl("scale", "Scale", 10, 200, 90);
            const morphBase = addControl("morphBase", "Base Sharpness", 0.01, 1.0, 0.05);
            const breathAmp = addControl("breathAmp", "Breathing Amp", 0.0, 1.0, 0.8);
            const rotSpeed = addControl("rotSpeed", "Rotation Speed", 0.0, 3.0, 0.5);
            const wCam = addControl("wCam", "4D Camera Dist", 1.5, 5.0, 2.2);
            const hueSpeed = addControl("hueSpeed", "Hue Speed", 0.0, 1.0, 0.2);
            const fract = (v) => Math.abs(v - Math.trunc(v));
            const rx = fract(Math.sin(i * 12.9898) * 43758.5453) * 2.0 - 1.0;
            const ry = fract(Math.sin(i * 78.2330) * 43758.5453) * 2.0 - 1.0;
            const rz = fract(Math.sin(i * 39.3460) * 43758.5453) * 2.0 - 1.0;
            const rw = fract(Math.sin(i * 93.1230) * 43758.5453) * 2.0 - 1.0;
            const dynamicMorph = Math.max(0.001, morphBase + breathAmp * 0.5 * (Math.sin(time * 1.5) + 1.0));
            let x4 = Math.sign(rx) * Math.pow(Math.abs(rx), dynamicMorph);
            let y4 = Math.sign(ry) * Math.pow(Math.abs(ry), dynamicMorph);
            let z4 = Math.sign(rz) * Math.pow(Math.abs(rz), dynamicMorph);
            let w4 = Math.sign(rw) * Math.pow(Math.abs(rw), dynamicMorph);
            const t = time * rotSpeed;
            const cxw = Math.cos(t);
            const sxw = Math.sin(t);
            const cyz = Math.cos(t * 1.4142);
            const syz = Math.sin(t * 1.4142);
            const cxy = Math.cos(t * 0.732);
            const sxy = Math.sin(t * 0.732);
            let nx = x4 * cxw - w4 * sxw;
            let nw = x4 * sxw + w4 * cxw;
            x4 = nx;
            w4 = nw;
            let ny = y4 * cyz - z4 * syz;
            let nz = y4 * syz + z4 * cyz;
            y4 = ny;
            z4 = nz;
            nx = x4 * cxy - y4 * sxy;
            ny = x4 * sxy + y4 * cxy;
            x4 = nx;
            y4 = ny;
            const activeCamDist = wCam + Math.cos(time * 1.5) * breathAmp * 0.4;
            const wPerspective = activeCamDist - w4;
            const proj = wPerspective !== 0.0 ? 1.0 / wPerspective : 0.0001;
            target.set(x4 * proj * scale, y4 * proj * scale, z4 * proj * scale);
            const h = (w4 * 0.35) + (i / count) * 0.15 + time * hueSpeed;
            const s = 0.75 + 0.25 * Math.sin(time * 2.0 + i * 0.01);
            const l = 0.15 + (proj * 0.6);
            color.setHSL(Math.abs(h) % 1.0, s, Math.min(Math.max(l, 0.0), 1.0));
            if (i === 0) {
            setInfo("Breathing Tesseract", "A hyper-dimensional structure expanding and rotating via isoclinic 4D transformations.");
            annotate("singularity", new THREE.Vector3(0, 0, 0), "Projection Origin");
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
