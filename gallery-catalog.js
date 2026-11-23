/* Blazing Flames Studio 3D Gallery — automatic Cloudflare R2 discovery.
   The browser receives original VRM bytes for rendering. Do not treat this as download protection. */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

const BASE = "https://blazingflamesdepository.isshinamv.workers.dev";
const CATALOG_URL = BASE + "/api/models";
const FALLBACK = {id:"Blaze Silver Model (Aino).vrm",name:"Aino",size:null};
const $ = id => document.getElementById(id);

let models = [FALLBACK];
let selectedId = FALLBACK.id;
let scene, camera, renderer, controls, grid, keyLight, fillLight, currentVRM;
let busy = false, spin = false;
let catalogLoaded = false;
const clock = new THREE.Clock();

const title = $("gallery-title");
const modelList = $("gallery-model-list");
const search = $("gallery-search");
const count = $("gallery-count");
const loadButton = $("load-stage");
const loadingPanel = $("gallery-loading");
const emptyPanel = $("gallery-empty");
const progress = $("gallery-progress");
const loadLabel = $("gallery-loading-label");

function message(value, error=false) {
  const node = $("gallery-feedback");
  node.textContent = value;
  node.classList.toggle("error", error);
}

function status(heading, detail, state="checking") {
  $("gateway-title").textContent = heading;
  $("gateway-detail").textContent = detail;
  $("gateway-pill").textContent = state==="ok" ? "CONNECTED" : state==="bad" ? "ERROR" : "CHECKING";
  $("gateway-pill").className = "gateway-pill " + (state==="ok" ? "ok" : state==="bad" ? "bad" : "");
}

function cleanCatalog(items) {
  if (!Array.isArray(items)) throw new Error("The Worker did not return a model list.");
  const names = new Set();
  return items.filter(m => {
    if (!m || typeof m.id !== "string" || typeof m.name !== "string") return false;
    if (!/\.vrm$/i.test(m.id) || m.id.includes("/") || m.id.includes("\\")) return false;
    if (names.has(m.id)) return false;
    names.add(m.id);
    return true;
  }).map(m => ({id:m.id,name:m.name,size:Number.isFinite(m.size) ? m.size : null}))
    .sort((a,b) => a.name.localeCompare(b.name,undefined,{numeric:true,sensitivity:"base"}));
}

function selected() {
  return models.find(m => m.id === selectedId) || models[0] || null;
}

function showSelection() {
  const model = selected();
  title.textContent = model ? model.name : "No models";
  loadButton.textContent = model ? "LOAD " + model.name.toLocaleUpperCase() + " ✧" : "NO MODELS";
  loadButton.disabled = busy || !model;
  const info = $("gallery-selected-info");
  if(info) info.textContent = model ? "Selected: " + model.name : "Upload a VRM to R2 to begin.";
}

function renderList() {
  modelList.replaceChildren();
  const q = search.value.trim().toLocaleLowerCase();
  const filtered = models.filter(m => m.name.toLocaleLowerCase().includes(q) || m.id.toLocaleLowerCase().includes(q));
  count.textContent = q ? filtered.length + " of " + models.length + " models" : models.length + (models.length===1 ? " model" : " models");
  if (filtered.length===0) {
    const none = document.createElement("p");
    none.className = "gallery-list-empty";
    none.textContent = models.length ? "No matching models." : "No .vrm files in your R2 models/ folder yet.";
    modelList.appendChild(none);
  }
  for (const model of filtered) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "gallery-model" + (model.id===selectedId ? " selected" : "");
    btn.disabled = busy;
    btn.setAttribute("aria-pressed", String(model.id===selectedId));
    const mark = document.createElement("span");
    mark.className = "gallery-initial";
    mark.textContent = model.name.charAt(0).toUpperCase() || "✦";
    const label = document.createElement("span");
    const strong = document.createElement("strong");
    strong.textContent = model.name;
    const sub = document.createElement("small");
    sub.textContent = model.size ? "VRM · " + (model.size / 1048576).toFixed(1) + " MB" : "Original VRM";
    label.append(strong,sub);
    const arrow = document.createElement("span");
    arrow.textContent = "↗";
    btn.append(mark,label,arrow);
    btn.addEventListener("click",() => {
      if(busy) return;
      selectedId = model.id;
      showSelection();
      renderList();
      loadModel();
    });
    modelList.appendChild(btn);
  }
  showSelection();
}

async function refreshCatalog() {
  const refresh = $("gateway-retry");
  refresh.disabled = true;
  status("Checking Cloudflare catalog…","Reading a list of filenames, without downloading any VRMs.");
  try {
    const response = await fetch(CATALOG_URL,{cache:"no-store"});
    if (!response.ok) {
      if (response.status===404 && !catalogLoaded) {
        models = [FALLBACK];
        selectedId = FALLBACK.id;
        status("Aino is still available","The Worker needs the updated discovery script. Existing Aino viewer remains available.","bad");
        renderList();
        return;
      }
      throw new Error("Catalog HTTP " + response.status + (response.status===403 ? " — check SITE_ORIGIN in the Worker" : ""));
    }
    const data = await response.json();
    const fresh = cleanCatalog(data.models);
    models = fresh;
    catalogLoaded = true;
    if (!models.some(m=>m.id===selectedId)) selectedId=models[0]?.id || "";
    status("Cloudflare catalog connected",models.length+" VRM " + (models.length===1?"model":"models") + " discovered in R2. Add or remove files to update this collection.","ok");
    renderList();
  } catch(err) {
    status("Could not load Cloudflare model catalog",err.message+" — click Test again after updating the Worker.","bad");
    if(!catalogLoaded) { models=[FALLBACK];renderList(); }
  } finally {
    refresh.disabled=false;
  }
}

function resize() {
  if(!renderer) return;
  const bounds = $("gallery-canvas").getBoundingClientRect();
  if(bounds.width && bounds.height) {
    camera.aspect = bounds.width / bounds.height;
    camera.updateProjectionMatrix();
    renderer.setSize(bounds.width,bounds.height,false);
  }
}

function initScene() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(38,1,.01,500);
  camera.position.set(0,1.3,4);
  renderer = new THREE.WebGLRenderer({antialias:true,alpha:true});
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.8));
  renderer.setClearColor(0,0);
  $("gallery-canvas").appendChild(renderer.domElement);
  controls = new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=true;
  controls.target.set(0,1,0);
  controls.update();
  keyLight = new THREE.DirectionalLight(0xffffff,2.5);
  keyLight.position.set(3,5,5);scene.add(keyLight);
  fillLight = new THREE.DirectionalLight(0xa6baff,1.3);
  fillLight.position.set(-4,3,-4);scene.add(fillLight);
  scene.add(new THREE.HemisphereLight(0xf2f1ff,0x24335c,1.4));
  grid = new THREE.GridHelper(12,32,0x92addd,0x42618a);
  grid.material.transparent=true;
  grid.material.opacity=.2;
  scene.add(grid);
  new ResizeObserver(resize).observe($("gallery-canvas"));
  document.addEventListener("fullscreenchange",resize);
  resize();
  function animate(){
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(),.1);
    if(document.hidden)return;
    if(currentVRM)currentVRM.update(delta);
    controls.autoRotate=!!currentVRM&&spin;
    controls.autoRotateSpeed=1.2;
    controls.update();
    renderer.render(scene,camera);
  }
  animate();
}

function frameModel(root) {
  const box = new THREE.Box3().setFromObject(root);
  if(box.isEmpty()) throw new Error("VRM contains no visible geometry.");
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const distance = Math.max(size.y/(2*Math.tan(fov/2)),size.x/(2*Math.tan(fov/2)*camera.aspect),size.z,.8)*1.35;
  camera.position.set(center.x,center.y+.03*size.y,center.z+distance);
  camera.near=Math.max(.01,distance/250);
  camera.far=Math.max(100,distance*20);
  camera.updateProjectionMatrix();
  controls.target.copy(center);
  controls.minDistance=Math.max(.15,distance*.15);
  controls.maxDistance=Math.max(20,distance*8);
  controls.update();controls.saveState();
  grid.position.y=box.min.y-.04;
}

async function loadModel() {
  const model = selected();
  if(busy || !model) return;
  busy=true;
  loadButton.disabled=true;
  renderList();
  emptyPanel.hidden=true;
  loadingPanel.hidden=false;
  $("gallery-summoning-title").textContent = "SUMMONING " + model.name.toLocaleUpperCase();
  progress.style.width="8%";
  loadLabel.textContent="Downloading " + model.name + " from Cloudflare…";
  message("Loading original " + model.name + " VRM…");

  try {
    if(!renderer) initScene();
    const loader = new GLTFLoader();
    loader.register(parser=>new VRMLoaderPlugin(parser));
    // Until the Worker is upgraded, the original Aino /models/aino route remains usable.
    const url = !catalogLoaded && model.id === FALLBACK.id
      ? BASE + "/models/aino"
      : BASE + "/models/" + encodeURIComponent(model.id);
    const gltf = await loader.loadAsync(url,event=>{
      if(event.total) {
        const percent = Math.round(event.loaded/event.total*100);
        progress.style.width=Math.min(80,percent*.8)+"%";
        loadLabel.textContent="Receiving "+model.name+" · "+percent+"%";
      } else loadLabel.textContent="Receiving original VRM…";
    });
    const next = gltf.userData.vrm;
    if(!next || !next.scene) throw new Error("No supported VRM avatar was found.");
    progress.style.width="92%";
    loadLabel.textContent="Preparing 3D model…";
    if(gltf.parser?.json?.extensions?.VRM)VRMUtils.rotateVRM0(next);
    scene.add(next.scene);
    try { frameModel(next.scene); }
    catch(err) {scene.remove(next.scene);VRMUtils.deepDispose(next.scene);throw err;}
    if(currentVRM){
      scene.remove(currentVRM.scene);
      VRMUtils.deepDispose(currentVRM.scene);
    }
    currentVRM = next;
    ["gallery-reset","gallery-spin","gallery-grid","gallery-light"].forEach(id=>$(id).disabled=false);
    loadingPanel.hidden=true;
    message(model.name+" ready · Drag to rotate · Scroll or pinch to zoom.");
  } catch(err) {
    console.error("VRM gallery load error:",err);
    loadingPanel.hidden=true;
    if(!currentVRM)emptyPanel.hidden=false;
    message("Unable to display "+model.name+": "+String(err.message||err),true);
  } finally {
    busy=false;
    renderList();
  }
}

function setupUI() {
  const toggle=document.querySelector(".mobile-toggle");
  const mobile=$("mobile-nav");
  toggle?.addEventListener("click",()=>{mobile.hidden=!mobile.hidden;toggle.setAttribute("aria-expanded",String(!mobile.hidden));});
  mobile?.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>{mobile.hidden=true;toggle.setAttribute("aria-expanded","false");}));
  $("gateway-retry").addEventListener("click",refreshCatalog);
  $("gallery-search").addEventListener("input",renderList);
  loadButton.addEventListener("click",loadModel);
  $("gallery-reset").addEventListener("click",()=>controls?.reset());
  $("gallery-spin").addEventListener("click",()=>{spin=!spin;$("gallery-spin").textContent="Auto-rotate: "+(spin?"On":"Off");$("gallery-spin").setAttribute("aria-pressed",String(spin));});
  $("gallery-grid").addEventListener("click",()=>{grid.visible=!grid.visible;$("gallery-grid").textContent="Floor: "+(grid.visible?"On":"Off");$("gallery-grid").setAttribute("aria-pressed",String(grid.visible));});
  $("gallery-light").addEventListener("input",ev=>{const f=Number(ev.target.value)/100;keyLight.intensity=2.5*f;fillLight.intensity=1.3*f;});
  $("gallery-fullscreen").addEventListener("click",async()=>{try{if(!document.fullscreenElement)await $("gallery-viewport").requestFullscreen();else await document.exitFullscreen();}catch(err){message("Fullscreen unavailable: "+err.message,true);}});
  document.querySelectorAll(".current-year").forEach(node=>node.textContent=String(new Date().getFullYear()));
  renderList();
  refreshCatalog();
}
setupUI();
