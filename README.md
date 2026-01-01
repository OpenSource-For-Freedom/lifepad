# lifePAD

Primary Artistry Device - A simple, mobile-first sketch pad that works with touch and stylus.

https://opensource-for-freedom.github.io/lifepad/

## What is lifePAD?

lifePAD is a Progressive Web App (PWA) that provides a clean, distraction-free drawing experience. It works completely offline, requires no account or login, and keeps all your work on your device. Perfect for quick sketches, note-taking, or artistic expression on the go.

## Features

- Touch and stylus optimized with pressure sensitivity support
- Multiple brush textures: Ink, Pencil, Marker, Spray, and Charcoal
- 8 preset colors plus custom color picker
- Adjustable brush size (1-48 pixels)
- Undo/Redo with history management
- Eraser tool
- Canvas autosave to localStorage
- Save drawings as PNG images
- Light and Dark theme modes
- Optional paper background (warm off-white)
- Works completely offline
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

## How to Install as a PWA

### On iOS (iPhone/iPad)

1. Open the lifePAD website in Safari
2. Tap the Share button (square with arrow pointing up)
3. Scroll down and tap "Add to Home Screen"
4. Edit the name if desired, then tap "Add"
5. The lifePAD icon will appear on your home screen
6. Launch it like any other app - it will open in fullscreen mode

### On Android

1. Open the lifePAD website in Chrome
2. Tap the three-dot menu in the top right
3. Select "Add to Home screen" or "Install app"
4. Confirm the installation
5. The lifePAD icon will appear in your app drawer and home screen
6. Launch it like any other app

### On Desktop (Chrome/Edge)

1. Open the lifePAD website
2. Look for the install icon in the address bar (plus sign or computer icon)
3. Click it and confirm the installation
4. The app will open in its own window
5. Access it from your Start menu or Applications folder

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

Created for freedom-focused open source initiatives. Built with accessibility and privacy in mind.
