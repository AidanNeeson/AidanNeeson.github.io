import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const container = document.getElementById('three-container');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setPixelRatio(1);
renderer.setSize(container.clientWidth, container.clientHeight);
camera.position.z = 5
container.appendChild(renderer.domElement);

const particleCount = 1000;
const positions = new Float32Array(particleCount * 3);
const velocities = [];
const active = new Array(particleCount).fill(false);
const originX = 0;
const originY = 4.3;
const originZ = 0;
const angle = -3 * Math.PI / 5;
const speed = 0.005 + Math.random() * 0.005;
let frameCount = 0;

// Initialie variables to track content animation timeouts
let pageContentTimeout = null;
let navElementTimeout = null;

// Pixel texture (1 white pixel)
const pixelTexture = new THREE.DataTexture(
  new Uint8Array([150, 150, 150, 200]),
  1, 1, THREE.RGBAFormat
);
pixelTexture.minFilter = THREE.NearestFilter;
pixelTexture.magFilter = THREE.NearestFilter;
pixelTexture.needsUpdate = true;


// Initialize geometry and particle placeholders
for (let i = 0; i < particleCount; i++) {
  positions[i * 3 + 0] = 0;
  positions[i * 3 + 1] = 3.8;
  positions[i * 3 + 2] = 0;

  velocities.push({
    x: 0, y: 0, z: 0
  });

  active[i] = false;
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

const material = new THREE.PointsMaterial({
  size: 0.1,
  map: pixelTexture,
  transparent: true,
  alphaTest: 0.5,
  color: 0xffffff
});

const particles = new THREE.Points(geometry, material);
scene.add(particles);

// Emit new particles
function emitParticles() {
  for (let i = 0; i < particleCount; i++) {

    if (!active[i]) {
      positions[i * 3 + 0] = originX + (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = originY;
      positions[i * 3 + 2] = originZ + (Math.random() - 0.5) * 0.2;

      velocities[i].x = speed * Math.cos(angle) + (Math.random() - 0.5) * 0.002;
      velocities[i].y = speed * Math.sin(angle) + (Math.random() - 0.5) * 0.002;
      velocities[i].z = (Math.random() - 0.5) * 0.001;

      active[i] = true;
      break;
    }
  }
}

// Animate existing particles
function animateSnow() {
  const pos = geometry.attributes.position.array;
  for (let i = 0; i < particleCount; i++) {
    if (active[i]) {
      pos[i * 3 + 0] += velocities[i].x;
      pos[i * 3 + 1] += velocities[i].y;
      pos[i * 3 + 2] += velocities[i].z;

      if (pos[i * 3 + 1] < -5) {
        active[i] = false;
        pos[i * 3 + 0] = 0;
        pos[i * 3 + 1] = 3.8;
        pos[i * 3 + 2] = 0;
      }
    }
  }
  geometry.attributes.position.needsUpdate = true;

  frameCount++;
  if (frameCount % 8 === 0){
    emitParticles();
    }
}

// Implement Pixelization Shader
const PixelShader = {
    uniforms: {
      tDiffuse: { value: null },
      resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      pixelSize: { value: 5.0 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform vec2 resolution;
      uniform float pixelSize;
      varying vec2 vUv;
  
      void main() {
        vec2 dxy = pixelSize / resolution;
        vec2 coord = dxy * floor(vUv / dxy);
        gl_FragColor = texture2D(tDiffuse, coord);
      }
    `
  };

// Create composer
const composer = new EffectComposer(renderer);

// Add render pass
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// Add pixel shader pass
const pixelPass = new ShaderPass(PixelShader);
pixelPass.uniforms.pixelSize.value = 8.0;
composer.addPass(pixelPass);

// Start animation
function animate() {
    requestAnimationFrame(animate);
    animateSnow();
    composer.render();
  }
animate();


// Initialize homepage content
let homeContent;
window.addEventListener('load', () => {
  homeContent = document.getElementById('right-content').innerHTML;
  handleRoute(location.pathname);
});


// Add click listeners on links to override for dynamic updates
document.querySelectorAll('a[data-page]').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const page = e.target.getAttribute('data-page');

    if (page === 'home') {
      history.pushState({page: 'home'}, '', '/');
      renderPage('home');
      updateActivePage(page);
    } else {
      history.pushState({page}, "", `/${page}`);
      renderPage(page);
      updateActivePage(page);
    }
  });
});

// Dynamically update page content
function renderPage(page) {
  const contentDiv = document.getElementById('right-content');
  fadeOut(contentDiv);

  if (pageContentTimeout) clearTimeout(pageContentTimeout);

  pageContentTimeout = setTimeout(() => {
    if (page === 'home') {
      contentDiv.innerHTML = homeContent;
      fadeIn(contentDiv);
    } else {
      fetch(`pages/${page}.html`)
        .then(response => {
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          return response.text();
        })
        .then(html => {
          contentDiv.innerHTML = html;
          fadeIn(contentDiv);
        })
        .catch(() => {
          contentDiv.innerHTML = "<p>Page not found.</p>";
          fadeIn(contentDiv);
        });
    }
  }, 300);
}

// Handle step retracing
window.addEventListener('popstate', () => {
  handleRoute(location.pathname);
})

// Track current page content being displayed
function updateActivePage(page) {
  if (navElementTimeout) {
      clearTimeout(navElementTimeout);
      navElementTimeout = null;
  }

  document.querySelectorAll('#nav a').forEach(link => {
    const baseText = link.id.match(/^[^-]+/);
    link.textContent = toTitleCase(baseText[0]);
    link.classList.add('link');
    link.classList.remove('active');
    link.style.opacity = '1';
  });

  const newActiveLink = document.querySelector(`#${page}-link`);
  if (newActiveLink) {
    newActiveLink.style.opacity = '0';
    navElementTimeout = setTimeout(() => {
      newActiveLink.textContent = '\u2744';
      newActiveLink.classList.remove('link');
      newActiveLink.classList.add('active');
      fadeIn(newActiveLink);
    }, 300);
  }
}

// Handing routing for step retracing, etc...
function handleRoute(path) {
    const page = path === '/' || path === '' ? 'home' : path.replace(/^\/+/, '');
    updateActivePage(page);
    renderPage(page);
}

// Turn text to title case
function toTitleCase(str) {
  return str.replace(
    /\w\S*/g,
    text => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
  );
}

// Handle fade-in animations
function fadeIn(el) {
    requestAnimationFrame(() => {
      el.style.opacity = '1';
    });
}

// Handle fade-out animations
function fadeOut (el) {
  requestAnimationFrame(() => {
    el.style.opacity = '0';
  });
}
