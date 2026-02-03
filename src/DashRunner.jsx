import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";

export default function DashRunner() {
  const mountRef = useRef(null);

  // UI state (throttled updates)
  const [score, setScore] = useState(0);
  const [coinCount, setCoinCount] = useState(0);
  const [health, setHealth] = useState(5);
  const [gameState, setGameState] = useState("start");
  const [dashCooldown, setDashCooldown] = useState(0);
  const [perfectDash, setPerfectDash] = useState(false);

  // Refs for performance (avoid setState every frame)
  const scoreRef = useRef(0);
  const coinCountRef = useRef(0);
  const healthRef = useRef(5);
  const dashCooldownRef = useRef(0);

  const startGame = () => {
    scoreRef.current = 0;
    coinCountRef.current = 0;
    healthRef.current = 5;
    dashCooldownRef.current = 0;

    setScore(0);
    setCoinCount(0);
    setHealth(5);
    setDashCooldown(0);
    setPerfectDash(false);
    setGameState("playing");
  };

  useEffect(() => {
    if (!mountRef.current || gameState !== "playing") return;

    // --- THREE setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x88c9f5);
    scene.fog = new THREE.Fog(0xb8e6ff, 20, 80);

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;

    mountRef.current.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xfff4e6, 1.2);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Character
    const character = new THREE.Group();

    const bodyGeometry = new THREE.BoxGeometry(0.4, 0.6, 0.3);
    const bodyMaterial = new THREE.MeshToonMaterial({ color: 0x5dade2 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.5;
    body.castShadow = true;
    character.add(body);

    const headGeometry = new THREE.SphereGeometry(0.22, 16, 16);
    const headMaterial = new THREE.MeshToonMaterial({ color: 0xffd5b5 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 0.95;
    head.castShadow = true;
    character.add(head);

    const hairGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    const hairMaterial = new THREE.MeshToonMaterial({ color: 0x3498db });
    const hair = new THREE.Mesh(hairGeometry, hairMaterial);
    hair.position.set(0, 1.1, 0);
    hair.castShadow = true;
    character.add(hair);

    const armGeometry = new THREE.BoxGeometry(0.15, 0.5, 0.15);
    const armMaterial = new THREE.MeshToonMaterial({ color: 0x5dade2 });

    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.3, 0.5, 0);
    leftArm.castShadow = true;
    character.add(leftArm);

    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.3, 0.5, 0);
    rightArm.castShadow = true;
    character.add(rightArm);

    const legGeometry = new THREE.BoxGeometry(0.15, 0.4, 0.15);
    const legMaterial = new THREE.MeshToonMaterial({ color: 0x34495e });

    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.15, 0.15, 0);
    leftLeg.castShadow = true;
    character.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.15, 0.15, 0);
    rightLeg.castShadow = true;
    character.add(rightLeg);

    character.position.set(0, 0, 0);
    scene.add(character);

    // Dash trail
    const trailGeometry = new THREE.PlaneGeometry(1.2, 1.5);
    const trailMaterial = new THREE.MeshBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const dashTrail = new THREE.Mesh(trailGeometry, trailMaterial);
    scene.add(dashTrail);

    // Platform
    const platformWidth = 12;
    const platformDepth = 12;
    const platforms = [];

    function createPlatform(zPosition) {
      const platformGeometry = new THREE.BoxGeometry(
        platformWidth,
        0.3,
        platformDepth
      );
      const platformMaterial = new THREE.MeshToonMaterial({ color: 0xa8dadc });
      const platform = new THREE.Mesh(platformGeometry, platformMaterial);
      platform.position.set(0, -0.15, zPosition);
      platform.receiveShadow = true;
      scene.add(platform);
      platforms.push(platform);

      const edgeGeometry = new THREE.BoxGeometry(platformWidth, 0.1, platformDepth);
      const edgeMaterial = new THREE.MeshToonMaterial({ color: 0x1d3557 });
      const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
      edge.position.set(0, -0.3, zPosition);
      scene.add(edge);
      platforms.push(edge);

      return platform;
    }

    for (let i = 0; i < 10; i++) createPlatform(-i * platformDepth);

    // Boundaries
    const boundaryHeight = 2.5;
    const boundaryMaterial = new THREE.MeshToonMaterial({
      color: 0xff6b9d,
      transparent: true,
      opacity: 0.6,
    });

    const boundaries = [];
    function createBoundary(x, zPosition) {
      const boundaryGeometry = new THREE.BoxGeometry(
        0.4,
        boundaryHeight,
        platformDepth
      );
      const boundary = new THREE.Mesh(boundaryGeometry, boundaryMaterial);
      boundary.position.set(x, boundaryHeight / 2, zPosition);
      boundary.castShadow = true;
      scene.add(boundary);
      boundaries.push(boundary);
      return boundary;
    }

    for (let i = 0; i < 10; i++) {
      createBoundary(platformWidth / 2, -i * platformDepth);
      createBoundary(-platformWidth / 2, -i * platformDepth);
    }

    // Coins (rename mesh array to avoid conflict)
    const coinGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.08, 20);
    const coinMaterial = new THREE.MeshToonMaterial({ color: 0xffd700 });
    const coinMeshes = [];

    function createCoin(x, z) {
      const coin = new THREE.Mesh(coinGeometry, coinMaterial);
      coin.position.set(x, 0.6, z);
      coin.rotation.x = Math.PI / 2;
      coin.castShadow = true;
      scene.add(coin);
      coinMeshes.push(coin);
      return coin;
    }

    for (let i = 0; i < 25; i++) {
      const x = (Math.random() - 0.5) * (platformWidth - 3);
      const z = -Math.random() * 100 - 15;
      createCoin(x, z);
    }

    // Enemies
    const obstacles = [];
    function createObstacle(x, z) {
      const enemy = new THREE.Group();

      const bodyGeometry2 = new THREE.SphereGeometry(0.4, 16, 16);
      const bodyMaterial2 = new THREE.MeshToonMaterial({ color: 0xe74c3c });
      const enemyBody = new THREE.Mesh(bodyGeometry2, bodyMaterial2);
      enemyBody.position.y = 0.4;
      enemyBody.castShadow = true;
      enemyBody.scale.set(1, 0.8, 1);
      enemy.add(enemyBody);

      const eyeGeometry = new THREE.SphereGeometry(0.08, 8, 8);
      const eyeMaterial = new THREE.MeshToonMaterial({ color: 0xffffff });

      const leftEye2 = new THREE.Mesh(eyeGeometry, eyeMaterial);
      leftEye2.position.set(-0.15, 0.5, 0.3);
      enemy.add(leftEye2);

      const rightEye2 = new THREE.Mesh(eyeGeometry, eyeMaterial);
      rightEye2.position.set(0.15, 0.5, 0.3);
      enemy.add(rightEye2);

      const pupilGeometry = new THREE.SphereGeometry(0.04, 8, 8);
      const pupilMaterial = new THREE.MeshToonMaterial({ color: 0x000000 });

      const leftPupil2 = new THREE.Mesh(pupilGeometry, pupilMaterial);
      leftPupil2.position.set(-0.15, 0.5, 0.35);
      enemy.add(leftPupil2);

      const rightPupil2 = new THREE.Mesh(pupilGeometry, pupilMaterial);
      rightPupil2.position.set(0.15, 0.5, 0.35);
      enemy.add(rightPupil2);

      enemy.position.set(x, 0, z);
      enemy.userData = { stunned: false, chasing: false };
      scene.add(enemy);
      obstacles.push(enemy);
      return enemy;
    }

    for (let i = 0; i < 12; i++) {
      const x = (Math.random() - 0.5) * (platformWidth - 3);
      const z = -Math.random() * 100 - 40;
      createObstacle(x, z);
    }

    // Trees
    const trees = [];
    function createTree(x, z) {
      const tree = new THREE.Group();

      const trunkGeometry = new THREE.CylinderGeometry(0.15, 0.25, 1.5, 6);
      const trunkMaterial = new THREE.MeshToonMaterial({ color: 0x8b7355 });
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
      trunk.position.y = 0.75;
      trunk.castShadow = true;
      tree.add(trunk);

      const foliageGeometry = new THREE.OctahedronGeometry(0.6);
      const foliageMaterial = new THREE.MeshToonMaterial({
        color: 0x48c9b0,
        transparent: true,
        opacity: 0.9,
      });
      const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
      foliage.position.y = 1.8;
      foliage.castShadow = true;
      tree.add(foliage);

      tree.position.set(x, 0, z);
      scene.add(tree);
      trees.push(tree);
      return tree;
    }

    for (let i = 0; i < 25; i++) {
      const side = Math.random() > 0.5 ? 1 : -1;
      const x = side * (platformWidth / 2 + 1.5 + Math.random() * 4);
      const z = -Math.random() * 100 - 15;
      createTree(x, z);
    }

    camera.position.set(0, 5, 7);
    camera.lookAt(0, 1, -5);

    // --- Game state (locals) ---
    let characterX = 0;
    let characterZ = 0;

    let moveSpeed = 0.12;
    let isDashing = false;
    let isInvulnerable = true;

    let dashStartTime = 0;
    let dashTargetX = 0;
    let dashTargetZ = 0;
    let dashStartX = 0;
    let dashStartZ = 0;

    let cooldownTimer = 0;
    let invulnerabilityTimer = 2.0;
    let speedBoostTimer = 0;
    let currentSpeedBoost = 1;

    // Touch/swipe
    let touchStartX = 0;
    let touchStartY = 0;

    const handleTouchStart = (e) => {
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    };

    const handleTouchEnd = (e) => {
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;
      const swipeDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      if (swipeDistance > 50) executeDash(deltaX, deltaY);
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape" || e.key === "p") {
        setGameState("paused");
        return;
      }
      if (isDashing || cooldownTimer > 0) return;

      if (e.key === "w" || e.key === "W" || e.key === " ") executeDash(0, -100);
      else if (e.key === "d" || e.key === "D") executeDash(100, 0);
      else if (e.key === "a" || e.key === "A") executeDash(-100, 0);
      else if (e.key === "e" || e.key === "E") executeDash(100, -100);
      else if (e.key === "q" || e.key === "Q") executeDash(-100, -100);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    function executeDash(deltaX, deltaY) {
      if (isDashing || cooldownTimer > 0) return;

      // Prevent backward dash on swipe-down (recommended)
      if (deltaY > 0) return;

      const angleRad = Math.atan2(deltaX, -deltaY);
      const angleDeg = angleRad * (180 / Math.PI);

      let direction = null;
      if (angleDeg >= -22.5 && angleDeg <= 22.5) direction = "forward";
      else if (angleDeg > 22.5 && angleDeg <= 67.5) direction = "mid-right";
      else if (angleDeg > 67.5 && angleDeg <= 112.5) direction = "right";
      else if (angleDeg < -22.5 && angleDeg >= -67.5) direction = "mid-left";
      else if (angleDeg < -67.5 && angleDeg >= -112.5) direction = "left";
      else return;

      const dashDistance = 2.7;
      const diag = 0.70710678;

      isDashing = true;
      isInvulnerable = true;

      dashStartTime = Date.now();
      dashStartX = characterX;
      dashStartZ = characterZ;

      if (direction === "forward") {
        dashTargetX = characterX;
        dashTargetZ = characterZ - dashDistance;
      } else if (direction === "mid-right") {
        dashTargetX = characterX + dashDistance * diag;
        dashTargetZ = characterZ - dashDistance * diag;
      } else if (direction === "right") {
        dashTargetX = characterX + dashDistance;
        dashTargetZ = characterZ;
      } else if (direction === "mid-left") {
        dashTargetX = characterX - dashDistance * diag;
        dashTargetZ = characterZ - dashDistance * diag;
      } else if (direction === "left") {
        dashTargetX = characterX - dashDistance;
        dashTargetZ = characterZ;
      }

      const maxX = platformWidth / 2 - 0.6;
      dashTargetX = Math.max(-maxX, Math.min(maxX, dashTargetX));

      cooldownTimer = 1.0;
      dashCooldownRef.current = cooldownTimer;
    }

    // Throttle UI updates (10 fps)
    let uiAccum = 0;
    const UI_INTERVAL = 0.1; // seconds

    let animationId;
    let frameCount = 0;
    let lastTime = Date.now();

    function animate() {
      animationId = requestAnimationFrame(animate);

      const currentTime = Date.now();
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      // Pause safety: stop advancing logic if paused/gameover
      if (gameState !== "playing") return;

      frameCount++;

      // Timers
      if (cooldownTimer > 0) {
        cooldownTimer -= deltaTime;
        if (cooldownTimer < 0) cooldownTimer = 0;
        dashCooldownRef.current = cooldownTimer;
      }

      if (invulnerabilityTimer > 0) {
        invulnerabilityTimer -= deltaTime;
        if (invulnerabilityTimer <= 0) isInvulnerable = false;
      }

      if (speedBoostTimer > 0) {
        speedBoostTimer -= deltaTime;
        if (speedBoostTimer <= 0) currentSpeedBoost = 1;
      }

      // Dash motion
      if (isDashing) {
        const dashElapsed = (Date.now() - dashStartTime) / 1000;
        const dashDuration = 0.18;

        if (dashElapsed < dashDuration) {
          const t = dashElapsed / dashDuration;
          const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

          characterX = dashStartX + (dashTargetX - dashStartX) * easeT;
          characterZ = dashStartZ + (dashTargetZ - dashStartZ) * easeT;

          dashTrail.position.copy(character.position);
          dashTrail.material.opacity = 0.7 * (1 - t);

          body.material.emissive = new THREE.Color(0x00d4ff);
          body.material.emissiveIntensity = 0.8;
        } else {
          isDashing = false;
          characterX = dashTargetX;
          characterZ = dashTargetZ;

          dashTrail.material.opacity = 0;
          body.material.emissive = new THREE.Color(0x000000);
          body.material.emissiveIntensity = 0;

          // small post-dash safety
          invulnerabilityTimer = 0.1;
        }
      }

      // Forward run
      characterZ -= moveSpeed * currentSpeedBoost;

      // Clamp inside platform
      const maxX = platformWidth / 2 - 0.6;
      characterX = Math.max(-maxX, Math.min(maxX, characterX));

      character.position.x = characterX;
      character.position.z = characterZ;

      // Limb animation
      if (!isDashing) {
        leftLeg.rotation.x = Math.sin(frameCount * 0.15) * 0.4;
        rightLeg.rotation.x = -Math.sin(frameCount * 0.15) * 0.4;
        leftArm.rotation.x = -Math.sin(frameCount * 0.15) * 0.3;
        rightArm.rotation.x = Math.sin(frameCount * 0.15) * 0.3;

        if (isInvulnerable && invulnerabilityTimer > 0) {
          body.material.opacity = Math.sin(frameCount * 0.5) > 0 ? 0.5 : 1.0;
          body.material.transparent = true;
        } else {
          body.material.opacity = 1.0;
          body.material.transparent = false;
        }
      } else {
        leftArm.rotation.x = -0.8;
        rightArm.rotation.x = -0.8;
      }

      // Coins pickup
      for (let i = coinMeshes.length - 1; i >= 0; i--) {
        const coin = coinMeshes[i];
        coin.rotation.z += 0.05;

        const dx = coin.position.x - characterX;
        const dz = coin.position.z - characterZ;
        const distance = Math.sqrt(dx * dx + dz * dz);

        if (distance < 0.7) {
          scene.remove(coin);
          coinMeshes.splice(i, 1);

          coinCountRef.current += 1;

          // reduce cooldown slightly as reward
          if (cooldownTimer > 0) {
            cooldownTimer = Math.max(0, cooldownTimer - 0.15);
            dashCooldownRef.current = cooldownTimer;
          }
          continue;
        }

        // recycle coins
        if (coin.position.z > characterZ + 10) {
          coin.position.z = characterZ - Math.random() * 40 - 50;
          coin.position.x = (Math.random() - 0.5) * (platformWidth - 3);
        }
      }

      // Enemies
      obstacles.forEach((obstacle) => {
        const dx = obstacle.position.x - characterX;
        const dz = obstacle.position.z - characterZ;
        const distanceToPlayer = Math.sqrt(dx * dx + dz * dz);

        const chaseRange = 8;
        if (distanceToPlayer < chaseRange && !obstacle.userData.stunned) {
          obstacle.userData.chasing = true;
          const dirX = characterX - obstacle.position.x;
          const dirZ = characterZ - obstacle.position.z;
          const len = Math.sqrt(dirX * dirX + dirZ * dirZ);

          if (len > 0.5) {
            obstacle.position.x += (dirX / len) * 0.04;
            obstacle.position.z += (dirZ / len) * 0.04;
          }
          obstacle.position.y = Math.abs(Math.sin(frameCount * 0.15)) * 0.15;
        } else {
          obstacle.userData.chasing = false;
          obstacle.position.y = 0;
        }

        // Dash hit = stun + perfect dash bonus
        if (isDashing && distanceToPlayer < 1.2 && !obstacle.userData.stunned) {
          obstacle.userData.stunned = true;
          obstacle.children[0].material.color.setHex(0x95a5a6);

          if (distanceToPlayer < 2.5) {
            setPerfectDash(true);
            setTimeout(() => setPerfectDash(false), 500);

            invulnerabilityTimer = 0.4;
            currentSpeedBoost = 1.15;
            speedBoostTimer = 1.0;

            scoreRef.current += 10;
          }

          cooldownTimer = Math.max(0, cooldownTimer - 0.3);
          dashCooldownRef.current = cooldownTimer;

          setTimeout(() => {
            obstacle.userData.stunned = false;
            obstacle.children[0].material.color.setHex(0xe74c3c);
          }, 1500);
        } else if (!isDashing && !isInvulnerable && distanceToPlayer < 0.9) {
          healthRef.current -= 1;

          if (healthRef.current <= 0) {
            setGameState("gameOver");
            return;
          }

          isInvulnerable = true;
          invulnerabilityTimer = 1.5;

          body.material.color.setHex(0xff0000);
          setTimeout(() => body.material.color.setHex(0x5dade2), 300);
        }

        // recycle obstacles
        if (obstacle.position.z > characterZ + 15) {
          obstacle.position.z = characterZ - Math.random() * 40 - 50;
          obstacle.position.x = (Math.random() - 0.5) * (platformWidth - 3);
          obstacle.userData.stunned = false;
          obstacle.children[0].material.color.setHex(0xe74c3c);
        }
      });

      // recycle world
      platforms.forEach((platform) => {
        if (platform.position.z > characterZ + 20) platform.position.z = characterZ - 60;
      });
      boundaries.forEach((boundary) => {
        if (boundary.position.z > characterZ + 20) boundary.position.z = characterZ - 60;
      });
      trees.forEach((tree) => {
        if (tree.position.z > characterZ + 20) {
          tree.position.z = characterZ - Math.random() * 50 - 60;
          const side = Math.random() > 0.5 ? 1 : -1;
          tree.position.x = side * (platformWidth / 2 + 1.5 + Math.random() * 4);
        }
        tree.children[1].rotation.y += 0.01;
      });

      // Camera follow
      camera.position.z = characterZ + 7;
      camera.position.x = characterX * 0.25;
      camera.lookAt(characterX, 1, characterZ - 5);

      // Difficulty ramp
      if (frameCount % 600 === 0) moveSpeed = Math.min(0.22, moveSpeed + 0.01);

      // Score increments (no React update here)
      if (frameCount % 10 === 0) scoreRef.current += 1;

      // Throttled UI sync
      uiAccum += deltaTime;
      if (uiAccum >= UI_INTERVAL) {
        uiAccum = 0;

        setScore(scoreRef.current);
        setCoinCount(coinCountRef.current);
        setHealth(healthRef.current);
        setDashCooldown(dashCooldownRef.current);
      }

      renderer.render(scene, camera);
    }

    animate();

    function handleResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
      cancelAnimationFrame(animationId);

      if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [gameState]);

  // --- UI Screens ---
  if (gameState === "start") {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background:
            "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <h1
          style={{
            color: "white",
            fontSize: "64px",
            marginBottom: "20px",
            fontWeight: "bold",
          }}
        >
          DASH RUNNER
        </h1>
        <button
          onClick={startGame}
          style={{
            padding: "25px 70px",
            fontSize: "36px",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            border: "3px solid white",
            borderRadius: "15px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          START
        </button>
        <div
          style={{
            marginTop: "40px",
            color: "white",
            fontSize: "18px",
            textAlign: "center",
          }}
        >
          <p>W/Space: Forward • A: Left • D: Right</p>
          <p>Q: Diagonal Left • E: Diagonal Right</p>
          <p>Swipe to dash on mobile!</p>
        </div>
      </div>
    );
  }

  if (gameState === "paused") {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "rgba(0, 0, 0, 0.9)",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <h1 style={{ color: "white", fontSize: "64px", marginBottom: "30px" }}>
          PAUSED
        </h1>
        <button
          onClick={() => setGameState("playing")}
          style={{
            padding: "20px 60px",
            fontSize: "28px",
            background: "#2ecc71",
            color: "white",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
            marginBottom: "20px",
          }}
        >
          RESUME
        </button>
        <button
          onClick={() => setGameState("start")}
          style={{
            padding: "20px 60px",
            fontSize: "28px",
            background: "#e74c3c",
            color: "white",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
          }}
        >
          QUIT
        </button>
      </div>
    );
  }

  if (gameState === "gameOver") {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #2c3e50 0%, #34495e 100%)",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <h1
          style={{
            color: "#e74c3c",
            fontSize: "64px",
            marginBottom: "30px",
          }}
        >
          GAME OVER
        </h1>
        <div style={{ marginBottom: "40px", color: "white", fontSize: "32px" }}>
          <p>Score: {score}</p>
          <p>Coins: {coinCount}</p>
        </div>
        <button
          onClick={startGame}
          style={{
            padding: "20px 60px",
            fontSize: "28px",
            background: "#2ecc71",
            color: "white",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
            marginBottom: "20px",
          }}
        >
          PLAY AGAIN
        </button>
        <button
          onClick={() => setGameState("start")}
          style={{
            padding: "20px 60px",
            fontSize: "28px",
            background: "#95a5a6",
            color: "white",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
          }}
        >
          MENU
        </button>
      </div>
    );
  }

  // Playing UI
  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", position: "relative" }}>
      <div ref={mountRef} />

      <div
        style={{
          position: "absolute",
          top: 20,
          left: 0,
          right: 0,
          padding: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 10,
        }}
      >
        <div style={{ color: "white", fontSize: "24px", fontWeight: "bold" }}>
          Score: {score}
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              style={{
                width: "40px",
                height: "40px",
                color: i < health ? "#ff6b9d" : "#555",
                fontSize: "40px",
              }}
            >
              ♥
            </div>
          ))}
        </div>

        <div style={{ color: "#ffd700", fontSize: "24px", fontWeight: "bold" }}>
          Coins: {coinCount}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: "100px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "200px",
          height: "20px",
          background: "rgba(0,0,0,0.5)",
          borderRadius: "10px",
          overflow: "hidden",
          border: "2px solid white",
          zIndex: 10,
        }}
      >
        <div
          style={{
            width: `${Math.max(0, 100 - dashCooldown * 100)}%`,
            height: "100%",
            background: dashCooldown > 0 ? "#e74c3c" : "#2ecc71",
            transition: "width 0.1s",
          }}
        />
      </div>

      {perfectDash && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "#00d4ff",
            fontSize: "48px",
            fontWeight: "bold",
            zIndex: 10,
          }}
        >
          PERFECT DASH!
        </div>
      )}
    </div>
  );
}