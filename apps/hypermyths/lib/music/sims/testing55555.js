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
        const PARAMS = {"scale":80,"speed":0.8,"twist":1.5,"persp":3.5};
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
            const scale = addControl("scale", "Scale", 10, 200, 80);
            const speed = addControl("speed", "4D Rotation Speed", 0, 3, 0.8);
            const twist = addControl("twist", "Twist", 0, 5, 1.5);
            const persp = addControl("persp", "4D Perspective", 1.5, 6.0, 3.5);
            
            if (i === 0) {
            setInfo("4D Tesseract Breathing", "A rotating hypercube projected from 4D, pulsing through dimensional folds.");
            annotate("core", new THREE.Vector3(0, 0, 0), "4D Core");
            }
            
            let t = i / count;
            
            // pseudo-random but deterministic 4D lattice
            let a = t;
            let b = t * 7.23; b = b - Math.floor(b);
            let c = t * 13.57; c = c - Math.floor(c);
            let d = t * 19.91; d = d - Math.floor(d);
            
            // map to [-1,1]
            let x = a * 2.0 - 1.0;
            let y = b * 2.0 - 1.0;
            let z = c * 2.0 - 1.0;
            let w = d * 2.0 - 1.0;
            
            // breathing in 4th dimension
            let pulse = Math.sin(time * speed) * 0.5 + 0.5;
            w *= (0.6 + pulse * 0.8);
            
            // 4D rotations
            let ct = Math.cos(time * speed);
            let st = Math.sin(time * speed);
            
            // rotate X-W plane
            let x2 = x * ct - w * st;
            let w2 = x * st + w * ct;
            
            // rotate Y-Z plane
            let ct2 = Math.cos(time * twist);
            let st2 = Math.sin(time * twist);
            let y2 = y * ct2 - z * st2;
            let z2 = y * st2 + z * ct2;
            
            // 4D -> 3D projection
            let denom = persp - w2;
            denom = denom === 0.0 ? 0.0001 : denom;
            let k = 1.0 / denom;
            
            // final position
            target.set(
            x2 * k * scale,
            y2 * k * scale,
            z2 * k * scale
            );
            
            // color based on 4D depth + index
            let hue = (w2 * 0.5 + 0.5 + t) % 1.0;
            let light = 0.4 + 0.3 * k;
            color.setHSL(hue, 0.9, light);
            
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
