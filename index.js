import { jsx as S } from "react/jsx-runtime";
import { useSettings as C, useViewport as R } from "@mywallpaper/sdk-react";
import { useRef as s, useEffect as _ } from "react";
const x = `#version 300 es
precision mediump float;
const vec2 positions[6] = vec2[6](
  vec2(-1.0, -1.0), vec2(1.0, -1.0), vec2(-1.0, 1.0),
  vec2(-1.0, 1.0), vec2(1.0, -1.0), vec2(1.0, 1.0)
);
out vec2 uv;
void main() {
  uv = positions[gl_VertexID];
  gl_Position = vec4(positions[gl_VertexID], 0.0, 1.0);
}
`, A = `#version 300 es
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec3 u_primaryColor;
uniform vec3 u_secondaryColor;
uniform float u_intensity;
uniform float u_speed;
uniform float u_scale;
uniform float u_turbulence;
uniform float u_height;
uniform float u_opacity;

in vec2 uv;
out vec4 fragColor;

float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float noise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  vec2 u = f * f * (3.0 - 2.0 * f);

  float a = random(i);
  float b = random(i + vec2(1.0, 0.0));
  float c = random(i + vec2(0.0, 1.0));
  float d = random(i + vec2(1.0, 1.0));

  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

#define OCTAVES 5
float fbm(vec2 st) {
  float value = 0.0;
  float amplitude = 0.4;
  vec2 freq = st;

  for (int i = 0; i < OCTAVES; i++) {
    value += amplitude * noise(freq);
    freq *= 2.0;
    amplitude *= 0.4;
  }
  return value;
}

void main() {
  vec2 st = uv;

  float aspectRatio = u_resolution.x / u_resolution.y;
  st.x *= aspectRatio;

  vec2 fireCoords = vec2(st.x, st.y - u_time * u_speed) * u_scale;

  float gradient = mix(st.y * 0.3, st.y * 0.7, fbm(fireCoords));

  float noise1 = fbm(fireCoords);
  float noise2 = u_turbulence * fbm(fireCoords + noise1 + u_time) - 0.5;

  float finalNoise = u_turbulence * fbm(vec2(noise1, noise2));
  float fireIntensity = fbm(vec2(noise2, noise1));

  vec3 fireColor = mix(u_secondaryColor, u_primaryColor, fireIntensity);
  vec3 finalColor = fireColor * u_intensity;

  float fireAlpha = smoothstep(0.0, 1.0, (fireIntensity - gradient + 0.3) * u_height);

  fragColor = vec4(finalColor, fireAlpha * u_opacity);
}
`;
function h(e) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i.exec(e);
  return r ? [
    parseInt(r[1], 16) / 255,
    parseInt(r[2], 16) / 255,
    parseInt(r[3], 16) / 255
  ] : [1, 1, 1];
}
function v(e, r, u) {
  const o = e.createShader(u);
  return o ? (e.shaderSource(o, r), e.compileShader(o), e.getShaderParameter(o, e.COMPILE_STATUS) ? o : (console.error("Shader compile error:", e.getShaderInfoLog(o)), e.deleteShader(o), null)) : null;
}
function b(e) {
  const r = v(e, x, e.VERTEX_SHADER), u = v(e, A, e.FRAGMENT_SHADER);
  if (!r || !u) return null;
  const o = e.createProgram();
  return o ? (e.attachShader(o, r), e.attachShader(o, u), e.linkProgram(o), e.getProgramParameter(o, e.LINK_STATUS) ? (e.detachShader(o, r), e.deleteShader(r), e.detachShader(o, u), e.deleteShader(u), o) : (console.error("Program link failed:", e.getProgramInfoLog(o)), e.deleteProgram(o), e.deleteShader(r), e.deleteShader(u), null)) : null;
}
function L(e, r) {
  return {
    u_time: e.getUniformLocation(r, "u_time"),
    u_resolution: e.getUniformLocation(r, "u_resolution"),
    u_primaryColor: e.getUniformLocation(r, "u_primaryColor"),
    u_secondaryColor: e.getUniformLocation(r, "u_secondaryColor"),
    u_intensity: e.getUniformLocation(r, "u_intensity"),
    u_speed: e.getUniformLocation(r, "u_speed"),
    u_scale: e.getUniformLocation(r, "u_scale"),
    u_turbulence: e.getUniformLocation(r, "u_turbulence"),
    u_height: e.getUniformLocation(r, "u_height"),
    u_opacity: e.getUniformLocation(r, "u_opacity")
  };
}
function I() {
  const e = C(), { width: r, height: u } = R(), o = s(null), f = s(null), m = s(null), d = s(null), l = s(0), p = s(performance.now());
  return _(() => {
    const t = o.current;
    if (!t) return;
    const i = t.getContext("webgl2", {
      alpha: !0,
      premultipliedAlpha: !1,
      antialias: !0
    });
    if (!i) {
      console.error("WebGL2 not supported");
      return;
    }
    i.enable(i.BLEND), i.blendFunc(i.SRC_ALPHA, i.ONE_MINUS_SRC_ALPHA), i.clearColor(0, 0, 0, 0);
    const n = b(i);
    if (n)
      return i.useProgram(n), f.current = i, m.current = n, d.current = L(i, n), () => {
        cancelAnimationFrame(l.current), i && n && i.deleteProgram(n);
        const a = i.getExtension("WEBGL_lose_context");
        a && a.loseContext(), f.current = null, m.current = null, d.current = null;
      };
  }, []), _(() => {
    const t = o.current, i = f.current;
    if (!t || !i) return;
    const n = window.devicePixelRatio || 1, a = r * n, c = u * n;
    (t.width !== a || t.height !== c) && (t.width = a, t.height = c, i.viewport(0, 0, a, c));
  }, [r, u]), _(() => {
    const t = f.current, i = m.current, n = d.current, a = o.current;
    if (!t || !i || !n || !a) return;
    const c = () => {
      const y = (performance.now() - p.current) / 1e3;
      t.clear(t.COLOR_BUFFER_BIT), t.uniform1f(n.u_time, y), t.uniform2fv(n.u_resolution, [a.width, a.height]), t.uniform3fv(n.u_primaryColor, h(e.primaryColor)), t.uniform3fv(n.u_secondaryColor, h(e.secondaryColor)), t.uniform1f(n.u_intensity, e.intensity), t.uniform1f(n.u_speed, e.speed), t.uniform1f(n.u_scale, e.scale), t.uniform1f(n.u_turbulence, e.turbulence), t.uniform1f(n.u_height, e.height), t.uniform1f(n.u_opacity, e.opacity), t.drawArrays(t.TRIANGLES, 0, 6), l.current = requestAnimationFrame(c);
    };
    return l.current = requestAnimationFrame(c), () => {
      cancelAnimationFrame(l.current);
    };
  }, [e]), /* @__PURE__ */ S(
    "canvas",
    {
      ref: o,
      style: {
        display: "block",
        width: "100%",
        height: "100%"
      }
    }
  );
}
export {
  I as default
};
