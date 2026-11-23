/*
  Glass-block sky for the hero.
  A slowly drifting colour field seen through a grid of pillowed glass blocks,
  drawn with WebGL2 on a canvas behind the cut-out building. The pointer acts
  as a light and loupe. Adapted from a Framer component to plain JavaScript and
  retinted to the Lloyds Property blues.

  If WebGL2 is unavailable, nothing changes: the plain hero photo stays.
  With reduced motion, it draws one still frame.
*/
(function () {
  var host = document.querySelector('.hero-img');
  if (!host) return;

  // Colours and tuning. Change these to adjust the look.
  var C = {
    background: '#0d1828',  // darkest parts of the field
    shadows: '#14243a',     // low tones
    lightTones: '#36537a',  // brightest tones
    deep: '#0e192a',
    royal: '#1a2b44',
    mid: '#223856',
    ice: '#2d4768',
    faceTint: '#1a2d4a'
  };
  var T = {
    refraction: 0.9, depth: 0.65, hover: 1.0,
    rows: 34, grout: 0.07, bevel: 0.35, zoom: 1.3,
    hlSize: 0.62, hlRound: 0.22, hlAmt: 0.4, lightAng: 135,
    paleFade: 0.15, fieldSize: 1.0, warp: 0.6, darkLvl: 0.34, lightLvl: 0.62,
    blackShare: 0.5, bottomGlow: 0.35, drift: 0.08, loop: 12, breathe: 0.06,
    seed: 7, lensBoost: 0.8, ptrRadius: 0.25, ptrPush: 0.02, grain: 0.03, vignette: 0
  };

  var canvas = document.createElement('canvas');
  canvas.className = 'glass';
  canvas.setAttribute('aria-hidden', 'true');
  var gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, premultipliedAlpha: false });
  if (!gl) return;
  host.insertBefore(canvas, host.firstChild);

  function hex(h) {
    h = h.replace('#', '');
    return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255];
  }

  var VERT = '#version 300 es\nin vec2 aPos;\nvoid main(){gl_Position=vec4(aPos,0.0,1.0);}';

  var FRAG = [
    '#version 300 es',
    'precision highp float;',
    'uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse; uniform float uHover;',
    'uniform vec3 uBg; uniform vec3 uBase; uniform vec3 uAccent; uniform float uScale;',
    'uniform float uPointer; uniform float uRefract; uniform float uDepth;',
    'uniform vec3 uDeep; uniform vec3 uRoyal; uniform vec3 uMid; uniform vec3 uIce; uniform vec3 uTint;',
    'uniform float uRows; uniform float uGrout; uniform float uBevel; uniform float uZoom;',
    'uniform float uHlSize; uniform float uHlRound; uniform float uHlAmt; uniform float uLightAng;',
    'uniform float uPaleFade; uniform float uFieldFreq; uniform float uWarp; uniform float uDarkLvl;',
    'uniform float uLightLvl; uniform float uBlackSel; uniform float uBottomGlow; uniform float uDrift;',
    'uniform float uLoop; uniform float uBreathe; uniform float uSeed; uniform float uLensBoost;',
    'uniform float uPtrRadius; uniform float uPtrPush; uniform float uGrain; uniform float uVignette;',
    'out vec4 outColor;',
    'float hash12(vec2 p){vec3 p3=fract(vec3(p.xyx)*0.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}',
    'float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 w=f*f*f*(f*(f*6.0-15.0)+10.0);',
    ' float a=hash12(i),b=hash12(i+vec2(1.0,0.0));float c=hash12(i+vec2(0.0,1.0)),d=hash12(i+vec2(1.0,1.0));',
    ' return mix(mix(a,b,w.x),mix(c,d,w.x),w.y);}',
    'float fbm3(vec2 p){float s=0.0,a=0.55;for(int i=0;i<3;i++){s+=a*vnoise(p);p=mat2(1.6,1.2,-1.2,1.6)*p+3.7;a*=0.45;}return s/0.909;}',
    'vec3 field(vec2 p){',
    ' float th=6.2831853*uTime/max(uLoop,0.5);float c=cos(th),s=sin(th);',
    ' float R=uDrift*uLoop/6.2831853;vec2 orb=vec2(c,0.45*s)*R;orb=vec2(orb.x-orb.y,orb.x+orb.y)*0.70710678;',
    ' float br=1.0+uBreathe*s;',
    ' vec2 q=(p/max(br,0.1)-orb)*uFieldFreq+vec2(uSeed*1.37,uSeed*0.71);',
    ' vec2 o2=vec2(cos(th+2.1),sin(th+2.1))*0.35;',
    ' vec2 w=vec2(fbm3(q*0.6+o2+11.3),fbm3(q*0.6-o2+4.7))-0.5;q+=w*2.0*uWarp;',
    ' vec2 qd=vec2(q.x+q.y,q.y-q.x)*0.70710678;qd.x*=0.7;',
    ' float v=(fbm3(qd)-0.5)*2.0+0.5;v+=uBottomGlow*smoothstep(0.3,0.48,-p.y);v=clamp(v,0.0,1.0);',
    ' float sel=fbm3(qd*0.8+vec2(23.1,7.7)+o2*0.5);',
    ' float blue=smoothstep(uBlackSel-0.08,uBlackSel+0.08,sel);',
    ' vec3 dark=mix(uDeep,uBase,blue);float m=0.5*(uDarkLvl+uLightLvl);',
    ' vec3 col=mix(uBg,dark,smoothstep(0.0,uDarkLvl*0.6,v));',
    ' col=mix(col,uRoyal,smoothstep(uDarkLvl-0.06,uDarkLvl+0.06,v));',
    ' col=mix(col,uMid,smoothstep(uDarkLvl+0.04,m+0.04,v));',
    ' col=mix(col,uAccent,smoothstep(m,uLightLvl+0.04,v));',
    ' col=mix(col,uIce,smoothstep(uLightLvl+0.06,uLightLvl+0.3,v));',
    ' return col;}',
    'void main(){',
    ' vec2 res=max(uRes,vec2(1.0));vec2 uv=gl_FragCoord.xy/res;vec2 p=(gl_FragCoord.xy-0.5*res)/res.y;',
    ' float cph=max(uRows,4.0)/max(uScale,0.05);vec2 g=p*cph;vec2 id=floor(g);vec2 f=g-id-0.5;',
    ' float aa=cph/res.y*1.5;float cell=1.0/cph;',
    ' vec2 aspect=vec2(res.x/res.y,1.0);vec2 mp=(uMouse-0.5)*aspect;vec2 centre=(id+0.5)*cell;',
    ' vec2 cd=centre-mp;float cdl=length(cd);float pr=max(uPtrRadius,0.02);float hv=uHover*uPointer;',
    ' float near=min(exp(-dot(cd,cd)/(pr*pr))*hv,2.0);',
    ' vec2 a2=abs(f)*2.0;vec2 slope=sign(f)*smoothstep(1.0-uBevel,1.0,a2)+f*0.5;',
    ' vec3 n=normalize(vec3(slope*(0.6+1.6*uDepth)*(1.0+1.4*near),1.0));',
    ' float lens=uRefract*(1.0+uLensBoost*1.5*near);float zoom=max(uZoom,0.2)*(1.0+0.9*near);',
    ' vec2 sp=centre+f*cell/zoom-n.xy*cell*1.2*lens;',
    ' sp=mp+(sp-mp)*(1.0-min(0.8,0.45*near*uPtrPush*50.0));',
    ' vec3 col=field(sp);',
    ' float lum=dot(col,vec3(0.299,0.587,0.114));float gC=mix(1.0,uPaleFade,smoothstep(0.5,0.8,lum));',
    ' vec3 L0=normalize(vec3(cos(uLightAng),sin(uLightAng),1.1));vec2 dirP=-cd/max(cdl,1e-3);',
    ' float follow=hv*(1.0-smoothstep(0.0,pr*3.0,cdl));',
    ' vec3 L=normalize(mix(L0,normalize(vec3(dirP,0.9)),min(1.0,follow*0.85)));',
    ' float dif=clamp(dot(n,L)/max(L.z,1e-4),0.0,1.6);col*=mix(1.0,dif,gC*min(1.0,0.5+uDepth));',
    ' float hs=uHlSize*0.5;float hr=min(uHlRound,hs);vec2 hp=f-vec2(-0.05,0.05);vec2 qb=abs(hp)-vec2(hs-hr);',
    ' float dbox=length(max(qb,0.0))+min(max(qb.x,qb.y),0.0)-hr;float hl=1.0-smoothstep(-0.08,0.02+aa,dbox);',
    ' vec3 lifted=col*1.25+uTint*(1.0-lum)*0.9;col=mix(col,lifted,min(1.0,hl*uHlAmt*gC*(1.0+0.6*near)));',
    ' float e=max(abs(f.x),abs(f.y));',
    ' float rim=smoothstep(0.3,0.46,dot(f,dirP))*(1.0-smoothstep(0.46,0.5,e));',
    ' col+=mix(uAccent,vec3(1.0),0.6)*rim*min(near,1.5)*0.5;',
    ' col*=1.0-0.15*min(hv,1.0)*smoothstep(pr,pr*4.0,cdl);',
    ' float gr=smoothstep(0.5-uGrout-aa,0.5-aa*0.3,e);col*=1.0-gr*mix(0.12,0.85,gC);',
    ' float gn=hash12(gl_FragCoord.xy+fract(uTime*7.13)*517.0)-0.5;col+=gn*uGrain*(0.5+lum);',
    ' vec2 vc=(uv-0.5)*vec2(res.x/res.y,1.0);col*=1.0-uVignette*smoothstep(0.3,1.0,length(vc));',
    ' outColor=vec4(clamp(col,0.0,1.0),1.0);}'
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
  var loc = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  var U = {};
  function u(name) { if (!(name in U)) U[name] = gl.getUniformLocation(prog, name); return U[name]; }
  function f1(n, v) { gl.uniform1f(u(n), v); }
  function c3(n, h) { var c = hex(h); gl.uniform3f(u(n), c[0], c[1], c[2]); }

  // Fixed uniforms, set once.
  c3('uBg', C.background); c3('uBase', C.shadows); c3('uAccent', C.lightTones);
  c3('uDeep', C.deep); c3('uRoyal', C.royal); c3('uMid', C.mid); c3('uIce', C.ice); c3('uTint', C.faceTint);
  f1('uScale', 1); f1('uPointer', T.hover * 2); f1('uRefract', T.refraction * 2); f1('uDepth', T.depth);
  f1('uRows', T.rows); f1('uGrout', T.grout); f1('uBevel', T.bevel); f1('uZoom', T.zoom);
  f1('uHlSize', T.hlSize); f1('uHlRound', Math.min(T.hlSize * 0.5, T.hlRound)); f1('uHlAmt', T.hlAmt);
  f1('uLightAng', T.lightAng * Math.PI / 180); f1('uPaleFade', T.paleFade);
  f1('uFieldFreq', 2.0 / Math.max(0.1, T.fieldSize)); f1('uWarp', T.warp);
  f1('uDarkLvl', T.darkLvl); f1('uLightLvl', T.lightLvl); f1('uBlackSel', 0.35 + 0.3 * T.blackShare);
  f1('uBottomGlow', T.bottomGlow); f1('uDrift', T.drift); f1('uLoop', T.loop); f1('uBreathe', T.breathe);
  f1('uSeed', T.seed); f1('uLensBoost', T.lensBoost); f1('uPtrRadius', T.ptrRadius); f1('uPtrPush', T.ptrPush);
  f1('uGrain', T.grain); f1('uVignette', T.vignette);

  var W = 0, H = 0;
  function resize() {
    W = host.offsetWidth; H = host.offsetHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
    if (still) draw();
  }

  var mx = 0.5, my = 0.5, tx = 0.5, ty = 0.5, over = 0, hov = 0;
  host.addEventListener('pointermove', function (e) {
    var r = host.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return;
    tx = (e.clientX - r.left) / r.width;
    ty = 1 - (e.clientY - r.top) / r.height;
    over = 1;
  });
  host.addEventListener('pointerleave', function () { over = 0; });

  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clock = 3, last = -1, raf = 0, visible = true;

  function draw() {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(u('uRes'), canvas.width, canvas.height);
    f1('uTime', clock);
    gl.uniform2f(u('uMouse'), mx, my);
    f1('uHover', hov);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!canvas.classList.contains('on')) canvas.classList.add('on');
  }
  function frame(now) {
    raf = 0;
    if (!visible || still) return;
    raf = requestAnimationFrame(frame);
    var dt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 20);
    last = now;
    clock = (clock + dt) % 3600;
    var k = 1 - Math.exp(-dt * 6);
    mx += (tx - mx) * k; my += (ty - my) * k; hov += (over - hov) * k;
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
