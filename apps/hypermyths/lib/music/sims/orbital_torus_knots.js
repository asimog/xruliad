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
        const PARAMS = {"rings":36,"radius":65,"spread":25,"twist":3,"speed":0.8,"morph":1};
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
            const numRings = addControl("rings", "Ring Count", 1.0, 100.0, 36.0);
            const baseRadius = addControl("radius", "Base Radius", 10.0, 200.0, 65.0);
            const ringSpread = addControl("spread", "Ring Spread", 0.0, 100.0, 25.0);
            const twist = addControl("twist", "Twist & Wave", 0.0, 20.0, 3.0);
            const flowSpeed = addControl("speed", "Flow Speed", 0.0, 5.0, 0.8);
            const morph = addControl("morph", "Spherical Morph", 0.0, 1.0, 1.0);
            
            const safeRings = Math.max(1.0, Math.floor(numRings));
            const particlesPerRing = Math.max(1.0, count / safeRings);
            
            const rId = Math.floor(i / particlesPerRing);
            const pId = i % particlesPerRing;
            
            const t = time * flowSpeed;
            
            const pNorm = pId / particlesPerRing;
            const rNorm = rId / safeRings;
            
            const angle = pNorm * Math.PI * 2.0;
            const flowAngle = angle + (t * (rId % 2 === 0 ? 1.0 : -1.0));
            
            const ringPhase = rNorm * Math.PI * 2.0;
            
            const waveOffset = Math.sin(flowAngle * twist + ringPhase * 5.0 + t) * ringSpread;
            const currentRadius = baseRadius + waveOffset * (1.0 - morph * 0.5);
            
            let x = Math.cos(flowAngle) * currentRadius;
            let y = Math.sin(flowAngle) * currentRadius;
            let z = Math.sin(flowAngle * Math.max(1.0, twist) + ringPhase) * 15.0 * (1.0 - morph);
            
            const pitch = ringPhase * 2.0 * morph + t * 0.2;
            const yaw = ringPhase * Math.PI * morph - t * 0.1;
            const roll = ringPhase * 0.5 + t * 0.15;
            
            const cP = Math.cos(pitch), sP = Math.sin(pitch);
            const cY = Math.cos(yaw), sY = Math.sin(yaw);
            const cR = Math.cos(roll), sR = Math.sin(roll);
            
            let y1 = y * cP - z * sP;
            let z1 = y * sP + z * cP;
            
            let x2 = x * cY + z1 * sY;
            let z2 = -x * sY + z1 * cY;
            
            let x3 = x2 * cR - y1 * sR;
            let y3 = x2 * sR + y1 * cR;
            
            target.set(x3, y3, z2);
            
            const hueBase = rNorm + (time * 0.05) + (Math.sin(flowAngle) * 0.1);
            const hue = hueBase - Math.floor(hueBase);
            const saturation = 0.7 + 0.3 * Math.cos(flowAngle * 3.0);
            const lightness = 0.4 + 0.4 * Math.sin(flowAngle * 2.0 - t) * (z2 / baseRadius * 0.5 + 0.5);
            
            color.setHSL(hue, saturation, Math.min(1.0, Math.max(0.05, lightness)));
            
            if (i === 0) {
                setInfo("Orbital Torus Knots", "A multi-ringed geometric system interpolating between a flat wave field and a spherical interlocking planetary orbital structure.");
                annotate("center", new THREE.Vector3(0, 0, 0), "Gravity Well");
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
