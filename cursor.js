/*
  Crosshair cursor for the hero image.
  While the mouse is over the hero image, the normal pointer is replaced by
  thin full-width and full-height lines, a dot, and a small X/Y label.
  Adapted from a Framer component to plain JavaScript.
  Only on devices with a mouse; touch screens are unaffected.
*/
(function () {
  var host = document.querySelector('.hero-img');
  if (!host || !window.matchMedia || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  var layer = document.createElement('div');
  layer.className = 'xhair';
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = '<span class="xv"></span><span class="xh"></span><span class="xd"></span><span class="xl"></span>';
  host.appendChild(layer);
  host.classList.add('has-xhair');

  var v = layer.querySelector('.xv'), h = layer.querySelector('.xh'),
      d = layer.querySelector('.xd'), l = layer.querySelector('.xl');
  var x = 0, y = 0, queued = false;

  function paint() {
    queued = false;
    v.style.transform = 'translateX(' + x + 'px)';
    h.style.transform = 'translateY(' + y + 'px)';
    d.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    l.style.transform = 'translate(' + (x + 12) + 'px,' + (y + 12) + 'px)';
    l.textContent = 'X: ' + Math.round(x) + '  Y: ' + Math.round(y);
  }
  host.addEventListener('pointermove', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    var r = host.getBoundingClientRect();
    x = e.clientX - r.left; y = e.clientY - r.top;
    layer.classList.add('on');
    if (!queued) { queued = true; requestAnimationFrame(paint); }
  });
  host.addEventListener('pointerleave', function () { layer.classList.remove('on'); });
})();
