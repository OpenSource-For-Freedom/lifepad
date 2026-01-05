# GitHub Copilot Instructions for lifePAD

## Project Overview

lifePAD is a Progressive Web App (PWA) for drawing, sketching, and diagramming. It is a privacy-first, offline-capable, framework-free application that works completely on the client side with optional peer-to-peer collaboration.

**Core Philosophy:**
- Privacy-first: No data sent to external servers unless explicitly authorized by user
- Offline-first: Full functionality without internet connection
- Zero external dependencies: Pure vanilla JavaScript, HTML, and CSS
- Security-focused: End-to-end encryption for collaboration features
- Accessibility: Touch, mouse, and stylus support with pressure sensitivity
- Performance: High-DPI canvas rendering, efficient caching

## Technology Stack

### Strictly Prohibited
- **NO frameworks** (React, Vue, Angular, etc.)
- **NO libraries** (jQuery, Lodash, etc.)
- **NO CDN dependencies**
- **NO npm/package managers** (this is a pure static site)
- **NO build tools** (Webpack, Rollup, etc.)
- **NO TypeScript** (pure JavaScript only)
- **NO CSS preprocessors** (SASS, LESS)
- **NO external API calls** except for WebRTC STUN servers

### Allowed Technologies
- Pure HTML5
- Pure CSS3 (with CSS Variables for theming)
- Pure JavaScript (ES6+ features)
- Canvas API (2D context)
- Web Crypto API (for encryption)
- WebRTC API (for P2P collaboration)
- Service Worker API (for PWA)
- Pointer Events API (for input)
- localStorage (for data persistence)

## File Structure

```
/
├── index.html          - Main HTML structure, UI layout
├── app.js              - Main application logic (~3200 lines)
├── styles.css          - All styling with CSS variables (~1300 lines)
├── sw.js               - Service Worker for PWA (~117 lines)
├── manifest.webmanifest - PWA manifest
├── icons/              - App icons
├── favicon.png         - Favicon
└── .github/
    ├── workflows/
    │   └── deploy.yml  - GitHub Pages deployment
    └── copilot-instructions.md - This file
```

**DO NOT create additional JavaScript or CSS files.** Keep all application logic in `app.js` and all styles in `styles.css`.

## Coding Standards

### JavaScript Style

#### Strict Mode
**ALWAYS** use strict mode:
```javascript
(function() {
    'use strict';
    // Your code here
})();
```

#### Module Pattern
All code must be wrapped in IIFE (Immediately Invoked Function Expression) to avoid polluting global scope:
```javascript
(function() {
    'use strict';
    // Module code
})();
```

#### Naming Conventions
- **Variables and functions**: camelCase
  - Examples: `currentColor`, `setupCanvas()`, `drawInk()`
- **Constants**: UPPER_SNAKE_CASE
  - Examples: `CACHE_VERSION`, `BUTTON_RESET_DELAY`, `ICE_GATHERING_TIMEOUT`
- **Module objects**: PascalCase
  - Examples: `ColorUtils`, `Crypto`, `RTC`, `Sync`
- **DOM element variables**: descriptive camelCase
  - Examples: `bgCanvas`, `drawCanvas`, `customColorPicker`, `brushTextureSelect`
- **CSS classes**: kebab-case
  - Examples: `color-swatch`, `tool-btn`, `intro-overlay`

#### State Management
Use a single state object for application state:
```javascript
const state = {
    currentColor: '#000000',
    currentSize: 4,
    currentTexture: 'ink',
    isEraser: false,
    // ... more state properties
};
```

- **DO NOT** scatter state across multiple objects
- Keep state centralized and predictable
- Use descriptive property names

#### Function Organization
Functions should be organized by category with clear comment headers:
```javascript
// ============================================
// MODULE NAME - Brief description
// ============================================

const ModuleName = {
    method1() {
        // Implementation
    },
    
    method2() {
        // Implementation
    }
};

// ============================================
// SECTION NAME
// ============================================

function regularFunction() {
    // Implementation
}
```

#### Comments
- Use `//` for single-line comments
- Add clear section headers for major modules (see above)
- Comment complex algorithms or non-obvious logic
- DO NOT over-comment obvious code
- Include JSDoc-style comments for public API functions in modules

Example:
```javascript
// Convert screen coordinates to world coordinates
function screenToWorld(screenX, screenY) {
    // screenX, screenY are relative to canvas (from clientX - rect.left)
    // Convert to world coordinates by inverting zoom and pan
    return {
        x: (screenX - state.panX) / state.zoom,
        y: (screenY - state.panY) / state.zoom
    };
}
```

#### Event Listeners
- Use named functions for event handlers (not inline arrow functions)
- Clean up event listeners when appropriate
- Use Pointer Events API for all input handling (not mouse/touch events)

Example:
```javascript
function setupEventListeners() {
    startBtn.addEventListener('click', closeIntro);
    drawCanvas.addEventListener('pointerdown', startDrawing);
    drawCanvas.addEventListener('pointermove', draw);
    drawCanvas.addEventListener('pointerup', stopDrawing);
}
```

#### Error Handling
- Use try-catch blocks for async operations and crypto operations
- Provide user-friendly error messages
- Log errors to console for debugging
- Show errors in the UI using `showToast()` or `showCollabError()`

Example:
```javascript
try {
    const encrypted = await Crypto.encrypt(key, data);
    // Success
} catch (error) {
    console.error('Encryption error:', error);
    showToast('Encryption failed. Please try again.');
}
```

#### Async/Await
- Prefer async/await over .then() chains
- Always handle errors with try-catch
- Mark functions async only when they use await

```javascript
async function createOffer(passphrase) {
    try {
        this.encryptionKey = await Crypto.deriveKey(passphrase, this.salt);
        const offer = await this.peerConnection.createOffer();
        return offer;
    } catch (error) {
        console.error('Create offer failed:', error);
        throw error;
    }
}
```

### CSS Style

#### CSS Variables
Use CSS variables for all theme-related colors:
```css
:root {
    --bg-primary: #e8e8e8;
    --text-primary: #2c2c2c;
    --border-color: #cccccc;
    /* ... */
}

[data-theme="dark"] {
    --bg-primary: #1a1a1a;
    --text-primary: #cccccc;
    /* ... */
}
```

**ALWAYS** use CSS variables for colors, never hardcode colors in component styles.

#### Naming
- Use kebab-case for all class names
- Use descriptive, semantic names
- Prefix utility classes appropriately

Examples:
- `.color-swatch`, `.tool-btn`, `.intro-overlay`
- `.hidden`, `.active`, `.disabled`

#### Structure
Organize CSS in logical sections:
1. CSS Variables
2. Reset and base styles
3. Layout components
4. UI components
5. Utility classes
6. Responsive adjustments

#### Responsive Design
- Use viewport units (vh, vw) for full-screen layouts
- Use flexbox for layout
- Add media queries at the end of the file
- Ensure touch-friendly hit targets (minimum 44px)

### HTML Style

#### Structure
- Use semantic HTML5 elements
- Keep structure clean and logical
- Use `data-*` attributes for storing element-specific data
- Add descriptive `id` and `class` attributes

#### Accessibility
- Add `title` attributes to buttons for tooltips
- Use proper `label` elements for inputs
- Ensure keyboard navigation works
- Use `aria-*` attributes where appropriate

Example:
```html
<button id="save-btn" class="tool-btn primary" title="Save as PNG">Save PNG</button>
```

## Architecture Patterns

### Canvas Architecture
The app uses a **three-layer canvas system**:

1. **bgCanvas**: Background layer (paper texture, imported background images)
2. **drawCanvas**: Main drawing layer (strokes, shapes, text)
3. **overlayCanvas**: Temporary preview layer (shape preview while drawing)

**Rules:**
- Background canvas does NOT use zoom/pan transforms
- Drawing and overlay canvases use zoom/pan transforms
- All canvases support high-DPI rendering with `devicePixelRatio`
- Always use world coordinates for drawing logic, convert from screen coordinates

```javascript
// CORRECT: Convert screen to world coordinates
const world = screenToWorld(screenX, screenY);
ctx.beginPath();
ctx.arc(world.x, world.y, radius, 0, Math.PI * 2);

// WRONG: Using screen coordinates directly
ctx.arc(screenX, screenY, radius, 0, Math.PI * 2); // Will be wrong with zoom/pan
```

### State Persistence
- Canvas state saved to localStorage on every stroke end
- User preferences saved to localStorage on change
- Use keys prefixed with `lifepad-`
  - `lifepad-canvas`: Canvas drawing data
  - `lifepad-theme`: Theme preference
  - `lifepad-hue-shift`: Hue shift value
  - `lifepad-intro-hidden`: Intro overlay preference

### PWA Service Worker
- Cache-first strategy for assets (CSS, JS, images)
- Network-first strategy for HTML (to get updates)
- Cache version bump requires updating `CACHE_VERSION` in `sw.js`
- Service worker must be registered in `app.js`

### WebRTC Collaboration
The collaboration feature uses:
- **WebRTC DataChannel** for P2P communication
- **Manual signaling** via copy/paste (no signaling server)
- **Non-trickle ICE** gathering (simpler, one blob exchange)
- **End-to-end encryption** using Web Crypto API
  - PBKDF2 key derivation (150,000 iterations)
  - AES-GCM encryption
  - Application-layer encryption on top of WebRTC encryption

**Module structure:**
- `Crypto` module: Encryption utilities
- `RTC` module: WebRTC connection management
- `Sync` module: Canvas synchronization protocol

## Security Requirements

### Encryption Standards
**ALWAYS** use these encryption parameters:
- Key derivation: PBKDF2 with SHA-256, 150,000 iterations
- Encryption: AES-GCM with 256-bit keys
- IV: 12 bytes (96 bits) generated with `crypto.getRandomValues()`
- Salt: 16 bytes (128 bits) generated with `crypto.getRandomValues()`

```javascript
// CORRECT
const key = await crypto.subtle.deriveKey(
    {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations: 150000,
        hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
);
```

**DO NOT:**
- Reduce iteration counts
- Use weaker encryption algorithms
- Log encryption keys or passphrases
- Send unencrypted data over WebRTC

### Privacy Requirements
**NEVER:**
- Send user data to external servers without explicit user action
- Add analytics or tracking
- Store user data in cookies
- Use third-party services that collect data
- Log sensitive information (passphrases, keys, canvas data)

**ALWAYS:**
- Keep all data in localStorage (client-side only)
- Encrypt collaboration data end-to-end
- Provide clear user feedback for network operations
- Allow users to disconnect and clear data

### Content Security
**NEVER:**
- Use `eval()` or `Function()` constructor
- Use `innerHTML` with user-provided content (XSS risk)
- Allow script injection in canvas text or imported images

**ALWAYS:**
- Sanitize user inputs
- Use `textContent` instead of `innerHTML` for user data
- Validate imported file types

## Feature Implementation Guidelines

### Adding New Drawing Tools
When adding a new brush texture or drawing tool:

1. Add UI control in the appropriate navbar section
2. Add state property if needed
3. Implement drawing function following existing patterns:
```javascript
function drawNewTexture(x1, y1, x2, y2, size) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = state.currentColor;
    ctx.lineWidth = size;
    ctx.globalAlpha = 0.8; // Adjust for texture
    
    // Drawing logic
}
```
4. Add to switch statement in `draw()` function
5. Ensure pressure sensitivity is supported
6. Add sync protocol support if needed for collaboration

### Adding New Shapes
When adding a new shape type:

1. Add button to shapes panel in `index.html`
2. Add shape type to `activeShape` state documentation
3. Implement drawing function:
```javascript
function drawNewShape(x1, y1, x2, y2) {
    ctx.beginPath();
    // Shape path logic
    if (state.shapeFill) {
        ctx.fillStyle = state.currentColor;
        ctx.fill();
    }
    ctx.strokeStyle = state.currentColor;
    ctx.lineWidth = 2;
    ctx.stroke();
}
```
4. Add to shape preview in `draw()` (overlay canvas)
5. Add to `drawShapeFinal()` switch statement
6. Optionally add rough/hand-drawn variant if `shapeHandDrawn` is true

### Adding New UI Features
When adding new UI elements:

1. Add HTML structure in appropriate section
2. Add styling in `styles.css` using existing patterns and CSS variables
3. Get DOM element reference in `init()`
4. Set up event listeners in `setupEventListeners()`
5. Implement handler functions
6. Save preferences to localStorage if persistent
7. Ensure mobile-responsive design
8. Test with touch, mouse, and keyboard

### Modifying Collaboration Protocol
**WARNING:** Changes to the sync protocol break compatibility.

If you must change the protocol:
1. Increment protocol version number
2. Document breaking changes
3. Add version checking
4. Test thoroughly with both host and joiner roles
5. Verify encryption still works correctly

## Testing Requirements

### Manual Testing Checklist
Before any PR, verify:

**Drawing Features:**
- [ ] All brush textures work (ink, pencil, marker, spray, charcoal)
- [ ] Eraser works correctly
- [ ] All shapes draw correctly (rectangle, circle, line, arrow, etc.)
- [ ] Fill and rough/hand-drawn styles work
- [ ] Text tool works
- [ ] Color selection works (swatches and custom picker)
- [ ] Hue shift works correctly
- [ ] Pen size adjustment works
- [ ] Pressure sensitivity works (if testing device supports it)

**Canvas Features:**
- [ ] Undo/Redo works correctly
- [ ] Clear canvas works
- [ ] Zoom in/out/reset works
- [ ] Pan tool works
- [ ] Canvas autosave works (refresh page and check)
- [ ] Export PNG works
- [ ] Export SVG works
- [ ] Import background image works
- [ ] Ruler tool works

**UI/UX:**
- [ ] Theme toggle works (light/dark)
- [ ] Paper background toggle works
- [ ] Intro overlay shows/hides correctly
- [ ] All tooltips are present and accurate
- [ ] Mobile responsive layout works
- [ ] Touch input works on mobile
- [ ] Tools menu dropdown works

**PWA Features:**
- [ ] Service worker registers correctly
- [ ] App works offline after first load
- [ ] App can be installed (test on Chrome)
- [ ] Update notification shows when new version available

**Collaboration Features:**
- [ ] Host session creates offer
- [ ] Join session creates answer
- [ ] Connection establishes successfully
- [ ] Drawing syncs in real-time
- [ ] Encryption/decryption works (verify with correct and incorrect passphrases)
- [ ] Disconnect works
- [ ] Status indicators update correctly
- [ ] Error messages show for failures

**Cross-browser Testing:**
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari (iOS and macOS)

### Performance Testing
- Canvas should render at 60fps on modern devices
- No memory leaks (check DevTools)
- localStorage usage stays under 5MB for typical drawings
- Service worker cache stays reasonable (~1MB)

## Common Pitfalls to Avoid

### 1. Coordinate Systems
**WRONG:**
```javascript
// Using screen coordinates directly
ctx.arc(e.clientX, e.clientY, 10, 0, Math.PI * 2);
```

**CORRECT:**
```javascript
// Convert to world coordinates
const rect = drawCanvas.getBoundingClientRect();
const screenX = e.clientX - rect.left;
const screenY = e.clientY - rect.top;
const world = screenToWorld(screenX, screenY);
ctx.arc(world.x, world.y, 10, 0, Math.PI * 2);
```

### 2. Canvas Transform
**WRONG:**
```javascript
// Forgetting to apply transform after resize
canvas.width = newWidth;
canvas.height = newHeight;
// Drawing now broken!
```

**CORRECT:**
```javascript
canvas.width = newWidth;
canvas.height = newHeight;
applyDrawTransform(); // Reapply zoom/pan transform
```

### 3. High-DPI Rendering
**WRONG:**
```javascript
canvas.width = containerWidth;
canvas.height = containerHeight;
// Blurry on high-DPI displays!
```

**CORRECT:**
```javascript
const dpr = window.devicePixelRatio || 1;
canvas.width = containerWidth * dpr;
canvas.height = containerHeight * dpr;
canvas.style.width = containerWidth + 'px';
canvas.style.height = containerHeight + 'px';
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
```

### 4. Event Listener Memory Leaks
**WRONG:**
```javascript
function setupTempFeature() {
    document.addEventListener('pointermove', handler);
    // Never removed!
}
```

**CORRECT:**
```javascript
function setupTempFeature() {
    document.addEventListener('pointermove', handler);
}

function cleanupTempFeature() {
    document.removeEventListener('pointermove', handler);
}
```

### 5. Pointer Events
**WRONG:**
```javascript
// Using separate mouse and touch events
canvas.addEventListener('mousedown', handler);
canvas.addEventListener('touchstart', handler);
```

**CORRECT:**
```javascript
// Use Pointer Events API (unified)
canvas.addEventListener('pointerdown', handler);
```

### 6. External Dependencies
**WRONG:**
```javascript
import roughjs from 'rough-js'; // NO!
import { compress } from 'lz-string'; // NO!
```

**CORRECT:**
```javascript
// Implement rough/hand-drawn algorithm yourself
function drawRoughRectangle(x, y, width, height) {
    // Custom implementation
}
```

## Deployment

### GitHub Pages
The app is deployed to GitHub Pages automatically on push to `Primary` branch.

**Requirements:**
- All files must be static
- No build step
- Service worker must work with GitHub Pages URL structure
- Manifest must have correct paths

### Testing Deployment
1. Serve locally: `python3 -m http.server 8000`
2. Open: `http://localhost:8000`
3. Test all features
4. Check service worker in DevTools
5. Test PWA installation

## Documentation Standards

### Code Documentation
- Document public APIs with clear comments
- Explain complex algorithms
- Add inline comments for non-obvious logic
- Keep comments up-to-date with code changes

### README Updates
When adding features, update README.md sections:
- Features list
- How to use
- Known limitations
- Browser support

### Commit Messages
Use clear, descriptive commit messages:
- `feat: Add charcoal brush texture`
- `fix: Correct zoom transform on canvas resize`
- `refactor: Simplify shape drawing logic`
- `docs: Update collaboration setup instructions`
- `style: Fix CSS variable naming consistency`

## AI Coding Assistant Guidelines

When using GitHub Copilot or similar tools:

### DO:
- ✅ Accept suggestions for repetitive code patterns
- ✅ Use for boilerplate event listener setup
- ✅ Use for similar shape drawing functions
- ✅ Use for CSS styling with existing patterns
- ✅ Use for error handling try-catch blocks
- ✅ Review and understand all accepted suggestions

### DO NOT:
- ❌ Accept suggestions that import external libraries
- ❌ Accept framework-specific code (React, Vue, etc.)
- ❌ Accept suggestions that use build tools or npm
- ❌ Accept code that violates privacy principles
- ❌ Accept code that weakens encryption
- ❌ Accept code without understanding it first
- ❌ Accept code that adds unnecessary complexity

### When in Doubt:
1. Check existing codebase for similar patterns
2. Follow the established architecture
3. Prioritize simplicity and maintainability
4. Keep dependencies at zero
5. Preserve privacy-first principles

## Version History and Breaking Changes

### Current Version: v3 (Service Worker Cache Version)

**Breaking changes require:**
1. Version bump in service worker
2. Testing with previous version
3. Update notification to users
4. Documentation updates

### Collaboration Protocol Version: 1

**Changes to protocol require:**
1. Version increment in offer/answer blobs
2. Backward compatibility or clear migration path
3. Extensive testing of both roles (host and joiner)

## Performance Optimization Guidelines

### Canvas Rendering
- Use `requestAnimationFrame` for animations
- Minimize canvas clears (use layered canvases)
- Cache frequently used calculations
- Use `willReadFrequently: false` context option (we don't read pixels often)

### Memory Management
- Cap history to 30 steps (already implemented)
- Clear old canvases when resizing
- Clean up event listeners
- Monitor localStorage size

### Network (WebRTC)
- Use `ordered: true` for data channel (already implemented)
- Batch sync events when possible
- Compress large canvas syncs (already implemented with selective sync)

## Support and Maintenance

### Browser Compatibility
**Minimum supported versions:**
- Chrome/Edge 80+
- Safari 13.1+
- Firefox 75+
- Opera 67+
- Samsung Internet 12+

**If a feature doesn't work in a supported browser:**
1. Add feature detection
2. Provide graceful degradation
3. Show user-friendly message if feature unavailable

### Backwards Compatibility
- localStorage format should remain stable
- Service worker should clean old caches
- Collaboration protocol must handle version mismatches

## Final Reminders

🔐 **Security First**: All collaboration data is encrypted end-to-end.

🔒 **Privacy First**: No data leaves the device without explicit user action.

🚫 **Zero Dependencies**: No npm, no CDN, no frameworks. Pure web platform.

⚡ **Performance Matters**: 60fps canvas rendering, instant offline loading.

📱 **Mobile First**: Touch-optimized, pressure-sensitive, responsive design.

♿ **Accessibility**: Keyboard navigation, screen reader support, high contrast themes.

✨ **User Experience**: Simple, clean, distraction-free interface.

---

**When writing code for lifePAD, always ask yourself:**
1. Does this add external dependencies? (If yes, STOP)
2. Does this send data externally? (If yes, require explicit user consent)
3. Does this work offline? (If no, make it work offline or gracefully degrade)
4. Is this simple enough? (Favor simplicity over cleverness)
5. Would this pass a security audit? (Verify encryption and privacy)

**Remember:** lifePAD is a tool for freedom. Keep it simple, private, and accessible to all.
