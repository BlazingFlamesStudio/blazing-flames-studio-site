// Lightweight UI controller. Intentionally independent from WebGL and CDN modules.
// If three.js fails to import, Models / Details / Shading still open and show status.
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const configurations = [
    ["viewer-models-toggle", "viewer-sidebar", "viewer-sidebar-close"],
    ["viewer-details-toggle", "viewer-inspector", "viewer-inspector-close"],
    ["viewer-lighting-toggle", "viewer-lighting-panel", "viewer-lighting-close"]
  ];
  function init() {
    const backdrop = $("viewer-panel-backdrop");
    const options = configurations.map(([buttonId, panelId, closeId]) => ({
      button: $(buttonId), panel: $(panelId), closeButton: $(closeId)
    }));
    function closePanels() {
      for (const item of options) {
        if (item.panel) item.panel.hidden = true;
        item.button?.setAttribute("aria-expanded", "false");
      }
      if (backdrop) backdrop.hidden = true;
    }
    function toggle(item) {
      if (!item.button || !item.panel) return;
      const shouldOpen = item.panel.hidden;
      closePanels();
      if (shouldOpen) {
        item.panel.hidden = false;
        if (backdrop) backdrop.hidden = false;
        item.button.setAttribute("aria-expanded", "true");
        if (item.panel.id === "viewer-sidebar") $("viewer-search")?.focus();
      }
      updateEngineStatus();
    }
    for (const item of options) {
      item.button?.addEventListener("click", () => toggle(item));
      item.closeButton?.addEventListener("click", closePanels);
    }
    backdrop?.addEventListener("click", closePanels);
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") closePanels();
    });
    function updateEngineStatus() {
      const output = $("viewer-lighting-engine-status");
      if (!output) return;
      if (window.blazeViewerReady) {
        output.textContent = "Lighting controls ready. Select or load a VRM to preview shading.";
        output.dataset.state = "ready";
      } else {
        output.textContent = "3D engine not initialized yet. The menu works independently; if a model and shading controls do not respond, check your browser's WebGL support or CDN connection.";
        output.dataset.state = "waiting";
      }
    }
    document.addEventListener("blaze-viewer-ready", updateEngineStatus);
    window.BlazeViewerUI = { closePanels, updateEngineStatus };
    updateEngineStatus();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
