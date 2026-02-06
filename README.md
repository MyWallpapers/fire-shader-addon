# Fire Shader Effect Add-on for MyWallpaper

Realistic animated fire effect with customizable colors and fluid dynamics. Pure WebGL2 shader with Fractal Brownian Motion.

![MyWallpaper Add-on](https://img.shields.io/badge/MyWallpaper-Add--on-purple?style=for-the-badge)
![SDK Version](https://img.shields.io/badge/SDK-2.17.1-blue?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

## Settings

### Colors
| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| Primary Color | color | `#FF6B35` | Main fire color |
| Secondary Color | color | `#FF0000` | Deep flame color |

### Motion
| Setting | Range | Default | Description |
|---------|-------|---------|-------------|
| Speed | 0 - 1 | 0.2 | Flame animation speed |

### Appearance
| Setting | Range | Default | Description |
|---------|-------|---------|-------------|
| Intensity | 0 - 2 | 0.9 | Overall fire brightness |
| Scale | 1 - 15 | 7.0 | Detail size (smaller = more details) |
| Turbulence | 0 - 2 | 0.9 | Chaos and movement level |
| Height | 0.3 - 3 | 1.0 | Vertical size of flames |
| Opacity | 0 - 1 | 1.0 | Overall transparency |

## Installation

1. Download or clone this repository
2. In MyWallpaper, go to **Add-ons** > **Install from folder**
3. Select the `fire-shader-addon` folder

## Development

```bash
npx serve . -p 3000
# In MyWallpaper: Settings > Developer > Enter http://localhost:3000 > Test
```

## Technical Details

- **WebGL2 only** (`#version 300 es`)
- **5-octave Fractal Brownian Motion** for realistic flames
- **Domain warping** for organic fire movement
- `performance.now()` for sub-millisecond timing
- Shader cleanup after linkage
- Proper lifecycle management (pause/resume/dispose)

## License

MIT License
