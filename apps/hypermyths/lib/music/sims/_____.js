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
        const PARAMS = {"width":450,"height":180,"separation":25,"speed":1.8};
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
            const wallWidth = addControl("width", "Wall Width", 100, 800, 450);
            const wallHeight = addControl("height", "Flame Height", 50, 400, 180);
            const separation = addControl("separation", "Separation", 0, 50, 25);
            const burnSpeed = addControl("speed", "Burn Speed", 0, 5, 1.8);
            
            const t = time * burnSpeed;
            const ratio = i / count;
            
            // 1. パーティクルを3つの「層」に分ける (0, 1, 2)
            const layer = i % 3;
            const layerOffset = (layer - 1) * 15; // Z軸（奥行き）のズレ
            
            // 2. ベースの配置（横一列）
            const xBase = ((i % (count / 3)) / (count / 3) * 2.0 - 1.0) * (wallWidth * 0.5);
            const yBase = -60;
            
            // 3. 上昇と揺らぎ（層ごとに少しタイミングをずらす）
            const yPosBase = (i % 120) / 120 * wallHeight; 
            const tempRatio = Math.max(0, Math.min(1.0, yPosBase / wallHeight));
            const finalY = yBase + yPosBase + (tempRatio * tempRatio * 40);
            
            // 層ごとに揺らぎのタイミングを変えて「重なり」を作る
            const layerTime = t + layer * 0.5;
            const sepFactor = Math.pow(tempRatio, 2.5);
            const noiseX = Math.sin(xBase * 0.04 + finalY * 0.08 - layerTime * 4.0) * separation * sepFactor;
            
            // ターゲット位置の設定（Z軸に厚みを出す）
            target.set(xBase + noiseX, finalY, layerOffset + Math.sin(xBase * 0.02 + layerTime) * 8);
            
            // 4. 色の設定（層ごとに微妙に色を変えて深みを出す）
            const hue = (0.12 - layer * 0.02) * (1.0 - tempRatio); // 奥は少し赤く、手前は黄色く
            const saturation = 0.9 + layer * 0.05;
            const fadeOut = 1.0 - Math.pow(tempRatio, 5.0); // 先端を綺麗に消す
            const lightness = (0.85 * (1.0 - tempRatio * 0.6)) * fadeOut;
            
            color.setHSL(hue, saturation, Math.max(0, lightness));
            
            if (i === 0) {
              setInfo("Layered Fire Wall", "Multi-layered thermal simulation for depth and density.");
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
