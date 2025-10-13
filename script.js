// 🔥 FIRE SHADER ADDON - WebGL Fire Effect
class FireShaderAddon {
    constructor() {
        this.canvas = document.getElementById('fireCanvas');
        this.gl = null;
        this.program = null;
        this.startTime = Date.now();
        this.layerId = window.MYWALLPAPER_LAYER_ID;
        this.isFirstRender = true;

        // ✅ Read pre-injected config from MyWallpaper (avoids race condition)
        const config = window.MYWALLPAPER_CONFIG || {};

        // Default settings merged with pre-injected config
        this.settings = {
            primaryColor: config.primaryColor ?? '#FF6B35',
            secondaryColor: config.secondaryColor ?? '#FF0000',
            intensity: config.intensity ?? 0.9,
            speed: config.speed ?? 0.2,
            scale: config.scale ?? 7.0,
            turbulence: config.turbulence ?? 0.9,
            height: config.height ?? 1.0,
            opacity: config.opacity ?? 1.0
        };

        this.init();
        console.log('🔥 Fire Shader initialized with config:', this.settings);
    }
    
    init() {
        console.log('🔥 Fire Shader Addon initializing...');
        this.setupWebGL();
        this.setupEventListeners();
        this.createShaderProgram();
        this.render();
    }
    
    setupEventListeners() {
        // Listen for settings updates from MyWallpaper
        window.addEventListener('message', (event) => {
            if (event.data?.type === 'SETTINGS_UPDATE' && event.data?.settings) {
                this.updateSettings(event.data.settings);
            }
        });
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.resize();
        });
    }
    
    updateSettings(newSettings) {
        console.log('🔧 Updating fire shader settings:', newSettings);
        Object.assign(this.settings, newSettings);
        // Pas besoin de recompiler les shaders, les uniforms sont mis à jour dans render()
    }
    
    setupWebGL() {
        // Configuration WebGL avec support de la transparence
        this.gl = this.canvas.getContext('webgl2', {
            alpha: true,                // Active le canal alpha pour la transparence
            premultipliedAlpha: false,  // Évite les problèmes de blending
            antialias: true            // Améliore la qualité visuelle
        });
        
        if (!this.gl) {
            console.error('WebGL2 non supporté');
            return;
        }
        
        // Activer le blending pour la transparence
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        
        // Configurer la couleur d'effacement transparente
        this.gl.clearColor(0.0, 0.0, 0.0, 0.0);
        
        this.resize();
    }
    
    resize() {
        if (!this.canvas) return;
        
        // Utiliser des dimensions normalisées pour un rendu consistent
        const dpr = window.devicePixelRatio || 1;
        const displayWidth = this.canvas.clientWidth * dpr;
        const displayHeight = this.canvas.clientHeight * dpr;
        
        if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
            this.canvas.width = displayWidth;
            this.canvas.height = displayHeight;
            
            if (this.gl) {
                this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
            }
        }
    }
    
    createShaderProgram() {
        const vertexShaderSource = `#version 300 es
            precision mediump float;
            const vec2 positions[6] = vec2[6](
                vec2(-1.0, -1.0), vec2(1.0, -1.0), vec2(-1.0, 1.0),
                vec2(-1.0, 1.0), vec2(1.0, -1.0), vec2(1.0, 1.0)
            );
            out vec2 uv;
            void main() {
                uv = positions[gl_VertexID];
                gl_Position = vec4(positions[gl_VertexID], 0.0, 1.0);
            }`;
        
        const fragmentShaderSource = `#version 300 es
            precision highp float;
            
            uniform float time;
            uniform vec2 resolution;
            uniform vec3 primaryColor;
            uniform vec3 secondaryColor;
            uniform float intensity;
            uniform float speed;
            uniform float scale;
            uniform float turbulence;
            uniform float height;
            uniform float opacity;
            
            in vec2 uv;
            out vec4 fragColor;
            
            // Générateur de nombres pseudo-aléatoires
            float random(vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
            }
            
            // Fonction de bruit basée sur Morgan McGuire
            float noise(vec2 st) {
                vec2 i = floor(st);
                vec2 f = fract(st);
                
                // Quatre coins du carré
                float a = random(i);
                float b = random(i + vec2(1.0, 0.0));
                float c = random(i + vec2(0.0, 1.0));
                float d = random(i + vec2(1.0, 1.0));
                
                // Interpolation cubique
                vec2 u = f * f * (3.0 - 2.0 * f);
                
                return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
            }
            
            // Bruit fractal (FBM - Fractional Brownian Motion)
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
                
                // Coordinates indépendantes de la résolution pour un rendu consistent
                // Le feu aura toujours la même apparence quelle que soit la taille d'écran
                
                // Correction d'aspect ratio seulement (pas d'échelle résolution)
                float aspectRatio = resolution.x / resolution.y;
                st.x *= aspectRatio;
                
                // Animation du feu avec échelle fixe - même pattern partout
                vec2 fireCoords = vec2(st.x, st.y - time * speed) * scale;
                
                // Gradient de base normalisé (évite la surexposition)
                float gradient = mix(st.y * 0.3, st.y * 0.7, fbm(fireCoords));
                
                // Première couche de bruit pour la forme du feu
                float noise1 = fbm(fireCoords);
                
                // Seconde couche avec plus de turbulence
                float noise2 = turbulence * fbm(fireCoords + noise1 + time) - 0.5;
                
                // Combinaison des bruits pour créer l'effet de flamme
                float finalNoise = turbulence * fbm(vec2(noise1, noise2));
                float fireIntensity = fbm(vec2(noise2, noise1));
                
                // Mélange des couleurs basé sur l'intensité - contrôle total des couleurs
                vec3 fireColor = mix(secondaryColor, primaryColor, fireIntensity);
                
                // Couleur finale PURE - jamais de saturation, jamais de blanc forcé
                vec3 finalColor = fireColor * intensity;  // Seulement l'intensité utilisateur
                
                // Alpha dynamique pour transparence réelle - hauteur contrôle la taille
                float fireAlpha = smoothstep(0.0, 1.0, (fireIntensity - gradient + 0.3) * height);
                
                fragColor = vec4(finalColor, fireAlpha * opacity);
            }`;
        
        // Compilation des shaders
        const vertexShader = this.compileShader(vertexShaderSource, this.gl.VERTEX_SHADER);
        const fragmentShader = this.compileShader(fragmentShaderSource, this.gl.FRAGMENT_SHADER);
        
        if (!vertexShader || !fragmentShader) return;
        
        // Création du programme shader
        this.program = this.gl.createProgram();
        this.gl.attachShader(this.program, vertexShader);
        this.gl.attachShader(this.program, fragmentShader);
        this.gl.linkProgram(this.program);
        
        if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
            console.error('Erreur de liaison du programme:', this.gl.getProgramInfoLog(this.program));
            return;
        }
        
        this.gl.useProgram(this.program);
        
        // Récupération des emplacements des uniforms
        this.uniforms = {
            time: this.gl.getUniformLocation(this.program, 'time'),
            resolution: this.gl.getUniformLocation(this.program, 'resolution'),
            primaryColor: this.gl.getUniformLocation(this.program, 'primaryColor'),
            secondaryColor: this.gl.getUniformLocation(this.program, 'secondaryColor'),
            intensity: this.gl.getUniformLocation(this.program, 'intensity'),
            speed: this.gl.getUniformLocation(this.program, 'speed'),
            scale: this.gl.getUniformLocation(this.program, 'scale'),
            turbulence: this.gl.getUniformLocation(this.program, 'turbulence'),
            height: this.gl.getUniformLocation(this.program, 'height'),
            opacity: this.gl.getUniformLocation(this.program, 'opacity')
        };
    }
    
    compileShader(source, type) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('Erreur de compilation du shader:', this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }
    
    // Conversion couleur hexadécimale vers vec3
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16) / 255,
            parseInt(result[2], 16) / 255,
            parseInt(result[3], 16) / 255
        ] : [1, 1, 1];
    }
    
    render = () => {
        if (!this.gl || !this.program) {
            requestAnimationFrame(this.render);
            return;
        }

        // Mise à jour des uniforms
        const currentTime = (Date.now() - this.startTime) / 1000;

        this.gl.uniform1f(this.uniforms.time, currentTime);
        this.gl.uniform2fv(this.uniforms.resolution, [this.canvas.width, this.canvas.height]);

        // Effacer avec transparence
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        // Conversion des couleurs
        const primaryRgb = this.hexToRgb(this.settings.primaryColor);
        const secondaryRgb = this.hexToRgb(this.settings.secondaryColor);

        this.gl.uniform3fv(this.uniforms.primaryColor, primaryRgb);
        this.gl.uniform3fv(this.uniforms.secondaryColor, secondaryRgb);

        this.gl.uniform1f(this.uniforms.intensity, this.settings.intensity);
        this.gl.uniform1f(this.uniforms.speed, this.settings.speed);
        this.gl.uniform1f(this.uniforms.scale, this.settings.scale);
        this.gl.uniform1f(this.uniforms.turbulence, this.settings.turbulence);
        this.gl.uniform1f(this.uniforms.height, this.settings.height);
        this.gl.uniform1f(this.uniforms.opacity, this.settings.opacity);

        // Rendu
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

        // ✅ Signal ADDON_READY after first frame rendered (for thumbnail generation)
        if (this.isFirstRender && this.layerId) {
            this.isFirstRender = false;
            window.parent.postMessage({
                type: 'ADDON_READY',
                layerId: this.layerId
            }, '*');
            console.log('✅ Fire shader ready signal sent');
        }

        requestAnimationFrame(this.render);
    }
    
    destroy() {
        if (this.program) {
            this.gl.deleteProgram(this.program);
        }
    }
}

// Initialisation quand le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
    window.fireShader = new FireShaderAddon();
});