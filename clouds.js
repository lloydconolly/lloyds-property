/*
  Moving clouds for the hero sky.
  Two layers of cumulus (near and far) and a thin high cirrus veil drift slowly
  across a dusk-blue sky, drawn with WebGL on a canvas behind the cut-out
  building. Moving the pointer leans the view (parallax) and pushes the wind.
  Adapted from a Framer component to plain JavaScript and retinted to the
  Lloyds Property blues.

  If WebGL is unavailable, nothing changes: the plain hero photo stays.
  With reduced motion, it draws one still frame.
*/
(function () {
  var host = document.querySelector('.hero-img');
  if (!host) return;

  // Look. Change these to adjust.
  var S = {
    zenith: '#15263b',     // sky at the top
    horizon: '#2c4566',    // sky lower down
    cloud: '#e4e9ef',      // cloud highlight colour
    glow: [1, 1, 1, 0.55], // sun glow (r, g, b, strength), top right
    sunX: 1.0, sunY: 1.0,
    coverage: 1.0,         // 0 to 1: how many clouds
    size: 1.3,             // 0.2 to 3: cloud size
    softness: 4.5 / 2.0,   // edge softness
    shadow: 0.7,           // underside shading
    cirrus: 1.0,           // high thin veil
    speed: 64 / 50,        // drift speed
    parallax: 3.0, wind: 3.0, damping: 50
  };

  var NEAR_DRIFT = 0.055, FAR_DRIFT = 0.026, CIRRUS_DRIFT = 0.014;

  var canvas = document.createElement('canvas');
  canvas.className = 'sky';
  canvas.setAttribute('aria-hidden', 'true');
  var gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false });
  if (!gl) return;
  host.insertBefore(canvas, host.firstChild);

  var VERT = 'attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0.0,1.0);}';

  var FRAG = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    'uniform vec2 uRes;',
    'uniform float uNearX, uFarX, uCirrusX;',
    'uniform float uCoverage, uSize, uSoftness, uShadow, uCirrus;',
    'uniform vec3 uZenith, uHorizon, uCloud;',
    'uniform vec4 uGlow;',
    'uniform vec2 uSun;',
    'uniform vec2 uParallax;',
    'vec2 hash22(vec2 p){vec3 q=fract(vec3(p.xyx)*vec3(0.1031,0.1030,0.0973));q+=dot(q,q.yzx+33.33);return fract((q.xx+q.yz)*q.zy);}',
    'float hash12(vec2 p){vec3 q=fract(vec3(p.xyx)*0.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}',
    'float vnoise(vec2 x){vec2 i=floor(x),f=fract(x);f=f*f*(3.0-2.0*f);',
    ' return mix(mix(hash12(i),hash12(i+vec2(1.0,0.0)),f.x),mix(hash12(i+vec2(0.0,1.0)),hash12(i+vec2(1.0,1.0)),f.x),f.y);}',
    'float fbm(vec2 p){float a=0.5,s=0.0;for(int i=0;i<4;i++){s+=a*vnoise(p);p*=2.03;a*=0.5;}return s;}',
    'vec2 blobs(vec2 uv,float seed){',
    ' vec2 id=floor(uv),f=fract(uv);float best=-1e4;float wsum=0.0,ysum=0.0;',
    ' float wMax=min(2.150,0.72*uSize);float reach=min(2.0,ceil(wMax+0.85)-1.0);',
    ' for(int j=-2;j<=2;j++){for(int i=-2;i<=2;i++){',
    '  vec2 o=vec2(float(i),float(j));',
    '  if(max(abs(o.x),abs(o.y))>reach)continue;',
    '  vec2 h=hash22(id+o+seed);',
    '  if(fract(h.x*37.1)>uCoverage)continue;',
    '  vec2 c=o+0.15+h*0.7;',
    '  float w=min(2.150,(0.30+0.42*fract(h.y*19.7))*uSize);',
    '  vec2 d=f-c;',
    '  float ry=(d.y>0.0?0.340:0.190)*uSize*(0.8+0.5*fract(h.y*7.3));',
    '  float e=length(vec2(d.x/max(w,1e-3),d.y/max(ry,1e-3)));',
    '  float val=1.0-e;float yN=d.y/max(ry,1e-3);',
    '  if(val>best){float k=exp(12.0*(best-val));wsum=wsum*k+1.0;ysum=ysum*k+yN;best=val;}',
    '  else{float g=exp(12.0*(val-best));wsum+=g;ysum+=g*yN;}',
    ' }}',
    ' return vec2(best,ysum/max(wsum,1e-4));}',
    'vec2 cloudField(vec2 uv,float seed,float detailScale){',
    ' vec2 b=blobs(uv,seed);',
    ' float n=fbm(uv*detailScale+seed*3.1)*0.72+fbm(uv*detailScale*3.3+seed*7.7)*0.28;',
    ' return vec2(b.x-(1.0-n)*0.700,b.y);}',
    'vec3 shadeCloud(float dyNorm,vec3 sky){',
    ' float t=smoothstep(-0.95,0.25,dyNorm);vec3 base=mix(uCloud*0.52,sky,0.34);',
    ' return mix(mix(uCloud,base,uShadow),uCloud,t);}',
    'void main(){',
    ' vec2 frag=gl_FragCoord.xy/max(uRes.y,1.0);float aspect=uRes.x/max(uRes.y,1.0);vec2 p=frag;',
    ' vec3 sky=mix(uHorizon,uZenith,smoothstep(-0.15,1.05,p.y));',
    ' vec2 sunP=vec2(uSun.x*aspect,uSun.y);float sd=length(p-sunP);',
    ' sky+=uGlow.rgb*uGlow.a*exp(-sd*3.4)*0.30;',
    ' vec3 col=sky;',
    ' if(uCirrus>0.0){vec2 cuv=vec2(p.x*1.4+uCirrusX,p.y*5.5);float veil=fbm(cuv)*fbm(cuv*2.3+9.0);',
    '  veil=smoothstep(0.24,0.55,veil)*smoothstep(0.15,0.7,p.y);col=mix(col,uCloud,veil*uCirrus*0.5);}',
    ' vec2 fuv=vec2(p.x+uFarX,p.y)*2.150+uParallax*0.4;vec2 fd=cloudField(fuv,17.0,11.0);',
    ' float fa=clamp(fd.x*uSoftness,0.0,1.0);',
    ' if(fa>0.0){vec3 lit=shadeCloud(fd.y,sky);col=mix(col,mix(lit,sky,0.550),fa);}',
    ' vec2 nuv=vec2(p.x+uNearX,p.y)*1.050+uParallax;vec2 nd=cloudField(nuv,3.0,8.5);',
    ' float na=clamp(nd.x*uSoftness,0.0,1.0);',
    ' if(na>0.0){vec3 lit=shadeCloud(nd.y,sky);',
    '  float above=clamp(cloudField(nuv+vec2(0.0,0.085),3.0,8.5).x*uSoftness,0.0,1.0);',
    '  lit*=1.0-0.18*uShadow*above;lit+=uGlow.rgb*uGlow.a*0.22*exp(-length(p-sunP)*1.6);',
    '  col=mix(col,lit,na);}',
    ' gl_FragColor=vec4(col,1.0);}'
  ].join('\n');

  function shader(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
    return s;
  }
  var prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || 'link');
  } catch (err) {
    canvas.remove();
    return;
  }
  gl.useProgram(prog);
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var aPos = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  var L = {};
  function u(n) { if (!(n in L)) L[n] = gl.getUniformLocation(prog, n); return L[n]; }
  function hex(h) {
    h = h.replace('#', '');
    return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255];
  }

  // Fixed uniforms, set once.
  var z = hex(S.zenith), hz = hex(S.horizon), c = hex(S.cloud);
  gl.uniform3f(u('uZenith'), z[0], z[1], z[2]);
  gl.uniform3f(u('uHorizon'), hz[0], hz[1], hz[2]);
  gl.uniform3f(u('uCloud'), c[0], c[1], c[2]);
  gl.uniform4f(u('uGlow'), S.glow[0], S.glow[1], S.glow[2], S.glow[3]);
  gl.uniform2f(u('uSun'), S.sunX, S.sunY);
  gl.uniform1f(u('uCoverage'), S.coverage);
  gl.uniform1f(u('uSize'), S.size);
  gl.uniform1f(u('uSoftness'), S.softness);
  gl.uniform1f(u('uShadow'), S.shadow);
  gl.uniform1f(u('uCirrus'), S.cirrus);

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.max(1, Math.round(host.offsetWidth * dpr));
    canvas.height = Math.max(1, Math.round(host.offsetHeight * dpr));
    if (still) draw();
  }

  var ptr = { x: 0, y: 0, inside: false };
  function track(e) {
    var r = host.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return;
    ptr.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ptr.y = 1 - ((e.clientY - r.top) / r.height) * 2;
    ptr.inside = true;
  }
  host.addEventListener('pointermove', track);
  host.addEventListener('pointerenter', track);
  host.addEventListener('pointerleave', function () { ptr.inside = false; });

  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Start part-way along so the first frame already has clouds in place.
  var nearX = -0.37, farX = -0.81, cirrusX = -0.2, leanX = 0, leanY = 0;
  var last = -1, raf = 0, visible = true;

  function draw() {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(u('uRes'), canvas.width, canvas.height);
    gl.uniform1f(u('uNearX'), nearX);
    gl.uniform1f(u('uFarX'), farX);
    gl.uniform1f(u('uCirrusX'), cirrusX);
    gl.uniform2f(u('uParallax'), -leanX * S.parallax * 0.07, -leanY * S.parallax * 0.05);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!canvas.classList.contains('on')) canvas.classList.add('on');
  }
  function frame(now) {
    raf = 0;
    if (!visible || still) return;
    raf = requestAnimationFrame(frame);
    var dt = last < 0 ? 0 : Math.min(0.05, (now - last) / 1000);
    last = now;
    var k = 1 - Math.exp(-S.damping * 0.12 * dt);
    leanX += ((ptr.inside ? ptr.x : 0) - leanX) * k;
    leanY += ((ptr.inside ? ptr.y : 0) - leanY) * k;
    var rate = S.speed * (1 + leanX * S.wind);
    nearX = (nearX - NEAR_DRIFT * rate * dt) % 1000;
    farX = (farX - FAR_DRIFT * rate * dt) % 1000;
    cirrusX = (cirrusX - CIRRUS_DRIFT * rate * dt) % 1000;
    draw();
  }
  function start() { if (!raf && !still) { last = -1; raf = requestAnimationFrame(frame); } }

  if (window.ResizeObserver) new ResizeObserver(resize).observe(host); else window.addEventListener('resize', resize);
  resize();
  draw();
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) start(); }).observe(host);
  }
  document.addEventListener('visibilitychange', function () { visible = !document.hidden; if (visible) start(); });
  start();
})();
