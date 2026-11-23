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
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
stage.append(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 0.5;
controls.maxDistance = 30;
controls.target.set(0, 1.25, 0);
controls.update();
scene.add(new THREE.HemisphereLight(0xffe5c9, 0x583543, 2.0));
const warm = new THREE.DirectionalLight(0xffb884, 2.4);
warm.position.set(3, 6, 4); scene.add(warm);
const cool = new THREE.DirectionalLight(0xa99ff4, 1.5);
cool.position.set(-3, 3, -4); scene.add(cool);
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
  const bounds = new THREE.Box3().setFromObject(vrm.scene);
  if (bounds.isEmpty()) return;
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const height = Math.max(size.y,0.4);
  const distance = Math.max(1.2,height/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)))*1.32);
  controls.target.copy(center);
  camera.position.copy(center).add(new THREE.Vector3(0, height*0.06, distance));
  camera.near = 0.01;
  camera.far = Math.max(100, distance*15);
  camera.updateProjectionMatrix();
  controls.minDistance = Math.max(0.25, height*0.10);
  controls.maxDistance = Math.max(12, height*9);
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
async function loadBytes(buffer, label, source) {
  const current=++job;
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
    if(active?.id!==model.id) return;
    await loadBytes(bytes,model.name,'Web asset: '+assetUrl.hostname);
  } catch(e) {
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
  loadRemote(model);
}
function filePicked(file){
  if(!file)return;
  if(!/\.(vrm|glb|vrm\.gz|gz)$/i.test(file.name)){message('FILE TYPE NOT SUPPORTED','Select a .vrm or .vrm.gz model file.','ERROR');return;}
  message('OPENING LOCAL VRM',file.name,'LOADING');
  file.arrayBuffer().then(async buf=>{
    if(/\.gz$/i.test(file.name)){
      if(!('DecompressionStream' in window))throw new Error('Compressed VRM requires a newer browser');
      buf=await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    }
    return loadBytes(buf,file.name,'Your device — local file, never uploaded');
  }).catch(e=>message('COULD NOT READ FILE',e.message,'ERROR'));
}
function bindButton(id,fn){byId(id)?.addEventListener('click',fn);}
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
