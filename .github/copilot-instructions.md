# GitHub Copilot Instructions for lifePAD

## Project Overview

lifePAD is a Progressive Web App (PWA) for sketching, drawing, and diagramming. It is designed as a privacy-focused, offline-first alternative to tools like Excalidraw.

### Core Technologies
- **Pure vanilla JavaScript** (ES6+) - NO frameworks, NO build tools
- **HTML5 Canvas API** - High-DPI rendering with devicePixelRatio
- **CSS3** with CSS Custom Properties for theming
- **Service Worker** for offline functionality
- **WebRTC DataChannels** for P2P collaboration
- **Web Crypto API** for end-to-end encryption

### Architecture Principles
1. **Single-file architecture**: All JavaScript in one `app.js` file wrapped in an IIFE
2. **Module pattern**: Crypto, RTC, and Sync are namespaced objects within the IIFE
3. **No external dependencies**: Zero npm packages, no CDN resources
4. **Progressive enhancement**: Core functionality works without advanced features
5. **Privacy-first**: No analytics, no tracking, no external servers

## Critical Rules

### MUST FOLLOW (Non-negotiable)

1. **NO external dependencies** - Do not add npm packages, frameworks, or libraries
2. **NO build process** - Code must run directly in the browser without compilation
3. **NO breaking changes** - Maintain backward compatibility with saved canvases
4. **NO data collection** - Never add analytics, telemetry, or external API calls
5. **Security first** - All WebRTC data must be encrypted at application layer
6. **Offline-first** - All features must work without internet connection after first load

### Code Organization

#### File Structure
```
lifepad/
├── index.html          # Main HTML (DO NOT split into components)
├── app.js              # All JavaScript (DO NOT split into modules)
├── styles.css          # All CSS (DO NOT split into files)
├── sw.js               # Service Worker (keep separate)
├── manifest.webmanifest
├── icons/
└── .github/
```

**NEVER split files** - Maintain single-file architecture for simplicity and offline reliability.

#### JavaScript Organization (within app.js)

The app.js follows this structure:
1. **IIFE wrapper** - Entire code wrapped in `(function() { 'use strict'; })();`
2. **State object** - Single source of truth for app state
3. **DOM elements** - Declared at top level
4. **Initialization** - `init()` function called on DOMContentLoaded
5. **Event handlers** - Grouped by functionality
6. **Core modules** - ColorUtils, Crypto, RTC, Sync at bottom
7. **Module pattern** - Use object literals with methods, NOT classes

## Coding Conventions

### JavaScript Style

#### Variable Naming
- `camelCase` for functions and variables
- `UPPER_SNAKE_CASE` for constants
- `PascalCase` for module names (ColorUtils, Crypto, RTC, Sync)
- Descriptive names: `isDrawingShape` not `isDraw`, `penSizeSlider` not `slider`

#### Function Style
```javascript
// CORRECT: Function declarations for top-level functions
function startDrawing(e) {
    // ...
}

// CORRECT: Arrow functions for short handlers
someElement.addEventListener('click', () => {
    doSomething();
});

// CORRECT: Object methods in modules
const Crypto = {
    encrypt(key, plaintext) {
        // ...
    }
};

// INCORRECT: Do not use classes
class DrawingTool { /* NO */ }
```

#### State Management
- Use the single `state` object for all application state
- Never create global variables outside the IIFE
- Always update state before modifying UI
- Use `localStorage` for persistence (prefix keys with `lifepad-`)

#### Canvas Operations
```javascript
// ALWAYS save/restore context when changing transform
ctx.save();
ctx.setTransform(1, 0, 0, 1, 0, 0);
// ... operations ...
ctx.restore();

// ALWAYS account for devicePixelRatio
const dpr = window.devicePixelRatio || 1;
canvas.width = cssWidth * dpr;
canvas.height = cssHeight * dpr;

// ALWAYS use world coordinates for drawing
const world = screenToWorld(screenX, screenY);
```

### HTML Conventions

1. **Semantic HTML**: Use appropriate elements (`<button>`, `<label>`, etc.)
2. **Accessibility**: Include ARIA labels, alt text, and keyboard navigation
3. **IDs for functionality**: Use IDs for JavaScript, classes for styling
4. **BEM-like classes**: `.modal-content`, `.tool-btn`, `.collab-status`

### CSS Conventions

1. **CSS Custom Properties**: Use variables for all colors, spacing, and values
2. **Mobile-first**: Design for touch/small screens, enhance for desktop
3. **Theme support**: Use `[data-theme="dark"]` selector for dark mode
4. **No preprocessors**: Pure CSS only (no SCSS, Less, etc.)
5. **Avoid `!important`**: Use specificity correctly instead

```css
/* CORRECT: Use CSS variables */
.tool-btn {
    background: var(--bg-secondary);
    color: var(--text-primary);
}

/* CORRECT: Mobile-first with media queries for desktop */
.navbar {
    flex-direction: column;
}
@media (min-width: 768px) {
    .navbar {
        flex-direction: row;
    }
}
```

## Feature Development Guidelines

### Adding New Drawing Tools

1. Add tool button in HTML navbar
2. Add tool state to `state` object
3. Implement tool activation function (`activateXTool`)
4. Add tool logic in `startDrawing`, `draw`, `stopDrawing` event handlers
5. Update `updateToolButtons` and `updateToolStatus` functions
6. Add sync support in Sync module for collaboration
7. Test with touch, mouse, and stylus input
8. Test zoom/pan compatibility

### Adding New UI Components

1. Add HTML structure in `index.html`
2. Add styles in `styles.css` with proper theming
3. Initialize DOM reference in `init()` function
4. Add event listeners in `setupEventListeners()`
5. Implement show/hide functions with proper class management
6. Test in both light and dark themes
7. Test on mobile and desktop viewports

### WebRTC/Collaboration Features

**CRITICAL**: All collaboration features must maintain end-to-end encryption

```javascript
// ALWAYS encrypt before sending
await RTC.sendEncrypted(payload);

// ALWAYS decrypt on receive
const plaintext = await Crypto.decrypt(key, ivB64, ctB64);

// NEVER send unencrypted user data
// NEVER send canvas as image - send draw events only
```

#### Sync Protocol Rules
1. Send normalized coordinates (0-1 range) for device independence
2. Send stroke events (begin/point/end), not pixel data
3. Include brush properties in stroke_begin event
4. Cache stroke_begin events for stroke_point lookup
5. Deduplicate events using ID + timestamp

### Service Worker Updates

1. Increment `CACHE_VERSION` in `sw.js`
2. Add new static assets to `STATIC_ASSETS` array
3. Test offline functionality after changes
4. Test update notification and reload flow
5. Ensure cache cleanup works correctly

## Security Best Practices

### Encryption Requirements
- Use AES-GCM with 256-bit keys
- Use PBKDF2 with 150,000 iterations for key derivation
- Generate random IV/salt using `crypto.getRandomValues()`
- Never reuse IVs
- Never log or display encryption keys

### Input Validation
```javascript
// ALWAYS validate user input
if (!passphrase || passphrase.length < 8) {
    showCollabError('Passphrase must be at least 8 characters');
    return;
}

// ALWAYS validate JSON structure
let parsed;
try {
    parsed = JSON.parse(input);
} catch (e) {
    showError('Invalid data format');
    return;
}

// ALWAYS check protocol version and type
if (parsed.app !== 'lifePAD' || parsed.v !== 1) {
    showError('Invalid protocol version');
    return;
}
```

### XSS Prevention
- Use `textContent` not `innerHTML` for user data
- Validate and sanitize all user inputs
- Use canvas drawing, not DOM manipulation for user content

## Performance Considerations

### Canvas Optimization
```javascript
// GOOD: Batch draws, minimize state changes
ctx.beginPath();
for (let i = 0; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
}
ctx.stroke();

// BAD: Individual draws with repeated state changes
for (let i = 0; i < points.length; i++) {
    ctx.beginPath();
    ctx.moveTo(points[i].x, points[i].y);
    ctx.lineTo(points[i+1].x, points[i+1].y);
    ctx.stroke();
}
```

### Memory Management
- Limit history to `maxHistory` (30 steps)
- Cap event log to `maxEvents` (1000 events)
- Clean up event listeners on component close
- Use `{ willReadFrequently: false }` for canvas contexts
- Limit processed event IDs cache size

### Pointer Events
```javascript
// ALWAYS use Pointer Events (not Touch + Mouse)
canvas.addEventListener('pointerdown', handlePointerDown);
canvas.addEventListener('pointermove', handlePointerMove);
canvas.addEventListener('pointerup', handlePointerUp);

// Track single pointer to prevent multi-touch conflicts
if (state.currentPointerId !== null && state.currentPointerId !== e.pointerId) {
    return; // Ignore other pointers
}
```

## Testing Requirements

### Before Every Commit
1. Test in Chrome, Firefox, and Safari
2. Test on mobile device (iOS or Android)
3. Test with touch, mouse, and stylus input
4. Test light and dark themes
5. Test offline functionality (disable network in DevTools)
6. Test collaboration with two browser windows
7. Verify no console errors

### Drawing Features Testing
- [ ] Draw smooth lines with all brush textures
- [ ] Pressure sensitivity works with stylus
- [ ] Undo/redo preserves drawing correctly
- [ ] Canvas autosaves to localStorage
- [ ] Export PNG includes background and drawing
- [ ] Shapes draw with correct fill and stroke
- [ ] Zoom/pan works without breaking drawing

### Collaboration Testing
- [ ] Offer/answer flow completes successfully
- [ ] Encryption handshake succeeds
- [ ] Drawing syncs in real-time
- [ ] Canvas snapshot syncs on connection
- [ ] Passphrase mismatch detected
- [ ] Disconnect/reconnect works

### PWA Testing
- [ ] Service Worker installs and activates
- [ ] App works offline after first load
- [ ] Install prompt appears on supported browsers
- [ ] iOS install instructions show on Safari
- [ ] Update notification appears on new version

## Common Patterns

### Error Handling
```javascript
// ALWAYS use try-catch for async operations
try {
    await someAsyncOperation();
} catch (error) {
    console.error('Operation failed:', error);
    showToast('Error: ' + error.message);
    // Restore UI state
}
```

### Toast Notifications
```javascript
// Use for user feedback
showToast('Canvas saved successfully');
showToast('Error: Connection failed');

// For actions with callbacks
showToast('Update available', {
    text: 'Reload',
    callback: () => window.location.reload()
});
```

### Modal Management
```javascript
// ALWAYS use consistent open/close pattern
function openModal() {
    modal.classList.remove('hidden');
}

function closeModal() {
    modal.classList.add('hidden');
    // Clean up state
}

// Add close button handler
closeBtn.addEventListener('click', closeModal);
```

## Anti-Patterns (DO NOT DO)

### ❌ Do Not Add Build Tools
```javascript
// NO npm install
// NO webpack/vite/parcel
// NO babel/typescript
// NO sass/less
```

### ❌ Do Not Add Frameworks
```javascript
// NO React/Vue/Angular
// NO jQuery
// NO Lodash/Underscore
// NO UI libraries (Bootstrap, Material, etc.)
```

### ❌ Do Not Break Single-File Architecture
```javascript
// NO: import { something } from './module.js'
// NO: <script type="module" src="...">
// YES: Everything in app.js IIFE
```

### ❌ Do Not Add Backend Dependencies
```javascript
// NO WebSocket servers
// NO REST APIs
// NO Firebase/Supabase
// NO authentication services
```

### ❌ Do Not Compromise Privacy
```javascript
// NO Google Analytics
// NO error tracking (Sentry, etc.)
// NO external font/icon CDNs
// NO social media integrations
```

## Code Review Checklist

Before submitting a PR, verify:

- [ ] No external dependencies added
- [ ] No build process required
- [ ] Single-file architecture maintained
- [ ] Works offline after first load
- [ ] No privacy violations (tracking, analytics)
- [ ] All collaboration data encrypted
- [ ] High-DPI canvas rendering correct
- [ ] Touch, mouse, and stylus all work
- [ ] Light and dark themes both work
- [ ] Mobile and desktop layouts work
- [ ] localStorage keys prefixed with `lifepad-`
- [ ] Service Worker cache updated if needed
- [ ] No console errors or warnings
- [ ] Code follows existing style conventions
- [ ] Comments added for complex logic
- [ ] Tested in Chrome, Firefox, Safari

## Version History and Compatibility

### Breaking Changes Policy
**NEVER introduce breaking changes** that would:
- Corrupt existing saved canvases
- Break collaboration protocol compatibility
- Remove core features
- Change localStorage schema without migration

### Adding Features
1. Gracefully degrade if feature not supported
2. Check for browser API availability
3. Provide fallback or informative message
4. Test on older browsers (Chrome 80+, Safari 13.1+, Firefox 75+)

### Deprecation Process
1. Mark feature as deprecated with console warning
2. Maintain functionality for 2+ versions
3. Document migration path in README
4. Remove only after adequate deprecation period

## Documentation Standards

### Code Comments
```javascript
// GOOD: Explain WHY, not WHAT
// Use non-trickle ICE to simplify signaling (no TURN server needed)
await this.waitForICEGathering();

// GOOD: Clarify complex logic
// Convert screen coordinates to world coordinates by inverting zoom and pan
const worldX = (screenX - state.panX) / state.zoom;

// BAD: State the obvious
// Set x to 5
const x = 5;
```

### README Updates
When adding features:
1. Update feature list with description
2. Add usage instructions if UI-visible
3. Update browser compatibility if needed
4. Add troubleshooting section if complex

## Emergency Procedures

### If Service Worker Breaks App
1. Increment `CACHE_VERSION` immediately
2. Clear old cache in activate event
3. Test install/activate flow thoroughly
4. Document incident in commit message

### If Collaboration Protocol Has Issues
1. Check protocol version compatibility
2. Add validation for new message types
3. Maintain backward compatibility
4. Test with older versions if possible

### If Canvas Drawing Breaks
1. Check devicePixelRatio handling
2. Verify transform save/restore pairs
3. Test zoom/pan coordinate conversion
4. Check history state restoration

## Questions to Ask Before Changing Code

1. Does this maintain offline-first functionality?
2. Does this preserve backward compatibility?
3. Does this add external dependencies? (Answer must be NO)
4. Does this compromise user privacy? (Answer must be NO)
5. Does this work with touch, mouse, AND stylus?
6. Does this work in both light and dark themes?
7. Have I tested this on mobile and desktop?
8. Does this maintain end-to-end encryption for collab?
9. Is this the simplest solution?
10. Would this confuse new contributors?

## Getting Help

If stuck:
1. Read existing code for similar patterns
2. Check browser API documentation (MDN)
3. Test in browser DevTools
4. Ask for review before major changes
5. Document assumptions in code comments

## Summary

lifePAD is intentionally simple:
- **One HTML file** - all structure
- **One CSS file** - all styles  
- **One JS file** - all logic
- **No dependencies** - works anywhere
- **No build** - edit and reload
- **No server** - completely local
- **No tracking** - respects privacy

**When in doubt, keep it simple and maintain these principles.**
