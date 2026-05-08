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
        const PARAMS = {"waveH":3.5,"waveS":1,"chop":0.4,"storm":0,"spread":30,"depth":0.5};
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
            // Ocean water body — overlapping wave trains with foam and caustics
            
            const waveH  = addControl("waveH",  "Wave Height",   0.5, 12,  3.5);
            const waveS  = addControl("waveS",  "Wave Speed",    0,   4,   1.0);
            const chop   = addControl("chop",   "Choppiness",   0,   1,   0.4);
            const storm  = addControl("storm",  "Storm Surge",  0,   1,   0.0);
            const spread = addControl("spread", "Ocean Size",   10,  60,  30);
            const depth  = addControl("depth",  "Depth Color",  0,   1,   0.5);
            
            const gw     = Math.ceil(Math.sqrt(count));
            const col    = i % gw;
            const row    = Math.floor(i / gw);
            const px     = (col / gw - 0.5) * spread;
            const pz     = (row / gw - 0.5) * spread;
            
            const sM     = 1 + storm * 4;
            const t      = time * waveS;
            
            const w1     = Math.sin(px * 0.18 - t * 1.1) * waveH * sM;
            const w2     = Math.sin(px * 0.11 + pz * 0.09 - t * 0.85) * waveH * 0.65 * sM;
            const w3     = Math.sin(px * 0.35 - pz * 0.25 - t * 1.6) * waveH * chop * sM;
            const w4     = Math.sin(px * 0.22 + pz * 0.28 + t * 1.3) * waveH * chop * 0.5 * sM;
            
            const raw    = (w1 + w2 + w3 + w4) / (1 + chop);
            const sharp  = Math.pow(Math.abs(raw) / (waveH * sM + 0.001), 1.4) * Math.sign(raw + 0.001);
            const py     = raw * (1 - chop * 0.3) + sharp * waveH * chop * sM * 0.4;
            
            target.set(px, py, pz);
            
            const maxH   = waveH * sM * 2.2 + 0.001;
            const hFrac  = Math.max(0, Math.min(1, (py + maxH) / (maxH * 2)));
            
            const foamT  = Math.max(0, hFrac - 0.72) * 3.5;
            const foam   = Math.min(1, foamT * foamT * (1 + storm * 2));
            
            const caus   = Math.pow(Math.max(0, Math.sin(px * 1.7 + pz * 2.1 + time * 3)), 6) * (1 - hFrac) * 0.6;
            
            const baseHue= 0.62 - depth * 0.1 - hFrac * 0.08;
            const sat    = 0.75 + storm * 0.15 - foam * 0.75;
            const lit    = 0.22 + hFrac * 0.28 + foam * 0.55 + caus * 0.25;
            
            color.setHSL(baseHue, Math.max(0, sat), Math.min(1, lit));
            
            if (i === 0) {
              setInfo(
                "Ocean Water Body",
                "4 overlapping wave trains with Gerstner crest sharpening. Foam appears at peaks. Caustic shimmer in troughs. Crank Storm Surge for rough seas."
              );
              annotate("surf", new THREE.Vector3(0, 0, 0), "Sea Level");
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
