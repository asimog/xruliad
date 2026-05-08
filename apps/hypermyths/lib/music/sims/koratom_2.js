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
        const PARAMS = {"speed":0.8,"radius":30,"nucleus":4,"thick":0.6};
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
            const speed = addControl("speed", "Orbit Speed", 0.1, 3.0, 0.8);
            const radius = addControl("radius", "Ring Radius", 15, 60, 30);
            const nucleusSize = addControl("nucleus", "Nucleus Size", 1, 12, 4);
            const thickness = addControl("thick", "Ring Thickness", 0.1, 3.0, 0.6);
            
            const nucleusCount = Math.floor(count * 0.15);
            const ringCount = Math.floor(count * 0.75);
            const ringSize = Math.floor(ringCount / 3);
            const ambientCount = count - nucleusCount - ringCount;
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
              const noiseR = Math.sin(frac * 47.0 + i * 0.01) * thickness;
              const noiseY = Math.cos(frac * 31.0 + i * 0.02) * thickness * 0.5;
              const rr = radius + noiseR;
              let x = Math.cos(angle) * rr;
              let y = Math.sin(angle) * rr;
              let z = noiseY;
              const tiltX = ringIdx === 0 ? 0.44 : ringIdx === 1 ? 1.13 : 1.45;
              const tiltZ = ringIdx === 0 ? 0.17 : ringIdx === 1 ? 0.73 : -0.38;
              const cx = Math.cos(tiltX);
              const sx = Math.sin(tiltX);
              const y1 = y * cx - z * sx;
              const z1 = y * sx + z * cx;
              const cz = Math.cos(tiltZ);
              const sz = Math.sin(tiltZ);
              target.set(x * cz - y1 * sz, x * sz + y1 * cz, z1);
              const bright = 0.6 + 0.4 * Math.pow(Math.abs(Math.sin(angle * 2 + t)), 3);
              if (ringIdx === 0) {
                color.setRGB(0.49 * bright, 0.23 * bright, 0.93 * bright);
              } else if (ringIdx === 1) {
                color.setRGB(0.02 * bright, 0.71 * bright, 0.83 * bright);
              } else {
                color.setRGB(0.42 * bright, 0.30 * bright, 0.98 * bright);
              }
            } else {
              const ai = i - nucleusCount - ringCount;
              const golden = 2.399963;
              const theta = Math.acos(1 - 2 * (ai + 0.5) / ambientCount);
              const phi = golden * ai;
              const r = radius * 2.2 + Math.sin(t * 0.2 + ai * 0.03) * 8;
              target.set(
                Math.sin(theta) * Math.cos(phi) * r * 0.3,
                Math.sin(theta) * Math.sin(phi) * r * 0.3,
                Math.cos(theta) * r * 0.3
              );
              const mix = Math.sin(ai * 0.05 + t * 0.3) * 0.5 + 0.5;
              color.setRGB(
                (0.49 * (1 - mix) + 0.02 * mix) * 0.3,
                (0.23 * (1 - mix) + 0.71 * mix) * 0.3,
                (0.93 * (1 - mix) + 0.83 * mix) * 0.3
              );
            }
            
            if (i === 0) {
              setInfo("korFlow Atom", "15% nucleus, 75% rings, 10% ambient. Adjust Ring Thickness for sharper orbits.");
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
