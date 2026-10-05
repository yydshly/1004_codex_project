(() => {
  const dialog = document.getElementById('understanding-reader');
  const openButton = document.getElementById('open-understanding-map');
  if (!dialog || !openButton) return;
  const viewport = document.getElementById('map-reader-viewport');
  const map = document.getElementById('map-reader-image');
  const output = document.getElementById('map-reader-scale');
  const zoomIn = document.getElementById('map-reader-in');
  const zoomOut = document.getElementById('map-reader-out');
  let width = 1600;
  function resize(next, preserveCenter = true) {
    const previous = width;
    const centerX = (viewport.scrollLeft + viewport.clientWidth / 2) / previous;
    const centerY = (viewport.scrollTop + viewport.clientHeight / 2) / previous;
    width = Math.max(320, Math.min(3200, Math.round(next)));
    map.style.width = `${width}px`;
    output.textContent = `${Math.round(width / 1600 * 100)}%`;
    zoomIn.disabled = width >= 3200;
    zoomOut.disabled = width <= 320;
    if (preserveCenter) {
      viewport.scrollLeft = centerX * width - viewport.clientWidth / 2;
      viewport.scrollTop = centerY * width - viewport.clientHeight / 2;
    } else {
      viewport.scrollTop = 0;
      viewport.scrollLeft = 0;
    }
  }
  openButton.addEventListener('click', () => {
    dialog.showModal();
    document.body.classList.add('map-reader-open');
    resize(1600, false);
    viewport.focus();
  });
  zoomIn.addEventListener('click', () => resize(width * 1.25));
  zoomOut.addEventListener('click', () => resize(width / 1.25));
  document.getElementById('map-reader-fit').addEventListener('click', () => resize(viewport.clientWidth - 32, false));
  document.getElementById('map-reader-original').addEventListener('click', () => resize(1600, false));
  document.getElementById('map-reader-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    document.body.classList.remove('map-reader-open');
    openButton.focus({ preventScroll: true });
  });
})();
