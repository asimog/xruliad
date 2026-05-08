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
        const PARAMS = {"breath":1,"hyper":3,"speed":1};
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
            const breathScale = addControl("breath", "Breath Intensity", 0.1, 2.0, 1.0);
            const hyperD = addControl("hyper", "4D Warp", 0.1, 10.0, 3.0);
            const speed = addControl("speed", "Neural Speed", 0.1, 5.0, 1.0);
            
            const t = time * speed;
            const ratio = i / count;
            const breath = Math.sin(t * 1.5) * 0.2 * breathScale + 1.0;
            
            const phi = Math.acos(1.0 - 2.0 * ratio);
            const theta = Math.sqrt(count * Math.PI) * phi;
            
            let r = 50.0;
            const snout = Math.pow(Math.abs(Math.sin(phi * 0.5)), 8.0) * 40.0;
            const ears = Math.pow(Math.abs(Math.cos(theta * 2.0)), 12.0) * Math.sin(phi) * 25.0;
            r = (r + snout + ears) * breath;
            
            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta);
            const z = r * Math.cos(phi);
            
            const w = Math.sin(t + ratio * hyperD) * 20.0;
            const s4 = 1.0 / (1.0 + Math.abs(w) * 0.01);
            
            const finalX = x * s4;
            const finalY = (y + snout * 0.5) * s4;
            const finalZ = (z + w) * s4;
            
            target.set(finalX, finalY, finalZ);
            
            const hue = (0.6 + Math.sin(t * 0.2 + ratio * 5.0) * 0.1) % 1.0;
            const saturation = 0.4 + Math.sin(phi * 2.0) * 0.3;
            const lightness = 0.5 + Math.cos(t + ratio * 10.0) * 0.2;
            color.setHSL(hue, saturation, lightness);
            
            if (i === 0) {
            setInfo("Hyper-Dog 4D", "A biological entity pulsing through the 4th dimension.");
            annotate("snout", new THREE.Vector3(0, 60 * breath, 0), "Olfactory Projection");
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
