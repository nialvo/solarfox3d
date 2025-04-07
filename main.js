
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.156.1/build/three.module.js';

window.onload = () => {

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );

  const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('bg')
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

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

  const slabs = [];

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
        slabs.push(box);
        scene.add(box);
      }
    }
  });

  const sun = new THREE.DirectionalLight(0xffffff, 10);
  sun.position.set(20, 10, 0);
  scene.add(sun);

  const sunTexture = new THREE.TextureLoader().load('assets/sun.png');
  const sunShapeGeometry = new THREE.SphereGeometry(200, 32, 32);
  const sunShapeMaterial = new THREE.MeshBasicMaterial({ map: sunTexture });
  const sunMesh = new THREE.Mesh(sunShapeGeometry, sunShapeMaterial);
  sunMesh.position.set(1300, 10, 0);
  scene.add(sunMesh);

  const ambient = new THREE.AmbientLight(0xffffff, 2); 
  scene.add(ambient);

  const shipGeometry = new THREE.ConeGeometry(0.5, 1, 8);
  shipGeometry.rotateX(Math.PI);
  const shipMaterial = new THREE.MeshStandardMaterial({ color: 0x990033 });
  const ship = new THREE.Mesh(shipGeometry, shipMaterial);
  ship.position.set(0, 10, 0);

  camera.position.set(0, -12, 0);
  camera.rotation.x = Math.PI / 2.5;
  ship.add(camera);

  scene.add(ship);

  const starGeo = new THREE.SphereGeometry(1500, 64, 64);
  const starMat = new THREE.MeshBasicMaterial({
    side: THREE.BackSide,
    map: new THREE.CanvasTexture(generateStarCanvas())
  });
  const starSphere = new THREE.Mesh(starGeo, starMat);
  scene.add(starSphere);

  function generateStarCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 1000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = Math.random() * .25;
      ctx.fillStyle = `rgba(255,255,255,${Math.random()})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    return canvas;
  }

  const keys = {};
  window.addEventListener('keydown', e => keys[e.code] = true);
  window.addEventListener('keyup', e => keys[e.code] = false);

  let gamepadIndex = null;
  window.addEventListener('gamepadconnected', e => gamepadIndex = e.gamepad.index);

  const isMobile = /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent);
  let accelPressed = false;
  let decelPressed = false;
  let mobileRotation = { alpha: 0, beta: 0, gamma: 0 };
  let calibration = { alpha: 0, beta: 0, gamma: 0 };

  if (isMobile) {


    const accelBtn = document.createElement('div');
    let lastOrientation = null;

    Object.assign(accelBtn.style, {
      position: 'absolute', bottom: '20px', left: '20px',
      width: '60px', height: '60px',
      borderRadius: '50%', border: '3px solid white',
      background: 'transparent'
    });
    document.body.appendChild(accelBtn);
    accelBtn.ontouchstart = () => accelPressed = true;
    accelBtn.ontouchend = () => accelPressed = false;

    const decelBtn = document.createElement('div');
    Object.assign(decelBtn.style, {
      position: 'absolute', bottom: '20px', left: '100px',
      width: '60px', height: '60px',
      borderRadius: '50%', border: '3px solid white',
      background: 'transparent'
    });
    document.body.appendChild(decelBtn);
    decelBtn.ontouchstart = () => decelPressed = true;
    decelBtn.ontouchend = () => decelPressed = false;

    const recalBtn = document.createElement('div');
    Object.assign(recalBtn.style, {
      position: 'absolute', bottom: '20px', left: '180px',
      width: '60px', height: '60px',
      borderRadius: '50%', border: '2px dashed white',
      background: 'transparent'
    });
    document.body.appendChild(recalBtn);
    recalBtn.addEventListener("click", () => {
      if (lastOrientation) {
        calibration.alpha = lastOrientation.alpha || 0;
        calibration.beta = lastOrientation.beta || 0;
        calibration.gamma = lastOrientation.gamma || 0;
      }
    });

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', (e) => {
        lastOrientation = e;
        
        mobileRotation.alpha = e.alpha || 0;
        mobileRotation.beta = e.beta || 0;
        mobileRotation.gamma = e.gamma || 0;
      });
    }
  }

  const velocity = new THREE.Vector3();
  const acceleration = 0.006;
  const friction = 0.98;
  const rotSpeed = 0.01;
  const explosions = [];

  function createExplosion(position) {
    const geo = new THREE.SphereGeometry(1, 16, 16);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x66ccff,
      transparent: true,
      opacity: 0.6,
      emissive: 0x66ccff,
      emissiveIntensity: 0.6
    });
    const explosion = new THREE.Mesh(geo, mat);
    explosion.position.copy(position);
    explosion.userData = { life: 1.0 };
    scene.add(explosion);
    explosions.push(explosion);
  }

  function animate() {
    requestAnimationFrame(animate);
    const q = new THREE.Quaternion();

    //alpha
    if (keys['Numpad7']) ship.quaternion.multiply(q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -rotSpeed));
    if (keys['Numpad9']) ship.quaternion.multiply(q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotSpeed));
    //gamma
    if (keys['Numpad8']) ship.quaternion.multiply(q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), rotSpeed));
    if (keys['Numpad2']) ship.quaternion.multiply(q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -rotSpeed));
    //beta
    if (keys['Numpad4']) ship.quaternion.multiply(q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), rotSpeed));
    if (keys['Numpad6']) ship.quaternion.multiply(q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -rotSpeed));

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(ship.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(ship.quaternion);
    if (keys['Numpad5']) velocity.add(forward.clone().multiplyScalar(acceleration));
    if (keys['Numpad0']) velocity.add(forward.clone().multiplyScalar(-acceleration));
    if (keys['KeyR']) velocity.add(up.clone().multiplyScalar(acceleration));
    if (keys['KeyF']) velocity.add(up.clone().multiplyScalar(-acceleration));

    if (gamepadIndex !== null) {
      const gp = navigator.getGamepads()[gamepadIndex];
      if (gp) {
        const lx = gp.axes[2], ly = gp.axes[1];
        const rx = gp.axes[0], ry = gp.axes[3];
        if (Math.abs(rx) > 0.1) ship.quaternion.multiply(q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rx * rotSpeed));
        if (Math.abs(ry) > 0.1) ship.quaternion.multiply(q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -ry * rotSpeed));
        if (Math.abs(lx) > 0.1) ship.quaternion.multiply(q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -lx * rotSpeed));
        if (Math.abs(ly) > 0.1) velocity.add(up.clone().multiplyScalar(-ly * acceleration));
      }
    }

    if (isMobile) {
      let alp = mobileRotation.alpha - calibration.alpha;
      if (alp < -180) alp += 360;
      else if (alp > 180) alp -= 360;

      const gamma = THREE.MathUtils.degToRad(mobileRotation.gamma);// - calibration.gamma);       
      const beta   = THREE.MathUtils.degToRad(mobileRotation.beta );  
      const alpha  = THREE.MathUtils.degToRad(alp);

      if (Math.abs(gamma) > 0.05) ship.quaternion.multiply(q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -gamma * 0.05));
      if (Math.abs(alpha) > 0.05)   ship.quaternion.multiply(q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -alpha * 0.05));
      //if (Math.abs(beta) > 0.05)  ship.quaternion.multiply(q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), beta * 0.001));

      if (accelPressed) velocity.add(up.clone().multiplyScalar(acceleration));
      if (decelPressed) velocity.add(up.clone().multiplyScalar(-acceleration));
    }

    velocity.multiplyScalar(friction);
    ship.position.add(velocity);

    for (let i = slabs.length - 1; i >= 0; i--) {
      const slab = slabs[i];
      if (slab.position.distanceTo(ship.position) < boxSize / 2) {
        createExplosion(slab.position);
        scene.remove(slab);
        slabs.splice(i, 1);
      }
    }

    for (let i = explosions.length - 1; i >= 0; i--) {
      const e = explosions[i];
      e.scale.multiplyScalar(1.05);
      e.material.opacity -= 0.01;
      e.userData.life -= 0.01;
      if (e.userData.life <= 0) {
        scene.remove(e);
        explosions.splice(i, 1);
      }
    }

    renderer.render(scene, camera);
  }

  animate();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

};
