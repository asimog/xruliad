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
        const PARAMS = {"mass":35,"accretion":200,"jetPower":80,"timeScale":1.2};
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
            const bhMass = addControl("mass", "Supermassive Scale", 10.0, 100.0, 35.0);
            const accretion = addControl("accretion", "Disk Spread", 20.0, 500.0, 200.0);
            const jetPower = addControl("jetPower", "Jet Reach", 1.0, 200.0, 80.0);
            const timeScale = addControl("timeScale", "Time Dilation", 0.1, 3.0, 1.2);
            
            if (i === 0) {
            setInfo("Quasar Engine", "Supermassive Black Hole with Photon Sphere, Accretion Disk, and Relativistic Jets.");
            annotate("singularity", new THREE.Vector3(0, 0, 0), "Singularity");
            }
            
            const norm = i / count;
            const t = time * timeScale;
            const r_s = bhMass * 1.2;
            
            const pType = i % 100;
            const mJet = pType < 6 ? 1.0 : 0.0;
            const mRing = (pType >= 6 && pType < 14) ? 1.0 : 0.0;
            const mDisk = pType >= 14 ? 1.0 : 0.0;
            
            const goldenRatio = 2.39996322972865332;
            const baseAngle = i * goldenRatio;
            
            const phi = Math.acos(1.0 - 2.0 * ((i * 137.03) % 1.0));
            const theta = Math.sqrt(count * Math.PI) * phi;
            
            const r_disk = r_s * 1.5 + Math.pow(norm, 2.5) * accretion;
            const orbitalSpeed = 15.0 / Math.sqrt(r_disk + 1.0);
            const diskAngle = baseAngle + t * orbitalSpeed;
            
            const warpAngle = diskAngle * 2.0 - t * 0.8;
            const warpDistortion = Math.sin(warpAngle) * (r_s * 1.8) * Math.exp(-norm * 6.0);
            const diskThickness = (Math.sin(i * 31.0) * Math.cos(i * 73.0)) * (r_disk * 0.04);
            
            const dx = Math.cos(diskAngle) * r_disk;
            const dz = Math.sin(diskAngle) * r_disk;
            const dy = warpDistortion + diskThickness;
            
            const jetFlow = (t * 25.0 + norm * 2000.0) % jetPower;
            const jetSign = (i % 2 === 0) ? 1.0 : -1.0;
            const jetRadius = r_s * 0.3 + Math.sin(jetFlow * 0.15) * (jetFlow * 0.08);
            
            const jx = Math.cos(theta) * jetRadius;
            const jz = Math.sin(theta) * jetRadius;
            const jy = (r_s + jetFlow * 2.5) * jetSign;
            
            const ringR = r_s * 1.05 + (i % 10) * 0.15;
            const ringSpeed = 20.0 + (i % 7);
            const ringTheta = theta + t * ringSpeed;
            
            const rx = Math.cos(ringTheta) * Math.sin(phi) * ringR;
            const ry = Math.cos(phi) * ringR;
            const rz = Math.sin(ringTheta) * Math.sin(phi) * ringR;
            
            const finalX = dx * mDisk + jx * mJet + rx * mRing;
            const finalY = dy * mDisk + jy * mJet + ry * mRing;
            const finalZ = dz * mDisk + jz * mJet + rz * mRing;
            
            target.set(finalX, finalY, finalZ);
            
            const tempFactor = Math.exp(-norm * 4.0);
            const cDiskH = 0.02 + norm * 0.08 + tempFactor * 0.05;
            const cDiskL = Math.max(0.01, (1.0 - norm * 1.1) * 0.9 + tempFactor * 0.5);
            
            const jetEnergy = 1.0 - (jetFlow / jetPower);
            const cJetH = 0.60 + jetEnergy * 0.15;
            const cJetL = Math.max(0.0, jetEnergy * 1.2);
            
            const cRingH = 0.08;
            const cRingL = 1.0;
            
            const h = cDiskH * mDisk + cJetH * mJet + cRingH * mRing;
            const l = cDiskL * mDisk + cJetL * mJet + cRingL * mRing;
            
            color.setHSL(h, 1.0, Math.min(1.0, l));
            
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
