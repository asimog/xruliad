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
        const PARAMS = {"tubeLen":60,"tubeRad":12,"billowCount":7,"shearSpeed":1,"reconnectIntensity":1,"alfvenAmp":1};
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
            const tubeLen = addControl("tubeLen", "Tube Length", 20, 120, 60);
            const tubeRad = addControl("tubeRad", "Tube Radius", 4, 20, 12);
            const billowCount = addControl("billowCount", "Billow Count", 3, 12, 7);
            const shearSpeed = addControl("shearSpeed", "Shear Speed", 0.1, 3.0, 1.0);
            const reconnectIntensity = addControl("reconnectIntensity", "Reconnection", 0.0, 2.0, 1.0);
            const alfvenAmp = addControl("alfvenAmp", "Alfven Amplitude", 0.0, 3.0, 1.0);
            
            if (i === 0) {
              setInfo(
                "Kelvin-Helmholtz Plasma Jets",
                "Two counter-rotating magnetized plasma jets shearing at 400 km/s. KH vortex billows roll at the interface. Magnetic reconnection fires plasmoid bursts at pinch points. Alfven waves propagate along flux tube. Blue-white = hot corona, orange-red = compression."
              );
              annotate("hotJet", new THREE.Vector3(tubeLen * 0.45, 0, 0), "Hot Jet 10MK");
              annotate("coldJet", new THREE.Vector3(-tubeLen * 0.45, 0, 0), "Cold Jet 50K");
              annotate("center", new THREE.Vector3(0, 0, 0), "KH Interface");
            }
            
            const norm = i / count;
            const billowSpacing = 8.0;
            const billowRadius = 3.0;
            const alfvenSpeed = 0.3;
            const alfvenWavelength = 5.0;
            const TWO_PI = 6.28318530718;
            
            // Partition particles into layers
            const hotFrac = 0.38;
            const coldFrac = 0.38;
            const interfaceFrac = 0.14;
            // remaining 0.10 = plasmoid/reconnection bursts
            
            const hotEnd = hotFrac;
            const coldEnd = hotFrac + coldFrac;
            const interfaceEnd = coldEnd + interfaceFrac;
            
            let px, py, pz, velMag, hue, sat, lit;
            
            if (norm < hotEnd) {
              // Hot tenuous jet: flows left to right (+X), outer annulus r in [7..12]
              const localNorm = norm / hotEnd;
              const phi = localNorm * TWO_PI * 37.1 + time * shearSpeed * 0.4;
              const zPos = (localNorm * 2.0 - 1.0) * tubeLen * 0.5;
              const rBase = tubeRad * (0.55 + 0.45 * Math.abs(Math.sin(localNorm * 89.3)));
              
              // Alfven transverse oscillation
              const alfvenPhase = zPos / alfvenWavelength * TWO_PI - time * alfvenSpeed * shearSpeed;
              const alfvenOscY = alfvenAmp * Math.sin(alfvenPhase) * 0.6;
              const alfvenOscZ = alfvenAmp * Math.cos(alfvenPhase * 1.13) * 0.4;
              
              const r = rBase * (0.7 + 0.3 * Math.sin(phi * 3.0 + time * 0.3));
              px = zPos; // hot jet along +X
              py = Math.cos(phi) * r + alfvenOscY;
              pz = Math.sin(phi) * r + alfvenOscZ;
              
              // Velocity: fast flow left-to-right
              velMag = 0.65 + 0.35 * Math.sin(localNorm * 43.7 + time * shearSpeed);
              
              // Blue-white corona tones
              hue = 0.58 + 0.08 * Math.sin(localNorm * 17.3 + time);
              sat = 0.5 + 0.5 * (1.0 - velMag * 0.5);
              lit = 0.4 + 0.6 * velMag;
            
            } else if (norm < coldEnd) {
              // Cold dense jet: flows right to left (-X), inner core r in [0..7]
              const localNorm = (norm - hotEnd) / coldFrac;
              const phi = localNorm * TWO_PI * 41.7 - time * shearSpeed * 0.5;
              const zPos = (localNorm * 2.0 - 1.0) * tubeLen * 0.5;
              const rBase = tubeRad * 0.55 * Math.abs(Math.sin(localNorm * 73.1 + 0.5));
              
              const alfvenPhase = zPos / alfvenWavelength * TWO_PI + time * alfvenSpeed * shearSpeed * 1.1;
              const alfvenOscY = alfvenAmp * Math.sin(alfvenPhase + 1.57) * 0.5;
              const alfvenOscZ = alfvenAmp * Math.cos(alfvenPhase * 0.91) * 0.5;
              
              const r = rBase * (0.8 + 0.2 * Math.cos(phi * 5.0 - time * 0.5));
              px = -zPos; // cold jet flows opposite
              py = Math.cos(phi) * r + alfvenOscY;
              pz = Math.sin(phi) * r + alfvenOscZ;
              
              velMag = 0.3 + 0.7 * Math.abs(Math.sin(localNorm * 53.1 + time * 0.7 * shearSpeed));
              
              // Orange-red compression tones (cold + dense)
              hue = 0.05 + 0.07 * Math.sin(localNorm * 23.1 + time * 0.5);
              sat = 0.8 + 0.2 * Math.sin(localNorm * 11.0);
              lit = 0.25 + 0.45 * velMag;
            
            } else if (norm < interfaceEnd) {
              // KH interface layer: vortex billows rolling at shear boundary
              const localNorm = (norm - coldEnd) / interfaceFrac;
              
              // Distribute along tube length
              const zPos = (Math.sin(localNorm * TWO_PI * 3.7 + 0.3) * 0.5 + localNorm - 0.5) * tubeLen;
              
              // Which billow are we near?
              const billowIndex = Math.floor((zPos + tubeLen * 0.5) / billowSpacing);
              const billowCenter = (billowIndex + 0.5) * billowSpacing - tubeLen * 0.5;
              const distToBillow = zPos - billowCenter;
              const billowPhase = distToBillow / (billowSpacing * 0.5) * Math.PI;
              
              // Vortex roll: particles spiral at billow centers
              const vortexAngle = localNorm * TWO_PI * 19.3 + time * shearSpeed * (1.0 + 0.5 * Math.sin(billowPhase));
              const rollRadius = billowRadius * (0.3 + 0.7 * Math.abs(Math.sin(billowPhase * 0.5)));
              const interfaceR = tubeRad * 0.55;
              
              px = zPos;
              py = interfaceR * Math.cos(vortexAngle * 0.2 + billowPhase) + rollRadius * Math.sin(vortexAngle);
              pz = interfaceR * Math.sin(vortexAngle * 0.2 + billowPhase) + rollRadius * Math.cos(vortexAngle);
              
              // Turbulent velocity at interface
              velMag = 0.4 + 0.6 * Math.abs(Math.sin(vortexAngle * 2.3 + time));
              
              // Mix hot and cold colors at interface — blue shifts to orange in compression
              const compression = 0.5 + 0.5 * Math.sin(billowPhase + time * shearSpeed);
              hue = 0.58 - compression * 0.53; // blue-white -> orange-red
              sat = 0.6 + 0.4 * compression;
              lit = 0.35 + 0.55 * velMag;
            
            } else {
              // Plasmoid reconnection bursts — discrete jets firing perpendicular to main flow
              const localNorm = (norm - interfaceEnd) / (1.0 - interfaceEnd);
              
              // Reconnection sites at billow pinch points (between billows)
              const siteCount = Math.round(billowCount);
              const siteIndex = Math.floor(localNorm * siteCount);
              const siteNorm = (localNorm * siteCount) - siteIndex;
              
              const siteZ = (siteIndex / (siteCount - 1.0 + 1e-6) - 0.5) * tubeLen * 0.85;
              
              // Burst timing: reconnection events fire periodically
              const burstPeriod = 3.5;
              const burstPhase = (time * shearSpeed + siteIndex * 1.37) / burstPeriod;
              const burstCycle = burstPhase - Math.floor(burstPhase); // 0..1
              const burstAge = burstCycle;
              
              // Collimated micro-jet: shoots perpendicular to main flow (in Y-Z plane)
              const jetAngle = siteIndex * 2.39996 + time * 0.1; // golden angle spread per site
              const jetLen = reconnectIntensity * burstAge * tubeRad * 1.8;
              const spread = siteNorm * TWO_PI + jetAngle;
              
              const jetDir = Math.sin(siteIndex * 7.3 + time * 0.05) > 0.0 ? 1.0 : -1.0;
              
              px = siteZ + jetDir * jetLen * 0.15 * Math.sin(spread * 3.1);
              py = Math.cos(spread) * jetLen * (0.1 + siteNorm * 0.9);
              pz = Math.sin(spread) * jetLen * (0.1 + siteNorm * 0.9);
              
              // Relativistic acceleration: dim at birth, brilliant white at full speed
              velMag = burstAge * reconnectIntensity;
              
              // Brilliant white-blue for accelerated particles
              hue = 0.62 - velMag * 0.62; // deep blue -> white
              sat = 1.0 - velMag * 0.9;
              lit = 0.3 + 0.7 * velMag;
            }
            
            // Clamp all coordinates inside flux tube with soft boundary
            const radDist = Math.sqrt(py * py + pz * pz) + 1e-9;
            const clampR = Math.min(radDist, tubeRad * 1.05) / radDist;
            py *= clampR;
            pz *= clampR;
            px = Math.max(-tubeLen * 0.52, Math.min(tubeLen * 0.52, px));
            
            target.set(px, py, pz);
            
            // Velocity-to-brightness: slow=dim red shift, fast=brilliant white
            const finalLit = Math.min(1.0, Math.max(0.05, lit));
            const finalSat = Math.min(1.0, Math.max(0.0, sat));
            const finalHue = ((hue % 1.0) + 1.0) % 1.0;
            color.setHSL(finalHue, finalSat, finalLit);
            
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
