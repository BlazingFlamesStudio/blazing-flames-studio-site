/* Full-resolution VRM viewer for Blazing Flames Studio.
 * GitHub Releases is the catalogue and download host; it may block browser
 * loading via CORS, so users can also download and open any VRM locally.
 * The viewer never compresses, decimates, or re-exports model data.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

const repo = 'BlazingFlamesStudio/blazing-flames-studio-site';
const endpoint = 'https://api.github.com/repos/' + repo + '/releases?per_page=100';
const el = (id) => document.getElementById(id);
const viewport = el('model-viewport');
const canvasWrap = el('model-canvas-wrap');
const stageName = el('model-stage-name');
const connection = el('model-connection');
const feedback = el('model-feedback');
const empty = el('model-stage-empty');
const progress = el('model-progress');
const progressText = el('model-progress-text');
const progressBar = el('model-progress-bar');
const modelList = el('model-list');
const search = el('model-search');
const download = el('model-download');
const loader = new GLTFLoader();
loader.crossOrigin = 'anonymous';
loader.register((parser) => new VRMLoaderPlugin(parser));

let renderer, scene, camera, controls, light, secondary, grid, currentVrm;
let releaseAssets = [];
let activeUrl = '';
let activeLoadToken = 0;
let activeObjectUrl = '';
let spinning = false;
let showGrid = true;
const clock = new THREE.Clock();

function notify(message, isError = false) {
  if (!feedback) return;
  feedback.textContent = message;
  feedback.classList.toggle('is-error', isError);
}
function setProgress(visible, label = '', percent = null) {
  progress.hidden = !visible;
  progressText.textContent = label || 'Loading model…';
  progressBar.style.width = Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) + '%' : '0%';
}
function getFilename(name) {
  return String(name || 'Untitled VRM').replace(/\.vrm$/i, '').replace(/[_-]/g, ' ');
}
function showDownload(asset) {
  if (!download) return;
  if (asset && /^https:\/\//i.test(asset.browser_download_url)) {
    download.href = asset.browser_download_url;
    download.textContent = 'Download original ' + asset.name + ' ↗';
    download.hidden = false;
  } else {
    download.hidden = true;
    download.removeAttribute('href');
  }
}
function releaseEntry(asset) {
  return {
    id: asset.id,
    name: String(asset.name || 'Untitled.vrm'),
    title: getFilename(asset.name),
    size: Number(asset.size || 0),
    browser_download_url: String(asset.browser_download_url || ''),
    release: String(asset.releaseName || 'VRM Archive'),
  };
}
function formatBytes(bytes) {
  if (!bytes) return 'VRM model';
  return bytes >= 1024 ** 3
    ? (bytes / 1024 ** 3).toFixed(2) + ' GB'
    : (bytes / 1024 ** 2).toFixed(1) + ' MB';
}
function listAssets() {
  if (!modelList) return;
  const q = String(search?.value || '').trim().toLowerCase();
  const matches = releaseAssets.filter((a) => (a.title + ' ' + a.release).toLowerCase().includes(q));
  modelList.replaceChildren();
  if (!matches.length) {
    const p = document.createElement('p');
    p.className = 'model-list-empty';
    p.textContent = releaseAssets.length ? 'No models match that search.' : 'No public VRM release assets found yet. Add a .vrm file to a GitHub Release.';
    modelList.append(p);
    return;
  }
  for (const asset of matches) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Load original ' + asset.title);
    btn.setAttribute('aria-pressed', String(asset.browser_download_url === activeUrl));
    const copy = document.createElement('span');
    copy.textContent = asset.title;
    const meta = document.createElement('small');
    meta.textContent = asset.release + ' · ' + formatBytes(asset.size);
    copy.append(meta);
    const arrow = document.createElement('span');
    arrow.textContent = '↗';
    btn.append(copy, arrow);
    btn.addEventListener('click', () => loadRemote(asset.browser_download_url, asset.title, asset));
    const row = document.createElement('div');
    row.className = 'model-list-row';
    row.append(btn);
    const fileLink = document.createElement('a');
    fileLink.className = 'model-list-download';
    fileLink.href = asset.browser_download_url;
    fileLink.textContent = 'Download original';
    fileLink.title = 'Download ' + asset.name + ' to preview it locally when GitHub blocks direct loading';
    fileLink.setAttribute('aria-label', 'Download original ' + asset.name);
    fileLink.rel = 'noopener noreferrer';
    row.append(fileLink);
    modelList.append(row);
  }
}
async function loadReleases() {
  try {
    const response = await fetch(endpoint, { headers: { Accept: 'application/vnd.github+json' }, cache: 'no-store' });
    if (!response.ok) throw new Error('GitHub API returned ' + response.status);
    const releases = await response.json();
    if (!Array.isArray(releases)) throw new Error('Unexpected GitHub response.');
    const seen = new Set();
    releaseAssets = releases.filter((r) => !r.draft)
      .flatMap((r) => (r.assets || []).map((asset) => ({ ...asset, releaseName: r.name || r.tag_name })))
      .filter((asset) => /\.vrm$/i.test(asset.name || '') && asset.state === 'uploaded'
        && /^https:\/\/github\.com\//.test(asset.browser_download_url || ''))
      .filter((asset) => {
        if (seen.has(asset.id)) return false;
        seen.add(asset.id);
        return true;
      })
      .map(releaseEntry);
    el('model-count').textContent = String(releaseAssets.length);
    const catalogStatus = releaseAssets.length
      ? releaseAssets.length + ' public model' + (releaseAssets.length === 1 ? '' : 's') + ' found in GitHub Releases.'
      : 'GitHub Releases connected. No .vrm assets are published yet.';
    notify(catalogStatus);
    connection.textContent = 'GITHUB RELEASES';
    connection.classList.add('connected');
    listAssets();
  } catch (error) {
    connection.textContent = 'RELEASE CATALOGUE OFFLINE';
    notify('Could not read GitHub Releases catalogue. Local-file preview still works. ' + error.message, true);
    listAssets();
  }
}
function initScene() {
  if (!viewport) return;
  scene = new THREE.Scene();
  scene.background = new THREE.Color('#071b34');
  scene.fog = new THREE.FogExp2('#071b34', 0.027);
  camera = new THREE.PerspectiveCamera(32, 1, 0.01, 1000);
  camera.position.set(0, 1.35, 4.7);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.24;
  viewport.append(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.screenSpacePanning = true;
  controls.target.set(0, 1, 0);
  controls.minDistance = 0.08;
  controls.maxDistance = 250;
  controls.update();

  light = new THREE.DirectionalLight(0xffffff, 2.4);
  light.position.set(3, 6, 5);
  scene.add(light);
  secondary = new THREE.DirectionalLight(0xa1d3ff, 1.05);
  secondary.position.set(-3, 2, -4);
  scene.add(secondary);
  scene.add(new THREE.HemisphereLight(0xf8fcff, 0x365678, 1.4));

  grid = new THREE.GridHelper(15, 36, 0x7bc4ef, 0x2a5578);
  grid.material.opacity = 0.22;
  grid.material.transparent = true;
  grid.visible = showGrid;
  scene.add(grid);

  function resize() {
    if (!viewport || !renderer || !camera) return;
    const box = viewport.getBoundingClientRect();
    const w = Math.max(1, box.width), h = Math.max(1, box.height);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(viewport);
  else window.addEventListener('resize', resize);
  resize();

  function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);
    if (currentVrm?.update) currentVrm.update(delta);
    if (spinning && currentVrm) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 1.2;
    }
    controls.update(delta);
    renderer.render(scene, camera);
  }
  animate();
}
function disposeObject(root) {
  if (!root) return;
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  root.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of (Array.isArray(object.material) ? object.material : [object.material])) {
      if (!material) continue;
      materials.add(material);
      for (const item of Object.values(material)) if (item?.isTexture) textures.add(item);
    }
  });
  for (const geo of geometries) geo.dispose();
  for (const mat of materials) mat.dispose();
  for (const texture of textures) texture.dispose();
}
function clearPrevious() {
  if (currentVrm) {
    scene.remove(currentVrm.scene);
    disposeObject(currentVrm.scene);
    currentVrm.dispose?.();
    currentVrm = null;
  }
  if (activeObjectUrl) {
    URL.revokeObjectURL(activeObjectUrl);
    activeObjectUrl = '';
  }
}
function frameModel(vrm) {
  const bounds = new THREE.Box3().setFromObject(vrm.scene);
  if (bounds.isEmpty()) return;
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const max = Math.max(0.1, size.x, size.y, size.z);
  const distance = Math.max(max * 1.85, 1.8);
  controls.target.copy(center);
  camera.position.set(center.x + distance * 0.18, center.y + max * 0.13, center.z + distance);
  camera.near = Math.max(0.001, distance / 250);
  camera.far = Math.max(100, distance * 15);
  camera.updateProjectionMatrix();
  controls.minDistance = Math.max(0.01, max * 0.15);
  controls.maxDistance = Math.max(25, max * 25);
  grid.position.y = bounds.min.y - max * 0.02;
  controls.saveState();
  controls.update();
}
function startLoad(name, asset) {
  activeLoadToken++;
  stageName.textContent = name;
  showDownload(asset);
  empty.hidden = true;
  setProgress(true, 'Loading original VRM…', 0);
  notify('Loading full-resolution ' + name + '. Large files may take some time.');
  return activeLoadToken;
}
function finishLoad(gltf, token, name) {
  if (token !== activeLoadToken) {
    const old = gltf.userData?.vrm;
    if (old) disposeObject(old.scene);
    return;
  }
  if (!gltf?.userData?.vrm) throw new Error('This file did not contain a supported VRM model.');
  clearPrevious();
  const vrm = gltf.userData.vrm;
  if (vrm.meta?.metaVersion === '0' && VRMUtils.rotateVRM0) VRMUtils.rotateVRM0(vrm);
  vrm.scene.traverse((o) => { o.frustumCulled = false; });
  scene.add(vrm.scene);
  currentVrm = vrm;
  frameModel(vrm);
  stageName.textContent = name;
  setProgress(false);
  notify(name + ' loaded at its original mesh and texture resolution. Drag to rotate; scroll to zoom.');
  listAssets();
}
function handleFailure(error, token, asset) {
  if (token !== activeLoadToken) return;
  setProgress(false);
  if (!currentVrm) empty.hidden = false;
  const msg = String(error?.message || error);
  const cors = /fetch|network|cors|http status 0|failed to load/i.test(msg);
  if (asset && cors) {
    notify('This GitHub Release asset could not be opened directly. GitHub may block cross-origin 3D loading. Use the download link below, then "Preview a VRM from your computer." The file stays local.', true);
  } else {
    notify('Could not load this VRM: ' + msg.slice(0, 250), true);
  }
}
function loadRemote(url, name, asset = null) {
  if (!/^https:\/\//i.test(url)) {
    notify('Enter a public HTTPS URL to an original .vrm file.', true);
    return;
  }
  activeUrl = url;
  const token = startLoad(name, asset);
  listAssets();
  loader.load(
    url,
    (gltf) => { try { finishLoad(gltf, token, name); } catch (error) { handleFailure(error, token, asset); } },
    (event) => {
      if (token !== activeLoadToken) return;
      const percent = event.total ? Math.round(100 * event.loaded / event.total) : null;
      setProgress(true, event.total ? 'Downloading original VRM… ' + percent + '%' : 'Downloading original VRM…', percent);
    },
    (error) => handleFailure(error, token, asset)
  );
}
function loadLocal(file) {
  if (!file) return;
  if (!/\.vrm$/i.test(file.name)) { notify('Choose a .vrm file.', true); return; }
  activeUrl = '';
  const token = startLoad(getFilename(file.name), null);
  listAssets();
  const url = URL.createObjectURL(file);
  loader.load(
    url,
    (gltf) => {
      if (token !== activeLoadToken) { URL.revokeObjectURL(url); return; }
      try {
        finishLoad(gltf, token, getFilename(file.name));
        if (activeObjectUrl && activeObjectUrl !== url) URL.revokeObjectURL(activeObjectUrl);
        activeObjectUrl = url;
      } catch (error) { URL.revokeObjectURL(url); handleFailure(error, token); }
    },
    (event) => {
      if (token !== activeLoadToken) return;
      const percent = event.total ? Math.round(100 * event.loaded / event.total) : null;
      setProgress(true, 'Reading local VRM…', percent);
    },
    (error) => { URL.revokeObjectURL(url); handleFailure(error, token); }
  );
}
function wireControls() {
  el('model-search')?.addEventListener('input', listAssets);
  el('load-url')?.addEventListener('click', () => {
    const url = (el('model-url')?.value || '').trim();
    if (!url) { notify('Paste a public VRM URL to test.', true); return; }
    if (!/^https:\/\//i.test(url)) { notify('Please enter a secure https:// VRM URL.', true); return; }
    if (/^https:\/\/(?:console\.cloud\.google\.com|drive\.google\.com)/i.test(url)) {
      notify('This is not a direct public VRM file URL.', true); return;
    }
    loadRemote(url, getFilename(new URL(url).pathname.split('/').pop() || 'Remote VRM'));
  });
  el('model-local')?.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    loadLocal(file);
    event.target.value = '';
  });
  el('model-reset')?.addEventListener('click', () => {
    if (controls) controls.reset();
    notify('Camera restored.');
  });
  el('model-spin')?.addEventListener('click', (event) => {
    spinning = !spinning;
    if (controls) controls.autoRotate = spinning;
    event.currentTarget.setAttribute('aria-pressed', String(spinning));
    event.currentTarget.textContent = 'Auto-rotate: ' + (spinning ? 'On' : 'Off');
  });
  el('model-grid')?.addEventListener('click', (event) => {
    showGrid = !showGrid;
    if (grid) grid.visible = showGrid;
    event.currentTarget.setAttribute('aria-pressed', String(showGrid));
    event.currentTarget.textContent = 'Floor grid: ' + (showGrid ? 'On' : 'Off');
  });
  el('model-light')?.addEventListener('input', (event) => {
    if (light) light.intensity = 2.4 * Number(event.target.value) / 100;
    if (secondary) secondary.intensity = 1.05 * Number(event.target.value) / 100;
  });
  const toggle = document.querySelector('.mobile-toggle');
  const menu = el('mobile-nav');
  if (toggle && menu) {
    const close = () => { menu.hidden = true; toggle.setAttribute('aria-expanded', 'false'); };
    toggle.addEventListener('click', () => {
      menu.hidden = !menu.hidden;
      toggle.setAttribute('aria-expanded', String(!menu.hidden));
    });
    menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', close));
    window.addEventListener('resize', () => { if (window.innerWidth > 760) close(); });
  }
  document.querySelectorAll('.current-year').forEach((node) => node.textContent = String(new Date().getFullYear()));
}
try {
  initScene();
  wireControls();
  loadReleases();
} catch (error) {
  console.error('VRM viewer initialization failed:', error);
  notify('3D viewer could not initialize. Check browser WebGL support. ' + error.message, true);
}
