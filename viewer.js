/* Blazing Flames Studio — public PREVIEW-only model renderer.
   Never loads original VRM assets or GitHub Releases. GLB preview files are
   intentionally simplified, static, and downloadable from the public site.
   Do not treat this as DRM or as protection for the preview mesh itself. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const $ = id => document.getElementById(id);
const viewport = $('model-viewport');
const stageName = $('model-stage-name');
const connection = $('model-connection');
const feedback = $('model-feedback');
const empty = $('model-stage-empty');
const progress = $('model-progress');
const progressText = $('model-progress-text');
const progressBar = $('model-progress-bar');
const modelList = $('model-list');
const search = $('model-search');
const filePicker = $('model-local');
const MAX_PREVIEW_BYTES = 15 * 1024 * 1024;
const ALLOWED_PATH = /^previews\/[a-z0-9][a-z0-9._-]*\.glb$/i;
const loader = new GLTFLoader();
let scene, camera, controls, renderer, grid, light, fill, currentScene = null;
let models = [];
let activeId = '';
let generation = 0;
let spin = false;
let gridEnabled = true;
let loadAbortController = null;
const clock = new THREE.Clock();

function report(message, error = false) {
  if (!feedback) return;
  feedback.textContent = message;
  feedback.classList.toggle('is-error', error);
}
function loading(show, message = 'Loading preview…', percent = 0) {
  progress.hidden = !show;
  progressText.textContent = message;
  progressBar.style.width = Math.max(0, Math.min(100, percent)) + '%';
}
function describeSize(bytes) {
  return bytes > 0 ? (bytes / 1048576).toFixed(1) + ' MB preview' : 'Reduced-detail preview';
}
function renderList() {
  if (!modelList) return;
  const q = (search?.value || '').toLowerCase().trim();
  const matches = models.filter(m => (m.name + ' ' + m.collection).toLowerCase().includes(q));
  modelList.replaceChildren();
  if (!matches.length) {
    const msg = document.createElement('p');
    msg.className = 'model-list-empty';
    msg.textContent = models.length ? 'No preview models match your search.' : 'No public preview models have been added yet.';
    modelList.append(msg);
    return;
  }
  for (const model of matches) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-label', 'View simplified preview of ' + model.name);
    btn.setAttribute('aria-pressed', String(activeId === model.id));
    const wrapper = document.createElement('span');
    wrapper.textContent = model.name;
    const sub = document.createElement('small');
    sub.textContent = model.collection + ' · ' + (model.description || 'Static preview');
    wrapper.append(sub);
    const arrow = document.createElement('span');
    arrow.textContent = '✧';
    btn.append(wrapper, arrow);
    btn.addEventListener('click', () => loadPreview(model));
    modelList.append(btn);
  }
}
async function fetchCatalog() {
  try {
    const response = await fetch('previews.json', {cache:'no-store'});
    if (!response.ok) throw Error('Catalogue request returned ' + response.status);
    const data = await response.json();
    if (!data || !Array.isArray(data.models)) throw Error('Invalid preview catalogue');
    const seen = new Set();
    models = data.models.filter(m => m && typeof m.id==='string' && typeof m.name==='string'
      && typeof m.file==='string' && ALLOWED_PATH.test(m.file) && m.name.length < 150
      && !seen.has(m.id) && seen.add(m.id))
      .map(m => ({
        id:m.id, name:m.name, file:m.file,
        collection:typeof m.collection==='string'?m.collection:'Blazing Flames Models',
        description:typeof m.description==='string'?m.description:'Static preview'
      }));
    $('model-count').textContent = String(models.length);
    connection.textContent = 'PREVIEW LIBRARY';
    connection.classList.add('connected');
    report(models.length
      ? models.length + ' simplified preview'+(models.length===1?'':'s')+' in the catalogue. Originals are never loaded from this website.'
      : 'Preview library ready. No models have been published yet.');
    renderList();
  } catch (error) {
    models = [];
    $('model-count').textContent = '0';
    connection.textContent = 'CATALOGUE UNAVAILABLE';
    report('The preview catalogue could not be loaded: ' + error.message, true);
    renderList();
  }
}
function init3D() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x071b34);
  scene.fog = new THREE.FogExp2(0x071b34, .026);
  camera = new THREE.PerspectiveCamera(32, 1, .01, 1000);
  camera.position.set(0, 1.15, 4.8);
  renderer = new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,2));
  viewport.append(renderer.domElement);
  controls = new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=true;
  controls.dampingFactor=.075;
  controls.screenSpacePanning=true;
  controls.target.set(0,1,0);
  controls.minDistance=.05;
  controls.maxDistance=100;
  controls.update();
  light=new THREE.DirectionalLight(0xffffff,2.35);
  light.position.set(3,5,5); scene.add(light);
  fill=new THREE.DirectionalLight(0x9fd3ff,1.05);
  fill.position.set(-3,2,-5);scene.add(fill);
  scene.add(new THREE.HemisphereLight(0xf3faff,0x375274,1.35));
  grid=new THREE.GridHelper(15,36,0x8dcafa,0x3d709d);
  grid.material.transparent=true;grid.material.opacity=.22;
  scene.add(grid);
  const resize=()=>{
    const {width,height}=viewport.getBoundingClientRect();
    if(width<1||height<1)return;
    camera.aspect=width/height;camera.updateProjectionMatrix();
    renderer.setSize(width,height,false);
  };
  if('ResizeObserver' in window)new ResizeObserver(resize).observe(viewport);
  else window.addEventListener('resize',resize);
  resize();
  const animate=()=>{
    requestAnimationFrame(animate);
    clock.getDelta();
    controls.autoRotate=spin&&!!currentScene;
    controls.autoRotateSpeed=1.2;
    controls.update();
    renderer.render(scene,camera);
  };
  animate();
}
function disposeScene(root) {
  if(!root)return;
  scene.remove(root);
  const geo=new Set(), mats=new Set(),tex=new Set();
  root.traverse(o=>{
    if(o.geometry)geo.add(o.geometry);
    for(const m of (Array.isArray(o.material)?o.material:[o.material])){
      if(!m)continue;
      mats.add(m);
      for(const v of Object.values(m))if(v?.isTexture)tex.add(v);
    }
  });
  for(const g of geo)g.dispose();
  for(const m of mats)m.dispose();
  for(const t of tex)t.dispose();
}
function frame(root) {
  const bounds=new THREE.Box3().setFromObject(root);
  if(bounds.isEmpty())throw Error('No usable geometry found in the preview.');
  const center=bounds.getCenter(new THREE.Vector3());
  const size=bounds.getSize(new THREE.Vector3());
  const span=Math.max(size.x,size.y,size.z,.1);
  const distance=Math.max(span*1.85,1.7);
  controls.target.copy(center);
  camera.position.set(center.x+distance*.1,center.y+span*.12,center.z+distance);
  camera.near=Math.max(.001,distance/300);
  camera.far=Math.max(100,distance*16);
  camera.updateProjectionMatrix();
  controls.minDistance=Math.max(.03,span*.12);
  controls.maxDistance=Math.max(25,span*23);
  grid.position.y=bounds.min.y-span*.02;
  controls.saveState();
  controls.update();
}
function parsePreview(arrayBuffer, name, token) {
  // Use bytes directly. No full-resolution originals, VRM plugin or remote file URLs.
  loader.parse(arrayBuffer, '', gltf=>{
    if(token!==generation){disposeScene(gltf.scene);return;}
    try{
      const next=gltf.scene;
      if(!next)throw Error('No model was found in the preview file.');
      scene.add(next);
      try{frame(next);}catch(e){scene.remove(next);disposeScene(next);throw e;}
      disposeScene(currentScene);
      currentScene=next;
      stageName.textContent=name;
      empty.hidden=true;
      loading(false);
      report(name+' preview loaded. Drag to rotate, scroll to zoom, right-drag to pan.');
      renderList();
    }catch(e){handleError(e,token);}
  },error=>handleError(error,token));
}
function handleError(error,token) {
  if(token!==generation)return;
  loading(false);
  if(!currentScene)empty.hidden=false;
  report('Preview could not be displayed: '+String(error?.message||error).slice(0,200),true);
}
async function loadPreview(model) {
  if (!ALLOWED_PATH.test(model.file))return report('This preview path is not allowed.',true);
  if(loadAbortController)loadAbortController.abort();
  const abort=new AbortController();
  loadAbortController=abort;
  const token=++generation;
  activeId=model.id;
  renderList();
  loading(true,'Loading reduced-detail preview…',12);
  report('Loading the public preview for '+model.name+'…');
  try{
    const response=await fetch(model.file,{cache:'default',signal:abort.signal});
    if(!response.ok)throw Error(response.status===404
      ? 'The preview file has not been uploaded yet. Add '+model.file+' to the GitHub repository.'
      : 'HTTP '+response.status);
    const declared=Number(response.headers.get('Content-Length')||0);
    if(declared>MAX_PREVIEW_BYTES)throw Error('Preview is too large; it was not processed to preview size.');
    const buffer=await response.arrayBuffer();
    if(buffer.byteLength>MAX_PREVIEW_BYTES)throw Error('Preview exceeds the 15 MB safety limit.');
    if(token!==generation)return;
    loading(true,'Preparing preview for display…',82);
    parsePreview(buffer,model.name,token);
  }catch(e){
    if(e.name==='AbortError')return;
    handleError(e,token);
  }
}
function loadLocalPreview(file) {
  if(!file)return;
  if(!/\.glb$/i.test(file.name))return report('Choose a reduced-detail .glb preview file (not an original .vrm).',true);
  if(file.size>MAX_PREVIEW_BYTES)return report('Choose a preview smaller than 15 MB.',true);
  if(loadAbortController)loadAbortController.abort();
  const token=++generation;
  activeId='';
  renderList();
  loading(true,'Reading local preview…',25);
  file.arrayBuffer().then(data=>{
    if(token===generation)parsePreview(data,file.name.replace(/\.glb$/i,''),token);
  }).catch(e=>handleError(e,token));
}
function bindUI() {
  search?.addEventListener('input',renderList);
  filePicker?.addEventListener('change',e=>{
    loadLocalPreview(e.target.files?.[0]);
    e.target.value='';
  });
  $('model-reset')?.addEventListener('click',()=>{controls.reset();report('Camera reset.');});
  $('model-spin')?.addEventListener('click',e=>{
    spin=!spin;
    e.currentTarget.setAttribute('aria-pressed',String(spin));
    e.currentTarget.textContent='Auto-rotate: '+(spin?'On':'Off');
  });
  $('model-grid')?.addEventListener('click',e=>{
    gridEnabled=!gridEnabled;
    grid.visible=gridEnabled;
    e.currentTarget.setAttribute('aria-pressed',String(gridEnabled));
    e.currentTarget.textContent='Floor grid: '+(gridEnabled?'On':'Off');
  });
  $('model-light')?.addEventListener('input',e=>{
    const value=Number(e.target.value)/100;
    light.intensity=2.35*value;
    fill.intensity=1.05*value;
  });
  const toggle=document.querySelector('.mobile-toggle'),menu=$('mobile-nav');
  if(toggle&&menu){
    const close=()=>{menu.hidden=true;toggle.setAttribute('aria-expanded','false');};
    toggle.addEventListener('click',()=>{
      menu.hidden=!menu.hidden;
      toggle.setAttribute('aria-expanded',String(!menu.hidden));
    });
    menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));
    window.addEventListener('resize',()=>{if(window.innerWidth>1240)close();});
  }
  document.querySelectorAll('.current-year').forEach(e=>e.textContent=String(new Date().getFullYear()));
}
try{init3D();bindUI();fetchCatalog();}
catch(e){console.error('Preview renderer initialization failed',e);report('3D preview renderer unavailable: '+e.message,true);}
