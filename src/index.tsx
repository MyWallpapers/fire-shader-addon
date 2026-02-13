import { useSettings, useViewport } from '@mywallpaper/sdk-react'
import { useRef, useEffect } from 'react'

interface Settings {
  primaryColor: string
  secondaryColor: string
  intensity: number
  speed: number
  scale: number
  turbulence: number
  height: number
  opacity: number
}

const VERTEX_SHADER = `#version 300 es
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
`

const FRAGMENT_SHADER = `#version 300 es
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
`

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i.exec(hex)
  return result
    ? [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255,
      ]
    : [1, 1, 1]
}

function compileShader(gl: WebGL2RenderingContext, source: string, type: number): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

function createProgram(gl: WebGL2RenderingContext): WebGLProgram | null {
  const vertexShader = compileShader(gl, VERTEX_SHADER, gl.VERTEX_SHADER)
  const fragmentShader = compileShader(gl, FRAGMENT_SHADER, gl.FRAGMENT_SHADER)
  if (!vertexShader || !fragmentShader) return null

  const program = gl.createProgram()
  if (!program) return null

  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link failed:', gl.getProgramInfoLog(program))
    gl.deleteProgram(program)
    gl.deleteShader(vertexShader)
    gl.deleteShader(fragmentShader)
    return null
  }

  gl.detachShader(program, vertexShader)
  gl.deleteShader(vertexShader)
  gl.detachShader(program, fragmentShader)
  gl.deleteShader(fragmentShader)

  return program
}

interface Uniforms {
  u_time: WebGLUniformLocation | null
  u_resolution: WebGLUniformLocation | null
  u_primaryColor: WebGLUniformLocation | null
  u_secondaryColor: WebGLUniformLocation | null
  u_intensity: WebGLUniformLocation | null
  u_speed: WebGLUniformLocation | null
  u_scale: WebGLUniformLocation | null
  u_turbulence: WebGLUniformLocation | null
  u_height: WebGLUniformLocation | null
  u_opacity: WebGLUniformLocation | null
}

function getUniforms(gl: WebGL2RenderingContext, program: WebGLProgram): Uniforms {
  return {
    u_time: gl.getUniformLocation(program, 'u_time'),
    u_resolution: gl.getUniformLocation(program, 'u_resolution'),
    u_primaryColor: gl.getUniformLocation(program, 'u_primaryColor'),
    u_secondaryColor: gl.getUniformLocation(program, 'u_secondaryColor'),
    u_intensity: gl.getUniformLocation(program, 'u_intensity'),
    u_speed: gl.getUniformLocation(program, 'u_speed'),
    u_scale: gl.getUniformLocation(program, 'u_scale'),
    u_turbulence: gl.getUniformLocation(program, 'u_turbulence'),
    u_height: gl.getUniformLocation(program, 'u_height'),
    u_opacity: gl.getUniformLocation(program, 'u_opacity'),
  }
}

export default function FireShaderWidget() {
  const settings = useSettings<Settings>()
  const { width, height } = useViewport()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const glRef = useRef<WebGL2RenderingContext | null>(null)
  const programRef = useRef<WebGLProgram | null>(null)
  const uniformsRef = useRef<Uniforms | null>(null)
  const rafRef = useRef<number>(0)
  const startTimeRef = useRef<number>(performance.now())

  // Initialize WebGL2
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: false,
      antialias: true,
    })

    if (!gl) {
      console.error('WebGL2 not supported')
      return
    }

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    gl.clearColor(0.0, 0.0, 0.0, 0.0)

    const program = createProgram(gl)
    if (!program) return

    gl.useProgram(program)

    glRef.current = gl
    programRef.current = program
    uniformsRef.current = getUniforms(gl, program)

    return () => {
      cancelAnimationFrame(rafRef.current)
      if (gl && program) {
        gl.deleteProgram(program)
      }
      const ext = gl.getExtension('WEBGL_lose_context')
      if (ext) ext.loseContext()
      glRef.current = null
      programRef.current = null
      uniformsRef.current = null
    }
  }, [])

  // Handle resize
  useEffect(() => {
    const canvas = canvasRef.current
    const gl = glRef.current
    if (!canvas || !gl) return

    const dpr = window.devicePixelRatio || 1
    const w = width * dpr
    const h = height * dpr

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
      gl.viewport(0, 0, w, h)
    }
  }, [width, height])

  // Render loop with settings updates
  useEffect(() => {
    const gl = glRef.current
    const program = programRef.current
    const uniforms = uniformsRef.current
    const canvas = canvasRef.current
    if (!gl || !program || !uniforms || !canvas) return

    const render = () => {
      const currentTime = (performance.now() - startTimeRef.current) / 1000

      gl.clear(gl.COLOR_BUFFER_BIT)

      gl.uniform1f(uniforms.u_time, currentTime)
      gl.uniform2fv(uniforms.u_resolution, [canvas.width, canvas.height])

      gl.uniform3fv(uniforms.u_primaryColor, hexToRgb(settings.primaryColor))
      gl.uniform3fv(uniforms.u_secondaryColor, hexToRgb(settings.secondaryColor))

      gl.uniform1f(uniforms.u_intensity, settings.intensity)
      gl.uniform1f(uniforms.u_speed, settings.speed)
      gl.uniform1f(uniforms.u_scale, settings.scale)
      gl.uniform1f(uniforms.u_turbulence, settings.turbulence)
      gl.uniform1f(uniforms.u_height, settings.height)
      gl.uniform1f(uniforms.u_opacity, settings.opacity)

      gl.drawArrays(gl.TRIANGLES, 0, 6)

      rafRef.current = requestAnimationFrame(render)
    }

    rafRef.current = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(rafRef.current)
    }
  }, [settings])

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
      }}
    />
  )
}
