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
        const PARAMS = {"spd":0.4,"hR":32,"tS":48,"thick":4};
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
            const spd = addControl("spd", "Morph Speed", 0.1, 2.0, 0.4);                                                                                                                                                         
              const hR = addControl("hR", "Helix Radius", 5, 55, 32);                                                                                                                                                              
              const tS = addControl("tS", "Text Scale", 15, 80, 48);                                                                                                                                                               
              const thick = addControl("thick", "Boldness", 1, 12, 4);                                                                                                                                                             
              const r1 = Math.abs(Math.sin(i * 127.1 + 311.7));                                                                                                                                                                    
              const r2 = Math.abs(Math.sin(i * 269.5 + 183.3));               
              const r3 = Math.abs(Math.sin(i * 419.2 + 71.9));                                                                                                                                                                     
              const raw = Math.sin(time * spd) * 0.5 + 0.5;                                                                                                                                                                      
              const m = raw * raw * (3.0 - 2.0 * raw);                                                                                                                                                                             
              const burst = Math.sin(m * 3.14159) * 18;                                                                                                                                                                          
              const n = i / count;                                                                                                                                                                                                 
              const ci = n < 0.3 ? 0 : n < 0.63 ? 1 : 2;                      
              const ct = ci === 0 ? n / 0.3 : ci === 1 ? (n - 0.3) / 0.33 : (n - 0.63) / 0.37;                                                                                                                                     
              const cW = tS * 0.52;                                                                                                                                                                                              
              const cH = tS;                                                                                                                                                                                                       
              const ox = (ci - 1) * tS * 0.88;
              let tx = 0;                                                                                                                                                                                                          
              let ty = 0;                                                     
              if (ci === 0) {
                const seg = ct * 5;
                if (seg < 3.5) { tx = 0; ty = (seg / 3.5 - 0.5) * cH; }
                else if (seg < 4.3) { tx = ((seg - 3.5) / 0.8 - 0.5) * cW * 0.7; ty = -cH * 0.5; }
                else { const f = (seg - 4.3) / 0.7; tx = -f * cW * 0.35; ty = cH * 0.5 - f * cH * 0.22; }
              }
              if (ci === 1) {
                const a = ct * 6.2832;
                tx = Math.cos(a) * cW * 0.48;
                ty = Math.sin(a) * cH * 0.5;
              }
              if (ci === 2) {
                if (ct < 0.5) { const p = ct * 2 - 0.5; tx = p * cW * 0.75; ty = p * cH; }
                else { const p = (ct - 0.5) * 2 - 0.5; tx = p * cW * 0.75; ty = -p * cH; }
              }
              tx += ox + (r1 - 0.5) * thick;
              ty += (r2 - 0.5) * thick;
              const tz = (r3 - 0.5) * thick * 1.5;
              tx *= 1.0 + Math.sin(time * 1.2) * 0.02;
              ty *= 1.0 + Math.sin(time * 1.2) * 0.02;                                                                                                                                                                           
              const turns = 6;                                                                                                                                                                                                     
              const ang = n * 6.2832 * turns + time * 0.65;                                                                                                                                                                      
              const stOff = (i % 2) * 3.14159;                                                                                                                                                                                     
              const hx = Math.cos(ang + stOff) * hR;                          
              const hy = (n - 0.5) * 180;                                                                                                                                                                                          
              const hz = Math.sin(ang + stOff) * hR;                                                                                                                                                                             
              const isBP = (i % 12) < 2;                                                                                                                                                                                           
              let bpx = hx;                   
              let bpz = hz;                                                                                                                                                                                                        
              if (isBP) {                                                                                                                                                                                                        
                const ba = Math.floor(i / 12) * 0.5236 + time * 0.3;                                                                                                                                                               
                const sd = (i % 2) * 2 - 1;   
                bpx = Math.cos(ba) * hR * sd * 0.85;                                                                                                                                                                               
                bpz = Math.sin(ba) * hR * sd * 0.85;                                                                                                                                                                             
              }                                                                                                                                                                                                                    
              const dx = isBP ? bpx : hx;     
              const dz = isBP ? bpz : hz;                                                                                                                                                                                          
              target.set(                                                                                                                                                                                                          
                tx + (dx - tx) * m + (r1 - 0.5) * burst,
                ty + (hy - ty) * m + (r2 - 0.5) * burst,                                                                                                                                                                           
                tz + (dz - tz) * m + (r3 - 0.5) * burst                       
              );
              const gH = 0.09 + Math.sin(time * 1.5 + n * 8) * 0.04;
              const sH = (i % 2) > 0 ? 0.54 : 0.84;
              const bH = 0.13;
              const fH = isBP && m > 0.5 ? bH : gH + (sH - gH) * m;
              const fS = 0.78 + m * 0.22;
              const fL = 0.48 + Math.sin(time * 2.5 + i * 0.004) * 0.14;
              color.setHSL(fH, fS, Math.max(0.18, Math.min(0.82, fL)));                                                                                                                                                          
              if (i === 0) {                                                                                                                                                                                                       
                const ph = m < 0.2 ? "10X" : m > 0.8 ? "DNA HELIX" : "MORPHING";
                setInfo("10X to DNA Double Helix", ph);                                                                                                                                                                            
                annotate("tag", new THREE.Vector3(0, -100, 0), "Particle Morph");                                                                                                                                                
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
