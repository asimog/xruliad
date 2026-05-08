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
        const PARAMS = {"speed":1.7,"radius":30,"nucleus":5,"trail":25};
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
            const speed = addControl("speed", "Orbit Speed", 0.1, 3.0, 1.7);
            const radius = addControl("radius", "Ring Radius", 15, 60, 30);
            const nucleusSize = addControl("nucleus", "Nucleus Size", 1, 12, 5);
            const trailLen = addControl("trail", "Trail Length", 5, 40, 25);
            
            const nucleusCount = Math.floor(count * 0.12);
            const ringCount = Math.floor(count * 0.65);
            const ringSize = Math.floor(ringCount / 3);
            const electronTrailCount = Math.floor(count * 0.18);
            const trailPerRing = Math.floor(electronTrailCount / 3);
            const ambientCount = count - nucleusCount - ringCount - electronTrailCount;
            const t = time * speed;
            
            if (i < nucleusCount) {
              const golden = 2.399963;
              const theta = Math.acos(1 - 2 * (i + 0.5) / nucleusCount);
              const phi = golden * i + t * 0.3;
              const r = nucleusSize * (0.5 + 0.5 * Math.pow(Math.abs(Math.sin(t * 1.5 + i * 0.2)), 0.5));
              target.set(
                Math.sin(theta) * Math.cos(phi) * r,
                Math.sin(theta) * Math.sin(phi) * r,
                Math.cos(theta) * r
              );
              const pulse = 0.7 + 0.3 * Math.sin(t * 2.5 + i * 0.1);
              color.setRGB(0.65 * pulse, 0.35 * pulse, 1.0 * pulse);
            
            } else if (i < nucleusCount + ringCount) {
              const ri = i - nucleusCount;
              const ringIdx = Math.floor(ri / ringSize);
              const pi = ri - ringIdx * ringSize;
              const frac = pi / ringSize;
              const orbitSpeed = (1.0 + ringIdx * 0.3) * (ringIdx === 1 ? -1 : 1);
              const angle = frac * Math.PI * 2 + t * orbitSpeed;
              let x = Math.cos(angle) * radius;
              let y = Math.sin(angle) * radius;
              let z = 0;
              const tiltX = ringIdx === 0 ? 0.44 : ringIdx === 1 ? 1.13 : 1.45;
              const tiltZ = ringIdx === 0 ? 0.17 : ringIdx === 1 ? 0.73 : -0.38;
              const cx = Math.cos(tiltX);
              const sx = Math.sin(tiltX);
              const y1 = y * cx - z * sx;
              const z1 = y * sx + z * cx;
              const cz = Math.cos(tiltZ);
              const sz = Math.sin(tiltZ);
              target.set(x * cz - y1 * sz, x * sz + y1 * cz, z1);
              const bright = 0.5 + 0.2 * Math.sin(angle * 3 + t);
              if (ringIdx === 0) {
                color.setRGB(0.49 * bright, 0.23 * bright, 0.93 * bright);
              } else if (ringIdx === 1) {
                color.setRGB(0.02 * bright, 0.71 * bright, 0.83 * bright);
              } else {
                color.setRGB(0.42 * bright, 0.30 * bright, 0.98 * bright);
              }
            
            } else if (i < nucleusCount + ringCount + electronTrailCount) {
              const ei = i - nucleusCount - ringCount;
              const ringIdx = Math.floor(ei / trailPerRing);
              const trailIdx = ei - ringIdx * trailPerRing;
              const trailFrac = trailIdx / trailPerRing;
              const orbitSpeed = (1.0 + ringIdx * 0.3) * (ringIdx === 1 ? -1 : 1);
              const electronAngle = t * orbitSpeed * 3.0;
              const trailOffset = trailFrac * (trailLen * 0.04);
              const angle = electronAngle - trailOffset;
              let x = Math.cos(angle) * radius;
              let y = Math.sin(angle) * radius;
              let z = 0;
              const tiltX = ringIdx === 0 ? 0.44 : ringIdx === 1 ? 1.13 : 1.45;
              const tiltZ = ringIdx === 0 ? 0.17 : ringIdx === 1 ? 0.73 : -0.38;
              const cx = Math.cos(tiltX);
              const sx = Math.sin(tiltX);
              const y1 = y * cx - z * sx;
              const z1 = y * sx + z * cx;
              const cz = Math.cos(tiltZ);
              const sz = Math.sin(tiltZ);
              target.set(x * cz - y1 * sz, x * sz + y1 * cz, z1);
              const fade = 1.0 - trailFrac;
              const fadeCurve = fade * fade;
              if (trailFrac < 0.02) {
                color.setRGB(1.0, 1.0, 1.0);
              } else if (ringIdx === 0) {
                color.setRGB(0.7 * fadeCurve, 0.4 * fadeCurve, 1.0 * fadeCurve);
              } else if (ringIdx === 1) {
                color.setRGB(0.1 * fadeCurve, 0.9 * fadeCurve, 1.0 * fadeCurve);
              } else {
                color.setRGB(0.6 * fadeCurve, 0.45 * fadeCurve, 1.0 * fadeCurve);
              }
            
            } else {
              const ai = i - nucleusCount - ringCount - electronTrailCount;
              const golden = 2.399963;
              const theta = Math.acos(1 - 2 * (ai + 0.5) / ambientCount);
              const phi = golden * ai + t * 0.05;
              const r = radius * 2.5;
              target.set(
                Math.sin(theta) * Math.cos(phi) * r,
                Math.sin(theta) * Math.sin(phi) * r,
                Math.cos(theta) * r
              );
              const mix = Math.sin(ai * 0.05 + t * 0.3) * 0.5 + 0.5;
              color.setRGB(
                (0.49 * (1 - mix) + 0.02 * mix) * 0.15,
                (0.23 * (1 - mix) + 0.71 * mix) * 0.15,
                (0.93 * (1 - mix) + 0.83 * mix) * 0.15
              );
            }
            
            if (i === 0) {
              setInfo("korFlow Atom", "Electrons with trails orbiting. Adjust Trail Length slider.");
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
