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
        const PARAMS = {"radius":45,"rotSpeed":0.6,"tileCount":16,"beamCount":6};
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
            const radius = addControl("radius", "Ball Size", 20, 80, 45);
            const rotSpeed = addControl("rotSpeed", "Spin Speed", 0, 3, 0.6);
            const tileCount = addControl("tileCount", "Tile Density", 8, 30, 16);
            const beamCount = addControl("beamCount", "Light Beams", 2, 12, 6);
            
            const tiles = Math.round(tileCount);
            const tileStep = Math.PI / tiles;
            
            const golden = 2.399963229728653;
            const rawPhi = Math.acos(1 - 2 * (i / count));
            const rawTheta = golden * i;
            
            const row = Math.round(rawPhi / tileStep);
            const clampedPhi = row * tileStep;
            const sp = Math.sin(clampedPhi);
            const colCount = Math.max(1, Math.round(2 * Math.PI * sp / tileStep));
            const colStep = (colCount > 0) ? (2 * Math.PI / colCount) : 0;
            const col = colStep > 0 ? Math.round(rawTheta / colStep) : 0;
            const clampedTheta = col * colStep + time * rotSpeed;
            
            const tileId = row * 997 + col;
            const withinTile = (i % 7) / 7;
            const tileSpreadPhi = (withinTile - 0.5) * tileStep * 0.7;
            const tileSpreadTheta = (((i * 3) % 7) / 7 - 0.5) * (colStep > 0 ? colStep : tileStep) * 0.7;
            
            const finalPhi = clampedPhi + tileSpreadPhi;
            const finalTheta = clampedTheta + tileSpreadTheta;
            
            const sfp = Math.sin(finalPhi);
            const x = radius * sfp * Math.cos(finalTheta);
            const y = radius * Math.cos(finalPhi);
            const z = radius * sfp * Math.sin(finalTheta);
            
            target.set(x, y, z);
            
            const beams = Math.max(2, Math.round(beamCount));
            const lightAngle1 = time * 1.5;
            const lightAngle2 = time * 0.9 + 2.09;
            const facePhi = clampedPhi;
            const faceTheta = clampedTheta;
            
            const dot1 = Math.sin(facePhi) * Math.cos(faceTheta - lightAngle1) * 0.7 + Math.cos(facePhi) * 0.3;
            const dot2 = Math.sin(facePhi) * Math.cos(faceTheta - lightAngle2) * 0.7 - Math.cos(facePhi) * 0.5;
            const reflect1 = Math.pow(Math.max(0, dot1), 12.0);
            const reflect2 = Math.pow(Math.max(0, dot2), 12.0);
            
            const flashSeed = Math.sin(tileId * 1.618 + time * beams) * 0.5 + 0.5;
            const flash = Math.pow(flashSeed, 6.0);
            
            const brightness = 0.08 + 0.55 * reflect1 + 0.4 * reflect2 + 0.35 * flash;
            const hue1 = (faceTheta * 0.12 + time * 0.05 + reflect1 * 0.3) % 1;
            const sat = 0.3 + 0.7 * (reflect1 + reflect2 + flash);
            const safeHue = hue1 < 0 ? hue1 + 1 : hue1;
            
            color.setHSL(safeHue, Math.min(sat, 1), Math.min(brightness, 1));
            
            if (i === 0) setInfo("Retro Disco Ball", "Mirror tile grid with sweeping spotlights");
            
            
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
