(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const gl = canvas.getContext("webgl", { antialias: true, alpha: false });
  if (!gl) {
    alert("WebGL is required to play this Eldor's Chronicles demo.");
    return;
  }

  const ui = {
    mainMenu: document.getElementById("mainMenu"),
    pauseMenu: document.getElementById("pauseMenu"),
    victoryScreen: document.getElementById("victoryScreen"),
    hud: document.getElementById("hud"),
    startButton: document.getElementById("startButton"),
    resumeButton: document.getElementById("resumeButton"),
    restartButton: document.getElementById("restartButton"),
    victoryRestartButton: document.getElementById("victoryRestartButton"),
    healthBar: document.getElementById("healthBar"),
    staminaBar: document.getElementById("staminaBar"),
    manaBar: document.getElementById("manaBar"),
    healthValue: document.getElementById("healthValue"),
    staminaValue: document.getElementById("staminaValue"),
    manaValue: document.getElementById("manaValue"),
    questTracker: document.getElementById("questTracker"),
    bossFrame: document.getElementById("bossFrame"),
    bossBar: document.getElementById("bossBar"),
    prompt: document.getElementById("interactionPrompt"),
    assetStatus: document.getElementById("assetStatus"),
    toastLog: document.getElementById("toastLog"),
    dialogue: document.getElementById("dialogueBox"),
    dialogueName: document.getElementById("dialogueName"),
    dialogueText: document.getElementById("dialogueText"),
    journal: document.getElementById("journalPanel"),
    journalText: document.getElementById("journalText"),
    abilityIcons: document.getElementById("abilityIcons")
  };

  let assetDatabase = null;

  const assetManifest = {
    elderMageNpcFbx: "../North Region/Elder_Mage_with_Staff_0318190000_generate.fbx",
    eryndorFbx: "../The wayfarer/Animation_Walking_withSkin.fbx",
    etherealWardenZip: "../Huma/Ethereal_Warden_0319151800_texture_fbx.zip",
    arkonArt: "../snips/arkon's keep.png",
    emeraldArt: "../snips/Emerald Guardian.png",
    dragonSpineArt: "../North Region/Dragon’s Spine & Spire of Arkon/df805894-7070-4400-8c46-7686ecf11b2b.jpg"
  };

  const lore = {
    title: "Eldor's Chronicles: Echoes of Eldrador",
    hero: "Aedrys",
    mentor: "Eryndor the Wayfarer",
    regions: [
      "Willowhaven Crossroads",
      "Dragon's Spine foothills",
      "Arkon Keep",
      "Emerald Dominion",
      "Hidden Temple of Elyria"
    ],
    prophecy: "The Star-Dragon Prophecy awakens through ancient knowledge, the Aurora Shard, the Echo of Elyria, and future relics."
  };

  const mat = {
    mossyStone: [0.28, 0.33, 0.27, 1, 0.18, 0.82, 0.78, 12],
    wetRock: [0.20, 0.22, 0.23, 1, 0.06, 0.48, 0.64, 18],
    agedWood: [0.34, 0.22, 0.13, 1, 0.04, 0.74, 0.82, 22],
    rustedMetal: [0.43, 0.25, 0.16, 1, 0.38, 0.68, 0.75, 34],
    leather: [0.23, 0.16, 0.12, 1, 0.06, 0.78, 0.82, 28],
    darkCloth: [0.08, 0.10, 0.13, 1, 0.02, 0.86, 0.88, 30],
    parchmentCloth: [0.55, 0.42, 0.25, 1, 0.03, 0.88, 0.84, 18],
    emeraldCrystal: [0.28, 0.95, 0.62, 0.88, 0.0, 0.18, 0.42, 16],
    arcaneCrystal: [0.48, 0.82, 1.0, 0.9, 0.0, 0.2, 0.4, 18],
    coldRuin: [0.30, 0.33, 0.36, 1, 0.08, 0.7, 0.72, 20],
    grass: [0.10, 0.26, 0.12, 1, 0.0, 0.94, 0.9, 22],
    leafLitter: [0.25, 0.16, 0.08, 1, 0.0, 0.9, 0.86, 26],
    dirt: [0.24, 0.18, 0.12, 1, 0.0, 0.86, 0.86, 18],
    snowStone: [0.58, 0.63, 0.66, 1, 0.02, 0.58, 0.72, 16],
    ember: [0.95, 0.38, 0.13, 0.9, 0.0, 0.32, 0.52, 12]
  };

  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;
  const keys = new Set();
  const pressed = new Set();
  const mouse = { dx: 0, dy: 0, left: false, right: false };
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const now = () => performance.now() / 1000;
  const len2 = (x, z) => Math.hypot(x, z);
  const distXZ = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

  const zones = {
    willow: { x: -510, z: -230, r: 170, name: "Willowhaven Crossroads" },
    forest: { x: -245, z: -95, r: 150, name: "Ancient Forest Path" },
    spine: { x: 30, z: -310, r: 185, name: "Dragon's Spine Foothills" },
    arkon: { x: 255, z: -105, r: 150, name: "Arkon Keep Ruin" },
    emerald: { x: 520, z: 160, r: 180, name: "Emerald Dominion Crystal Grove" },
    temple: { x: 735, z: 320, r: 145, name: "Hidden Temple Boss Arena" }
  };

  const questSteps = [
    "Speak with Eryndor in Willowhaven.",
    "Travel the ancient forest path toward Dragon's Spine.",
    "Recover 3 ancient glyph fragments.",
    "Open the rune door at Arkon Keep.",
    "Solve the Astral Alignment puzzle.",
    "Unlock Frost Ward in the inner sanctum.",
    "Enter the Emerald Dominion crystal grove.",
    "Use Whisperwind to reveal the hidden temple path.",
    "Defeat the Ethereal Warden.",
    "Claim the Echo of Elyria."
  ];

  let state = null;
  let lastTime = now();
  let audioCtx = null;

  const shader = createProgram(`
    attribute vec3 aPos;
    attribute vec3 aNormal;
    uniform mat4 uModel;
    uniform mat4 uViewProj;
    uniform vec4 uColor;
    uniform vec3 uLightDir;
    uniform vec3 uCamera;
    uniform float uFogNear;
    uniform float uFogFar;
    uniform float uEmissive;
    uniform float uMetallic;
    uniform float uRoughness;
    uniform float uAo;
    uniform float uNoiseScale;
    uniform float uTime;
    varying vec3 vWorld;
    varying vec4 vColor;
    varying float vFog;

    float hash(vec3 p) {
      return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
    }

    void main() {
      vec4 world = uModel * vec4(aPos, 1.0);
      vec3 n = normalize((uModel * vec4(aNormal, 0.0)).xyz);
      vec3 light = normalize(-uLightDir);
      vec3 viewDir = normalize(uCamera - world.xyz);
      vec3 halfDir = normalize(light + viewDir);
      float diff = max(dot(n, light), 0.0);
      float spec = pow(max(dot(n, halfDir), 0.0), mix(80.0, 12.0, uRoughness)) * (1.0 - uRoughness * 0.72);
      float rim = pow(1.0 - max(dot(viewDir, n), 0.0), 2.4);
      float slopeAo = clamp(n.y * 0.75 + 0.25, 0.25, 1.0);
      float grain = hash(floor(world.xyz * max(uNoiseScale, 0.01)));
      vec3 albedo = uColor.rgb * mix(0.78, 1.18, grain);
      vec3 warmBounce = vec3(0.16, 0.11, 0.07);
      vec3 coldSky = vec3(0.06, 0.09, 0.12);
      vec3 lit = albedo * (coldSky + warmBounce + diff * 0.92) * slopeAo * uAo;
      lit += mix(vec3(0.04), albedo, uMetallic) * spec * 1.15;
      lit += albedo * rim * 0.14;
      lit += uColor.rgb * uEmissive;
      vWorld = world.xyz;
      vColor = vec4(lit, uColor.a);
      float d = distance(uCamera, world.xyz);
      vFog = clamp((d - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
      gl_Position = uViewProj * world;
    }
  `, `
    precision mediump float;
    varying vec3 vWorld;
    varying vec4 vColor;
    varying float vFog;
    uniform vec3 uFogColor;
    void main() {
      vec3 color = mix(vColor.rgb, uFogColor, vFog);
      color = color / (color + vec3(1.0));
      color = pow(color, vec3(0.88));
      color *= 1.0 - smoothstep(460.0, 620.0, length(vWorld.xz)) * 0.16;
      gl_FragColor = vec4(color, vColor.a);
    }
  `);

  const loc = {
    aPos: gl.getAttribLocation(shader, "aPos"),
    aNormal: gl.getAttribLocation(shader, "aNormal"),
    uModel: gl.getUniformLocation(shader, "uModel"),
    uViewProj: gl.getUniformLocation(shader, "uViewProj"),
    uColor: gl.getUniformLocation(shader, "uColor"),
    uLightDir: gl.getUniformLocation(shader, "uLightDir"),
    uCamera: gl.getUniformLocation(shader, "uCamera"),
    uFogNear: gl.getUniformLocation(shader, "uFogNear"),
    uFogFar: gl.getUniformLocation(shader, "uFogFar"),
    uFogColor: gl.getUniformLocation(shader, "uFogColor"),
    uEmissive: gl.getUniformLocation(shader, "uEmissive"),
    uMetallic: gl.getUniformLocation(shader, "uMetallic"),
    uRoughness: gl.getUniformLocation(shader, "uRoughness"),
    uAo: gl.getUniformLocation(shader, "uAo"),
    uNoiseScale: gl.getUniformLocation(shader, "uNoiseScale"),
    uTime: gl.getUniformLocation(shader, "uTime")
  };

  const meshes = {
    terrain: makeMesh(makeTerrain(84, 84, 18)),
    cube: makeMesh(boxMesh()),
    cylinder: makeMesh(cylinderMesh(18, 1, 1)),
    cone: makeMesh(coneMesh(18, 1, 1.8)),
    sphere: makeMesh(sphereMesh(12, 8, 1)),
    disc: makeMesh(cylinderMesh(32, 1, 0.035)),
    crystal: makeMesh(crystalMesh()),
    arch: makeMesh(archMesh()),
    blade: makeMesh(boxMesh())
  };

  const staticObjects = buildWorldObjects();

  function createState() {
    return {
      mode: "menu",
      time: 0,
      camera: { yaw: 42 * DEG, pitch: 22 * DEG, dist: 11.5, x: 0, y: 0, z: 0, shake: 0, cinematic: 0 },
      player: {
        x: -590,
        y: 0,
        z: -280,
        vx: 0,
        vy: 0,
        vz: 0,
        yaw: 0,
        hp: 130,
        maxHp: 130,
        stamina: 100,
        maxStamina: 100,
        mana: 100,
        maxMana: 100,
        grounded: true,
        invuln: 0,
        attackCd: 0,
        castCd: 0,
        dashCd: 0,
        ward: 0,
        whisper: 0,
        swing: 0
      },
      abilities: {
        climb: true,
        windwalk: false,
        frostWard: false,
        whisperwind: false
      },
      inventory: {
        glyphs: 0,
        echo: false,
        loreTablets: 0
      },
      quest: 0,
      gateOpen: false,
      astralSolved: false,
      hiddenPath: false,
      checkpoint: { x: -590, z: -280 },
      lockTarget: null,
      prompt: "",
      dialogue: null,
      journalOpen: false,
      toasts: [],
      projectiles: [],
      enemyProjectiles: [],
      particles: [],
      glyphs: [
        { x: -120, z: -120, found: false, name: "Riverbank Glyph" },
        { x: 40, z: -360, found: false, name: "Glacial Rune" },
        { x: 165, z: -40, found: false, name: "Scholar's Sigil" }
      ],
      tablets: [
        { x: -380, z: -80, read: false, text: "The first dwarven forges drank from glacier melt and shaped relics for elven kings." },
        { x: 290, z: -168, read: false, text: "Arkon Keep guarded the Chronicles of Eldrador's Dawn." },
        { x: 565, z: 70, read: false, text: "The Language of the Trees is heard by those who walk softly with the wind." },
        { x: 18, z: -384, read: false, text: "Highforge, Stonevale, and Boulderhelm mark the dwarven road beneath the Dragon's Spine." },
        { x: 226, z: -210, read: false, text: "The Stoic Guardian swore to guard the Spire's secrets even as Akon raiders gathered below." },
        { x: 352, z: -28, read: false, text: "The Mystic Sage, Cunning Outcast, Reluctant Hero, and Antagonistic Force are carved into Arkon's character stones." },
        { x: -650, z: -120, read: false, text: "The Elder of the Sands speaks of Al'Khutm, Qud-Shara, the Whispering Wastes, and the Cinderheart road south." },
        { x: -470, z: -315, read: false, text: "The Oracle of the Lost Moon and Eryndor's Wayfarer path bind moonlit prophecy to the Echo of Elyria." },
        { x: 95, z: -438, read: false, text: "Cartographers mark the Spire of Arkon above Arkon Keep, with Highforge, Stonevale, Boulderhelm, ancient forests, glacial rock, and mineral veins below." }
      ],
      archiveStones: [
        { x: -552, z: -252, key: "maps", label: "Map Archive", text: "North Region maps and Map Legend anchor the playable route: Dragon's Spine, Spire of Arkon, Arkon Keep, Highforge, Stonevale, Boulderhelm, ancient forests, and mineral veins." },
        { x: -514, z: -176, key: "story", label: "Story Archive", text: "Storyboard, chapter files, and integration notes feed the quest spine: Eryndor guides Aedrys from Willowhaven toward glyphs, Frost Ward, Whisperwind, and the Echo of Elyria." },
        { x: -622, z: -158, key: "sands", label: "Sands Archive", text: "Elder of the Sands, Al'Khutm, Qud-Shara, and the Whispering Wastes are staged as southern-expansion lore and warm-toned NPC/material references." },
        { x: 196, z: -42, key: "arkon", label: "Arkon Archive", text: "Arkon Keep, Stoic Guardian, Iron Sentinel, Valor Knights, Akon Army, Dark Lord, and Dragon Guardian files are represented by ruins, statues, sentinels, and enemy proxies." },
        { x: 540, z: 122, key: "emerald", label: "Emerald Archive", text: "Emerald Guardian, Ethereal Warden, crystal grove, Elyria, and Heartwood assets drive the luminous green grove and boss arena." },
        { x: -436, z: -306, key: "wayfarer", label: "Wayfarer Archive", text: "Wayfarer, Oracle of the Lost Moon, and walking animation files inform Eryndor's mentor role, staff silhouette, and moonlit prophecy references." }
      ],
      astral: [
        { x: 210, z: -70, id: "moon", active: false, label: "Moon" },
        { x: 262, z: -32, id: "star", active: false, label: "Star" },
        { x: 318, z: -70, id: "dragon", active: false, label: "Dragon" }
      ],
      astralInput: [],
      enemies: [
        enemy("Bandit", -190, -150),
        enemy("Bandit", -70, -210),
        enemy("Bandit", 22, -288),
        enemy("Akon Raider", 220, -210),
        enemy("Akon Raider", 270, -188),
        enemy("Iron Sentinel", 330, -72),
        enemy("Spectral Warden", 190, -162),
        enemy("Spectral Warden", 340, -95),
        enemy("Spectral Warden", 478, 38)
      ],
      boss: boss(),
      worldLabel: zones.willow.name
    };
  }

  function enemy(type, x, z) {
    const enemyData = {
      "Bandit": { hp: 58, speed: 24, attack: 14, color: [0.48, 0.28, 0.16, 1], range: 2.1 },
      "Akon Raider": { hp: 68, speed: 22, attack: 16, color: [0.40, 0.39, 0.37, 1], range: 2.2 },
      "Iron Sentinel": { hp: 110, speed: 13, attack: 24, color: [0.42, 0.46, 0.48, 1], range: 2.7 },
      "Spectral Warden": { hp: 76, speed: 21, attack: 17, color: [0.43, 0.78, 0.92, 1], range: 2.5 }
    };
    const data = enemyData[type] || enemyData["Spectral Warden"];
    return {
      type,
      x,
      y: heightAt(x, z),
      z,
      sx: x,
      sz: z,
      yaw: 0,
      hp: data.hp,
      maxHp: data.hp,
      speed: data.speed,
      attack: data.attack,
      color: data.color,
      range: data.range,
      state: "patrol",
      attackCd: 0,
      hurt: 0,
      dead: false,
      patrol: Math.random() * TAU
    };
  }

  function boss() {
    return {
      type: "Ethereal Warden",
      x: 740,
      y: heightAt(740, 320) + 0.4,
      z: 320,
      yaw: 0,
      hp: 620,
      maxHp: 620,
      active: false,
      dead: false,
      hurt: 0,
      slashCd: 2.2,
      runeCd: 3.7,
      shockCd: 5.2,
      teleportCd: 7.5,
      intro: false
    };
  }

  function startGame() {
    state = createState();
    state.mode = "playing";
    ui.mainMenu.classList.remove("active");
    ui.pauseMenu.classList.remove("active");
    ui.victoryScreen.classList.remove("active");
    ui.hud.classList.remove("hidden");
    hideDialogue();
    toast("Aedrys arrives at Willowhaven, seeking forgotten knowledge.");
    canvas.focus();
    updateUi();
  }

  function setPause(paused) {
    if (!state || state.mode === "menu" || state.mode === "victory") return;
    state.mode = paused ? "paused" : "playing";
    ui.pauseMenu.classList.toggle("active", paused);
  }

  function resize() {
    const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  async function checkAssets() {
    const checks = await Promise.all(Object.entries(assetManifest).map(async ([key, value]) => {
      try {
        const res = await fetch(value, { method: "HEAD" });
        return `${key}:${res.ok ? "ok" : "ref"}`;
      } catch {
        return `${key}:ref`;
      }
    }));
    try {
      const res = await fetch("assets/world-assets.json");
      assetDatabase = await res.json();
    } catch {
      assetDatabase = null;
    }
    const loaded = assetDatabase?.summary?.totalAssets ? `${assetDatabase.summary.totalAssets} indexed` : "index unavailable";
    ui.assetStatus.textContent = `Asset codex: ${loaded}`;
  }

  function loop() {
    const t = now();
    const dt = Math.min(0.033, t - lastTime);
    lastTime = t;
    update(dt);
    draw();
    pressed.clear();
    mouse.dx = 0;
    mouse.dy = 0;
    requestAnimationFrame(loop);
  }

  function update(dt) {
    if (!state) return;
    state.time += dt;
    for (const t of state.toasts) t.t -= dt;
    state.toasts = state.toasts.filter(t => t.t > 0);
    if (state.mode !== "playing") {
      updateCamera(dt);
      return;
    }
    updateCameraControls(dt);
    updatePlayer(dt);
    updateQuest();
    updateEnemies(dt);
    updateBoss(dt);
    updateProjectiles(dt);
    updateEnvironment(dt);
    updateParticles(dt);
    updateCamera(dt);
    updateUi();
  }

  function updateCameraControls(dt) {
    const cam = state.camera;
    if (document.pointerLockElement === canvas) {
      cam.yaw -= mouse.dx * 0.0032;
      cam.pitch = clamp(cam.pitch - mouse.dy * 0.0024, 10 * DEG, 58 * DEG);
    }
    if (keys.has("KeyZ")) cam.yaw += 1.6 * dt;
    if (keys.has("KeyX")) cam.yaw -= 1.6 * dt;
  }

  function updatePlayer(dt) {
    const p = state.player;
    p.attackCd = Math.max(0, p.attackCd - dt);
    p.castCd = Math.max(0, p.castCd - dt);
    p.dashCd = Math.max(0, p.dashCd - dt);
    p.invuln = Math.max(0, p.invuln - dt);
    p.ward = Math.max(0, p.ward - dt);
    p.whisper = Math.max(0, p.whisper - dt);
    p.swing = Math.max(0, p.swing - dt);
    p.mana = clamp(p.mana + 10 * dt, 0, p.maxMana);
    p.stamina = clamp(p.stamina + (p.grounded ? 18 : 9) * dt, 0, p.maxStamina);

    const fwd = { x: Math.sin(state.camera.yaw), z: Math.cos(state.camera.yaw) };
    const right = { x: Math.cos(state.camera.yaw), z: -Math.sin(state.camera.yaw) };
    let ix = 0;
    let iz = 0;
    if (keys.has("KeyW") || keys.has("ArrowUp")) { ix += fwd.x; iz += fwd.z; }
    if (keys.has("KeyS") || keys.has("ArrowDown")) { ix -= fwd.x; iz -= fwd.z; }
    if (keys.has("KeyD") || keys.has("ArrowRight")) { ix += right.x; iz += right.z; }
    if (keys.has("KeyA") || keys.has("ArrowLeft")) { ix -= right.x; iz -= right.z; }
    const il = len2(ix, iz);
    if (il > 0.01) { ix /= il; iz /= il; }

    const climbing = keys.has("KeyC") && nearClimbable(p) && p.stamina > 0;
    if (climbing) {
      p.vy = 8;
      p.stamina -= 22 * dt;
      spawnParticle(p.x, p.y + 1.1, p.z, [0.7, 0.8, 0.88, 0.45], 0.35, 0.45);
    }

    const sprinting = keys.has("ShiftLeft") || keys.has("ShiftRight");
    const speed = sprinting && p.stamina > 4 ? 48 : 30;
    if (sprinting && il > 0.01 && p.grounded) p.stamina -= 14 * dt;
    p.vx = lerp(p.vx, ix * speed, 1 - Math.pow(0.0005, dt));
    p.vz = lerp(p.vz, iz * speed, 1 - Math.pow(0.0005, dt));
    if (il > 0.05) p.yaw = Math.atan2(ix, iz);

    if (pressed.has("Space") && p.grounded && p.stamina >= 12) {
      p.vy = 24;
      p.grounded = false;
      p.stamina -= 12;
      playTone(210, 0.05, "triangle", 0.015);
    }

    if (keys.has("KeyG") && !p.grounded && state.abilities.windwalk && p.stamina > 0 && p.vy < -2) {
      p.vy = Math.max(p.vy, -4.2);
      p.stamina -= 18 * dt;
      spawnParticle(p.x, p.y, p.z, [0.55, 0.86, 1, 0.55], 0.8, 0.55);
    }

    if ((pressed.has("ControlLeft") || pressed.has("ControlRight")) && p.dashCd <= 0 && p.stamina >= 18) {
      p.dashCd = 0.85;
      p.invuln = 0.28;
      p.stamina -= 18;
      p.vx += Math.sin(p.yaw) * 90;
      p.vz += Math.cos(p.yaw) * 90;
      state.camera.shake = Math.max(state.camera.shake, 0.08);
      spawnBurst(p.x, p.y + 0.6, p.z, [0.86, 0.72, 0.38, 0.65], 14);
      playTone(240, 0.06, "sine", 0.02);
    }

    if (pressed.has("KeyQ") && state.abilities.windwalk && p.dashCd <= 0 && p.mana >= 18) {
      p.dashCd = 1.0;
      p.invuln = 0.34;
      p.mana -= 18;
      p.vx += Math.sin(p.yaw) * 130;
      p.vz += Math.cos(p.yaw) * 130;
      spawnBurst(p.x, p.y + 0.7, p.z, [0.5, 0.9, 1, 0.8], 24);
      toast("Windwalk carries Aedrys forward.");
    }

    if (pressed.has("KeyF")) useFrostWard();
    if (pressed.has("KeyV")) useWhisperwind();
    if (mouse.left || pressed.has("KeyR")) meleeAttack();
    if (mouse.right || pressed.has("KeyT")) castProjectile();

    p.x += p.vx * dt;
    p.z += p.vz * dt;
    p.vy -= climbing ? 0 : 42 * dt;
    p.y += p.vy * dt;
    const ground = heightAt(p.x, p.z);
    if (p.y <= ground) {
      p.y = ground;
      p.vy = 0;
      p.grounded = true;
    } else {
      p.grounded = false;
    }
    p.x = clamp(p.x, -720, 840);
    p.z = clamp(p.z, -510, 430);
    resolveWorldBounds();
  }

  function resolveWorldBounds() {
    const p = state.player;
    if (!state.gateOpen && p.x > 180 && p.x < 220 && p.z > -170 && p.z < -30) p.x = 178;
    if (!state.hiddenPath && p.x > 612 && p.z > 210) {
      p.x = Math.min(p.x, 612);
      if (state.abilities.whisperwind) state.prompt = "Use Whisperwind near the veiled roots to reveal the hidden path.";
    }
  }

  function nearClimbable(p) {
    const climbs = [
      { x: 10, z: -350, r: 76 },
      { x: 90, z: -280, r: 74 },
      { x: 605, z: 235, r: 58 }
    ];
    return climbs.some(c => len2(p.x - c.x, p.z - c.z) < c.r);
  }

  function meleeAttack() {
    const p = state.player;
    if (p.attackCd > 0 || p.stamina < 8) return;
    p.attackCd = 0.48;
    p.swing = 0.32;
    p.stamina -= 8;
    const reach = 4.1;
    for (const target of hostileTargets()) {
      const dx = target.x - p.x;
      const dz = target.z - p.z;
      const d = len2(dx, dz);
      const a = Math.atan2(dx, dz);
      const delta = Math.abs(Math.atan2(Math.sin(a - p.yaw), Math.cos(a - p.yaw)));
      if (d < reach && delta < 1.05) damageTarget(target, 28, "Aedrys's staff blade");
    }
    spawnBurst(p.x + Math.sin(p.yaw) * 2.4, p.y + 1.1, p.z + Math.cos(p.yaw) * 2.4, [1, 0.78, 0.35, 0.7], 8);
    playTone(140, 0.045, "square", 0.015);
  }

  function castProjectile() {
    const p = state.player;
    if (p.castCd > 0 || p.mana < 11) return;
    p.castCd = 0.42;
    p.mana -= 11;
    const target = nearestHostile(80);
    const yaw = target ? Math.atan2(target.x - p.x, target.z - p.z) : p.yaw;
    state.projectiles.push({
      x: p.x + Math.sin(yaw) * 1.5,
      y: p.y + 1.45,
      z: p.z + Math.cos(yaw) * 1.5,
      vx: Math.sin(yaw) * 82,
      vy: 0,
      vz: Math.cos(yaw) * 82,
      r: 1.0,
      life: 1.6,
      damage: 24,
      color: [0.44, 0.76, 1, 0.95],
      fromPlayer: true
    });
    playTone(480, 0.05, "sine", 0.02);
  }

  function useFrostWard() {
    const p = state.player;
    if (!state.abilities.frostWard) {
      toast("Frost Ward is locked. Seek Arkon Keep's inner sanctum.");
      return;
    }
    if (p.mana < 22) return;
    p.mana -= 22;
    p.ward = 5.5;
    p.invuln = Math.max(p.invuln, 0.18);
    spawnBurst(p.x, p.y + 1.1, p.z, [0.72, 0.92, 1, 0.9], 28);
    toast("Frost Ward absorbs the next blows.");
  }

  function useWhisperwind() {
    const p = state.player;
    if (!state.abilities.whisperwind) {
      toast("Whisperwind is locked. Listen to the Emerald grove.");
      return;
    }
    if (p.mana < 16) return;
    p.mana -= 16;
    p.whisper = 7;
    spawnBurst(p.x, p.y + 1.2, p.z, [0.52, 1, 0.62, 0.8], 28);
    if (!state.hiddenPath && len2(p.x - 600, p.z - 210) < 95) {
      state.hiddenPath = true;
      toast("Whisperwind reveals the hidden temple path.");
      state.quest = Math.max(state.quest, 8);
    } else {
      toast("Hidden runes answer the Whisperwind.");
    }
  }

  function updateQuest() {
    const p = state.player;
    state.prompt = "";
    state.worldLabel = currentZone();

    if (pressed.has("KeyJ")) state.journalOpen = !state.journalOpen;

    if (distPoint(p, zones.willow) < 95 && state.quest === 0) {
      state.prompt = "Press E to speak with Eryndor";
      if (pressed.has("KeyE")) {
        showDialogue("Eryndor the Wayfarer", [
          "Ah, Aedrys. Eldrador is a land of contrasts: Willowhaven at the center, Dragon's Spine to the north, the Emerald Dominion to the west, and the Dragon's Teeth beneath a darker fate.",
          "Seek the glyph fragments near Dragon's Spine. Arkon Keep once guarded the Chronicles of Eldrador's Dawn, and those pages point toward the Echo of Elyria.",
          "Take these mountain-grade gauntlets. Climb where the stone is scarred, and let the wind teach your feet."
        ]);
        state.abilities.windwalk = true;
        state.quest = 1;
        toast("Quest accepted: Echoes of Eldrador.");
      }
    }

    for (const tablet of state.tablets) {
      if (!tablet.read && len2(p.x - tablet.x, p.z - tablet.z) < 6) {
        state.prompt = "Press E to read lore tablet";
        if (pressed.has("KeyE")) {
          tablet.read = true;
          state.inventory.loreTablets++;
          toast(tablet.text);
        }
      }
    }

    for (const stone of state.archiveStones) {
      if (len2(p.x - stone.x, p.z - stone.z) < 7) {
        state.prompt = `Press E to open ${stone.label}`;
        if (pressed.has("KeyE")) {
          const counts = assetDatabase?.summary?.byTag?.[stone.key] || assetDatabase?.summary?.byType?.image || "";
          showDialogue(stone.label, [
            stone.text,
            assetDatabase ? `Full asset codex loaded: ${assetDatabase.summary.totalAssets} files, including ${assetDatabase.summary.byType.image || 0} images, ${assetDatabase.summary.byType.model || 0} FBX models, ${assetDatabase.summary.byType.model_archive || 0} model archives, ${assetDatabase.summary.byType.document || 0} documents, and ${assetDatabase.summary.byType.video || 0} videos.` : "Asset codex JSON is not loaded yet.",
            counts ? `Indexed tag count for this archive: ${counts}.` : "This archive contributes mood, lore, model, and future-region implementation data."
          ]);
        }
      }
    }

    for (const glyph of state.glyphs) {
      if (!glyph.found && len2(p.x - glyph.x, p.z - glyph.z) < 7) {
        state.prompt = `Press E to recover ${glyph.name}`;
        if (pressed.has("KeyE")) {
          glyph.found = true;
          state.inventory.glyphs++;
          state.quest = Math.max(state.quest, state.inventory.glyphs >= 3 ? 3 : 2);
          toast(`Ancient glyph fragment recovered: ${state.inventory.glyphs}/3`);
          spawnBurst(glyph.x, heightAt(glyph.x, glyph.z) + 1.2, glyph.z, [0.95, 0.85, 0.42, 0.95], 28);
        }
      }
    }

    const runeDoor = { x: 188, z: -98 };
    if (!state.gateOpen && len2(p.x - runeDoor.x, p.z - runeDoor.z) < 12) {
      state.prompt = state.inventory.glyphs >= 3 ? "Press E to open Arkon Keep's rune door" : "Rune door requires 3 glyph fragments";
      if (pressed.has("KeyE") && state.inventory.glyphs >= 3) {
        state.gateOpen = true;
        state.quest = 4;
        toast("The rune door opens into Arkon Keep.");
        state.camera.shake = 0.18;
      }
    }

    if (state.gateOpen && !state.astralSolved) {
      for (const a of state.astral) {
        if (len2(p.x - a.x, p.z - a.z) < 8) {
          state.prompt = `Press E to align ${a.label}`;
          if (pressed.has("KeyE")) activateAstral(a);
        }
      }
    }

    if (state.astralSolved && !state.abilities.frostWard && len2(p.x - 305, p.z -120) < 13) {
      state.prompt = "Press E to claim Frost Ward";
      if (pressed.has("KeyE")) {
        state.abilities.frostWard = true;
        state.quest = 6;
        toast("Skill unlocked: Frost Ward.");
      }
    }

    if (state.quest < 7 && distPoint(p, zones.emerald) < 105 && state.abilities.frostWard) {
      state.quest = 7;
      showDialogue("Forest Spirit", [
        "Aedrys, the Heartwood hears your steps.",
        "Match courage with listening. Whisperwind reveals what roots conceal."
      ]);
      state.abilities.whisperwind = true;
      toast("Skill unlocked: Whisperwind.");
    }

    if (state.hiddenPath && !state.boss.active && distPoint(p, zones.temple) < 105) {
      state.boss.active = true;
      state.boss.intro = true;
      state.camera.cinematic = 2.7;
      state.quest = 8;
      showDialogue("Haunting Chorus", [
        "No spoken tongue. Only a rune-etched battle cry.",
        "The Ethereal Warden descends to test the bearer of ancient knowledge."
      ]);
      toast("Boss awakened: Ethereal Warden.");
    }

    if (state.boss.dead && !state.inventory.echo && len2(p.x - 760, p.z - 338) < 10) {
      state.prompt = "Press E to claim the Echo of Elyria";
      if (pressed.has("KeyE")) {
        state.inventory.echo = true;
        state.quest = 10;
        state.mode = "victory";
        ui.victoryScreen.classList.add("active");
        toast("The Echo of Elyria answers Aedrys.");
      }
    }
  }

  function activateAstral(node) {
    if (node.active) return;
    const solution = ["moon", "star", "dragon"];
    const expected = solution[state.astralInput.length];
    if (node.id !== expected) {
      state.astralInput = [];
      for (const n of state.astral) n.active = false;
      toast("The astral mosaic dims. Follow moon, star, dragon.");
      return;
    }
    node.active = true;
    state.astralInput.push(node.id);
    spawnBurst(node.x, heightAt(node.x, node.z) + 1.2, node.z, [0.56, 0.78, 1, 0.9], 18);
    if (state.astralInput.length === solution.length) {
      state.astralSolved = true;
      state.quest = 5;
      toast("Astral Alignment solved. A frost rune awakens.");
    }
  }

  function updateEnemies(dt) {
    const p = state.player;
    for (const e of state.enemies) {
      if (e.dead) continue;
      e.hurt = Math.max(0, e.hurt - dt);
      e.attackCd = Math.max(0, e.attackCd - dt);
      const d = distXZ(p, e);
      if (d < 52) e.state = "chase";
      if (d > 78) e.state = "patrol";
      if (e.state === "patrol") {
        e.patrol += dt * 0.75;
        moveToward(e, e.sx + Math.sin(e.patrol) * 18, e.sz + Math.cos(e.patrol * 0.7) * 14, e.speed * 0.45, dt);
      } else if (d > e.range) {
        moveToward(e, p.x, p.z, e.speed, dt);
      } else if (e.attackCd <= 0) {
        e.attackCd = e.type === "Bandit" ? 1.15 : 1.45;
        hurtPlayer(e.attack, e);
      }
      e.y = heightAt(e.x, e.z);
    }
  }

  function updateBoss(dt) {
    const b = state.boss;
    if (!b.active || b.dead) return;
    b.y = heightAt(b.x, b.z) + 0.6 + Math.sin(state.time * 2) * 0.35;
    b.hurt = Math.max(0, b.hurt - dt);
    b.slashCd -= dt;
    b.runeCd -= dt;
    b.shockCd -= dt;
    b.teleportCd -= dt;
    const p = state.player;
    b.yaw = Math.atan2(p.x - b.x, p.z - b.z);
    const d = distXZ(p, b);

    if (b.teleportCd <= 0 && b.hp < b.maxHp * 0.58) {
      b.teleportCd = 7.5;
      const a = state.time * 2.1;
      b.x = zones.temple.x + Math.sin(a) * 42;
      b.z = zones.temple.z + Math.cos(a) * 42;
      spawnBurst(b.x, b.y, b.z, [0.6, 1, 0.86, 0.8], 36);
      toast("The Warden slips through a veil of crystal light.");
    }

    if (b.slashCd <= 0 && d < 10) {
      b.slashCd = 2.2;
      spawnBurst(p.x, p.y + 1.1, p.z, [0.54, 0.95, 1, 0.7], 16);
      hurtPlayer(22, b);
      toast("Spectral slash.");
    }
    if (b.runeCd <= 0) {
      b.runeCd = 3.1;
      bossProjectile();
      toast("Rune projectile.");
    }
    if (b.shockCd <= 0) {
      b.shockCd = 5.4;
      shockwave();
      toast("The Warden marks the ground with a shockwave.");
    }
  }

  function bossProjectile() {
    const b = state.boss;
    const p = state.player;
    const a = Math.atan2(p.x - b.x, p.z - b.z);
    state.enemyProjectiles.push({
      x: b.x,
      y: b.y + 2.2,
      z: b.z,
      vx: Math.sin(a) * 55,
      vy: 0,
      vz: Math.cos(a) * 55,
      r: 1.2,
      life: 2.2,
      damage: 18,
      color: [0.58, 1, 0.86, 0.95],
      fromPlayer: false
    });
  }

  function shockwave() {
    const b = state.boss;
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        if (!state || state.boss.dead || state.mode !== "playing") return;
        const radius = 13 + i * 11;
        state.particles.push({ type: "ring", x: b.x, y: heightAt(b.x, b.z) + 0.12, z: b.z, r: radius, life: 0.8, max: 0.8, color: [0.64, 1, 0.9, 0.7] });
        const d = distXZ(state.player, b);
        if (Math.abs(d - radius) < 4.3) hurtPlayer(20, b);
      }, i * 260);
    }
  }

  function updateProjectiles(dt) {
    for (const pr of [...state.projectiles, ...state.enemyProjectiles]) {
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.z += pr.vz * dt;
      pr.life -= dt;
      spawnParticle(pr.x, pr.y, pr.z, pr.color, 0.25, 0.25);
    }

    for (const pr of state.projectiles) {
      for (const target of hostileTargets()) {
        if (!target.dead && len2(pr.x - target.x, pr.z - target.z) < pr.r + 2.1 && Math.abs(pr.y - target.y) < 5.5) {
          damageTarget(target, pr.damage, "arcane projectile");
          pr.life = 0;
          spawnBurst(pr.x, pr.y, pr.z, pr.color, 16);
          break;
        }
      }
    }
    for (const pr of state.enemyProjectiles) {
      if (len2(pr.x - state.player.x, pr.z - state.player.z) < pr.r + 1.6 && Math.abs(pr.y - state.player.y) < 4.5) {
        hurtPlayer(pr.damage, pr);
        pr.life = 0;
      }
    }
    state.projectiles = state.projectiles.filter(p => p.life > 0);
    state.enemyProjectiles = state.enemyProjectiles.filter(p => p.life > 0);
  }

  function updateParticles(dt) {
    for (const p of state.particles) {
      p.life -= dt;
      if (p.type !== "ring") {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        p.vy -= 2.5 * dt;
      }
    }
    state.particles = state.particles.filter(p => p.life > 0);
  }

  function updateEnvironment(dt) {
    const p = state.player;
    const rate = p.x > 420 ? 10 : p.x > 120 ? 5 : 7;
    if (Math.random() < rate * dt) {
      const angle = Math.random() * TAU;
      const radius = 18 + Math.random() * 46;
      const x = p.x + Math.sin(angle) * radius;
      const z = p.z + Math.cos(angle) * radius;
      const emerald = p.x > 420;
      const color = emerald ? [0.42, 1, 0.55, 0.42] : [0.70, 0.62, 0.45, 0.28];
      spawnParticle(x, heightAt(x, z) + 1.5 + Math.random() * 5, z, color, emerald ? 0.38 : 0.62, 2.2 + Math.random() * 1.8);
    }
  }

  function moveToward(o, x, z, speed, dt) {
    const dx = x - o.x;
    const dz = z - o.z;
    const l = len2(dx, dz) || 1;
    o.x += (dx / l) * speed * dt;
    o.z += (dz / l) * speed * dt;
    o.yaw = Math.atan2(dx, dz);
  }

  function hostileTargets() {
    const targets = state.enemies.filter(e => !e.dead);
    if (state.boss.active && !state.boss.dead) targets.push(state.boss);
    return targets;
  }

  function nearestHostile(range) {
    let best = null;
    let bd = range;
    for (const t of hostileTargets()) {
      const d = distXZ(state.player, t);
      if (d < bd) { best = t; bd = d; }
    }
    return best;
  }

  function damageTarget(target, amount, source) {
    target.hp -= amount;
    target.hurt = 0.22;
    spawnBurst(target.x, target.y + 1.2, target.z, target.color || [0.6, 1, 0.9, 1], 18);
    if (target.hp <= 0 && !target.dead) {
      target.dead = true;
      spawnBurst(target.x, target.y + 1.2, target.z, [1, 0.86, 0.52, 0.9], 34);
      if (target === state.boss) {
        toast("The Ethereal Warden is purified. The Sigil of Veilgrove falls silent.");
        state.quest = 9;
        state.camera.shake = 0.24;
      }
    }
  }

  function hurtPlayer(amount, source) {
    const p = state.player;
    if (p.invuln > 0) return;
    if (p.ward > 0) amount *= 0.34;
    p.hp -= amount;
    p.invuln = p.ward > 0 ? 0.45 : 0.65;
    const a = Math.atan2(p.x - source.x, p.z - source.z);
    p.vx += Math.sin(a) * 26;
    p.vz += Math.cos(a) * 26;
    state.camera.shake = Math.max(state.camera.shake, 0.18);
    spawnBurst(p.x, p.y + 1.2, p.z, [1, 0.34, 0.25, 0.85], 18);
    playTone(80, 0.07, "sawtooth", 0.015);
    if (p.hp <= 0) {
      toast("Aedrys is restored at the last Wayfarer checkpoint.");
      p.hp = p.maxHp;
      p.mana = p.maxMana;
      p.stamina = p.maxStamina;
      p.x = state.checkpoint.x;
      p.z = state.checkpoint.z;
      p.y = heightAt(p.x, p.z);
    }
  }

  function updateCamera(dt) {
    const p = state.player;
    const c = state.camera;
    c.shake = Math.max(0, c.shake - dt * 0.5);
    c.cinematic = Math.max(0, c.cinematic - dt);
    const pitch = c.cinematic > 0 ? 12 * DEG : c.pitch;
    const dist = c.cinematic > 0 && state.boss.active ? 20 : c.dist;
    const targetX = c.cinematic > 0 && state.boss.active ? lerp(p.x, state.boss.x, 0.55) : p.x;
    const targetY = c.cinematic > 0 && state.boss.active ? state.boss.y + 4.5 : p.y + 2.6;
    const targetZ = c.cinematic > 0 && state.boss.active ? lerp(p.z, state.boss.z, 0.55) : p.z;
    c.x = targetX - Math.sin(c.yaw) * Math.cos(pitch) * dist + (Math.random() - 0.5) * c.shake;
    c.y = targetY + Math.sin(pitch) * dist + (Math.random() - 0.5) * c.shake;
    c.z = targetZ - Math.cos(c.yaw) * Math.cos(pitch) * dist + (Math.random() - 0.5) * c.shake;
  }

  function currentZone() {
    let best = zones.willow;
    let bd = 9999;
    for (const z of Object.values(zones)) {
      const d = distPoint(state.player, z);
      if (d < bd) { bd = d; best = z; }
    }
    return best.name;
  }

  function distPoint(a, b) {
    return Math.hypot(a.x - b.x, a.z - b.z);
  }

  function draw() {
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0.035, 0.045, 0.04, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(shader);

    const aspect = canvas.width / canvas.height;
    const proj = m4Perspective(58 * DEG, aspect, 0.12, 1200);
    const target = state?.boss.active && state.camera.cinematic > 0
      ? [state.boss.x, state.boss.y + 3, state.boss.z]
      : [state.player.x, state.player.y + 2.2, state.player.z];
    const view = m4LookAt([state.camera.x, state.camera.y, state.camera.z], target, [0, 1, 0]);
    const viewProj = m4Mul(proj, view);
    gl.uniformMatrix4fv(loc.uViewProj, false, viewProj);
    gl.uniform3f(loc.uLightDir, -0.42, -0.92, -0.34);
    gl.uniform3f(loc.uCamera, state.camera.x, state.camera.y, state.camera.z);
    gl.uniform1f(loc.uFogNear, 75);
    gl.uniform1f(loc.uFogFar, state.player.x > 420 ? 300 : 430);
    gl.uniform3f(loc.uFogColor, state.player.x > 420 ? 0.05 : 0.09, state.player.x > 420 ? 0.18 : 0.12, state.player.x > 420 ? 0.12 : 0.12);
    gl.uniform1f(loc.uTime, state.time);

    drawSkyAndLandmarks();
    drawMesh(meshes.terrain, m4Identity(), [0.14, 0.20, 0.14, 1, 0, 0.92, 0.86, 18], 0);
    drawGroundDetail();
    drawWorld();
    drawGlyphs();
    drawProjectiles();
    drawEnemies();
    drawBoss();
    drawPlayer();
    drawParticles();
  }

  function drawSkyAndLandmarks() {
    const horizonY = -8;
    drawMesh(meshes.cube, modelMatrix(40, horizonY + 40, 560, 0, 0, 0, 900, 90, 4), [0.035, 0.052, 0.060, 1, 0, 0.92, 1, 8], 0.02);
    drawMesh(meshes.cube, modelMatrix(40, horizonY + 20, -575, 0, 0, 0, 900, 58, 4), [0.050, 0.058, 0.068, 1, 0, 0.9, 1, 8], 0.01);
    for (let i = 0; i < 9; i++) {
      const x = -520 + i * 145;
      const h = 55 + (i % 4) * 24;
      drawMesh(meshes.cone, modelMatrix(x, horizonY + h * 0.48, -540 - (i % 2) * 35, 0, 0, 0, 58 + (i % 3) * 18, h, 58 + (i % 3) * 18), [0.12, 0.14, 0.16, 1, 0, 0.88, 0.84, 12], 0);
    }
    drawMesh(meshes.cube, modelMatrix(275, 46, -420, 0, 0.16, 0, 28, 85, 20), [0.12, 0.13, 0.14, 1, 0, 0.82, 0.78, 14], 0);
    drawMesh(meshes.cone, modelMatrix(275, 103, -420, 0, 0.16, 0, 34, 40, 34), [0.10, 0.11, 0.12, 1, 0, 0.86, 0.8, 12], 0);
    drawMesh(meshes.crystal, modelMatrix(555, 34, 300, 0, state.time * 0.06, 0, 9, 34, 9), [0.18, 0.82, 0.46, 0.7, 0, 0.18, 0.45, 8], 0.75);
  }

  function drawGroundDetail() {
    const path = [
      [-570, -278, 54, 25, 0.12],
      [-462, -226, 55, 22, 0.44],
      [-330, -145, 66, 24, 0.84],
      [-196, -142, 65, 23, 1.04],
      [-42, -230, 70, 24, 0.7],
      [118, -198, 74, 23, 0.94],
      [260, -118, 70, 26, 1.25],
      [405, 15, 80, 25, 0.92],
      [545, 148, 82, 24, 0.74],
      [662, 252, 72, 21, 0.55],
      [735, 320, 62, 24, 0.15]
    ];
    for (const [x, z, sx, sz, ry] of path) {
      drawMesh(meshes.disc, modelMatrix(x, heightAt(x, z) + 0.055, z, 0, ry, 0, sx, 1, sz), mat.dirt, 0);
    }
    const leaves = [
      [-270, -95, 48, 28, 0.2],
      [-180, -35, 60, 34, -0.3],
      [-95, -150, 44, 30, 0.7],
      [470, 105, 50, 36, 0.2],
      [560, 205, 70, 38, -0.55]
    ];
    for (const [x, z, sx, sz, ry] of leaves) {
      drawMesh(meshes.disc, modelMatrix(x, heightAt(x, z) + 0.06, z, 0, ry, 0, sx, 1, sz), mat.leafLitter, 0);
    }
    const wetStone = [
      [20, -318, 70, 42, 0.1],
      [78, -270, 62, 40, 0.4],
      [245, -118, 55, 36, 0.2],
      [310, -82, 48, 32, -0.5]
    ];
    for (const [x, z, sx, sz, ry] of wetStone) {
      drawMesh(meshes.disc, modelMatrix(x, heightAt(x, z) + 0.065, z, 0, ry, 0, sx, 1, sz), mat.wetRock, 0.02);
    }
    drawMesh(meshes.disc, modelMatrix(-568, heightAt(-568, -330) + 0.045, -330, 0, 0, 0, 82, 1, 42), [0.055, 0.13, 0.16, 0.75, 0, 0.22, 0.7, 18], 0.03);
  }

  function drawWorld() {
    for (const o of staticObjects) {
      if (o.hidden && !state.hiddenPath) continue;
      const model = modelMatrix(o.x, o.y ?? heightAt(o.x, o.z), o.z, o.rx || 0, o.ry || 0, o.rz || 0, o.sx, o.sy, o.sz);
      if (o.shadow !== false && o.mesh !== "disc") drawCastShadow(o.x, o.z, Math.max(o.sx || 1, o.sz || 1) * 1.2, o.sy || 1);
      drawMesh(meshes[o.mesh], model, o.color, o.emissive || 0);
    }
    if (!state.gateOpen) {
      drawMesh(meshes.cube, modelMatrix(190, heightAt(190, -98) + 5, -98, 0, 0, 0, 1.4, 10, 14), mat.coldRuin, 0);
      drawMesh(meshes.cylinder, modelMatrix(190, heightAt(190, -98) + 10.4, -98, Math.PI / 2, 0, 0, 3, 0.16, 3), mat.arcaneCrystal, 0.65);
    }
    for (const a of state.astral) {
      drawMesh(meshes.cylinder, modelMatrix(a.x, heightAt(a.x, a.z) + 0.25, a.z, 0, 0, 0, 2.1, 0.5, 2.1), a.active ? mat.arcaneCrystal : mat.wetRock, a.active ? 0.45 : 0.02);
      drawMesh(meshes.crystal, modelMatrix(a.x, heightAt(a.x, a.z) + 1.4, a.z, 0, state.time, 0, 1, 1.5, 1), a.active ? mat.arcaneCrystal : [0.32, 0.40, 0.48, 0.75, 0, 0.38, 0.7, 18], a.active ? 0.9 : 0.1);
    }
    if (state.boss.dead) {
      drawMesh(meshes.crystal, modelMatrix(760, heightAt(760, 338) + 1.8 + Math.sin(state.time * 3) * 0.25, 338, 0, state.time, 0, 1.4, 2.1, 1.4), mat.emeraldCrystal, 1.2);
    }
  }

  function drawGlyphs() {
    for (const g of state.glyphs) {
      if (g.found) continue;
      drawMesh(meshes.crystal, modelMatrix(g.x, heightAt(g.x, g.z) + 1.3 + Math.sin(state.time * 3) * 0.12, g.z, 0, state.time, 0, 0.85, 1.2, 0.85), [0.95, 0.72, 0.32, 0.95, 0, 0.22, 0.48, 14], 0.85);
    }
    for (const t of state.tablets) {
      drawMesh(meshes.cube, modelMatrix(t.x, heightAt(t.x, t.z) + 1.2, t.z, 0.18, 0.4, 0, 1.1, 2.2, 0.25), t.read ? mat.mossyStone : [0.38, 0.40, 0.34, 1, 0.08, 0.84, 0.74, 22], t.read ? 0 : 0.08);
    }
    for (const s of state.archiveStones) {
      drawMesh(meshes.cylinder, modelMatrix(s.x, heightAt(s.x, s.z) + 0.65, s.z, 0, 0, 0, 1.25, 1.3, 1.25), [0.17, 0.18, 0.16, 1, 0.06, 0.8, 0.72, 14], 0.02);
      drawMesh(meshes.crystal, modelMatrix(s.x, heightAt(s.x, s.z) + 1.9 + Math.sin(state.time * 2.2) * 0.08, s.z, 0, state.time * 0.3, 0, 0.38, 0.72, 0.38), s.key === "emerald" ? mat.emeraldCrystal : s.key === "sands" ? [0.95, 0.58, 0.22, 0.85, 0, 0.34, 0.54, 12] : mat.arcaneCrystal, 0.62);
    }
  }

  function drawPlayer() {
    const p = state.player;
    drawShadow(p.x, p.z, 2.6);
    const blink = p.invuln > 0 && Math.sin(state.time * 38) > 0;
    if (blink) return;
    const stride = Math.sin(state.time * (keys.has("ShiftLeft") || keys.has("ShiftRight") ? 13 : 8)) * Math.min(0.25, Math.hypot(p.vx, p.vz) * 0.006);
    drawMesh(meshes.cylinder, modelMatrix(p.x, p.y + 1.13, p.z, 0, p.yaw, 0, 0.82, 2.05, 0.62), mat.darkCloth, p.ward > 0 ? 0.18 : 0.02);
    drawMesh(meshes.cube, modelMatrix(p.x - Math.sin(p.yaw) * 0.12, p.y + 1.62, p.z - Math.cos(p.yaw) * 0.12, 0.08, p.yaw, 0, 0.72, 0.88, 0.36), [0.20, 0.12, 0.08, 1, 0.04, 0.72, 0.72, 24], 0.02);
    drawMesh(meshes.cube, modelMatrix(p.x - Math.sin(p.yaw) * 0.54, p.y + 0.68, p.z - Math.cos(p.yaw) * 0.54, stride, p.yaw, 0, 0.20, 0.88, 0.20), mat.leather, 0);
    drawMesh(meshes.cube, modelMatrix(p.x + Math.sin(p.yaw) * 0.54, p.y + 0.68, p.z + Math.cos(p.yaw) * 0.54, -stride, p.yaw, 0, 0.20, 0.88, 0.20), mat.leather, 0);
    drawMesh(meshes.sphere, modelMatrix(p.x, p.y + 2.48, p.z, 0, p.yaw, 0, 0.50, 0.62, 0.50), [0.70, 0.60, 0.48, 1, 0.02, 0.62, 0.82, 20], 0.02);
    drawMesh(meshes.cone, modelMatrix(p.x - Math.sin(p.yaw) * 0.12, p.y + 2.95, p.z - Math.cos(p.yaw) * 0.12, 0, p.yaw, 0, 0.72, 0.95, 0.72), [0.13, 0.14, 0.16, 1, 0.02, 0.78, 0.82, 22], 0);
    drawMesh(meshes.cube, modelMatrix(p.x - Math.sin(p.yaw) * 0.26, p.y + 1.62, p.z - Math.cos(p.yaw) * 0.26, 0.08, p.yaw, 0, 0.92, 1.52, 0.12), [0.08, 0.10, 0.11, 1, 0.02, 0.82, 0.72, 18], 0.02);
    const swing = p.swing > 0 ? Math.sin(p.swing * 24) * 0.9 : 0;
    drawMesh(meshes.blade, modelMatrix(p.x + Math.sin(p.yaw + swing) * 1.06, p.y + 1.45, p.z + Math.cos(p.yaw + swing) * 1.06, 0.2, p.yaw + swing, 0.25, 0.12, 2.35, 0.12), mat.agedWood, 0.02);
    drawMesh(meshes.blade, modelMatrix(p.x + Math.sin(p.yaw + swing) * 1.95, p.y + 1.74, p.z + Math.cos(p.yaw + swing) * 1.95, 0.2, p.yaw + swing, 0.25, 0.11, 0.75, 0.045), mat.rustedMetal, 0.04);
    drawMesh(meshes.crystal, modelMatrix(p.x + Math.sin(p.yaw + swing) * 2.42, p.y + 1.90, p.z + Math.cos(p.yaw + swing) * 2.42, 0.2, p.yaw + swing, 0.25, 0.18, 0.32, 0.18), mat.arcaneCrystal, 0.45);
    if (p.ward > 0) drawMesh(meshes.sphere, modelMatrix(p.x, p.y + 1.4, p.z, 0, 0, 0, 2.4, 2.4, 2.4), [0.52, 0.88, 1, 0.22], 0.9);
    if (p.whisper > 0) drawMesh(meshes.cylinder, modelMatrix(p.x, p.y + 0.08, p.z, 0, 0, 0, 4.4, 0.05, 4.4), [0.5, 1, 0.56, 0.2], 0.8);
  }

  function drawEnemies() {
    for (const e of state.enemies) {
      if (e.dead) continue;
      drawShadow(e.x, e.z, e.type === "Bandit" ? 2.1 : 2.5);
      const color = e.hurt > 0 ? [1, 0.94, 0.78, 1] : e.color;
      const spectral = e.type === "Spectral Warden";
      const sentinel = e.type === "Iron Sentinel";
      const body = sentinel ? mat.rustedMetal : spectral ? [color[0], color[1], color[2], color[3], 0, 0.32, 0.58, 16] : mat.leather;
      drawMesh(meshes.cylinder, modelMatrix(e.x, e.y + 1.1, e.z, 0, e.yaw, 0, sentinel ? 0.95 : 0.72, sentinel ? 2.3 : 1.95, sentinel ? 0.78 : 0.58), body, spectral ? 0.45 : sentinel ? 0.08 : 0.02);
      drawMesh(meshes.sphere, modelMatrix(e.x, e.y + (sentinel ? 2.72 : 2.38), e.z, 0, 0, 0, sentinel ? 0.58 : 0.46, sentinel ? 0.62 : 0.56, sentinel ? 0.58 : 0.46), spectral ? body : sentinel ? mat.wetRock : [0.52, 0.43, 0.34, 1, 0.02, 0.68, 0.8, 18], spectral ? 0.4 : 0);
      drawMesh(meshes.blade, modelMatrix(e.x + Math.sin(e.yaw) * 1.1, e.y + 1.4, e.z + Math.cos(e.yaw) * 1.1, 0.15, e.yaw, 0.4, 0.10, sentinel ? 2.1 : 1.5, 0.07), spectral ? mat.arcaneCrystal : mat.rustedMetal, spectral ? 0.35 : 0.02);
      drawHealthRing(e, 2.8);
    }
  }

  function drawBoss() {
    const b = state.boss;
    if (!b.active || b.dead) return;
    drawShadow(b.x, b.z, 7);
    const color = b.hurt > 0 ? [1, 0.95, 0.82, 1] : [0.42, 0.98, 0.82, 0.92];
    drawMesh(meshes.sphere, modelMatrix(b.x, b.y + 3.8, b.z, 0, state.time * 0.3, 0, 3.1, 4.3, 3.1), [color[0], color[1], color[2], color[3], 0, 0.24, 0.48, 18], 0.78);
    drawMesh(meshes.cone, modelMatrix(b.x, b.y + 6.6, b.z, Math.PI, state.time, 0, 2.5, 3.9, 2.5), [0.16, 0.42, 0.50, 0.8, 0.02, 0.32, 0.55, 16], 0.62);
    for (let i = 0; i < 4; i++) {
      const a = state.time + i * TAU / 4;
      drawMesh(meshes.crystal, modelMatrix(b.x + Math.sin(a) * 4.6, b.y + 3.7 + Math.sin(state.time * 2 + i) * 0.4, b.z + Math.cos(a) * 4.6, 0, a, 0, 0.8, 1.8, 0.8), [0.68, 1, 0.88, 0.9], 0.9);
    }
  }

  function drawProjectiles() {
    for (const p of [...state.projectiles, ...state.enemyProjectiles]) {
      drawMesh(meshes.sphere, modelMatrix(p.x, p.y, p.z, 0, 0, 0, p.r, p.r, p.r), p.color, 0.95);
    }
  }

  function drawParticles() {
    for (const p of state.particles) {
      const a = clamp(p.life / (p.max || 0.6), 0, 1);
      if (p.type === "ring") {
        drawMesh(meshes.disc, modelMatrix(p.x, p.y, p.z, 0, 0, 0, p.r * (1.25 - a * 0.2), 1, p.r * (1.25 - a * 0.2)), [p.color[0], p.color[1], p.color[2], a * 0.32], 0.7);
      } else {
        drawMesh(meshes.sphere, modelMatrix(p.x, p.y, p.z, 0, 0, 0, p.r, p.r, p.r), [p.color[0], p.color[1], p.color[2], a * p.color[3]], 0.75);
      }
    }
  }

  function drawShadow(x, z, s) {
    drawMesh(meshes.disc, modelMatrix(x, heightAt(x, z) + 0.035, z, 0, 0, 0, s, 1, s), [0, 0, 0, 0.28], 0);
  }

  function drawCastShadow(x, z, size, height) {
    const sx = clamp(size * 1.8 + height * 0.22, 1.6, 26);
    const sz = clamp(size * 0.62 + height * 0.06, 0.9, 9);
    drawMesh(meshes.disc, modelMatrix(x + height * 0.22, heightAt(x, z) + 0.028, z + height * 0.13, 0, -0.72, 0, sx, 1, sz), [0.005, 0.006, 0.005, 0.22], 0);
  }

  function drawHealthRing(o, size) {
    const hp = clamp(o.hp / o.maxHp, 0, 1);
    drawMesh(meshes.cube, modelMatrix(o.x, o.y + 3.25, o.z, 0, state.camera.yaw, 0, size * hp, 0.12, 0.08), [0.85, 0.12, 0.12, 0.85], 0.1);
  }

  function drawMesh(mesh, model, color, emissive) {
    const material = normalizeMaterial(color);
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vbo);
    gl.enableVertexAttribArray(loc.aPos);
    gl.vertexAttribPointer(loc.aPos, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(loc.aNormal);
    gl.vertexAttribPointer(loc.aNormal, 3, gl.FLOAT, false, 24, 12);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.ibo);
    gl.uniformMatrix4fv(loc.uModel, false, model);
    gl.uniform4fv(loc.uColor, material.color);
    gl.uniform1f(loc.uEmissive, emissive);
    gl.uniform1f(loc.uMetallic, material.metallic);
    gl.uniform1f(loc.uRoughness, material.roughness);
    gl.uniform1f(loc.uAo, material.ao);
    gl.uniform1f(loc.uNoiseScale, material.noiseScale);
    gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
  }

  function normalizeMaterial(value) {
    return {
      color: value.length >= 4 ? value.slice(0, 4) : [value[0], value[1], value[2], 1],
      metallic: value.length > 4 ? value[4] : 0.02,
      roughness: value.length > 5 ? value[5] : 0.78,
      ao: value.length > 6 ? value[6] : 0.82,
      noiseScale: value.length > 7 ? value[7] : 18
    };
  }

  function updateUi() {
    const p = state.player;
    ui.healthBar.style.width = `${clamp(p.hp / p.maxHp, 0, 1) * 100}%`;
    ui.staminaBar.style.width = `${clamp(p.stamina / p.maxStamina, 0, 1) * 100}%`;
    ui.manaBar.style.width = `${clamp(p.mana / p.maxMana, 0, 1) * 100}%`;
    ui.healthValue.textContent = Math.round(p.hp);
    ui.staminaValue.textContent = Math.round(p.stamina);
    ui.manaValue.textContent = Math.round(p.mana);
    ui.questTracker.textContent = `${state.worldLabel} - ${questSteps[Math.min(state.quest, questSteps.length - 1)]}`;
    ui.prompt.textContent = state.prompt || "";
    ui.prompt.classList.toggle("hidden", !state.prompt);
    ui.bossFrame.classList.toggle("hidden", !state.boss.active || state.boss.dead);
    ui.bossBar.style.width = `${clamp(state.boss.hp / state.boss.maxHp, 0, 1) * 100}%`;
    ui.toastLog.innerHTML = state.toasts.map(t => `<div>${escapeHtml(t.text)}</div>`).join("");
    ui.journal.classList.toggle("hidden", !state.journalOpen);
    ui.journalText.innerHTML = journalHtml();
    ui.abilityIcons.innerHTML = abilityHtml();
  }

  function journalHtml() {
    const codex = assetDatabase?.summary;
    const codexLine = codex
      ? `Asset Codex: ${codex.totalAssets} files (${codex.byType.image || 0} images, ${codex.byType.model || 0} FBX, ${codex.byType.model_archive || 0} archives, ${codex.byType.document || 0} docs, ${codex.byType.video || 0} videos)<br>`
      : "Asset Codex: loading world-assets.json<br>";
    const tagLine = codex?.byTag
      ? `Tags: ${Object.entries(codex.byTag).sort((a,b)=>b[1]-a[1]).slice(0, 8).map(([k,v]) => `${k} ${v}`).join(", ")}<br>`
      : "";
    return `
      <strong>${lore.title}</strong><br>
      Hero: ${lore.hero}<br>
      Mentor: ${lore.mentor}<br>
      Quest: ${escapeHtml(questSteps[Math.min(state.quest, questSteps.length - 1)])}<br>
      Glyphs: ${state.inventory.glyphs}/3<br>
      Lore tablets: ${state.inventory.loreTablets}/${state.tablets.length}<br>
      ${codexLine}
      ${tagLine}
      Regions: ${lore.regions.join(", ")}<br>
      ${lore.prophecy}
    `;
  }

  function abilityHtml() {
    const rows = [
      ["Climb", "C", state.abilities.climb],
      ["Dash", "Ctrl", true],
      ["Windwalk", "Q / G", state.abilities.windwalk],
      ["Frost Ward", "F", state.abilities.frostWard],
      ["Whisperwind", "V", state.abilities.whisperwind],
      ["Arcane Bolt", "RMB / T", true]
    ];
    return rows.map(([name, key, on]) => `<span class="${on ? "unlocked" : "locked"}"><b>${key}</b>${name}</span>`).join("");
  }

  function showDialogue(name, lines) {
    state.dialogue = { name, lines, index: 0 };
    ui.dialogue.classList.remove("hidden");
    renderDialogue();
  }

  function renderDialogue() {
    if (!state.dialogue) return;
    ui.dialogueName.textContent = state.dialogue.name;
    ui.dialogueText.textContent = state.dialogue.lines[state.dialogue.index];
  }

  function advanceDialogue() {
    if (!state?.dialogue) return false;
    state.dialogue.index++;
    if (state.dialogue.index >= state.dialogue.lines.length) {
      hideDialogue();
    } else {
      renderDialogue();
    }
    return true;
  }

  function hideDialogue() {
    if (state) state.dialogue = null;
    ui.dialogue.classList.add("hidden");
  }

  function toast(text) {
    if (!state) return;
    state.toasts.unshift({ text, t: 5 });
    state.toasts = state.toasts.slice(0, 4);
  }

  function spawnParticle(x, y, z, color, spread, life) {
    state.particles.push({
      x, y, z,
      vx: (Math.random() - 0.5) * spread * 7,
      vy: Math.random() * spread * 5,
      vz: (Math.random() - 0.5) * spread * 7,
      r: 0.12 + Math.random() * 0.18,
      color,
      life,
      max: life
    });
  }

  function spawnBurst(x, y, z, color, count) {
    for (let i = 0; i < count; i++) spawnParticle(x, y, z, color, 1.2, 0.5 + Math.random() * 0.45);
  }

  function playTone(freq, duration, type, gain) {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      g.gain.value = gain;
      osc.connect(g);
      g.connect(audioCtx.destination);
      osc.start();
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
      osc.stop(audioCtx.currentTime + duration);
    } catch {
      // Browser audio is optional.
    }
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
  }

  function heightAt(x, z) {
    let h = 0.9 * Math.sin(x * 0.012) + 0.7 * Math.cos(z * 0.014) + 0.4 * Math.sin((x + z) * 0.018);
    h += 14 * gaussian(x, z, 28, -330, 180);
    h += 10 * gaussian(x, z, 110, -270, 150);
    h += 3.5 * gaussian(x, z, 520, 160, 220);
    h -= 2.0 * gaussian(x, z, -525, -265, 110);
    h -= 2.5 * gaussian(x, z, 735, 320, 95);
    return h;
  }

  function gaussian(x, z, cx, cz, r) {
    const d = (x - cx) * (x - cx) + (z - cz) * (z - cz);
    return Math.exp(-d / (r * r));
  }

  function buildWorldObjects() {
    const o = [];
    const add = (obj) => o.push(obj);
    const tree = (x, z, s = 1, color = [0.06, 0.22, 0.13, 1, 0, 0.9, 0.86, 24]) => {
      add({ mesh: "cylinder", x, z, sx: 0.40 * s, sy: 3.8 * s, sz: 0.40 * s, color: mat.agedWood });
      add({ mesh: "cone", x, z, sx: 1.9 * s, sy: 4.7 * s, sz: 1.9 * s, color, y: heightAt(x, z) + 3.9 * s });
      add({ mesh: "cone", x, z, sx: 1.45 * s, sy: 3.3 * s, sz: 1.45 * s, color, y: heightAt(x, z) + 6.0 * s, shadow: false });
    };
    const grass = (x, z, s = 1, c = mat.grass) => add({ mesh: "cone", x, z, sx: 0.22 * s, sy: 1.2 * s, sz: 0.22 * s, y: heightAt(x, z) + 0.52 * s, rx: (Math.random() - 0.5) * 0.35, rz: (Math.random() - 0.5) * 0.35, color: c, shadow: false });
    const root = (x, z, sx, ry) => add({ mesh: "cube", x, z, sx, sy: 0.28, sz: 0.42, ry, color: mat.agedWood, shadow: false });
    const rock = (x, z, sx, sy, sz, c = mat.wetRock) => add({ mesh: "cube", x, z, sx, sy, sz, ry: Math.random() * TAU, rx: (Math.random() - 0.5) * 0.2, color: c });
    const crystal = (x, z, s, c = mat.emeraldCrystal) => add({ mesh: "crystal", x, z, sx: s, sy: s * 2.4, sz: s, ry: Math.random() * TAU, color: c, emissive: 0.78 });
    const torch = (x, z) => {
      add({ mesh: "cylinder", x, z, sx: 0.22, sy: 2.7, sz: 0.22, color: mat.agedWood });
      add({ mesh: "sphere", x, z, sx: 0.42, sy: 0.42, sz: 0.42, y: heightAt(x, z) + 2.95, color: mat.ember, emissive: 0.9, shadow: false });
    };
    const banner = (x, z, ry, c) => {
      add({ mesh: "cylinder", x, z, sx: 0.18, sy: 4.2, sz: 0.18, color: mat.agedWood });
      add({ mesh: "cube", x: x + Math.sin(ry) * 0.8, z: z + Math.cos(ry) * 0.8, sx: 0.08, sy: 1.5, sz: 0.75, y: heightAt(x, z) + 3.0, ry, color: c, shadow: false });
    };
    const tent = (x, z, ry, c) => {
      add({ mesh: "cube", x, z, sx: 5.4, sy: 1.7, sz: 4.4, ry, color: mat.agedWood });
      add({ mesh: "cone", x, z, sx: 5.8, sy: 3.2, sz: 4.8, y: heightAt(x, z) + 3.0, ry, color: c });
    };
    const dwarfHouse = (x, z, ry, forge = false) => {
      add({ mesh: "cube", x, z, sx: 8.5, sy: 4.5, sz: 7.2, ry, color: mat.mossyStone });
      add({ mesh: "cube", x, z, sx: 9.6, sy: 1.2, sz: 8.4, y: heightAt(x, z) + 5.1, ry, color: forge ? mat.rustedMetal : mat.wetRock });
      if (forge) add({ mesh: "sphere", x: x + Math.sin(ry) * 5.5, z: z + Math.cos(ry) * 5.5, sx: 0.9, sy: 0.9, sz: 0.9, y: heightAt(x, z) + 2.8, color: mat.ember, emissive: 0.9 });
    };
    const statue = (x, z, ry, c = mat.coldRuin, glow = 0.02) => {
      add({ mesh: "cylinder", x, z, sx: 1.4, sy: 1.2, sz: 1.4, color: mat.mossyStone });
      add({ mesh: "cylinder", x, z, sx: 0.72, sy: 2.6, sz: 0.56, y: heightAt(x, z) + 2.5, ry, color: c, emissive: glow });
      add({ mesh: "sphere", x, z, sx: 0.46, sy: 0.52, sz: 0.46, y: heightAt(x, z) + 4.05, color: c, emissive: glow });
      add({ mesh: "blade", x: x + Math.sin(ry) * 0.8, z: z + Math.cos(ry) * 0.8, sx: 0.10, sy: 1.65, sz: 0.08, y: heightAt(x, z) + 2.4, ry, color: mat.rustedMetal, emissive: glow * 0.5 });
    };
    const obelisk = (x, z, s, c, glow = 0.1) => {
      add({ mesh: "crystal", x, z, sx: s, sy: s * 4.8, sz: s, y: heightAt(x, z) + s * 2.1, ry: Math.random() * TAU, color: c, emissive: glow });
      add({ mesh: "cylinder", x, z, sx: s * 1.6, sy: 0.35, sz: s * 1.6, color: mat.mossyStone });
    };

    add({ mesh: "cylinder", x: -565, z: -330, sx: 85, sy: 0.08, sz: 45, color: [0.04, 0.12, 0.15, 0.82, 0, 0.18, 0.72, 16], emissive: 0.02, shadow: false });
    for (let i = 0; i < 8; i++) add({ mesh: "cube", x: -625 + i * 17, z: -310, sx: 7, sy: 0.35, sz: 25, color: mat.agedWood });
    for (let i = 0; i < 8; i++) {
      const x = -602 + i * 24;
      const z = -214 + (i % 2) * 20;
      add({ mesh: "cube", x, z, sx: 7.8, sy: 7 + (i % 3) * 2, sz: 7.4, color: mat.mossyStone });
      add({ mesh: "cone", x, z, sx: 8.5, sy: 4.5, sz: 8.2, y: heightAt(x, z) + 7.7 + (i % 3), color: [0.20, 0.17, 0.13, 1, 0.03, 0.74, 0.76, 18] });
      if (i % 2 === 0) torch(x + 9, z + 5);
    }
    add({ mesh: "cube", x: -455, z: -235, sx: 16, sy: 13, sz: 18, color: [0.48, 0.46, 0.39, 1, 0.06, 0.82, 0.74, 18] });
    add({ mesh: "cone", x: -455, z: -235, sx: 19, sy: 8, sz: 19, y: heightAt(-455, -235) + 13, color: [0.18, 0.22, 0.26, 1, 0.04, 0.66, 0.76, 16] });
    tent(-520, -178, 0.4, mat.parchmentCloth);
    tent(-388, -188, -0.7, [0.32, 0.12, 0.10, 1, 0.02, 0.86, 0.82, 18]);
    banner(-477, -184, 0.2, [0.45, 0.08, 0.08, 1, 0.02, 0.9, 0.8, 18]);
    banner(-430, -282, -0.3, [0.12, 0.20, 0.35, 1, 0.02, 0.9, 0.8, 18]);
    add({ mesh: "cylinder", x: -505, z: -230, sx: 1.4, sy: 2.55, sz: 1.4, color: [0.16, 0.15, 0.13, 1, 0.02, 0.78, 0.8, 20] });
    add({ mesh: "sphere", x: -505, z: -230, sx: 0.82, sy: 0.92, sz: 0.82, y: heightAt(-505, -230) + 3.05, color: [0.63, 0.55, 0.46, 1, 0.02, 0.66, 0.8, 20], emissive: 0.06 });

    for (let i = 0; i < 120; i++) {
      const x = -410 + Math.random() * 500;
      const z = -245 + Math.random() * 300;
      if (len2(x + 245, z + 95) < 55 || len2(x + 520, z + 230) < 80) continue;
      tree(x, z, 0.62 + Math.random() * 0.95);
      if (i % 2 === 0) root(x + Math.random() * 8 - 4, z + Math.random() * 8 - 4, 2 + Math.random() * 3, Math.random() * TAU);
    }
    for (let i = 0; i < 190; i++) {
      const x = -620 + Math.random() * 720;
      const z = -300 + Math.random() * 310;
      if (Math.random() < 0.7) grass(x, z, 0.65 + Math.random() * 1.3);
    }
    for (let i = 0; i < 50; i++) rock(-45 + Math.random() * 215, -430 + Math.random() * 225, 3 + Math.random() * 9, 2 + Math.random() * 9, 4 + Math.random() * 9, i % 3 === 0 ? mat.snowStone : mat.wetRock);
    dwarfHouse(28, -394, 0.2, true);
    dwarfHouse(72, -365, -0.45, false);
    dwarfHouse(118, -318, 0.7, false);
    obelisk(20, -430, 1.0, [0.42, 0.58, 0.66, 0.82, 0.02, 0.36, 0.62, 14], 0.2);
    banner(55, -382, 0.4, [0.28, 0.20, 0.12, 1, 0.02, 0.8, 0.76, 18]);
    banner(130, -306, -0.6, [0.12, 0.18, 0.24, 1, 0.02, 0.8, 0.76, 18]);

    add({ mesh: "arch", x: 204, z: -100, sx: 11, sy: 13, sz: 9, color: mat.coldRuin });
    add({ mesh: "cube", x: 245, z: -135, sx: 18, sy: 15, sz: 7, color: mat.mossyStone });
    add({ mesh: "cube", x: 290, z: -130, sx: 12, sy: 21, sz: 8, color: mat.coldRuin });
    add({ mesh: "cube", x: 335, z: -125, sx: 9, sy: 13, sz: 8, color: mat.mossyStone });
    add({ mesh: "arch", x: 300, z: -72, sx: 12, sy: 10, sz: 7, ry: 0.35, color: mat.coldRuin });
    for (let i = 0; i < 18; i++) add({ mesh: "cylinder", x: 195 + i * 12, z: -50 + (i % 3) * 14, sx: 1.0 + (i % 2) * 0.35, sy: 5 + (i % 4), sz: 1.0 + (i % 2) * 0.35, color: i % 4 === 0 ? mat.mossyStone : mat.coldRuin });
    for (let i = 0; i < 28; i++) root(205 + Math.random() * 150, -150 + Math.random() * 110, 2.5 + Math.random() * 5, Math.random() * TAU);
    statue(225, -205, 0.5, mat.coldRuin, 0.03);
    statue(255, -205, -0.2, mat.rustedMetal, 0.05);
    statue(296, -176, 0.95, [0.32, 0.34, 0.34, 1, 0.22, 0.58, 0.7, 18], 0.08);
    statue(356, -48, -0.4, mat.arcaneCrystal, 0.45);
    add({ mesh: "arch", x: 382, z: -24, sx: 8, sy: 9, sz: 6, ry: -0.7, color: [0.20, 0.16, 0.18, 1, 0.04, 0.78, 0.72, 20], emissive: 0.04 });
    for (let i = 0; i < 5; i++) {
      const x = 214 + i * 24;
      const z = -238 + (i % 2) * 16;
      tent(x, z, 0.2 + i * 0.3, [0.18, 0.16, 0.14, 1, 0.02, 0.86, 0.76, 18]);
      torch(x + 8, z - 5);
    }

    for (let i = 0; i < 80; i++) {
      const x = 400 + Math.random() * 280;
      const z = 10 + Math.random() * 285;
      tree(x, z, 0.52 + Math.random() * 0.72, [0.03, 0.34, 0.19, 1, 0, 0.88, 0.86, 26]);
      if (i % 2 === 0) crystal(x + Math.random() * 22 - 11, z + Math.random() * 22 - 11, 0.6 + Math.random() * 1.2);
    }
    for (let i = 0; i < 140; i++) grass(405 + Math.random() * 290, 30 + Math.random() * 260, 0.75 + Math.random() * 1.4, [0.05, 0.38, 0.18, 1, 0, 0.92, 0.88, 26]);
    add({ mesh: "cylinder", x: 520, z: 160, sx: 34, sy: 0.15, sz: 34, color: [0.05, 0.23, 0.14, 0.68, 0, 0.7, 0.7, 18], emissive: 0.10, shadow: false });
    add({ mesh: "arch", x: 550, z: 142, sx: 13, sy: 16, sz: 8, ry: -0.45, color: [0.18, 0.42, 0.32, 0.9, 0.02, 0.62, 0.64, 18], emissive: 0.18 });
    statue(500, 104, 0.8, mat.emeraldCrystal, 0.5);
    statue(575, 188, -0.4, [0.35, 0.68, 0.52, 0.9, 0.02, 0.42, 0.62, 18], 0.35);
    add({ mesh: "cube", x: 615, z: 236, sx: 20, sy: 1.5, sz: 7, color: [0.14, 0.36, 0.24, 0.58, 0, 0.52, 0.62, 18], emissive: 0.35, hidden: true });
    for (let i = 0; i < 16; i++) {
      const a = i * TAU / 16;
      crystal(735 + Math.sin(a) * 65, 320 + Math.cos(a) * 65, 1.2, mat.emeraldCrystal);
    }
    add({ mesh: "cylinder", x: 735, z: 320, sx: 58, sy: 0.15, sz: 58, color: [0.05, 0.16, 0.13, 0.72, 0, 0.64, 0.68, 18], emissive: 0.16, shadow: false });
    add({ mesh: "arch", x: 735, z: 384, sx: 16, sy: 17, sz: 9, ry: Math.PI, color: mat.mossyStone });
    obelisk(-650, -120, 1.2, [0.95, 0.58, 0.22, 0.82, 0, 0.34, 0.52, 14], 0.55);
    obelisk(-470, -315, 0.9, [0.42, 0.56, 0.95, 0.78, 0, 0.32, 0.54, 12], 0.45);
    statue(-632, -130, 0.3, [0.58, 0.46, 0.32, 1, 0.03, 0.78, 0.76, 18], 0.08);
    return o;
  }

  function makeTerrain(nx, nz, step) {
    const positions = [];
    const normals = [];
    const indices = [];
    const ox = -nx * step * 0.5;
    const oz = -nz * step * 0.5;
    for (let z = 0; z <= nz; z++) {
      for (let x = 0; x <= nx; x++) {
        const wx = ox + x * step;
        const wz = oz + z * step;
        positions.push(wx, heightAt(wx, wz), wz);
        const hL = heightAt(wx - 2, wz);
        const hR = heightAt(wx + 2, wz);
        const hD = heightAt(wx, wz - 2);
        const hU = heightAt(wx, wz + 2);
        const n = normalize([hL - hR, 4, hD - hU]);
        normals.push(n[0], n[1], n[2]);
      }
    }
    for (let z = 0; z < nz; z++) {
      for (let x = 0; x < nx; x++) {
        const a = z * (nx + 1) + x;
        indices.push(a, a + 1, a + nx + 1, a + 1, a + nx + 2, a + nx + 1);
      }
    }
    return { positions, normals, indices };
  }

  function boxMesh() {
    const p = [
      -1,-1,1, 1,-1,1, 1,1,1, -1,1,1, 1,-1,-1, -1,-1,-1, -1,1,-1, 1,1,-1,
      -1,-1,-1, -1,-1,1, -1,1,1, -1,1,-1, 1,-1,1, 1,-1,-1, 1,1,-1, 1,1,1,
      -1,1,1, 1,1,1, 1,1,-1, -1,1,-1, -1,-1,-1, 1,-1,-1, 1,-1,1, -1,-1,1
    ];
    const n = [
      0,0,1,0,0,1,0,0,1,0,0,1, 0,0,-1,0,0,-1,0,0,-1,0,0,-1,
      -1,0,0,-1,0,0,-1,0,0,-1,0,0, 1,0,0,1,0,0,1,0,0,1,0,0,
      0,1,0,0,1,0,0,1,0,0,1,0, 0,-1,0,0,-1,0,0,-1,0,0,-1,0
    ];
    const idx = [];
    for (let i = 0; i < 6; i++) {
      const o = i * 4;
      idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
    }
    return { positions: p, normals: n, indices: idx };
  }

  function cylinderMesh(seg, radius, height) {
    const p = [];
    const n = [];
    const idx = [];
    const h = height * 0.5;
    for (let i = 0; i <= seg; i++) {
      const a = i * TAU / seg;
      const x = Math.sin(a) * radius;
      const z = Math.cos(a) * radius;
      p.push(x, -h, z, x, h, z);
      n.push(x, 0, z, x, 0, z);
    }
    for (let i = 0; i < seg; i++) {
      const o = i * 2;
      idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2);
    }
    const top = p.length / 3;
    p.push(0, h, 0); n.push(0, 1, 0);
    const bot = p.length / 3;
    p.push(0, -h, 0); n.push(0, -1, 0);
    for (let i = 0; i < seg; i++) {
      const a = i * 2 + 1;
      const b = ((i + 1) % seg) * 2 + 1;
      idx.push(top, a, b);
      idx.push(bot, ((i + 1) % seg) * 2, i * 2);
    }
    return { positions: p, normals: n, indices: idx };
  }

  function coneMesh(seg, radius, height) {
    const p = [0, height * 0.5, 0];
    const n = [0, 1, 0];
    const idx = [];
    for (let i = 0; i < seg; i++) {
      const a = i * TAU / seg;
      const x = Math.sin(a) * radius;
      const z = Math.cos(a) * radius;
      p.push(x, -height * 0.5, z);
      n.push(x, 0.35, z);
    }
    for (let i = 0; i < seg; i++) idx.push(0, 1 + i, 1 + ((i + 1) % seg));
    const c = p.length / 3;
    p.push(0, -height * 0.5, 0);
    n.push(0, -1, 0);
    for (let i = 0; i < seg; i++) idx.push(c, 1 + ((i + 1) % seg), 1 + i);
    return { positions: p, normals: n, indices: idx };
  }

  function sphereMesh(cols, rows, r) {
    const p = [];
    const n = [];
    const idx = [];
    for (let y = 0; y <= rows; y++) {
      const v = y / rows;
      const phi = v * Math.PI;
      for (let x = 0; x <= cols; x++) {
        const u = x / cols;
        const th = u * TAU;
        const nx = Math.sin(phi) * Math.sin(th);
        const ny = Math.cos(phi);
        const nz = Math.sin(phi) * Math.cos(th);
        p.push(nx * r, ny * r, nz * r);
        n.push(nx, ny, nz);
      }
    }
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const a = y * (cols + 1) + x;
        idx.push(a, a + cols + 1, a + 1, a + 1, a + cols + 1, a + cols + 2);
      }
    }
    return { positions: p, normals: n, indices: idx };
  }

  function crystalMesh() {
    const p = [0,1.4,0, 0.75,0,0, 0,-1.2,0.75, -0.75,0,0, 0,-1.2,-0.75, 0,-1.8,0];
    const faces = [0,1,2, 0,2,3, 0,3,4, 0,4,1, 5,2,1, 5,3,2, 5,4,3, 5,1,4];
    const normals = new Array(p.length).fill(0);
    for (let i = 0; i < faces.length; i += 3) {
      const ia = faces[i] * 3, ib = faces[i + 1] * 3, ic = faces[i + 2] * 3;
      const a = [p[ia], p[ia+1], p[ia+2]], b = [p[ib], p[ib+1], p[ib+2]], c = [p[ic], p[ic+1], p[ic+2]];
      const no = normalize(cross(sub(b, a), sub(c, a)));
      for (const f of [faces[i], faces[i + 1], faces[i + 2]]) {
        normals[f * 3] += no[0]; normals[f * 3 + 1] += no[1]; normals[f * 3 + 2] += no[2];
      }
    }
    for (let i = 0; i < normals.length; i += 3) {
      const no = normalize([normals[i], normals[i + 1], normals[i + 2]]);
      normals[i] = no[0]; normals[i + 1] = no[1]; normals[i + 2] = no[2];
    }
    return { positions: p, normals, indices: faces };
  }

  function archMesh() {
    const parts = [
      { x: -0.78, y: 0, z: 0, sx: 0.22, sy: 1.2, sz: 0.24 },
      { x: 0.78, y: 0, z: 0, sx: 0.22, sy: 1.2, sz: 0.24 },
      { x: 0, y: 1.02, z: 0, sx: 1.0, sy: 0.22, sz: 0.24 }
    ];
    const base = boxMesh();
    const p = [];
    const n = [];
    const idx = [];
    for (const part of parts) {
      const offset = p.length / 3;
      for (let i = 0; i < base.positions.length; i += 3) {
        p.push(base.positions[i] * part.sx + part.x, base.positions[i + 1] * part.sy + part.y, base.positions[i + 2] * part.sz + part.z);
        n.push(base.normals[i], base.normals[i + 1], base.normals[i + 2]);
      }
      for (const id of base.indices) idx.push(id + offset);
    }
    return { positions: p, normals: n, indices: idx };
  }

  function makeMesh(data) {
    const packed = [];
    for (let i = 0; i < data.positions.length / 3; i++) {
      packed.push(data.positions[i * 3], data.positions[i * 3 + 1], data.positions[i * 3 + 2]);
      packed.push(data.normals[i * 3], data.normals[i * 3 + 1], data.normals[i * 3 + 2]);
    }
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(packed), gl.STATIC_DRAW);
    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(data.indices), gl.STATIC_DRAW);
    return { vbo, ibo, count: data.indices.length };
  }

  function createProgram(vsSource, fsSource) {
    const vs = compile(gl.VERTEX_SHADER, vsSource);
    const fs = compile(gl.FRAGMENT_SHADER, fsSource);
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    return program;
  }

  function compile(type, source) {
    const s = gl.createShader(type);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  function modelMatrix(x, y, z, rx, ry, rz, sx, sy, sz) {
    let m = m4Identity();
    m = m4Mul(m, m4Translate(x, y, z));
    if (ry) m = m4Mul(m, m4RotateY(ry));
    if (rx) m = m4Mul(m, m4RotateX(rx));
    if (rz) m = m4Mul(m, m4RotateZ(rz));
    return m4Mul(m, m4Scale(sx, sy, sz));
  }

  function m4Identity() {
    return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
  }

  function m4Translate(x, y, z) {
    return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1]);
  }

  function m4Scale(x, y, z) {
    return new Float32Array([x,0,0,0, 0,y,0,0, 0,0,z,0, 0,0,0,1]);
  }

  function m4RotateY(a) {
    const c = Math.cos(a), s = Math.sin(a);
    return new Float32Array([c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]);
  }

  function m4RotateX(a) {
    const c = Math.cos(a), s = Math.sin(a);
    return new Float32Array([1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]);
  }

  function m4RotateZ(a) {
    const c = Math.cos(a), s = Math.sin(a);
    return new Float32Array([c,s,0,0, -s,c,0,0, 0,0,1,0, 0,0,0,1]);
  }

  function m4Mul(a, b) {
    const o = new Float32Array(16);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        o[c * 4 + r] = a[0 * 4 + r] * b[c * 4 + 0] + a[1 * 4 + r] * b[c * 4 + 1] + a[2 * 4 + r] * b[c * 4 + 2] + a[3 * 4 + r] * b[c * 4 + 3];
      }
    }
    return o;
  }

  function m4Perspective(fov, aspect, near, far) {
    const f = 1 / Math.tan(fov / 2);
    const nf = 1 / (near - far);
    return new Float32Array([f/aspect,0,0,0, 0,f,0,0, 0,0,(far+near)*nf,-1, 0,0,2*far*near*nf,0]);
  }

  function m4LookAt(eye, center, up) {
    const z = normalize(sub(eye, center));
    const x = normalize(cross(up, z));
    const y = cross(z, x);
    return new Float32Array([
      x[0], y[0], z[0], 0,
      x[1], y[1], z[1], 0,
      x[2], y[2], z[2], 0,
      -dot(x, eye), -dot(y, eye), -dot(z, eye), 1
    ]);
  }

  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function dot(a, b) { return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]; }
  function cross(a, b) { return [a[1]*b[2] - a[2]*b[1], a[2]*b[0] - a[0]*b[2], a[0]*b[1] - a[1]*b[0]]; }
  function normalize(v) {
    const l = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
  }

  window.addEventListener("resize", resize);
  window.addEventListener("keydown", e => {
    if (!e.repeat) pressed.add(e.code);
    keys.add(e.code);
    if (e.code === "Escape") setPause(state?.mode !== "paused");
    if (e.code === "Enter" && advanceDialogue()) e.preventDefault();
  });
  window.addEventListener("keyup", e => keys.delete(e.code));
  canvas.addEventListener("mousedown", e => {
    if (state?.mode === "playing" && document.pointerLockElement !== canvas) canvas.requestPointerLock?.();
    if (e.button === 0) mouse.left = true;
    if (e.button === 2) mouse.right = true;
  });
  window.addEventListener("mouseup", e => {
    if (e.button === 0) mouse.left = false;
    if (e.button === 2) mouse.right = false;
  });
  window.addEventListener("mousemove", e => {
    mouse.dx += e.movementX || 0;
    mouse.dy += e.movementY || 0;
  });
  canvas.addEventListener("contextmenu", e => e.preventDefault());
  ui.startButton.addEventListener("click", startGame);
  ui.resumeButton.addEventListener("click", () => setPause(false));
  ui.restartButton.addEventListener("click", startGame);
  ui.victoryRestartButton.addEventListener("click", startGame);

  state = createState();
  resize();
  checkAssets();
  loop();
})();
