/* Blazing Flames Studio • install UI and native-feeling navigation.
   Progressive enhancement only: the regular website works without this file. */
(() => {
  "use strict";
  const PATH = "./";
  const installed = window.matchMedia?.("(display-mode: standalone)")?.matches || navigator.standalone === true;
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  let installEvent = null, refreshOnce = false;
  let installPanel = null;
  let toast = null;

  function el(name, cls, text) {
    const node = document.createElement(name);
    if(cls) node.className = cls;
    if(text) node.textContent = text;
    return node;
  }

  function showToast(text) {
    if(!toast) {
      toast = el("div","bfs-pwa-toast");
      toast.setAttribute("role","status");
      toast.setAttribute("aria-live","polite");
      document.body.appendChild(toast);
    }
    toast.textContent = text;
    toast.hidden = false;
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => {toast.hidden=true;}, 5200);
  }

  function hideInstallPanel() {
    installPanel?.remove();
    installPanel=null;
  }

  function isInstallDismissed() {
    try {
      const last=Number(localStorage.getItem("bfs-pwa-install-dismissed") || 0);
      return last>0 && (Date.now()-last) < 7*24*60*60*1000;
    } catch {return false;}
  }

  function dismissInstallPanel() {
    try {localStorage.setItem("bfs-pwa-install-dismissed",String(Date.now()));}
    catch {}
    hideInstallPanel();
  }

  function showInstallPanel() {
    if(installed || !document.body || isInstallDismissed() || installPanel) return;
    if(!installEvent && !isIOS) return;
    installPanel = el("aside","bfs-pwa-install");
    installPanel.setAttribute("aria-label","Install Blazing Flames Studio");
    const symbol=el("img","bfs-pwa-install-logo");
    symbol.src="./assets/channel-moonlit.webp";
    symbol.alt="";
    symbol.loading="lazy";
    symbol.setAttribute("aria-hidden","true");
    const copy=el("div","bfs-pwa-install-copy");
    copy.append(
      el("strong",null,"Blazing Flames Studio — your app"),
      el("p",null,"Home-screen access to the Live Hub, AMV games, Finder and 3D gallery.")
    );
    const action=el("button","bfs-pwa-install-action",isIOS ? "How to install" : "Install app");
    action.type="button";
    action.addEventListener("click",startInstall);
    const close=el("button","bfs-pwa-install-dismiss","×");
    close.type="button";
    close.setAttribute("aria-label","Dismiss install suggestion");
    close.addEventListener("click",dismissInstallPanel);
    installPanel.append(symbol,copy,action,close);
    document.body.appendChild(installPanel);
  }

  function installInstructions() {
    if(document.getElementById("bfs-pwa-guide")) {
      document.getElementById("bfs-pwa-guide").showModal();
      return;
    }
    const guide=el("dialog","bfs-pwa-guide");
    guide.id="bfs-pwa-guide";
    const heading=el("h2",null,"Install Blazing Flames Studio");
    const details=el("p",null,isIOS
      ? "Open this site in your browser, tap Share, choose Add to Home Screen, then tap Add. Open the new icon to launch the app."
      : "Open your browser menu and choose Install app or Add to Home screen."
    );
    const label=el("p","bfs-pwa-guide-note","Your models and livestreams still need an internet connection.");
    const done=el("button","bfs-pwa-install-action","Got it");
    done.addEventListener("click",()=>guide.close());
    guide.append(heading,details,label,done);
    guide.addEventListener("click",event=>{if(event.target===guide)guide.close();});
    document.body.appendChild(guide);
    guide.showModal();
  }

  async function startInstall() {
    if(!installEvent) {installInstructions();return;}
    const prompt=installEvent;
    installEvent=null;
    hideInstallPanel();
    try {
      await prompt.prompt();
      await prompt.userChoice;
    } catch(error) {
      console.warn("PWA installation prompt unavailable:",error);
      installInstructions();
    }
  }

  function addInstalledTabs() {
    if(!installed || document.querySelector(".bfs-pwa-tabs")) return;
    const location=window.location.pathname.split("/").pop() || "index.html";
    const items=[
      ["⌂","Home","index.html"],
      ["♫","Finder","finder.html"],
      ["●","Live","live.html"],
      ["✧","Games","amv-game.html"],
      ["◇","Gallery","viewer.html"]
    ];
    const nav=el("nav","bfs-pwa-tabs");
    nav.setAttribute("aria-label","App shortcuts");
    for(const [glyph,name,href] of items){
      const a=el("a",null);
      a.href=PATH+href;
      a.append(el("span","bfs-pwa-tab-icon",glyph),el("span",null,name));
      if((name==="Home" && location==="index.html")||
         (name==="Finder" && location==="finder.html")||
         (name==="Live" && location==="live.html")||
         (name==="Games" && location==="amv-game.html")||
         (name==="Gallery" && location==="viewer.html")) {
        a.setAttribute("aria-current","page");
      }
      nav.appendChild(a);
    }
    document.body.classList.add("bfs-pwa-standalone");
    document.body.appendChild(nav);
  }

  async function registerWorker(){
    if(!("serviceWorker" in navigator) || !window.isSecureContext) return;
    try {
      const registration=await navigator.serviceWorker.register("./sw.js",{scope:"./",updateViaCache:"none"});
      if(registration.waiting && navigator.serviceWorker.controller) offerUpdate(registration);
      registration.addEventListener("updatefound",()=>{
        const worker=registration.installing;
        if(!worker)return;
        worker.addEventListener("statechange",()=>{
          if(worker.state==="installed" && navigator.serviceWorker.controller) offerUpdate(registration);
        });
      });
      navigator.serviceWorker.addEventListener("controllerchange",()=>{
        if(refreshOnce) {window.location.reload();}
      });
    } catch(err){console.warn("Offline support is unavailable:",err);}
  }

  function offerUpdate(registration){
    if(document.getElementById("bfs-pwa-update")) return;
    const banner=el("div","bfs-pwa-update");
    banner.id="bfs-pwa-update";
    banner.append(el("span",null,"A new studio update is ready."));
    const go=el("button",null,"Update");
    go.type="button";
    go.addEventListener("click",()=>{
      refreshOnce=true;
      if(registration.waiting)registration.waiting.postMessage({type:"SKIP_WAITING"});
      else window.location.reload();
    });
    const close=el("button","bfs-pwa-update-close","×");
    close.type="button";
    close.setAttribute("aria-label","Dismiss update notice");
    close.addEventListener("click",()=>banner.remove());
    banner.append(go,close);
    document.body.appendChild(banner);
  }

  function init() {
    addInstalledTabs();
    registerWorker();
    if(!navigator.onLine) showToast("Offline: saved studio pages are available; 3D models and videos require internet.");
    window.addEventListener("offline",()=>showToast("You're offline. Previously saved pages remain available."));
    window.addEventListener("online",()=>showToast("Connected again. Live content is available."));
    window.addEventListener("appinstalled",()=>{installEvent=null;hideInstallPanel();showToast("Blazing Flames Studio is installed!");});
    if(isIOS && !installed) setTimeout(showInstallPanel,3000);
  }

  window.addEventListener("beforeinstallprompt",event=>{
    event.preventDefault();
    installEvent=event;
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",showInstallPanel,{once:true});
    else showInstallPanel();
  });

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
