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
        const PARAMS = {"scale":95,"spread":1.25,"margin":22,"kernel":0.85,"rotate":0.6,"flow":1,"support":1.2,"bias":0};
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
            const scale = addControl("scale", "Feature Space Scale", 20, 220, 95); const spread = addControl("spread", "Class Spread", 0.2, 3.0, 1.25); const margin = addControl("margin", "Margin Width", 2, 80, 22); const kernel = addControl("kernel", "Kernel Warp", 0, 2.5, 0.85); const rotate = addControl("rotate", "Hyperplane Rotation", -3.14159, 3.14159, 0.6); const flow = addControl("flow", "Training Flow", 0, 3, 1.0); const support = addControl("support", "Support Density", 0.1, 3.0, 1.2); const biasCtrl = addControl("bias", "Bias Shift", -60, 60, 0);
            
            if (i === 0) { setInfo( "Support Vector Machine Simulation", "Particles form two separable classes in a warped 3D feature space. The central separating hyperplane, soft margin bands, support-vector concentration, and kernel-like deformation are all interactively controlled." ); annotate("svm_center", new THREE.Vector3(0, 0, 0), "Decision Boundary"); annotate("svm_pos", new THREE.Vector3(scale * 0.9, 0, 0), "Class +1"); annotate("svm_neg", new THREE.Vector3(-scale * 0.9, 0, 0), "Class -1"); }
            
            const TAU = 6.283185307179586; const u = (i + 0.5) / count; const cls = i < count * 0.5 ? -1.0 : 1.0; const local = cls < 0.0 ? u * 2.0 : (u - 0.5) * 2.0;
            
            const t = time * flow; const ga = 2.399963229728653; const ang = i * ga + t * 0.18; const rad = scale * spread * Math.sqrt(local + 0.000001);
            
            const ca = Math.cos(ang); const sa = Math.sin(ang);
            
            const cy = (rad * ca) / (1.0 + 0.22 * kernel * rad / (scale + 0.000001)); const cz = (rad * sa) / (1.0 + 0.18 * kernel * rad / (scale + 0.000001));
            
            const nx = Math.cos(rotate); const ny = Math.sin(rotate) * 0.72; const nz = Math.sin(rotate * 0.7) * 0.42;
            
            const nLen = 1.0 / Math.sqrt(nx * nx + ny * ny + nz * nz + 0.000001); const ux = nx * nLen; const uy = ny * nLen; const uz = nz * nLen;
            
            const baseSep = margin * (1.25 + 0.75 * Math.sin(t * 0.35)); const shell = Math.cos(local * TAU * support + t * 0.55); const shellAbs = Math.abs(shell); const nearMargin = 1.0 - Math.pow(shellAbs, 0.65); const offset = cls * (baseSep + margin * 0.9 * nearMargin) + biasCtrl;
            
            const px0 = ux * offset; const py0 = uy * offset + cy; const pz0 = uz * offset + cz;
            
            const score0 = ux * px0 + uy * py0 + uz * pz0 - biasCtrl; const warp = kernel * ( 0.22 * Math.sin(py0 * 0.045 + t + cls * 0.9) + 0.18 * Math.cos(pz0 * 0.04 - t * 0.8) + 0.12 * Math.sin((py0 + pz0) * 0.028 + score0 * 0.03) ) * scale;
            
            const px = px0 + ux * warp; const py = py0 + 0.16 * warp * Math.sin(ang * 0.7 + t * 0.4); const pz = pz0 + 0.16 * warp * Math.cos(ang * 0.6 - t * 0.5);
            
            target.set(px, py, pz);
            
            const score = ux * px + uy * py + uz * pz - biasCtrl; const dist = Math.abs(score); const marginNorm = dist / (margin + 0.000001); const svGlow = Math.exp(-marginNorm * marginNorm * 1.6); const classHue = cls > 0.0 ? 0.58 : 0.02; const hue = classHue + 0.08 * svGlow + 0.03 * Math.sin(ang * 0.2 + t * 0.25); const sat = 0.72 + 0.26 * svGlow; const lit = 0.34 + 0.18 * (1.0 - Math.min(1.0, marginNorm)) + 0.22 * svGlow + 0.08 * local;
            
            color.setHSL(hue - Math.floor(hue), sat, lit);
            
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
