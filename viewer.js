import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

const byId = (id) => document.getElementById(id);
const stage = byId('viewer-canvas');
const list = byId('viewer-model-list');
const status = byId('viewer-render-status');
const overlay = byId('viewer-loading');
const loadTitle = byId('viewer-loading-title');
const loadMessage = byId('viewer-loading-message');
const progress = byId('viewer-progress');
const progressBar = byId('viewer-progress-bar');
const fileInput = byId('viewer-file');
const search = byId('viewer-search');
const modelName = byId('viewer-model-name');
const modelType = byId('viewer-model-type');
const profileTitle = byId('viewer-profile-title');
const profileText = byId('viewer-model-description');
const preview = byId('viewer-profile-preview');
const expressionPanel = byId('viewer-expressions');
const sourceText = byId('viewer-source');
const base = new URL('.', import.meta.url);
const catalog = [];
let active = null;
let vrm = null;
let job = 0;
let autoSpin = false;
let showGrid = false;
let shadingPreset = 'studio';
let lightPower = 1;
let rimPower = 1;
let groundShadows = true;
let shadowOpacity = 0.4;
const gltfLoader = new GLTFLoader();
gltfLoader.register(parser => new VRMLoaderPlugin(parser));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x120b10);
const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 300);
camera.position.set(0, 1.4, 4.0);
const renderer = new THREE.WebGLRenderer({antialias: true, alpha: false, powerPreference: 'high-performance'});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.45;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
stage.append(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 0.5;
controls.maxDistance = 30;
controls.target.set(0, 1.25, 0);
controls.update();
const ambient = new THREE.HemisphereLight(0xffe5d5, 0x4b3549, 1.25);
scene.add(ambient);
const warm = new THREE.DirectionalLight(0xffdfbc, 3.1);
warm.position.set(3, 6, 4);
warm.castShadow = true;
warm.shadow.mapSize.set(1024, 1024);
warm.shadow.bias = -0.0002;
warm.shadow.normalBias = 0.01;
warm.shadow.radius = 3;
scene.add(warm, warm.target);
const cool = new THREE.DirectionalLight(0xb9c3ff, 1.0);
cool.position.set(-3, 3, 2); scene.add(cool);
const rim = new THREE.DirectionalLight(0xff9c72, 1.9);
rim.position.set(-2, 3, -4); scene.add(rim);
const shadowFloor = new THREE.Mesh(
  new THREE.PlaneGeometry(1, 1),
  new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.4, transparent: true })
);
shadowFloor.rotation.x = -Math.PI / 2;
shadowFloor.receiveShadow = true;
shadowFloor.visible = false;
shadowFloor.renderOrder = -1;
scene.add(shadowFloor);
const lightingPresets = {
  studio:   { ambient: 1.25, key: 3.1, fill: 1.0, rim: 1.9, exposure: 1.3,  background: 0x140e16 },
  soft:     { ambient: 2.5,  key: 1.6, fill: 1.4, rim: 0.7, exposure: 1.3,  background: 0x21141d },
  dramatic: { ambient: 0.55, key: 3.5, fill: 0.3, rim: 3.2, exposure: 1.2,  background: 0x10090f },
  original: { ambient: 2.0,  key: 2.4, fill: 1.5, rim: 0,   exposure: 1.45, background: 0x120b10 }
};
function applyLighting() {
  const preset = lightingPresets[shadingPreset] || lightingPresets.studio;
  ambient.intensity = preset.ambient * lightPower;
  warm.intensity = preset.key * lightPower;
  cool.intensity = preset.fill * lightPower;
  rim.intensity = preset.rim * lightPower * rimPower;
  renderer.toneMappingExposure = preset.exposure;
  scene.background.setHex(preset.background);
  shadowFloor.material.opacity = shadowOpacity;
  warm.castShadow = groundShadows && Boolean(vrm);
  shadowFloor.visible = groundShadows && Boolean(vrm);
  renderer.shadowMap.needsUpdate = true;
}
function configureModelShadows() {
  if (!vrm) return;
  vrm.scene.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3().setFromObject(vrm.scene, true);
  if (bounds.isEmpty()) return;
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const extent = Math.max(2, size.x * 2, size.y * 1.3, size.z * 2);
  shadowFloor.scale.set(extent * 3, extent * 3, 1);
  shadowFloor.position.set(center.x, bounds.min.y - 0.012, center.z);
  warm.target.position.copy(center);
  warm.position.copy(center).add(new THREE.Vector3(extent * 0.6, extent * 1.25, extent * 0.8));
  warm.shadow.camera.left = -extent;
  warm.shadow.camera.right = extent;
  warm.shadow.camera.top = extent;
  warm.shadow.camera.bottom = -extent;
  warm.shadow.camera.near = 0.1;
  warm.shadow.camera.far = extent * 5;
  warm.shadow.camera.updateProjectionMatrix();
  warm.target.updateMatrixWorld();
  vrm.scene.traverse(obj => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  applyLighting();
}
applyLighting();
const grid = new THREE.GridHelper(12, 24, 0xa85a3e, 0x462a32);
grid.visible = false; scene.add(grid);
const timer = new THREE.Clock();

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function message(heading, body, kind='READY') {
  overlay.hidden = false;
  loadTitle.textContent = heading;
  loadMessage.textContent = body;
  status.textContent = kind;
}
function showProgress(percent) {
  progress.hidden = false;
  progressBar.style.width = Math.max(0,Math.min(100,percent))+'%';
}
function clearProgress() {
  progress.hidden = true;
  progressBar.style.width = '0%';
}
function fitView() {
  if (!vrm) return;
  // Compute the framing from the original unscaled mesh. A wide or short window
  // must not crop accessories, hands, feet, or the head.
  vrm.scene.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3().setFromObject(vrm.scene, true);
  if (bounds.isEmpty()) return;
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const rect = stage.getBoundingClientRect();
  const aspect = Math.max(0.2, rect.width / Math.max(1, rect.height));
  camera.aspect = aspect;
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
  const fitHeight = Math.max(size.y, 0.2) / (2 * Math.tan(vFov / 2));
  const fitWidth = Math.max(size.x, 0.2) / (2 * Math.tan(hFov / 2));
  const distance = Math.max(0.8, Math.max(fitHeight, fitWidth) * 1.17 + size.z * 0.65);
  controls.target.copy(center);
  camera.position.copy(center).add(new THREE.Vector3(0, 0, distance));
  camera.near = Math.max(0.001, distance / 2500);
  camera.far = Math.max(300, distance * 25);
  camera.updateProjectionMatrix();
  controls.minDistance = Math.max(0.08, Math.min(size.x, size.y) * 0.08);
  controls.maxDistance = Math.max(20, distance * 8);
  controls.update();
}
function cameraPreset(type) {
  if(!vrm) return;
  const center=controls.target.clone(), dist=camera.position.distanceTo(center);
  const offset={front:[0,0,dist],back:[0,0,-dist],left:[-dist,0,0],right:[dist,0,0]}[type];
  if(offset){camera.position.copy(center).add(new THREE.Vector3(...offset));controls.update();}
  if(type==='face'){
    const head=vrm.humanoid?.getNormalizedBoneNode?.('head') || vrm.humanoid?.getRawBoneNode?.('head');
    if(head){
      head.updateWorldMatrix(true,false);
      const p=new THREE.Vector3();head.getWorldPosition(p);controls.target.copy(p);camera.position.copy(p).add(new THREE.Vector3(0,0,0.65));controls.update();
    }
  }
}
function cleanModel() {
  if(!vrm)return;
  scene.remove(vrm.scene);
  const used=new Set();
  vrm.scene.traverse(obj => {
    if (obj.geometry && !used.has(obj.geometry)) {obj.geometry.dispose();used.add(obj.geometry);}
    const materials=Array.isArray(obj.material)?obj.material:[obj.material].filter(Boolean);
    for(const mat of materials){
      if(used.has(mat))continue;
      used.add(mat);
      for(const val of Object.values(mat))if(val?.isTexture&&!used.has(val)){val.dispose();used.add(val);}
      mat.dispose();
    }
  });
  vrm=null;
  shadowFloor.visible = false;
  warm.castShadow = false;
}
function expressionUI() {
  expressionPanel.replaceChildren();
  if(!vrm?.expressionManager) {
    expressionPanel.textContent='No facial expressions found in this file.';
    return;
  }
  const choices=['neutral','happy','angry','sad','relaxed','surprised','blink','aa','ih','ou','ee','oh','joy','fun','sorrow'];
  const manager=vrm.expressionManager;
  const names=choices.filter(name => manager.getExpression?.(name));
  if(!names.length){
    expressionPanel.textContent='This VRM has no supported expression presets.';
    return;
  }
  const reset=document.createElement('button');
  reset.textContent='Reset face';
  reset.addEventListener('click',()=>{for(const n of names) manager.setValue(n,0);manager.update();expressionPanel.querySelectorAll('button').forEach(b=>b.classList.remove('selected'));});
  expressionPanel.append(reset);
  for(const name of names){
    const btn=document.createElement('button');btn.type='button';btn.textContent=name.charAt(0).toUpperCase()+name.slice(1);
    btn.addEventListener('click',()=>{
      const on=!btn.classList.contains('selected');
      for(const n of names)manager.setValue(n,0);
      expressionPanel.querySelectorAll('button').forEach(b=>b.classList.remove('selected'));
      if(on){manager.setValue(name,1);btn.classList.add('selected');}
      manager.update();
    });
    expressionPanel.append(btn);
  }
}
async function decodeResponse(response, filename) {
  if(!response.ok)throw new Error('Model file not hosted (HTTP '+response.status+'). Open the VRM from your device instead.');
  const total=Number(response.headers.get('content-length'))||0;
  if(!response.body){
    const buffer=await response.arrayBuffer();
    showProgress(100);
    return buffer;
  }
  const reader=response.body.getReader();let received=0;const chunks=[];
  while(true){
    const {value,done}=await reader.read();
    if(done)break;
    chunks.push(value);received+=value.byteLength;
    if(total)showProgress(received/total*100);
    status.textContent='DOWNLOADING '+Math.round(received/1048576*10)/10+' MB';
  }
  const combined=new Uint8Array(received);let offset=0;
  for(const chunk of chunks){combined.set(chunk,offset);offset+=chunk.byteLength;}
  if(filename.toLowerCase().endsWith('.gz') && combined[0]===0x1f && combined[1]===0x8b){
    if(!('DecompressionStream' in window))throw new Error('Your browser does not support compressed VRM files. Try current Chrome, Edge, or Firefox.');
    const stream=new Blob([combined]).stream().pipeThrough(new DecompressionStream('gzip'));
    return await new Response(stream).arrayBuffer();
  }
  return combined.buffer;
}
async function loadBytes(buffer, label, source, selectionToken = null) {
  const current = selectionToken ?? ++job;
  if (current !== job) return;
  cleanModel();
  message('PREPARING MODEL','Parsing geometry, materials and facial expressions…','PROCESSING');
  showProgress(100);
  try {
    const gltf=await gltfLoader.parseAsync(buffer, base.href);
    if(current!==job)return;
    const result=gltf.userData.vrm;
    if(!result)throw new Error('The file is valid glTF, but does not contain VRM avatar information.');
    vrm=result;
    // VRM 0 uses the opposite forward axis from VRM 1.
    if(vrm.meta?.metaVersion==='0'&&typeof VRMUtils.rotateVRM0==='function')VRMUtils.rotateVRM0(vrm);
    scene.add(vrm.scene);
    configureModelShadows();
    fitView();
    expressionUI();
    overlay.hidden=true;
    status.textContent='MODEL LOADED';
    sourceText.textContent=source;
    byId('viewer-stage-caption').textContent=label.toUpperCase();
  } catch(error) {
    if(current===job){
      message('COULD NOT OPEN MODEL',error.message || 'The file could not be decoded.','ERROR');
      clearProgress();sourceText.textContent=source;
    }
    console.warn('VRM load failed',error);
  }
}
async function loadRemote(model) {
  const selectionToken = ++job;
  const url=model.url || (manifest.assets?.[model.id] ?? null);
  if(!url){
    message('ASSET NOT ONLINE YET','The 3D model is catalogued, but its web VRM has not been published. You can open the original VRM from your device.','LOCAL FILE AVAILABLE');
    sourceText.textContent='3D asset not uploaded yet';
    return;
  }
  try {
    const hostingBase=new URL(manifest.baseUrl || './', base.href);
    const assetUrl=new URL(url, hostingBase);
    if(assetUrl.protocol!=='https:' && !(assetUrl.protocol==='http:' && assetUrl.hostname==='localhost'))throw new Error('Unsafe asset location');
    if(location.protocol==='https:'&&assetUrl.protocol!=='https:')throw new Error('Model storage must use HTTPS');
    message('SUMMONING '+model.name.toUpperCase(),'Downloading this model…','DOWNLOADING');
    showProgress(0);
    const response=await fetch(assetUrl.toString(),{mode:'cors'});
    const bytes=await decodeResponse(response,assetUrl.pathname);
    if(selectionToken!==job || active?.id!==model.id) return;
    await loadBytes(bytes,model.name,'Web asset: '+assetUrl.hostname,selectionToken);
  } catch(e) {
    if(selectionToken !== job) return;
    message('MODEL UNAVAILABLE',e.message || 'Could not reach 3D asset storage. Try loading a local VRM instead.','NOT AVAILABLE');
    sourceText.textContent='Browser could not fetch the hosted asset';
    clearProgress();
  }
}
let manifest={assets:{}};
async function readManifest() {
  try{
    const r=await fetch('asset-manifest.json',{cache:'no-store'});
    if(!r.ok)return;
    const data=await r.json();
    if(data && typeof data.assets==='object')manifest=data;
  }catch{ /* The local model file picker always remains available */ }
}
function makeList(query='') {
  list.replaceChildren();
  const matching=catalog.filter(m=>m.name.toLowerCase().includes(query.toLowerCase()));
  for(const model of matching){
    const item=document.createElement('button');item.type='button';
    item.className='viewer-list-item'+(active?.id===model.id?' active':'');
    const available=!!(model.url||manifest.assets?.[model.id]);
    item.innerHTML='<span class="viewer-list-sigil">✦</span><span class="viewer-list-info"><strong>'+esc(model.name)+'</strong><small>'+esc(model.type)+'</small></span><span class="viewer-availability" title="'+(available?'3D model hosted':'Local VRM file required')+'">'+(available?'VIEW':'LOCAL')+'</span>';
    item.addEventListener('click',()=>choose(model));
    list.append(item);
  }
  if(!matching.length)list.textContent='No models match your search.';
}
function choose(model){
  active=model;modelName.textContent=model.name;modelType.textContent=model.type.toUpperCase();
  profileTitle.textContent='BLAZE SILVER';profileText.textContent=model.description || 'Blaze Silver VTuber model.';
  preview.replaceChildren();
  if(model.preview?.sheet){
    const img=document.createElement('div');
    img.className='viewer-thumb';
    const index=Number(model.preview.tile)||0, x=index%4,y=Math.floor(index/4);
    img.style.backgroundImage='url("'+encodeURI(model.preview.sheet)+'")';
    img.style.backgroundSize='400% 400%';img.style.backgroundPosition=(x*100/3)+'% '+(y*100/3)+'%';
    preview.append(img);
  }
  makeList(search.value);
  closePanels();
  try { history.replaceState(null, '', '?model=' + encodeURIComponent(model.id)); } catch {}
  loadRemote(model);
}
function filePicked(file){
  if(!file)return;
  if(!/\.(vrm|glb|vrm\.gz|gz)$/i.test(file.name)){message('FILE TYPE NOT SUPPORTED','Select a .vrm or .vrm.gz model file.','ERROR');return;}
  closePanels();
  const selectionToken = ++job;
  modelName.textContent = file.name.replace(/\\.(?:vrm|glb)(?:\\.gz)?$/i, '');
  modelType.textContent = 'ORIGINAL LOCAL VRM';
  profileText.textContent = 'The original model from your own device, at its stored geometry and texture resolution.';
  message('OPENING LOCAL VRM',file.name,'LOADING');
  file.arrayBuffer().then(async buf=>{
    if(/\.gz$/i.test(file.name)){
      if(!('DecompressionStream' in window))throw new Error('Compressed VRM requires a newer browser');
      buf=await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    }
    return loadBytes(buf,file.name,'Your device — local file, never uploaded',selectionToken);
  }).catch(e=>message('COULD NOT READ FILE',e.message,'ERROR'));
}
const layout = byId('viewer-layout');
const sidebar = byId('viewer-sidebar');
const inspector = byId('viewer-inspector');
const shadingPanel = byId('viewer-lighting-panel');
const backdrop = byId('viewer-panel-backdrop');
function closePanels() {
  sidebar.hidden = true;
  inspector.hidden = true;
  shadingPanel.hidden = true;
  backdrop.hidden = true;
  byId('viewer-models-toggle')?.setAttribute('aria-expanded', 'false');
  byId('viewer-details-toggle')?.setAttribute('aria-expanded', 'false');
  byId('viewer-lighting-toggle')?.setAttribute('aria-expanded', 'false');
}
function togglePanel(panel, toggleId) {
  const shouldOpen = panel.hidden;
  closePanels();
  if (shouldOpen) {
    panel.hidden = false;
    backdrop.hidden = false;
    byId(toggleId)?.setAttribute('aria-expanded', 'true');
    if (panel === sidebar) byId('viewer-search')?.focus();
  }
}
function isFullscreen() {
  return document.fullscreenElement === layout || layout.classList.contains('viewer-pseudo-fullscreen');
}
function syncFullscreen() {
  const active = isFullscreen();
  const button = byId('view-fullscreen');
  if (button) {
    button.innerHTML = active ? '<span aria-hidden="true">↙</span> Exit fullscreen' : '<span aria-hidden="true">⛶</span> Fullscreen';
    button.setAttribute('aria-pressed', String(active));
    button.setAttribute('aria-label', active ? 'Exit fullscreen' : 'Enter fullscreen');
  }
  if (vrm) requestAnimationFrame(() => fitView());
}
async function toggleFullscreen() {
  if (document.fullscreenElement === layout) {
    await document.exitFullscreen();
  } else if (layout.classList.contains('viewer-pseudo-fullscreen')) {
    layout.classList.remove('viewer-pseudo-fullscreen');
    syncFullscreen();
  } else {
    closePanels();
    try {
      if (layout.requestFullscreen) await layout.requestFullscreen();
      else throw new Error('Fullscreen API unavailable');
    } catch {
      layout.classList.add('viewer-pseudo-fullscreen');
      syncFullscreen();
    }
  }
}
function bindButton(id,fn){byId(id)?.addEventListener('click',fn);}
bindButton('viewer-models-toggle',()=>togglePanel(sidebar, 'viewer-models-toggle'));
bindButton('viewer-details-toggle',()=>togglePanel(inspector, 'viewer-details-toggle'));
bindButton('viewer-lighting-toggle',()=>togglePanel(shadingPanel, 'viewer-lighting-toggle'));
bindButton('viewer-lighting-close',closePanels);
bindButton('viewer-sidebar-close',closePanels);
bindButton('viewer-inspector-close',closePanels);
bindButton('view-fullscreen',()=>{toggleFullscreen().catch(console.warn);});
backdrop?.addEventListener('click',closePanels);
document.addEventListener('fullscreenchange',syncFullscreen);
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'){
    closePanels();
    if(layout.classList.contains('viewer-pseudo-fullscreen')) {
      layout.classList.remove('viewer-pseudo-fullscreen');
      syncFullscreen();
    }
  }
  if(event.key.toLowerCase()==='f' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) {
    event.preventDefault();
    toggleFullscreen().catch(console.warn);
  }
});

// All lighting controls affect the renderer immediately, without rebuilding VRM materials.
document.querySelectorAll('[data-lighting-preset]').forEach(button => button.addEventListener('click', () => {
  shadingPreset = button.dataset.lightingPreset;
  document.querySelectorAll('[data-lighting-preset]').forEach(item => {
    const selected = item === button;
    item.classList.toggle('active', selected);
    item.setAttribute('aria-pressed', String(selected));
  });
  if(shadingPreset === 'original') {
    groundShadows = false;
    byId('viewer-ground-shadows').checked = false;
  } else if (!groundShadows) {
    groundShadows = true;
    byId('viewer-ground-shadows').checked = true;
  }
  applyLighting();
}));
function bindLightingSlider(id, outputId, callback) {
  const slider = byId(id), output = byId(outputId);
  slider?.addEventListener('input', () => {
    const value = Number(slider.value);
    output.textContent = value + '%';
    callback(value);
    applyLighting();
  });
}
bindLightingSlider('viewer-light-intensity', 'viewer-light-intensity-value', value => { lightPower = value / 100; });
bindLightingSlider('viewer-rim-intensity', 'viewer-rim-intensity-value', value => { rimPower = value / 100; });
bindLightingSlider('viewer-shadow-opacity', 'viewer-shadow-opacity-value', value => { shadowOpacity = value / 100; });
byId('viewer-ground-shadows')?.addEventListener('change', e => {
  groundShadows = e.target.checked;
  applyLighting();
});
bindButton('view-front',()=>cameraPreset('front'));
bindButton('view-back',()=>cameraPreset('back'));
bindButton('view-left',()=>cameraPreset('left'));
bindButton('view-right',()=>cameraPreset('right'));
bindButton('view-face',()=>cameraPreset('face'));
bindButton('view-reset',fitView);
bindButton('view-spin',()=>{autoSpin=!autoSpin;controls.autoRotate=autoSpin;byId('view-spin').textContent='Auto-rotate: '+(autoSpin?'On':'Off');byId('view-spin').setAttribute('aria-pressed',String(autoSpin));});
bindButton('view-grid',()=>{showGrid=!showGrid;grid.visible=showGrid;byId('view-grid').textContent='Floor grid: '+(showGrid?'On':'Off');byId('view-grid').setAttribute('aria-pressed',String(showGrid));});
for(const name of ['viewer-file-button','viewer-upload-button'])bindButton(name,()=>fileInput.click());
fileInput?.addEventListener('change',()=>filePicked(fileInput.files?.[0]));
search?.addEventListener('input',()=>makeList(search.value));
const drop=byId('viewer-drop-zone');
if(drop){
  drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('dragging');});
  drop.addEventListener('dragleave',()=>drop.classList.remove('dragging'));
  drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('dragging');filePicked(e.dataTransfer?.files?.[0]);});
}
const resize=new ResizeObserver(()=>{
  const {width,height}=stage.getBoundingClientRect();
  if(!width||!height)return;
  camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height,false);
});
resize.observe(stage);
function animate(){
  requestAnimationFrame(animate);
  const delta=Math.min(timer.getDelta(),0.1);
  controls.update();
  vrm?.update(delta);
  renderer.render(scene,camera);
}
animate();
try {
  await readManifest();
  const resp=await fetch('models.json',{cache:'no-store'});
  if(!resp.ok)throw new Error('Could not load model catalogue');
  const data=await resp.json();
  for(const model of (data.models||[])) if(model.id && model.name)catalog.push(model);
  makeList();
  const selected=new URLSearchParams(location.search).get('model');
  if(selected){const model=catalog.find(m=>m.id===selected);if(model)choose(model);}
} catch(error){
  list.textContent='Could not load the catalogue: '+error.message;
  message('CATALOGUE UNAVAILABLE','You can still select a local VRM file.','READY');
}
