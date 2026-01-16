# lifePAD

Primary Artistry Device - A simple, mobile-first sketch pad that works with touch and stylus.

**In Memory of Shirley Parrish** - This app is dedicated to Shirley Parrish, who taught the creator how to paint, draw, and be creative. Her passion for art and design inspired this tool to promote creativity and help others express their artistic vision.

https://opensource-for-freedom.github.io/lifepad/

## What is lifePAD?

lifePAD is a Progressive Web App (PWA) that provides a clean, distraction-free drawing and diagramming experience. It works completely offline, requires no account or login, and keeps all your work on your device. Perfect for quick sketches, diagrams, note-taking, brainstorming, or artistic expression on the go.

## Features

### Drawing & Diagramming Tools
- **Multiple brush textures**: Ink, Pencil, Marker, Spray, and Charcoal
- **Rich shape library**: Rectangle, Circle, Line, Triangle, Arrow, Star, Diamond, Ellipse
- **Hand-drawn style**: Optional rough/sketch aesthetic for shapes
- **Text tool**: Add labels and annotations to your drawings
- **Selection tool**: Select and manipulate objects (coming soon: move, resize, rotate)
- Touch and stylus optimized with pressure sensitivity support
- 8 preset colors plus custom color picker
- Adjustable brush size (1-48 pixels)
- Fill shapes with solid colors
- Ruler tool for measurements

### Productivity Features
- Undo/Redo with history management (30 steps)
- Eraser tool
- Canvas autosave to localStorage
- **Export formats**: PNG and SVG
- Light and Dark theme modes
- Optional paper background (warm off-white)

### Collaboration & Privacy
- Real-time peer-to-peer collaboration with end-to-end encryption
- Works completely offline (solo mode)
- No accounts required
- No data sent to external servers
- No external dependencies or CDN usage

## How to Run Locally

1. Clone this repository:
   ```bash
   git clone https://github.com/OpenSource-For-Freedom/lifepad.git
   cd lifepad
   ```

2. Serve the files using any static web server. Examples:
   
   Using Python 3:
   ```bash
   python3 -m http.server 8000
   ```
   
   Using Node.js (http-server):
   ```bash
   npx http-server -p 8000
   ```
   
   Using PHP:
   ```bash
   php -S localhost:8000
   ```

3. Open your browser and navigate to `http://localhost:8000`

Note: The service worker requires HTTPS in production, but works with localhost for development.

## How to Deploy on GitHub Pages

1. Fork or clone this repository to your GitHub account

2. Go to your repository settings on GitHub

3. Navigate to Settings > Pages

4. Under "Source", select the branch you want to deploy (usually `main` or `master`)

5. Select the root folder `/` as the source directory

6. Click "Save"

7. GitHub will provide you with a URL like: `https://yourusername.github.io/lifepad`

8. Wait a few minutes for the deployment to complete

9. Visit your site and it should be live

The PWA will work immediately, and users can install it to their home screen.

## Collaboration Feature

lifePAD supports true peer-to-peer collaboration with manual copy/paste signaling and end-to-end encryption. No backend servers required - works entirely on GitHub Pages.

### How It Works

Two people can draw together in real-time by establishing a WebRTC connection:

1. One person hosts a session
2. Another person joins the session
3. Both use manual copy/paste to exchange connection information
4. Once connected, drawing strokes are synchronized in real-time with application-layer encryption

### Security

- Session passphrase is never transmitted
- All drawing data is encrypted using AES-GCM before being sent over the data channel
- Key derivation uses PBKDF2 with 150,000 iterations
- Transport is encrypted by WebRTC (DTLS-SRTP)
- Additional application-layer encryption ensures end-to-end privacy

### How to Use

#### Host a Session

1. Click the "Collab" button in the navbar
2. Go to the "Host Session" tab
3. Enter a strong passphrase (shared secretly with your partner)
4. Click "Create offer" - the connection data will auto-copy to clipboard
5. Send the copied text to your partner (via chat, email, etc.)
6. Wait for your partner to send back their response
7. Paste the response and click "Connect"
8. Connection will establish and you can start drawing together

#### Join a Session

1. Click the "Collab" button in the navbar
2. Go to the "Join Session" tab
3. Paste the connection data received from the host
4. Enter the same passphrase as the host
5. Click "Create answer" - your response will auto-copy to clipboard
6. Send the copied text back to the host
7. Wait for the host to complete the connection
8. Connection will establish and the canvas will sync

### Connection Status

The status indicator in the navbar shows your current connection state:

- **Disconnected**: No active collaboration session
- **Creating offer**: Host is generating connection offer
- **Waiting for answer**: Host is waiting for joiner to respond
- **Ready to join**: Joiner has received offer and is creating answer
- **Connecting**: WebRTC connection is being established
- **Connected**: WebRTC connection is active
- **Encrypted session active**: Handshake complete, ready to draw

### Technical Details

- Uses WebRTC DataChannels for peer-to-peer communication
- Manual signaling via copy/paste (no signaling server)
- Non-trickle ICE gathering for simpler blob format
- STUN servers for NAT traversal (no TURN, so some restrictive networks may not connect)
- Vector-based stroke events with normalized coordinates for cross-device support
- Automatic canvas synchronization when connection is established

### Testing Collaboration

#### Same Network Test
- Use two devices on the same WiFi network
- Or use two browser windows/tabs (for testing UI only)

#### Different Networks Test
- Use devices on different networks
- Note: Without TURN servers, connections through symmetric NATs may fail
- Most home and mobile networks should work fine

#### Passphrase Mismatch Test
- Try using different passphrases on host and joiner
- Should fail safely with "Key mismatch" error

### Troubleshooting

**Connection fails:**
- Check that both users entered the exact same passphrase
- Try again on a less restrictive network
- Some corporate or mobile networks may block WebRTC

**ICE gathering timeout:**
- Check your internet connection
- Try refreshing the page and creating a new session

**Key mismatch error:**
- Verify both users are using the exact same passphrase
- Passphrases are case-sensitive

## How to Install as a PWA

lifePAD is a Progressive Web App (PWA) that can be installed on your device like a native app. Once installed, it works offline and provides a fullscreen app experience.

### On iOS (iPhone/iPad)

1. Open the lifePAD website in Safari (https://opensource-for-freedom.github.io/lifepad/)
2. Tap the **Share** button at the bottom of Safari (square with arrow pointing up)
3. Scroll down and tap **"Add to Home Screen"**
4. Edit the name if desired, then tap **"Add"**
5. The lifePAD icon will appear on your home screen
6. Launch it like any other app - it will open in fullscreen mode without Safari's UI

**Note:** The Install button in the app will show instructions specific to iOS when clicked.

### On Android (Chrome)

1. Open the lifePAD website in Chrome (https://opensource-for-freedom.github.io/lifepad/)
2. Look for the **"Install"** button in the app's toolbar (or Chrome may show a prompt automatically)
3. Click **"Install"** and confirm
4. Alternatively, tap the three-dot menu and select **"Add to Home screen"** or **"Install app"**
5. The lifePAD icon will appear in your app drawer and home screen
6. Launch it like any other app

### On Desktop (Chrome/Edge/Opera)

1. Open the lifePAD website in your browser (https://opensource-for-freedom.github.io/lifepad/)
2. Look for the **"Install"** button in the app's toolbar
3. Click it to install, or look for the install icon in the address bar (computer icon or plus sign)
4. Click and confirm the installation
5. The app will open in its own window
6. Access it from your Start menu (Windows), Applications folder (Mac), or app launcher (Linux)

**Tip:** Once installed, lifePAD launches in standalone mode without browser chrome for a clean, app-like experience.

## Offline Behavior

Once you've loaded lifePAD at least once:

- **Works completely offline**: All drawing features work without internet
- **App shell cached**: The app loads instantly from cache
- **Automatic updates**: When online, the app checks for updates and shows an "Update available" prompt
- **Manual refresh**: Click "Reload" in the update prompt to get the latest version
- **Your drawings persist**: All work is saved locally in your browser's storage

### What Gets Cached

- App shell (HTML, CSS, JavaScript)
- Icons and manifest
- All static assets needed to run

### Update Behavior

- **Network-first for HTML**: The app checks for HTML updates when online
- **Cache-first for assets**: CSS, JS, and images load from cache for speed
- **User-controlled updates**: You decide when to reload for updates (via prompt)
- **Seamless transition**: Updates download in background, apply on reload

## PWA Features

- **Installable**: Add to home screen on mobile or install on desktop
- **Offline-first**: Works without internet after first visit
- **Fast loading**: Cached assets load instantly
- **Standalone mode**: Runs in its own window without browser UI
- **iOS support**: Full Add to Home Screen support on iOS Safari
- **Android support**: Full PWA install support on Chrome
- **Desktop support**: Install on Windows, Mac, and Linux via Chrome/Edge

## Browser Support for PWA Features

### Full PWA Support
- Chrome 80+ (Android, Windows, Mac, Linux)
- Edge 80+ (Windows, Mac, Linux)
- Opera 67+
- Samsung Internet 12+

### Add to Home Screen Support
- Safari 13.1+ (iOS)
- Safari 14+ (macOS)

## Why Choose lifePAD?

### A Tool for Creativity and Design
lifePAD is built to promote creativity and artistic expression:
- **Express yourself freely**: Multiple brush textures for artistic expression
- **Hand-drawn aesthetic**: Create diagrams with a natural, sketch-like feel
- **Pressure-sensitive stylus support**: Perfect for tablets and digital artists
- **Versatile shapes**: Rich library for both technical diagrams and creative designs
- **Text annotations**: Label and annotate your creations
- **Export flexibility**: Save as PNG or SVG for any use
- **Collaborate in real-time**: Share creativity with others
- **Privacy-focused**: Your art stays yours, with end-to-end encryption
- **Offline-first PWA**: Create anywhere, anytime
- **No accounts required**: Just open and start creating
- **Built-in dark mode**: Easy on the eyes during late-night creative sessions
- **Open source and free**: Built for the community

## Privacy and Data

lifePAD respects your privacy:

- All drawings are saved locally on your device using localStorage
- No data is sent to any server or third party
- No analytics or tracking
- No account required
- No internet connection needed after initial load
- Your drawings stay with you

## Known Limitations

- History is capped at 30 undo/redo steps to manage memory usage
- localStorage has a size limit (typically 5-10MB depending on browser)
- Very large or complex drawings may approach this limit
- Clearing browser data will erase saved drawings
- Service worker cache may need manual clearing after major updates

## Technical Details

- Pure HTML, CSS, and JavaScript - no frameworks or external dependencies
- Uses Pointer Events API for universal input support
- High-DPI canvas rendering for crisp lines on all displays
- Responsive design that adapts to any screen size
- Progressive Web App with offline support
- Service Worker caching for instant loading

## Browser Support

lifePAD works on all modern browsers:

- Chrome/Edge 80+
- Safari 13.1+
- Firefox 75+
- Opera 67+
- Samsung Internet 12+

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

This project is open source and available under the MIT License.

## Credits

**In Memory of Shirley Parrish** - This app is dedicated to Shirley Parrish, who inspired a love of painting, drawing, and creativity in the creator. Her legacy lives on through this tool that helps others explore their artistic vision.

Created for freedom-focused open source initiatives. Built with accessibility, privacy, and creativity in mind.
