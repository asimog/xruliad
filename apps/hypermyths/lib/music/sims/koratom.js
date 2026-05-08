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
        const PARAMS = {"speed":1,"radius":45,"nucleus":5,"spread":60};
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
            const speed = addControl("speed", "Orbit Speed", 0.1, 3.0, 1.0);
            const radius = addControl("radius", "Ring Radius", 20, 80, 45);
            const nucleusSize = addControl("nucleus", "Nucleus Size", 1, 15, 5);
            const spread = addControl("spread", "Background Spread", 10, 100, 60);
            const nucleusCount = Math.floor(count * 0.08);
            const ringCount = Math.floor(count * 0.6);
            const ringSize = Math.floor(ringCount / 3);
            const ambientCount = count - nucleusCount - ringCount;
            const t = time * speed;
            if (i < nucleusCount) {
              const phi = (i / nucleusCount) * Math.PI * 2 + t * 0.5;
              const theta = (i / nucleusCount) * Math.PI;
              const r = nucleusSize * (0.3 + 0.7 * Math.abs(Math.sin(t * 2 + i * 0.1)));
              target.set(Math.sin(theta) * Math.cos(phi) * r, Math.sin(theta) * Math.sin(phi) * r, Math.cos(theta) * r);
              const pulse = 0.5 + 0.5 * Math.sin(t * 3);
              color.setRGB(0.486 + pulse * 0.2, 0.227 + pulse * 0.1, 0.929);
            } else if (i < nucleusCount + ringCount) {
              const ri = i - nucleusCount;
              const ringIdx = Math.floor(ri / ringSize);
              const pi = ri - ringIdx * ringSize;
              const angle = (pi / ringSize) * Math.PI * 2 + t * (1.0 + ringIdx * 0.4) * (ringIdx === 1 ? -1 : 1);
              let x = Math.cos(angle) * radius;
              let y = Math.sin(angle) * radius;
              let z = 0;
              const tiltX = ringIdx === 0 ? 0.436 : ringIdx === 1 ? 1.134 : 1.431;
              const tiltZ = ringIdx === 0 ? 0.174 : ringIdx === 1 ? 0.733 : -0.384;
              const cosX = Math.cos(tiltX);
              const sinX = Math.sin(tiltX);
              const y1 = y * cosX - z * sinX;
              const z1 = y * sinX + z * cosX;
              const cosZ = Math.cos(tiltZ);
              const sinZ = Math.sin(tiltZ);
              const x2 = x * cosZ - y1 * sinZ;
              const y2 = x * sinZ + y1 * cosZ;
              target.set(x2, y2, z1);
              if (ringIdx === 0) { color.setRGB(0.486, 0.227, 0.929); } else if (ringIdx === 1) { color.setRGB(0.024, 0.714, 0.831); } else { color.setRGB(0.655, 0.545, 0.980); }
            } else {
              const ai = i - nucleusCount - ringCount;
              const phi = ai * 2.399 + Math.sin(t * 0.1 + ai * 0.01) * 0.1;
              const theta = Math.acos(1 - 2 * (ai + 0.5) / ambientCount);
              const r = spread * (0.8 + 0.2 * Math.sin(t * 0.3 + ai * 0.05));
              target.set(Math.sin(theta) * Math.cos(phi) * r, Math.sin(theta) * Math.sin(phi) * r, Math.cos(theta) * r);
              const mix = Math.sin(ai * 0.1 + t * 0.5) * 0.5 + 0.5;
              color.setRGB(0.486 * (1 - mix) + 0.024 * mix, 0.227 * (1 - mix) + 0.714 * mix, 0.929 * (1 - mix) + 0.831 * mix);
            }
            if (i === 0) { setInfo("Atom", "Nucleus + 3 orbital rings"); }
            
            
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
