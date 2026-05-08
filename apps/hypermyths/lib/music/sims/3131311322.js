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
        const PARAMS = {"growth":0.4,"petals":6,"chaos":0.2};
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
            const growth = addControl("growth", "Bloom Growth", 0.01, 1.0, 0.4);
            const petalCount = addControl("petals", "Petal Density", 2, 12, 6);
            const chaos = addControl("chaos", "Wind Influence", 0, 1, 0.2);
            
            if (i === 0) {
              setInfo("Phyllotaxis Rose", "A mathematical bloom using Vogel's spiral and polar coordinate displacement.");
              annotate("bloom", new THREE.Vector3(0, 40, 0), "The Heart");
            }
            
            const goldenAngle = 137.507764 * (Math.PI / 180);
            const ratio = i / count;
            const angle = i * goldenAngle;
            
            const spiralRadius = Math.sqrt(i) * 2.0 * growth;
            const wave = Math.sin(angle * petalCount + time) * 5.0 * ratio;
            const lift = Math.pow(ratio, 0.5) * 60.0 * growth;
            
            const tx = Math.cos(angle) * (spiralRadius + wave);
            const ty = lift + Math.sin(time + ratio * 10.0) * chaos * 2.0;
            const tz = Math.sin(angle) * (spiralRadius + wave);
            
            const stemMask = i < count * 0.1 ? 1 : 0;
            const sx = Math.sin(i * 0.5 + time) * chaos * stemMask;
            const sy = (i / (count * 0.1)) * -30.0 * stemMask;
            const sz = Math.cos(i * 0.5 + time) * chaos * stemMask;
            
            target.set(
              tx * (1 - stemMask) + sx,
              ty * (1 - stemMask) + sy,
              tz * (1 - stemMask) + sz
            );
            
            const hue = stemMask > 0 ? 0.3 + ratio * 0.1 : 0.95 - ratio * 0.4;
            const saturation = 0.8 + ratio * 0.2;
            const lightness = stemMask > 0 ? 0.2 + ratio : 0.3 + (1.0 - ratio) * 0.4;
            
            color.setHSL(hue % 1.0, saturation, lightness);
            
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
