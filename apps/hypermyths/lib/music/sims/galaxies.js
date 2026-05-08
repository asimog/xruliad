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
        const PARAMS = {"speed":0.5,"spread":18,"gravity":2.2,"chaos":0.3,"density":3};
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
            const speed       = addControl("speed",    "Simulation Speed",  0.1, 3.0,  0.5);
            const spread      = addControl("spread",   "Galaxy Spread",      5,  40,   18);
            const gravity     = addControl("gravity",  "Gravity Pull",      0.1, 5.0,  2.2);
            const chaos       = addControl("chaos",    "Orbital Chaos",     0.0, 1.0,  0.3);
            const starDensity = addControl("density",  "Arm Density",         1,   6,    3);
            
            const half   = count * 0.5;
            const isB    = i >= half ? 1.0 : 0.0;
            const local  = isB === 1.0 ? (i - half) : i;
            const norm   = local / (half - 1.0);
            
            const armCount   = Math.floor(starDensity);
            const armIndex   = Math.floor(norm * armCount);
            const armNorm    = (norm * armCount) - armIndex;
            const armOffset  = (armIndex / armCount) * Math.PI * 2.0;
            
            const baseAngle  = armNorm * Math.PI * 4.0 + armOffset;
            const r          = armNorm * spread;
            
            const tA         = time * speed;
            
            const gAx =  spread * 1.1 * Math.cos(tA * 0.18);
            const gAy =  spread * 0.3 * Math.sin(tA * 0.11);
            const gAz =  spread * 0.2 * Math.sin(tA * 0.09);
            
            const gBx = -spread * 1.1 * Math.cos(tA * 0.18 + 0.4);
            const gBy = -spread * 0.3 * Math.sin(tA * 0.11 + 1.2);
            const gBz = -spread * 0.2 * Math.sin(tA * 0.09 + 0.8);
            
            const spinA      = tA * 0.07 * (1.0 - isB) + isB * 0.0;
            const spinB      = tA * 0.0  * (1.0 - isB) + isB * tA * 0.09;
            const spin       = spinA + spinB;
            const tiltA      = 0.2;
            const tiltB      = 0.55;
            const tilt       = tiltA * (1.0 - isB) + tiltB * isB;
            
            const wobble     = Math.sin(tA * 0.3 + norm * Math.PI * 2.0) * chaos * 1.5;
            const ang        = baseAngle + spin + wobble;
            
            const lx         = Math.cos(ang) * r;
            const ly         = Math.sin(ang) * r * Math.sin(tilt);
            const lz         = Math.sin(ang) * r * Math.cos(tilt);
            
            const gcx        = gAx * (1.0 - isB) + gBx * isB;
            const gcy        = gAy * (1.0 - isB) + gBy * isB;
            const gcz        = gAz * (1.0 - isB) + gBz * isB;
            
            const px         = lx + gcx;
            const py         = ly + gcy;
            const pz         = lz + gcz;
            
            const dxAB       = gBx - gAx;
            const dyAB       = gBy - gAy;
            const dzAB       = gBz - gAz;
            const dist2      = dxAB * dxAB + dyAB * dyAB + dzAB * dzAB + 0.001;
            const dist       = Math.sqrt(dist2);
            const approach   = Math.max(0.0, 1.0 - dist / (spread * 2.5));
            
            const dx         = isB === 0.0 ? (px - gBx) : (px - gAx);
            const dy         = isB === 0.0 ? (py - gBy) : (py - gAy);
            const dz         = isB === 0.0 ? (pz - gBz) : (pz - gAz);
            const starDist2  = dx * dx + dy * dy + dz * dz + 0.001;
            const pull       = gravity * approach / (starDist2 * 0.04 + 1.0);
            const pullDir    = Math.atan2(dy, dx);
            
            const warpX      = Math.cos(pullDir) * pull * 0.6;
            const warpY      = Math.sin(pullDir) * pull * 0.4;
            
            target.set(px + warpX, py + warpY, pz);
            
            const coreGlow   = 1.0 - Math.min(1.0, r / spread);
            const hueA       = 0.58 + norm * 0.08 + coreGlow * 0.04;
            const hueB       = 0.92 + norm * 0.06 + coreGlow * 0.03;
            const hue        = hueA * (1.0 - isB) + hueB * isB;
            const mergeHue   = hue + approach * 0.12;
            const sat        = 0.7 + coreGlow * 0.3;
            const lit        = 0.35 + coreGlow * 0.45 + approach * 0.15;
            
            color.setHSL(mergeHue % 1.0, sat, Math.min(0.95, lit));
            
            if (i === 0) {
              setInfo(
                "Binary Galaxy Collision",
                "Two spiral galaxies in gravitational interaction. Adjust Gravity Pull to warp tidal streams. Increase Chaos to shred the arms. Watch the galactic cores merge over time."
              );
              annotate("coreA", new THREE.Vector3(gAx, gAy, gAz), "Galaxy A");
              annotate("coreB", new THREE.Vector3(gBx, gBy, gBz), "Galaxy B");
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
