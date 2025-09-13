import { useEffect } from "react";

export default function Elite(): JSX.Element {
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
    #container {
      margin: 0;
      overflow: hidden;
      background-color: #000;
      color: #ffff00;
      font-family: 'Press Start 2P', cursive;
      font-size: 10px;
      line-height: 1.6;
      position: relative;
      width: 100%;
      height: 100%;
    }
    canvas {
      display: block;
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
    }
    .overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      pointer-events: none;
      box-sizing: border-box;
      padding: 10px;
    }
    .top-bar, .bottom-bar {
      width: 100%;
      box-sizing: border-box;
    }
    .top-bar {
      text-align: center;
      padding: 5px 0;
      border-bottom: 2px solid #ffff00;
      margin-bottom: 10px;
    }
    .center-text {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      font-size: 1.5em;
      color: #00ff00;
    }
    .center-text.small {
      font-size: 1.2em;
      line-height: 1.8;
      color: #ffffff;
    }
    .bottom-bar {
      border: 2px solid #ffff00;
      background-color: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: space-between;
      padding: 5px;
      min-height: 80px;
    }
    .hud-left, .hud-right {
      display: flex;
      flex-direction: column;
      width: 30%;
      border: 1px solid #00ff00;
      padding: 3px;
      font-size: 0.8em;
    }
    .hud-center {
      width: 35%;
      border: 1px solid #ffff00;
      display: flex;
      justify-content: center;
      align-items: center;
      background-image: radial-gradient(#003300 1px, transparent 1px),
                        radial-gradient(#003300 1px, transparent 1px);
      background-size: 10px 10px;
      background-position: 0 0, 5px 5px;
    }
    .scanner-shape {
      width: 60%;
      height: 60%;
      border: 1px solid #ffff00;
      position: relative;
    }
    .scanner-shape::before, .scanner-shape::after {
      content: '';
      position: absolute;
      border-top: 1px solid #ffff00;
      left: 10%;
      right: 10%;
    }
    .scanner-shape::before { top: 30%; }
    .scanner-shape::after { bottom: 0%; width: 30%; left: 35%; }
    .hud-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 1px;
      white-space: nowrap;
    }
    .hud-label {
      color: #ff0000;
      margin-right: 5px;
    }
    .hud-bar {
      flex-grow: 1;
      border: 1px solid #004400;
      background-color: #002200;
      position: relative;
      height: 6px;
      margin-top: 2px;
    }
    .hud-bar-fill {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      background-color: #00ff00;
    }
    .hud-bar-fill.red { background-color: #ff0000; }
    .hud-value {
      color: #00ff00;
    }
    .hidden {
      display: none;
    }
    #fore-shield-fill { width: 80%; }
    #aft-shield-fill { width: 80%; }
    #fuel-fill { width: 100%; }
    #cabin-temp-fill { width: 10%; background-color: #00ff00; }
    #laser-temp-fill { width: 5%; background-color: #ff0000; }
    #stats-screen {
      color: #cc66ff;
      background-color: #000000;
      border: 2px solid #cc66ff;
      padding: 20px;
      font-size: 1.2em;
    }
    #stats-screen h2 {
      color: #ffffff;
      text-align: center;
      margin-top: 0;
      margin-bottom: 15px;
    }
    #stats-screen p { margin: 5px 0; }
    #stats-screen strong { color: #00ff00; margin-right: 10px; display: inline-block; min-width: 120px; }
    #stats-screen .equipment { margin-top: 15px; color: #ffff00; }
  `;

  useEffect(() => {
    const script = document.createElement("script");
    script.type = "module";
    script.textContent = `
      import * as THREE from 'https://unpkg.com/three@0.164.1/build/three.module.js';

      let scene, camera, renderer;
      let ship, planet, stars;
      let undockingSquares = [];
      let introMusic, undockSound;

      let state = 'title'; // title, credits, stats, undocking, game
      let keyProcessed = false;

      const pressKeyText = document.getElementById('press-key-text');
      const creditsText = document.getElementById('credits-text');
      const statsScreen = document.getElementById('stats-screen');
      const leavingText = document.getElementById('leaving-text');
      const titleText = document.getElementById('title-text');
      const viewText = document.getElementById('view-text');

      function init() {
          // Scene
          scene = new THREE.Scene();

          // Camera
          camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
          camera.position.z = 15;

          // Renderer
          const canvas = document.getElementById('eliteCanvas');
          renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false });
          renderer.setSize(window.innerWidth, window.innerHeight);
          renderer.setClearColor(0x000000);

          // Lighting (Basic)
          const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
          scene.add(ambientLight);
          const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
          directionalLight.position.set(1, 1, 1);
          scene.add(directionalLight);

          // --- Create Objects ---

          // Simplified Cobra Mk III - Approximation
          const shipGeometry = new THREE.BufferGeometry();
          const vertices = new Float32Array([
               // Front peak
               0,  1,  3,
               // Top wing corners
              -4,  0,  0,
               4,  0,  0,
               // Bottom wing corners
              -3, -1,  0,
               3, -1,  0,
               // Rear top center
               0,  0.5, -4,
               // Rear bottom center
               0, -0.5, -4,
               // Rear wingtips (approx)
              -4, -0.5, -3.5,
               4, -0.5, -3.5,

          ]);
           // Define faces (indices) - Creates a basic prism/wedge shape
           const indices = [
              0, 1, 2,  // Top front face
              0, 3, 1,  // Left slope face
              0, 2, 4,  // Right slope face
              1, 3, 6, 1, 6, 5, 1, 5, 7, // Left side (complex) -> simplified
              3, 4, 6, // Bottom face
              2, 8, 4, 2, 5, 8, 5, 6, 8, // Right side (complex) -> simplified
              // Rear faces
              5, 7, 6, // Rear Left wing
              5, 8, 7, // Rear Right wing
              5, 6, 8 // Rear Center (simplified)
          ];
           // Define colors for faces (simplistic: yellow body, green tips/details, orange mid)
          const colors = [];
          const colorYellow = new THREE.Color(0xffff00);
          const colorGreen = new THREE.Color(0x00ff00);
          const colorOrange = new THREE.Color(0xffa500);

          // Simple coloring: Assign color per vertex based on face
           const faceColors = [
               colorYellow, colorOrange, colorOrange, // Front top, slopes
               colorYellow, colorYellow, // Left side (placeholder)
               colorYellow, // Bottom
               colorYellow, colorYellow, // Right side (placeholder)
               colorGreen, colorGreen, colorYellow // Rear wings (green), center (yellow)
           ];

           for (let i = 0; i < indices.length / 3; i++) {
               const c = faceColors[i % faceColors.length];
               colors.push(c.r, c.g, c.b);
               colors.push(c.r, c.g, c.b);
               colors.push(c.r, c.g, c.b);
           }

          shipGeometry.setIndex(indices);
          shipGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
          shipGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
          shipGeometry.computeVertexNormals();

          const shipMaterial = new THREE.MeshBasicMaterial({
               vertexColors: true,
           });

          ship = new THREE.Mesh(shipGeometry, shipMaterial);
          ship.scale.set(0.8, 0.8, 0.8);
          ship.position.x = -3;
          scene.add(ship);

          // Planet (Red Sphere)
          const planetGeometry = new THREE.SphereGeometry(4, 16, 12);
          const planetMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
          planet = new THREE.Mesh(planetGeometry, planetMaterial);
          planet.position.x = 7;
          planet.position.z = -5;
          scene.add(planet);

          // Starfield
          const starVertices = [];
          for (let i = 0; i < 2000; i++) {
              const x = THREE.MathUtils.randFloatSpread(1000);
              const y = THREE.MathUtils.randFloatSpread(1000);
              const z = THREE.MathUtils.randFloatSpread(1000);
              if (Math.abs(x) > 50 || Math.abs(y) > 50 || Math.abs(z) > 50) {
                 starVertices.push(x, y, z);
              }
          }
          const starGeometry = new THREE.BufferGeometry();
          starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
          const starMaterial = new THREE.PointsMaterial({
              color: 0xffffff,
              size: 0.5,
              sizeAttenuation: false
          });
          stars = new THREE.Points(starGeometry, starMaterial);
          scene.add(stars);

          // Undocking Squares (Geometry reused)
          const squareGeom = new THREE.PlaneGeometry(1, 1);
          const squareMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide, wireframe: true });
          for(let i = 0; i < 10; i++) {
              const square = new THREE.Mesh(squareGeom, squareMat);
              square.scale.set( (i+1)*2, (i+1)*2, 1);
              square.position.z = -i * 5;
              square.visible = false;
              scene.add(square);
              undockingSquares.push(square);
          }

          // Audio
          introMusic = document.getElementById('introMusic');
          undockSound = document.getElementById('undockSound');
          introMusic.play().catch(e => console.error("Audio play failed:", e));

          // Event Listeners
          window.addEventListener('resize', onWindowResize, false);
          window.addEventListener('keydown', onKeyPress, false);

          animate();
      }

      function onWindowResize() {
          camera.aspect = window.innerWidth / window.innerHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(window.innerWidth, window.innerHeight);
      }

      function onKeyPress(event) {
          if (keyProcessed) return;

          if (state === 'title') {
              keyProcessed = true;
              introMusic.pause();
              pressKeyText.classList.add('hidden');
              ship.visible = false;
              planet.visible = false;

              creditsText.classList.remove('hidden');
              state = 'credits';

              setTimeout(() => {
                  creditsText.classList.add('hidden');
                  statsScreen.classList.remove('hidden');
                  state = 'stats';

                  setTimeout(() => {
                      statsScreen.classList.add('hidden');
                      leavingText.classList.remove('hidden');
                      titleText.classList.add('hidden');
                      viewText.classList.remove('hidden');
                      state = 'undocking';
                      undockSound.play().catch(e => console.error("Audio play failed:", e));

                      undockingSquares.forEach(s => s.visible = true);

                      setTimeout(() => {
                          leavingText.classList.add('hidden');
                          state = 'game';
                          undockingSquares.forEach(s => s.visible = false);
                          planet.position.set(0, 10, -50);
                          planet.scale.set(5,5,5);
                          planet.visible = true;

                      }, 3000);

                  }, 5000);

              }, 3000);
          }
      }

      function animate() {
          requestAnimationFrame(animate);

          if (state === 'title' && ship) {
              ship.rotation.y += 0.01;
              ship.rotation.x += 0.005;
          }

          if (state === 'undocking') {
              undockingSquares.forEach((s, i) => {
                  s.position.z += 0.5;
                  if (s.position.z > camera.position.z) {
                      s.position.z = -undockingSquares.length * 5 + 5;
                  }
              });
          }

          if (stars) {
               stars.rotation.y += 0.0001;
          }

          renderer.render(scene, camera);
      }

      init();
    `;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div id="container">
      <style>{css}</style>
      <canvas id="eliteCanvas"></canvas>
      <div className="overlay">
        <div className="top-bar">
          <span id="title-text">--- ELITE ---</span>
          <span id="bounty-text" className="hidden">BOUNTY: 5.0 Cr</span>
          <span id="view-text" className="hidden">Front View</span>
        </div>

        {/* Central Text Area */}
        <div id="press-key-text" className="center-text">Press any key to start game</div>
        <div id="credits-text" className="center-text small hidden">
          Game Copyright:-<br />
          Bell &amp; Braben<br />
          Code Copyright:-<br />
          Realtime Games<br />
          Software Ltd<br />
          Written by:-<br />
          Andy Onions<br />
          Cracked by:-<br />
          Key Software
        </div>
        <div id="stats-screen" className="center-text small hidden">
          <h2>COMMANDER JAMESON</h2>
          <p><strong>System:</strong> LAVE</p>
          <p><strong>Hypersystem:</strong> LAVE</p>
          <p><strong>Fuel:</strong> 7.0 Light Years</p>
          <p><strong>Cash:</strong> 100.0 Credits</p>
          <p><strong>Legal Status:</strong> Clean</p>
          <p><strong>Rating:</strong> Harmless</p>
          <p className="equipment"><strong>EQUIPMENT:</strong></p>
          <p>Missile (3)</p>
          <p>Pulse Laser (Fore)</p>
        </div>
        <div id="leaving-text" className="center-text small hidden">
          Leaving Space Station
        </div>

        {/* Bottom HUD */}
        <div className="bottom-bar">
          <div className="hud-left">
            <div className="hud-item">
              <span className="hud-label">FORE-SHIELD</span>
              <div className="hud-bar"><div id="fore-shield-fill" className="hud-bar-fill"></div></div>
            </div>
            <div className="hud-item">
              <span className="hud-label">AFT-SHIELD</span>
              <div className="hud-bar"><div id="aft-shield-fill" className="hud-bar-fill"></div></div>
            </div>
            <div className="hud-item">
              <span className="hud-label">FUEL</span>
              <div className="hud-bar"><div id="fuel-fill" className="hud-bar-fill"></div></div>
            </div>
            <div className="hud-item">
              <span className="hud-label">CABIN TEMP</span>
              <div className="hud-bar"><div id="cabin-temp-fill" className="hud-bar-fill"></div></div>
            </div>
            <div className="hud-item">
              <span className="hud-label">LASER TEMP</span>
              <div className="hud-bar"><div id="laser-temp-fill" className="hud-bar-fill red"></div></div>
            </div>
            <div className="hud-item">
              <span className="hud-label">ALTITUDE</span>
              <div className="hud-bar"></div>
            </div>
            <div className="hud-item">
              <span className="hud-label">MISSILES</span>
              <span className="hud-value"> M M M M</span>
            </div>
          </div>
          <div className="hud-center">
            <div className="scanner-shape"></div>
          </div>
          <div className="hud-right">
            <div className="hud-item">
              <span className="hud-label">SPEED</span>
              <div className="hud-bar"><div className="hud-bar-fill" style={{ width: "10%" }}></div></div>
            </div>
            <div className="hud-item">
              <span className="hud-label">ROLL</span>
              <div className="hud-bar"><div className="hud-bar-fill" style={{ width: "50%" }}></div></div>
            </div>
            <div className="hud-item">
              <span className="hud-label">DIVE/CLIMB</span>
              <div className="hud-bar"><div className="hud-bar-fill" style={{ width: "50%" }}></div></div>
            </div>
            <div className="hud-item" style={{ justifyContent: "center", marginTop: "5px" }}>
              <span style={{ border: "1px solid #00ff00", padding: "2px 5px" }}>1</span>
              <span style={{ border: "1px solid #00ff00", padding: "2px 5px", margin: "0 5px" }}>2</span>
              <span style={{ border: "1px solid #00ff00", padding: "2px 5px" }}>3</span>
              <span style={{ border: "1px solid #ffff00", borderRadius: "50%", width: "15px", height: "15px", display: "inline-block", marginLeft: "10px" }}></span>
            </div>
          </div>
        </div>
      </div>
      <audio id="introMusic" loop>
        <source src="elite_intro_music.mp3" type="audio/mpeg" />
        Your browser does not support the audio element. (Needs elite_intro_music.mp3)
      </audio>
      <audio id="undockSound">
        <source src="undocking_sound.mp3" type="audio/mpeg" />
        Your browser does not support the audio element. (Needs undocking_sound.mp3)
      </audio>
    </div>
  );
}

