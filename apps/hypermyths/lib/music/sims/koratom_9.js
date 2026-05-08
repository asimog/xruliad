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
        const PARAMS = {"speed":1.7,"radius":30,"nucleus":7,"trail":25};
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
            const nucleusSize = addControl("nucleus", "Nucleus Size", 1, 15, 7);
            const trailLen = addControl("trail", "Trail Length", 5, 40, 25);
            
            const sphereCount = 20;
            const ptsPerSphere = 100;
            const nucleusCount = sphereCount * ptsPerSphere;
            const electronHeadCount = 3 * 80;
            const electronTrailCount = Math.floor(count * 0.18);
            const trailPerRing = Math.floor(electronTrailCount / 3);
            const ringTotal = count - nucleusCount - electronHeadCount - electronTrailCount;
            const ringSize = Math.floor(ringTotal / 3);
            const t = time * speed;
            
            const tlX0 = 0.44;
            const tlX1 = 1.13;
            const tlX2 = 1.45;
            const tlZ0 = 0.17;
            const tlZ1 = 0.73;
            const tlZ2 = -0.38;
            
            const golden = 2.399963;
            
            const sCenters = [
              0.0, 0.0, 0.0,
              1.0, 0.0, 0.0,
              -1.0, 0.0, 0.0,
              0.0, 1.0, 0.0,
              0.0, -1.0, 0.0,
              0.0, 0.0, 1.0,
              0.0, 0.0, -1.0,
              0.7, 0.7, 0.0,
              -0.7, 0.7, 0.0,
              0.7, -0.7, 0.0,
              -0.7, -0.7, 0.0,
              0.0, 0.7, 0.7,
              0.0, -0.7, 0.7,
              0.0, 0.7, -0.7,
              0.7, 0.0, 0.7,
              -0.7, 0.0, 0.7,
              0.7, 0.0, -0.7,
              0.5, 0.5, 0.5,
              -0.5, 0.5, 0.5,
              -0.5, -0.5, 0.5
            ];
            
            if (i < nucleusCount) {
              const sIdx = Math.floor(i / ptsPerSphere);
              const pi = i - sIdx * ptsPerSphere;
              const sR = nucleusSize * 0.22;
              const cX = sCenters[sIdx * 3] * nucleusSize * 0.35;
              const cY = sCenters[sIdx * 3 + 1] * nucleusSize * 0.35;
              const cZ = sCenters[sIdx * 3 + 2] * nucleusSize * 0.35;
              const theta = Math.acos(1 - 2 * (pi + 0.5) / ptsPerSphere);
              const phi = golden * pi + t * 0.1;
              const rr = sR * Math.pow((pi + 1) / ptsPerSphere, 0.25);
              target.set(
                cX + Math.sin(theta) * Math.cos(phi) * rr,
                cY + Math.sin(theta) * Math.sin(phi) * rr,
                cZ + Math.cos(theta) * rr
              );
              const pulse = 0.65 + 0.35 * Math.sin(t * 1.5 + sIdx * 0.6);
              const isViolet = sIdx % 2 === 0;
              if (isViolet) {
                color.setRGB(0.55 * pulse, 0.28 * pulse, 0.95 * pulse);
              } else {
                color.setRGB(0.40 * pulse, 0.22 * pulse, 0.88 * pulse);
              }
            
            } else if (i < nucleusCount + ringSize * 3) {
              const ri = i - nucleusCount;
              const ringIdx = Math.floor(ri / ringSize);
              const pi = ri - ringIdx * ringSize;
              const frac = pi / ringSize;
              const dir = ringIdx === 1 ? -1 : 1;
              const spd = 1.0 + ringIdx * 0.3;
              const angle = frac * Math.PI * 2 + t * spd * dir;
              const bx = Math.cos(angle) * radius;
              const by = Math.sin(angle) * radius;
              const tX = ringIdx === 0 ? tlX0 : ringIdx === 1 ? tlX1 : tlX2;
              const tZ = ringIdx === 0 ? tlZ0 : ringIdx === 1 ? tlZ1 : tlZ2;
              const cxr = Math.cos(tX);
              const sxr = Math.sin(tX);
              const ry = by * cxr;
              const rz = by * sxr;
              const czr = Math.cos(tZ);
              const szr = Math.sin(tZ);
              target.set(bx * czr - ry * szr, bx * szr + ry * czr, rz);
              const bright = 0.45 + 0.15 * Math.sin(angle * 3 + t);
              if (ringIdx === 0) {
                color.setRGB(0.49 * bright, 0.23 * bright, 0.93 * bright);
              } else if (ringIdx === 1) {
                color.setRGB(0.08 * bright, 0.71 * bright, 0.83 * bright);
              } else {
                color.setRGB(0.42 * bright, 0.30 * bright, 0.98 * bright);
              }
            
            } else if (i < nucleusCount + ringSize * 3 + electronHeadCount) {
              const hi = i - nucleusCount - ringSize * 3;
              const ringIdx = Math.floor(hi / 80);
              const pi = hi - ringIdx * 80;
              const dir = ringIdx === 1 ? -1 : 1;
              const spd = 1.0 + ringIdx * 0.3;
              const eAngle = t * spd * dir + 3.5;
              const headR = 0.7;
              const hTheta = Math.acos(1 - 2 * (pi + 0.5) / 80);
              const hPhi = golden * pi;
              const localX = Math.sin(hTheta) * Math.cos(hPhi) * headR;
              const localY = Math.sin(hTheta) * Math.sin(hPhi) * headR;
              const localZ = Math.cos(hTheta) * headR;
              const tangentX = -Math.sin(eAngle);
              const tangentY = Math.cos(eAngle);
              const normalX = Math.cos(eAngle);
              const normalY = Math.sin(eAngle);
              const bx = Math.cos(eAngle) * radius + tangentX * localX + normalX * localY;
              const by = Math.sin(eAngle) * radius + tangentY * localX + normalY * localY;
              const bz = localZ;
              const tX = ringIdx === 0 ? tlX0 : ringIdx === 1 ? tlX1 : tlX2;
              const tZ = ringIdx === 0 ? tlZ0 : ringIdx === 1 ? tlZ1 : tlZ2;
              const cxr = Math.cos(tX);
              const sxr = Math.sin(tX);
              const ry = by * cxr - bz * sxr;
              const rz = by * sxr + bz * cxr;
              const czr = Math.cos(tZ);
              const szr = Math.sin(tZ);
              target.set(bx * czr - ry * szr, bx * szr + ry * czr, rz);
              const dist = Math.sqrt(localX * localX + localY * localY + localZ * localZ) / headR;
              const glow = 0.8 + 0.2 * (1.0 - dist);
              if (ringIdx === 0) {
                color.setRGB(0.8 * glow, 0.5 * glow, 1.0 * glow);
              } else if (ringIdx === 1) {
                color.setRGB(0.3 * glow, 0.9 * glow, 1.0 * glow);
              } else {
                color.setRGB(0.7 * glow, 0.55 * glow, 1.0 * glow);
              }
            
            } else if (i < nucleusCount + ringSize * 3 + electronHeadCount + trailPerRing * 3) {
              const ei = i - nucleusCount - ringSize * 3 - electronHeadCount;
              const ringIdx = Math.floor(ei / trailPerRing);
              const trailIdx = ei - ringIdx * trailPerRing;
              const trailFrac = trailIdx / trailPerRing;
              const dir = ringIdx === 1 ? -1 : 1;
              const spd = 1.0 + ringIdx * 0.3;
              const eAngle = t * spd * dir + 3.5;
              const offset = trailFrac * trailLen * 0.035;
              const angle = eAngle - offset * dir;
              const bx = Math.cos(angle) * radius;
              const by = Math.sin(angle) * radius;
              const tX = ringIdx === 0 ? tlX0 : ringIdx === 1 ? tlX1 : tlX2;
              const tZ = ringIdx === 0 ? tlZ0 : ringIdx === 1 ? tlZ1 : tlZ2;
              const cxr = Math.cos(tX);
              const sxr = Math.sin(tX);
              const ry = by * cxr;
              const rz = by * sxr;
              const czr = Math.cos(tZ);
              const szr = Math.sin(tZ);
              target.set(bx * czr - ry * szr, bx * szr + ry * czr, rz);
              const fade = 1.0 - trailFrac;
              const fc = fade * fade * fade;
              if (ringIdx === 0) {
                color.setRGB(0.55 * fc + 0.1, 0.3 * fc + 0.05, 0.85 * fc + 0.1);
              } else if (ringIdx === 1) {
                color.setRGB(0.05 * fc + 0.03, 0.7 * fc + 0.08, 0.8 * fc + 0.1);
              } else {
                color.setRGB(0.5 * fc + 0.08, 0.35 * fc + 0.05, 0.85 * fc + 0.1);
              }
            
            } else {
              target.set(0, 0, 0);
              color.setRGB(0, 0, 0);
            }
            
            if (i === 0) {
              setInfo("korFlow Atom", "20 dense spheres nucleus + synced electrons on orbits");
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
