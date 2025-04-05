
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.156.1/build/three.module.js';

window.onload = () => {

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('bg')
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  // Brick layers
  const boxSize = 8;
  const boxThick = 2;
  const layerGap = 18;
  const boxGap = 12;
  const boxCount = 6;
  const layerConfigs = [
    { y: -5 * layerGap, color: 0xABA32E },
    { y: -4 * layerGap, color: 0xCE69B8 },
    { y: -3 * layerGap, color: 0x7A64E7 },
    { y: -2 * layerGap, color: 0x3CAC62 },
    { y: -1 * layerGap, color: 0xADAE4D },
    { y: 0,             color: 0x36A8DE }
  ];

  layerConfigs.forEach(config => {
    const material = new THREE.MeshStandardMaterial({
      color: config.color,
      emissive: 0x000000,
      metalness: 0.2,
      roughness: 0.6
    });

    for (let x = -boxCount / 2; x < boxCount / 2; x++) {
      for (let z = -boxCount / 2; z < boxCount / 2; z++) {
        const geometry = new THREE.BoxGeometry(boxSize, boxThick, boxSize);
        const box = new THREE.Mesh(geometry, material);
        box.position.set(x * boxGap, config.y, z * boxGap);
        scene.add(box);
      }
    }
  });

  const sun = new THREE.DirectionalLight(0xffffff, 10);
  sun.position.set(20, 10, 0);
  scene.add(sun);

  const ambient = new THREE.AmbientLight(0xffffff, 2); 
  scene.add(ambient);

  // Ship
  const shipGeometry = new THREE.ConeGeometry(0.5, 1, 8);
  shipGeometry.rotateX(Math.PI); // face -Z
  const shipMaterial = new THREE.MeshStandardMaterial({ color: 0x990033 });
  const ship = new THREE.Mesh(shipGeometry, shipMaterial);
  ship.position.set(0, 10, 0);

  camera.position.set(0, -12, 2);
  camera.rotation.x = Math.PI / 2.5;
  ship.add(camera);

  scene.add(ship);

  // Stars
  function addStar() {
    const geometry = new THREE.SphereGeometry(0.05, 6, 6);
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const star = new THREE.Mesh(geometry, material);
    const [x, y, z] = Array(3).fill().map(() => THREE.MathUtils.randFloatSpread(100));
    star.position.set(x, y, z);
    scene.add(star);
  }
  Array(500).fill().forEach(addStar);

  // Input
  const keys = {};
  window.addEventListener('keydown', e => keys[e.code] = true);
  window.addEventListener('keyup', e => keys[e.code] = false);

  // Physics
  const velocity = new THREE.Vector3();
  const acceleration = 0.006;
  const friction = 0.98;
  const rotSpeed = 0.01;

  // Animate loop
  function animate() {
    requestAnimationFrame(animate);

    // Rotation axes — in local space
    const q = new THREE.Quaternion();
    if (keys['Numpad7']) {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -rotSpeed); // Yaw left
      ship.quaternion.multiply(q);
    }
    if (keys['Numpad9']) {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotSpeed); // Yaw right
      ship.quaternion.multiply(q);
    }
    if (keys['Numpad8']) {
      q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), rotSpeed); // Pitch up
      ship.quaternion.multiply(q);
    }
    if (keys['Numpad2']) {
      q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -rotSpeed); // Pitch down
      ship.quaternion.multiply(q);
    }
    if (keys['Numpad4']) {
      q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), rotSpeed); // Roll left
      ship.quaternion.multiply(q);
    }
    if (keys['Numpad6']) {
      q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -rotSpeed); // Roll right
      ship.quaternion.multiply(q);
    }

    // Thrust in local directions
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(ship.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(ship.quaternion);

    if (keys['Numpad5']) velocity.add(forward.clone().multiplyScalar(acceleration));
    if (keys['Numpad0']) velocity.add(forward.clone().multiplyScalar(-acceleration));
    if (keys['KeyR']) velocity.add(up.clone().multiplyScalar(acceleration));
    if (keys['KeyF']) velocity.add(up.clone().multiplyScalar(-acceleration));

    velocity.multiplyScalar(friction);
    ship.position.add(velocity);

    renderer.render(scene, camera);
  }

  animate();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

};

