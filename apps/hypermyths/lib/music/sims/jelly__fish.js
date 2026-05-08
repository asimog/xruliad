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
        const PARAMS = {"pulseSpeed":1.5,"tentacleFlow":5,"shellWidth":22};
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
            const pulseSpeed = addControl("pulseSpeed", "Pulse Rate", 0.5, 4.0, 1.5);
            const tentacleFlow = addControl("tentacleFlow", "Tentacle Flux", 1.0, 10.0, 5.0);
            const shellWidth = addControl("shellWidth", "Shell Girth", 5.0, 30.0, 22.0);
            
            if (i === 0) {
            setInfo("Bioluminescent Chrysaora", "A high-density particle swarm simulating a pulsing medusa with emergent tentacle kinematics.");
            annotate("bell", new THREE.Vector3(0, 5, 0), "Pulsing Bell");
            }
            
            // Partition particles: 30% for the bell shell, 70% for tentacles
            const isShell = i < count * 0.3;
            const pTime = time * pulseSpeed;
            const pulse = Math.sin(pTime);
            const pulseAbs = Math.abs(pulse);
            
            let posX = 0;
            let posY = 0;
            let posZ = 0;
            
            if (isShell) {
            // Shell Logic: A wide, pulsing oblate spheroid cap
            const shellIndex = i / (count * 0.3);
            const theta = shellIndex * Math.PI * 2.0;
            const phi = Math.pow(shellIndex, 0.5) * (Math.PI * 0.4); // Focus particles on the top cap
            
            // Rhythmic expansion/contraction
            const radius = shellWidth * (1.0 + pulse * 0.15);
            posX = Math.sin(phi) * Math.cos(theta * 50.0) * radius;
            posZ = Math.sin(phi) * Math.sin(theta * 50.0) * radius;
            posY = Math.cos(phi) * (shellWidth * 0.4) + (pulse * 2.0);
            
            // Color: Shifting turquoise/green
            color.setHSL(0.45 + pulse * 0.05, 0.8, 0.4 + pulseAbs * 0.2);
            } else {
            // Tentacle Logic: Long flowing strands
            const tentacleIndex = (i - count * 0.3) / (count * 0.7);
            const numStrands = 60;
            const strandID = Math.floor(tentacleIndex * numStrands);
            const segmentID = (tentacleIndex * numStrands) % 1.0; // Position along a single tentacle
            
            const angle = (strandID / numStrands) * Math.PI * 2.0;
            const startRadius = shellWidth * 0.8;
            
            // Wave propagation down the tentacle
            const waveFreq = segmentID * tentacleFlow - pTime * 2.0;
            const waveAmp = segmentID * 4.0 * (1.0 + pulseAbs);
            
            posX = Math.cos(angle) * startRadius + Math.sin(waveFreq) * waveAmp;
            posZ = Math.sin(angle) * startRadius + Math.cos(waveFreq) * waveAmp;
            
            // Tentacles trail behind the bell's pulse
            posY = -segmentID * 40.0 + Math.cos(segmentID * 3.0 - pTime) * 3.0;
            
            // Color: Deep Blue (top) to Bright Turquoise (tips)
            const hue = 0.5 + segmentID * 0.15;
            const brightness = (1.0 - segmentID) * 0.5 + (pulseAbs * 0.2);
            color.setHSL(hue, 0.9, brightness);
            }
            
            // Apply a gentle vertical swimming oscillation to the whole swarm
            target.set(posX, posY + Math.sin(pTime * 0.5) * 5.0, posZ);
            
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
