# FLATLAND: ASCENSION

*A journey through the dimensions* — a browser game inspired by Edwin A. Abbott's
**Flatland: A Romance of Many Dimensions** (1884) and *Flatland: The Movie*.

You play **Arthur Square** as he climbs the dimensional ladder: 0D → 1D → 2D → 3D → 4D.
The unifying idea: in every chapter you see both the **omniscient view** and the **native
view** of that dimension's inhabitants — so you *feel* why each world cannot conceive the
one above it.

## Chapters

| # | World | What happens |
|---|-------|--------------|
| 0D | **Pointland** | A vignette: the Point that is its own universe. |
| 1D | **Lineland** | Neighbours are forever — until you step *sideways through the 2nd dimension* (SPACE) and scandalize the King. Your "retina" is two points. |
| 2D | **Flatland** | Free-roam the plane as A. Square. The bottom strip is a real-time **1D raycast** of what a Flatlander actually sees (nearness = brightness: Abbott's "recognition by fog"). Meet Hex, then receive the Sphere — a circle that swells and fades as it passes through your plane. |
| 3D | **Spaceland** | WebGL. Rise off the plane, see *inside* every house and citizen, then pass the **Rite of the Sections**: name solids from their 2D slices alone. Story rounds use Abbott's classic trio (sphere / cube-on-corner / cone); the **Endless Rite** afterwards draws from a library of eight bodies — cylinder, pyramid, tetrahedron, octahedron, and the torus (the only slice with a *hole*) — plus rounds where three **randomly generated crystals** tumble in a line-up and you pick which one (Ⓐ/Ⓑ/Ⓒ) is passing through the plane. |
| 4D | **Hyperland** | A **tesseract** under genuine 4D rotation (XW/YW/ZW plane rotations), perspective-projected 4D→3D→screen. Toggle **Slice Mode** to see its morphing 3D cross-section, run the **Ladder of Dimensions** extrusion finale, and play the **Hyper-Rite**: a 4D body (tesseract, 16-cell, glome, hyperpyramid) turns as a wireframe shadow while you pick which of three candidate 3D solids is its slice at w = 0 — with **Reveal** (watch it pass through the hyperplane) and **3D Perspectives** (picture-in-picture slices at w = −0.8 / 0 / +0.8). |

## Run

Any static file server works (ES modules require http, not file://):

```bash
./flatland.sh            # serves on http://localhost:8000
# or: python3 -m http.server 8000
```

Internet access is required on first load (Three.js + fonts come from CDN).

## Controls

- **W/S** move · **A/D** turn · **Q/E** sidestep (Flatland) — **A/D** move (Lineland)
- **SPACE / ENTER / click** advance dialogue · **SPACE** hop dimension (Lineland)
- **drag** orbit · **scroll** zoom (3D/4D chapters)
- **1–5** jump straight to any chapter · `?ch=N` URL param does the same
- 🔊 toggle in the top-right

## Tech

- **Three.js** (WebGL) via import map — no build step, plain ES modules
- Canvas2D **1D raycaster** for the Flatlander retina (ray–segment casting + distance fog)
- One generic `sliceEdges()` powers both 3D solids sliced by a plane *and* the
  4D bodies sliced by the `w = 0` hyperplane (`js/math/poly.js`); random crystals
  are convex hulls of scattered points, sliced via the same path (`extractEdges`)
- NPCs are solid: Mrs. Point halts against you in Lineland (nobody passes anybody
  in 1D), and Flatland citizens steer around — and cannot walk through — Arthur
- Real 4D math: Givens plane rotations + 4D perspective projection (`js/math/vec4.js`)
- Procedural **WebAudio** ambience: one pad chord per dimension, typewriter blips, chimes
- The same 2D world geometry (`js/world2d.js`) is walked *within* in Chapter 2 and
  rendered *from above* in Chapter 3

## Structure

```
index.html            shell + import map
css/style.css         HUD, dialogue, retina, title/end screens
js/main.js            scene manager, HUD, boot
js/dialogue.js        typewriter dialogue queue
js/audio.js           procedural sound
js/input.js           keyboard state
js/util.js            tween/until/lerp helpers
js/world2d.js         the shared 2D world (shapes, houses, wandering citizens)
js/three-setup.js     shared WebGL renderer
js/math/poly.js       raycasting, convex hull, generic edge-soup slicer
js/math/vec4.js       4D rotations, projection, n-cube generators
js/scenes/chapter0–4  one module per dimension
```
