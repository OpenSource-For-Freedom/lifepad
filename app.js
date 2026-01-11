// lifePAD - Primary Artistry Device
// Drawing app with touch/stylus support, PWA capabilities, and offline functionality

(function() {
    'use strict';

    // App state
    const state = {
        currentColor: '#000000',
        baseColor: '#000000', // Store the base color before hue shift (initialized to match currentColor)
        hueShift: 0, // Hue shift in degrees (-180 to 180)
        currentSize: 4,
        currentTexture: 'ink',
        isEraser: false,
        isDrawing: false,
        lastX: 0,
        lastY: 0,
        history: [],
        historyStep: -1,
        maxHistory: 30,
        paperMode: false,
        theme: 'light',
        activeTool: 'brush', // 'brush', 'eraser', 'select', 'text', 'shape', 'pan'
        activeShape: null, // 'rectangle', 'circle', 'ellipse', 'line', 'arrow', 'triangle', 'diamond', 'star'
        shapeFill: false,
        shapeHandDrawn: false,
        isDrawingShape: false,
        shapeStartX: 0,
        shapeStartY: 0,
        selectedObject: null,
        objects: [], // Array of drawable objects (shapes, text)
        textX: 0,
        textY: 0,
        currentPointerId: null,
        // Selection and manipulation state
        isDraggingObject: false,
        dragStartX: 0,
        dragStartY: 0,
        dragOriginalX1: 0,
        dragOriginalY1: 0,
        dragOriginalX2: 0,
        dragOriginalY2: 0,
        isResizing: false,
        resizeHandle: null,
        resizeStartX: 0,
        resizeStartY: 0,
        resizeOriginalBounds: null,
        // Zoom and pan state - view transform
        zoom: 1.0,           // Current zoom level (1.0 to 1.7)
        panX: 0,             // Pan offset X in CSS pixels
        panY: 0,             // Pan offset Y in CSS pixels
        isPanning: false,
        panStartX: 0,
        panStartY: 0,
        minZoom: 1.0,        // Minimum zoom (100%)
        maxZoom: 1.7,        // Maximum zoom (170%)
        // Background image state
        bgImage: null,       // Loaded background image
        bgImageLoaded: false
    };
    
    // UI Constants
    const BUTTON_RESET_DELAY = 3000; // Time in ms before resetting button text after feedback

    // Color utility functions
    const ColorUtils = {
        // Convert hex color to RGB
        hexToRgb(hex) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        },

        // Convert RGB to hex
        rgbToHex(r, g, b) {
            return '#' + [r, g, b].map(x => {
                const hex = Math.round(x).toString(16);
                return hex.length === 1 ? '0' + hex : hex;
            }).join('');
        },

        // Convert RGB to HSL
        rgbToHsl(r, g, b) {
            r /= 255;
            g /= 255;
            b /= 255;

            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            let h, s, l = (max + min) / 2;

            if (max === min) {
                h = s = 0; // achromatic
            } else {
                const d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

                switch (max) {
                    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                    case g: h = ((b - r) / d + 2) / 6; break;
                    case b: h = ((r - g) / d + 4) / 6; break;
                }
            }

            return { h: h * 360, s: s * 100, l: l * 100 };
        },

        // Convert HSL to RGB
        hslToRgb(h, s, l) {
            h /= 360;
            s /= 100;
            l /= 100;

            let r, g, b;

            if (s === 0) {
                r = g = b = l; // achromatic
            } else {
                const hue2rgb = (p, q, t) => {
                    if (t < 0) t += 1;
                    if (t > 1) t -= 1;
                    if (t < 1/6) return p + (q - p) * 6 * t;
                    if (t < 1/2) return q;
                    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                    return p;
                };

                const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                const p = 2 * l - q;

                r = hue2rgb(p, q, h + 1/3);
                g = hue2rgb(p, q, h);
                b = hue2rgb(p, q, h - 1/3);
            }

            return { r: r * 255, g: g * 255, b: b * 255 };
        },

        // Apply hue shift to a hex color
        shiftHue(hex, hueDegrees) {
            const rgb = this.hexToRgb(hex);
            if (!rgb) return hex;

            const hsl = this.rgbToHsl(rgb.r, rgb.g, rgb.b);
            
            // Shift hue and wrap around (handles both positive and negative values)
            hsl.h = ((hsl.h + hueDegrees) % 360 + 360) % 360;

            const newRgb = this.hslToRgb(hsl.h, hsl.s, hsl.l);
            return this.rgbToHex(newRgb.r, newRgb.g, newRgb.b);
        }
    };

    // DOM elements
    let bgCanvas, bgCtx, drawCanvas, ctx, canvasContainer;
    let overlayCanvas, overlayCtx;
    let introOverlay, introContent, startBtn, sampleBtn, dontShowAgainCheckbox;
    let colorSwatches, customColorPicker, penSizeSlider, penSizeValue;
    let hueShiftSlider, hueShiftValue;
    let brushTextureSelect, brushEraserToggle;
    let undoBtn, redoBtn, clearBtn, saveBtn, helpBtn;
    let themeToggleBtn, paperBgCheckbox;
    let toast;
    let toolsBtn, toolsMenu, shapesBtn, rulerBtn, exportSvgBtn, importBgBtn;
    let shapesPanel, closeShapesBtn, shapeButtons, shapeFillCheckbox, shapeRoughCheckbox;
    let rulerOverlay, closeRulerBtn, horizontalRuler, verticalRuler, rulerScaleSlider, rulerScaleValue, rulerResetBtn;
    let toolStatus;
    // Zoom elements
    let zoomInBtn, zoomOutBtn, zoomResetBtn, zoomLevel;
    // PWA install elements
    let installBtn, iosInstallModal, closeIosInstall;
    // Text and select tool elements
    let selectToolBtn, textToolBtn, textDialog, textInput, textConfirmBtn, textCancelBtn;
    // Pan tool element
    let panToolBtn;
    // Background image input
    let bgImageInput;
    // Collaboration elements
    let collabBtn, collabModal, closeCollabModal, collabStatus, collabError;
    let hostTabBtn, joinTabBtn, hostTab, joinTab;
    let hostPassphrase, createOfferBtn, offerBlob, offerOutput, copyOfferBtn;
    let answerBlobInput, answerInput, applyAnswerBtn;
    let joinPassphrase, offerBlobInput, createAnswerBtn, answerBlob, answerOutput, copyAnswerBtn;
    let disconnectBtn;

    // Initialize app
    function init() {
        // Get DOM elements
        bgCanvas = document.getElementById('bgCanvas');
        bgCtx = bgCanvas.getContext('2d', { willReadFrequently: false });
        drawCanvas = document.getElementById('drawCanvas');
        ctx = drawCanvas.getContext('2d', { willReadFrequently: false });
        overlayCanvas = document.getElementById('overlay-canvas');
        overlayCtx = overlayCanvas.getContext('2d', { willReadFrequently: false });
        canvasContainer = document.getElementById('canvas-container');
        toolStatus = document.getElementById('tool-status');
        introOverlay = document.getElementById('intro-overlay');
        introContent = introOverlay.querySelector('.intro-content');
        startBtn = document.getElementById('start-drawing');
        sampleBtn = document.getElementById('sample-canvas');
        dontShowAgainCheckbox = document.getElementById('dont-show-again');
        customColorPicker = document.getElementById('custom-color');
        penSizeSlider = document.getElementById('pen-size');
        penSizeValue = document.getElementById('pen-size-value');
        hueShiftSlider = document.getElementById('hue-shift');
        hueShiftValue = document.getElementById('hue-shift-value');
        brushTextureSelect = document.getElementById('brush-texture');
        brushEraserToggle = document.getElementById('brush-eraser-toggle');
        undoBtn = document.getElementById('undo-btn');
        redoBtn = document.getElementById('redo-btn');
        clearBtn = document.getElementById('clear-btn');
        saveBtn = document.getElementById('save-btn');
        helpBtn = document.getElementById('help-btn');
        themeToggleBtn = document.getElementById('theme-toggle');
        paperBgCheckbox = document.getElementById('paper-bg');
        toast = document.getElementById('toast');
        colorSwatches = document.querySelectorAll('.color-swatch');
        toolsBtn = document.getElementById('tools-btn');
        toolsMenu = document.getElementById('tools-menu');
        shapesBtn = document.getElementById('shapes-btn');
        rulerBtn = document.getElementById('ruler-btn');
        exportSvgBtn = document.getElementById('export-svg-btn');
        importBgBtn = document.getElementById('import-bg-btn');
        shapesPanel = document.getElementById('shapes-panel');
        closeShapesBtn = document.getElementById('close-shapes');
        shapeButtons = document.querySelectorAll('.shape-btn');
        shapeFillCheckbox = document.getElementById('shape-fill');
        shapeRoughCheckbox = document.getElementById('shape-rough');
        rulerOverlay = document.getElementById('ruler-overlay');
        closeRulerBtn = document.getElementById('close-ruler');
        horizontalRuler = document.getElementById('horizontal-ruler');
        verticalRuler = document.getElementById('vertical-ruler');
        rulerScaleSlider = document.getElementById('ruler-scale');
        rulerScaleValue = document.getElementById('ruler-scale-value');
        rulerResetBtn = document.getElementById('ruler-reset');
        
        // Zoom elements
        zoomInBtn = document.getElementById('zoom-in-btn');
        zoomOutBtn = document.getElementById('zoom-out-btn');
        zoomResetBtn = document.getElementById('zoom-reset-btn');
        zoomLevel = document.getElementById('zoom-level');
        
        // PWA install elements
        installBtn = document.getElementById('install-btn');
        iosInstallModal = document.getElementById('ios-install-modal');
        closeIosInstall = document.getElementById('close-ios-install');
        
        // Text and select tool elements
        selectToolBtn = document.getElementById('select-tool');
        textToolBtn = document.getElementById('text-tool');
        panToolBtn = document.getElementById('pan-tool');
        textDialog = document.getElementById('text-dialog');
        textInput = document.getElementById('text-input');
        textConfirmBtn = document.getElementById('text-confirm');
        textCancelBtn = document.getElementById('text-cancel');
        
        // Background image input
        bgImageInput = document.getElementById('bg-image-input');
        
        // Collaboration elements
        collabBtn = document.getElementById('collab-btn');
        collabModal = document.getElementById('collab-modal');
        closeCollabModal = document.getElementById('close-collab-modal');
        collabStatus = document.getElementById('collab-status');
        collabError = document.getElementById('collab-error');
        hostTab = document.getElementById('host-tab');
        joinTab = document.getElementById('join-tab');
        createOfferBtn = document.getElementById('create-offer-btn');
        offerBlob = document.getElementById('offer-blob');
        offerOutput = document.getElementById('offer-output');
        copyOfferBtn = document.getElementById('copy-offer-btn');
        answerBlobInput = document.getElementById('answer-blob-input');
        answerInput = document.getElementById('answer-input');
        applyAnswerBtn = document.getElementById('apply-answer-btn');
        answerInput = document.getElementById('answer-input');
        createAnswerBtn = document.getElementById('create-answer-btn');
        answerBlob = document.getElementById('answer-blob');
        answerOutput = document.getElementById('answer-output');
        copyAnswerBtn = document.getElementById('copy-answer-btn');
        answerBlob = document.getElementById('answer-blob');
        answerOutput = document.getElementById('answer-output');
        hostPassphrase = document.getElementById('host-passphrase');
        joinPassphrase = document.getElementById('join-passphrase');
        offerBlobInput = document.getElementById('offer-blob-input');
        disconnectBtn = document.getElementById('disconnect-btn');
        // Tab buttons don't have IDs, select by class and data attribute
        hostTabBtn = document.querySelector('.tab-btn[data-tab="host"]');
        joinTabBtn = document.querySelector('.tab-btn[data-tab="join"]');

        // Setup canvas
        setupCanvas();
        
        // Initialize zoom
        updateZoomDisplay();
        
        // Load saved state
        loadState();
        
        // Setup event listeners
        setupEventListeners();
        
        // Check intro preference
        checkIntroPreference();
        
        // Register service worker
        registerServiceWorker();
    }

    // Setup canvas with high DPI support
    function setupCanvas() {
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        window.addEventListener('orientationchange', resizeCanvas);
    }

    function resizeCanvas() {
        const rect = canvasContainer.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        // Get container size in CSS pixels
        const cssWidth = rect.width;
        const cssHeight = rect.height;
        
        // Save current drawing before resize
        const oldBgData = state.bgImageLoaded ? bgCanvas.toDataURL() : null;
        const oldDrawData = drawCanvas.toDataURL();
        
        // Resize both canvases to match container
        // Physical size (with DPR)
        bgCanvas.width = cssWidth * dpr;
        bgCanvas.height = cssHeight * dpr;
        drawCanvas.width = cssWidth * dpr;
        drawCanvas.height = cssHeight * dpr;
        overlayCanvas.width = cssWidth * dpr;
        overlayCanvas.height = cssHeight * dpr;
        
        // CSS size
        bgCanvas.style.width = cssWidth + 'px';
        bgCanvas.style.height = cssHeight + 'px';
        drawCanvas.style.width = cssWidth + 'px';
        drawCanvas.style.height = cssHeight + 'px';
        overlayCanvas.style.width = cssWidth + 'px';
        overlayCanvas.style.height = cssHeight + 'px';
        
        // Set transform for background canvas (always 1:1, no zoom)
        bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        
        // Set transform for drawing canvas (DPR only)
        applyDrawTransform();
        
        // Set transform for overlay canvas (DPR only)
        applyOverlayTransform();
        
        // Apply CSS transform for visual zoom and pan
        applyCanvasTransform();
        
        // Restore background if present
        if (oldBgData && state.bgImageLoaded) {
            const img = new Image();
            img.onload = function() {
                bgCtx.drawImage(img, 0, 0, cssWidth, cssHeight);
            };
            img.src = oldBgData;
        }
        
        // Restore drawing
        if (oldDrawData && oldDrawData !== 'data:,') {
            const img = new Image();
            img.onload = function() {
                // Draw image pixel-for-pixel at canvas resolution (without transform)
                // This preserves the drawing regardless of current zoom level
                ctx.save();
                ctx.setTransform(1, 0, 0, 1, 0, 0);  // Identity transform
                ctx.drawImage(img, 0, 0);
                ctx.restore();  // Restores the zoom/pan transform set at line 338
            };
            img.src = oldDrawData;
        }
    }
    
    // Apply CSS transform to canvases for visual zoom
    function applyCanvasTransform() {
        const transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
        const canvases = [drawCanvas, overlayCanvas, bgCanvas];
        
        canvases.forEach(canvas => {
            canvas.style.transform = transform;
            canvas.style.transformOrigin = '0 0';
        });
    }
    
    // Apply transform to drawing canvas context (DPR only, no zoom)
    function applyDrawTransform() {
        const dpr = window.devicePixelRatio || 1;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    
    // Apply transform to overlay canvas context (DPR only, no zoom)
    function applyOverlayTransform() {
        const dpr = window.devicePixelRatio || 1;
        overlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    
    // Redraw canvas from current history state
    function redrawFromCurrentHistoryState() {
        if (state.history.length > 0 && state.historyStep >= 0) {
            restoreHistoryState(state.history[state.historyStep]);
        }
    }
    
    // Convert screen coordinates to world coordinates
    function screenToWorld(screenX, screenY) {
        // screenX, screenY are relative to canvas (from clientX - rect.left)
        // With CSS transform, we need to account for the scale
        // Divide by zoom to get actual canvas coordinates
        return {
            x: screenX / state.zoom,
            y: screenY / state.zoom
        };
    }
    
    // Convert world coordinates to screen coordinates
    function worldToScreen(worldX, worldY) {
        return {
            x: worldX * state.zoom,
            y: worldY * state.zoom
        };
    }

    // Event listeners setup
    function setupEventListeners() {
        // Intro overlay
        startBtn.addEventListener('click', closeIntro);
        sampleBtn.addEventListener('click', openSampleCanvas);
        helpBtn.addEventListener('click', showIntro);
        
        // Close intro on backdrop click (clicking outside the modal content)
        introOverlay.addEventListener('click', function(e) {
            if (e.target === introOverlay) {
                closeIntro();
            }
        });
        
        // Prevent clicks on non-button elements from closing the overlay
        // But allow button clicks to propagate and work correctly
        introContent.addEventListener('click', function(e) {
            // Only stop propagation if not clicking a button
            if (e.target.tagName !== 'BUTTON' && !e.target.closest('button')) {
                e.stopPropagation();
            }
        });

        // Color selection
        colorSwatches.forEach(swatch => {
            swatch.addEventListener('click', function() {
                selectColor(this.dataset.color);
                updateActiveColorSwatch(this);
            });
        });

        const handleCustomColorChange = function() {
            selectColor(this.value);
            updateActiveColorSwatch(null);
        };

        customColorPicker.addEventListener('change', handleCustomColorChange);
        customColorPicker.addEventListener('input', handleCustomColorChange);

        // Pen size
        penSizeSlider.addEventListener('input', function() {
            state.currentSize = parseInt(this.value);
            penSizeValue.textContent = this.value;
        });

        // Hue shift
        hueShiftSlider.addEventListener('input', function() {
            state.hueShift = parseInt(this.value);
            hueShiftValue.textContent = this.value + '°';
            updateCurrentColor();
            updateColorSwatchesDisplay();
            localStorage.setItem('lifepad-hue-shift', state.hueShift);
        });

        // Brush texture
        brushTextureSelect.addEventListener('change', function() {
            state.currentTexture = this.value;
        });

        // Brush/Eraser toggle
        brushEraserToggle.addEventListener('click', toggleEraser);

        // Actions
        undoBtn.addEventListener('click', undo);
        redoBtn.addEventListener('click', redo);
        clearBtn.addEventListener('click', clearCanvas);
        saveBtn.addEventListener('click', saveImage);

        // Settings
        themeToggleBtn.addEventListener('click', toggleTheme);
        paperBgCheckbox.addEventListener('change', togglePaperMode);
        
        // Collaboration
        collabBtn.addEventListener('click', openCollabModal);
        closeCollabModal.addEventListener('click', closeCollabModalFn);
        hostTabBtn.addEventListener('click', () => switchTab('host'));
        joinTabBtn.addEventListener('click', () => switchTab('join'));
        createOfferBtn.addEventListener('click', handleCreateOffer);
        copyOfferBtn.addEventListener('click', async () => {
            try {
                await copyToClipboard(offerBlob.value);
                showToast('Copied to clipboard!');
            } catch (error) {
                showToast('Failed to copy - please select and copy manually');
            }
        });
        applyAnswerBtn.addEventListener('click', handleApplyAnswer);
        createAnswerBtn.addEventListener('click', handleCreateAnswer);
        copyAnswerBtn.addEventListener('click', async () => {
            try {
                await copyToClipboard(answerBlob.value);
                showToast('Copied to clipboard!');
            } catch (error) {
                showToast('Failed to copy - please select and copy manually');
            }
        });
        disconnectBtn.addEventListener('click', handleDisconnect);

        // Tools dropdown
        toolsBtn.addEventListener('click', toggleToolsMenu);
        shapesBtn.addEventListener('click', openShapesPanel);
        rulerBtn.addEventListener('click', openRuler);
        exportSvgBtn.addEventListener('click', exportSVG);
        importBgBtn.addEventListener('click', openBackgroundImport);

        // Tool selection
        selectToolBtn.addEventListener('click', activateSelectTool);
        textToolBtn.addEventListener('click', activateTextTool);
        panToolBtn.addEventListener('click', activatePanTool);
        
        // Background image import
        bgImageInput.addEventListener('change', handleBackgroundImageUpload);

        // Shapes panel
        closeShapesBtn.addEventListener('click', closeShapesPanel);
        shapeButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                selectShape(this.dataset.shape);
            });
        });
        shapeFillCheckbox.addEventListener('change', function() {
            state.shapeFill = this.checked;
            console.log('Shape fill:', state.shapeFill);
        });
        shapeRoughCheckbox.addEventListener('change', function() {
            state.shapeHandDrawn = this.checked;
            console.log('Shape hand-drawn:', state.shapeHandDrawn);
        });

        // Text dialog
        textConfirmBtn.addEventListener('click', addTextToCanvas);
        textCancelBtn.addEventListener('click', cancelTextInput);

        // Ruler
        closeRulerBtn.addEventListener('click', closeRuler);
        rulerScaleSlider.addEventListener('input', function() {
            rulerState.pixelsPerMeter = parseInt(this.value);
            rulerScaleValue.textContent = this.value;
            updateRulerMeasurements();
        });
        rulerResetBtn.addEventListener('click', resetRulerPositions);
        
        // Zoom controls
        zoomInBtn.addEventListener('click', zoomIn);
        zoomOutBtn.addEventListener('click', zoomOut);
        zoomResetBtn.addEventListener('click', resetZoom);
        
        // PWA install
        installBtn.addEventListener('click', handleInstallClick);
        closeIosInstall.addEventListener('click', closeIosInstallModal);

        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!toolsBtn.contains(e.target) && !toolsMenu.contains(e.target)) {
                toolsMenu.classList.remove('show');
            }
        });

        // Drawing events - using Pointer Events for universal support
        drawCanvas.addEventListener('pointerdown', startDrawing);
        drawCanvas.addEventListener('pointermove', draw);
        drawCanvas.addEventListener('pointerup', stopDrawing);
        drawCanvas.addEventListener('pointercancel', stopDrawing);
        drawCanvas.addEventListener('pointerleave', stopDrawing);

        // Prevent context menu on long press
        drawCanvas.addEventListener('contextmenu', e => e.preventDefault());
        
        // Zoom with mouse wheel
        drawCanvas.addEventListener('wheel', handleWheel, { passive: false });
        
        // Keyboard shortcuts for zoom
        document.addEventListener('keydown', handleKeyboard);
    }

    // Color selection
    function selectColor(color) {
        state.baseColor = color;
        updateCurrentColor();
        state.isEraser = false;
        brushEraserToggle.textContent = 'Brush';
        brushEraserToggle.classList.remove('active');
    }

    function updateCurrentColor() {
        // Apply hue shift to base color
        state.currentColor = ColorUtils.shiftHue(state.baseColor, state.hueShift);
    }

    function updateColorSwatchesDisplay() {
        // Update visual display of color swatches to show hue shift effect
        colorSwatches.forEach(swatch => {
            const baseColor = swatch.dataset.color;
            if (baseColor) {
                const shiftedColor = ColorUtils.shiftHue(baseColor, state.hueShift);
                swatch.style.background = shiftedColor;
            }
        });
    }

    function updateActiveColorSwatch(activeSwatch) {
        colorSwatches.forEach(s => s.classList.remove('active'));
        if (activeSwatch) {
            activeSwatch.classList.add('active');
        }
    }

    // Toggle eraser
    function toggleEraser() {
        state.isEraser = !state.isEraser;
        brushEraserToggle.textContent = state.isEraser ? 'Eraser' : 'Brush';
        brushEraserToggle.classList.toggle('active', state.isEraser);
        state.activeTool = state.isEraser ? 'eraser' : 'brush';
        state.activeShape = null; // Clear shape mode
        updateToolButtons();
        updateToolStatus();
    }

    // Tool activation
    function activateSelectTool() {
        state.activeTool = 'select';
        state.activeShape = null;
        state.isEraser = false;
        updateToolButtons();
        updateToolStatus();
        showToast('Select tool activated - click objects to select');
    }

    function activateTextTool() {
        state.activeTool = 'text';
        state.activeShape = null;
        state.isEraser = false;
        updateToolButtons();
        updateToolStatus();
        showToast('Text tool activated - click to place text');
    }
    
    function activatePanTool() {
        state.activeTool = 'pan';
        state.activeShape = null;
        state.isEraser = false;
        updateToolButtons();
        updateToolStatus();
        showToast('Pan tool activated - drag to pan canvas');
    }

    function updateToolButtons() {
        // Clear all active states
        brushEraserToggle.classList.remove('active');
        selectToolBtn.classList.remove('active');
        textToolBtn.classList.remove('active');
        panToolBtn.classList.remove('active');
        
        // Set active state for current tool
        if (state.activeTool === 'brush' || state.activeTool === 'eraser') {
            brushEraserToggle.classList.add('active');
        } else if (state.activeTool === 'select') {
            selectToolBtn.classList.add('active');
        } else if (state.activeTool === 'text') {
            textToolBtn.classList.add('active');
        } else if (state.activeTool === 'pan') {
            panToolBtn.classList.add('active');
        } else if (state.activeTool === 'shape') {
            // No button to highlight for shapes - it's in the panel
        }
    }

    function updateToolStatus() {
        if (!toolStatus) return;
        
        let statusText = 'Tool: ';
        if (state.activeTool === 'shape' && state.activeShape) {
            statusText += `Shape / ${state.activeShape}`;
        } else if (state.activeTool === 'brush') {
            statusText += 'Brush';
        } else if (state.activeTool === 'eraser') {
            statusText += 'Eraser';
        } else if (state.activeTool === 'select') {
            statusText += 'Select';
        } else if (state.activeTool === 'text') {
            statusText += 'Text';
        } else if (state.activeTool === 'pan') {
            statusText += 'Pan';
        } else {
            statusText += state.activeTool;
        }
        
        toolStatus.textContent = statusText;
        console.log('Tool status updated:', statusText);
    }
    
    // Background image import functions
    function openBackgroundImport() {
        bgImageInput.click();
        toolsMenu.classList.remove('show');
    }
    
    function handleBackgroundImageUpload(e) {
        const file = e.target.files[0];
        if (!file || !file.type.startsWith('image/')) {
            showToast('Please select a valid image file');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                state.bgImage = img;
                state.bgImageLoaded = true;
                
                // Draw image to background canvas at 100% scale (screen space)
                const rect = canvasContainer.getBoundingClientRect();
                bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
                bgCtx.save();
                bgCtx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
                bgCtx.drawImage(img, 0, 0, rect.width, rect.height);
                bgCtx.restore();
                
                showToast('Background image imported');
            };
            img.onerror = function() {
                showToast('Failed to load image');
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
        
        // Reset input so same file can be selected again
        e.target.value = '';
    }

    // Text tool functions
    function addTextToCanvas() {
        const text = textInput.value.trim();
        if (!text) {
            cancelTextInput();
            return;
        }

        // Save history state
        saveHistoryState();

        // Draw text on canvas
        ctx.font = '24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif';
        ctx.fillStyle = state.currentColor;
        ctx.textBaseline = 'top';
        ctx.fillText(text, state.textX, state.textY);

        // Store as object
        state.objects.push({
            type: 'text',
            x: state.textX,
            y: state.textY,
            text: text,
            color: state.currentColor,
            font: '24px sans-serif'
        });

        cancelTextInput();
        saveCanvasToStorage();
    }

    function cancelTextInput() {
        textDialog.classList.add('hidden');
        textInput.value = '';
    }

    // SVG Export
    function exportSVG() {
        try {
            // Create a temporary canvas to combine bg and drawing
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            const dpr = window.devicePixelRatio || 1;
            
            // Set size to match current view
            tempCanvas.width = bgCanvas.width;
            tempCanvas.height = bgCanvas.height;
            
            // Draw background at 100% scale
            tempCtx.drawImage(bgCanvas, 0, 0);
            
            // Draw drawing layer at current zoom/pan
            tempCtx.drawImage(drawCanvas, 0, 0);
            
            // Create SVG with canvas content
            const rect = drawCanvas.getBoundingClientRect();
            const svgNS = 'http://www.w3.org/2000/svg';
            const svg = document.createElementNS(svgNS, 'svg');
            svg.setAttribute('width', rect.width);
            svg.setAttribute('height', rect.height);
            svg.setAttribute('xmlns', svgNS);

            // Convert combined canvas to image and embed in SVG
            const image = document.createElementNS(svgNS, 'image');
            image.setAttribute('width', rect.width);
            image.setAttribute('height', rect.height);
            image.setAttribute('href', tempCanvas.toDataURL('image/png'));
            svg.appendChild(image);

            // Serialize SVG to string
            const serializer = new XMLSerializer();
            const svgString = serializer.serializeToString(svg);
            const blob = new Blob([svgString], { type: 'image/svg+xml' });

            // Download
            const link = document.createElement('a');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            link.download = `lifepad-${timestamp}.svg`;
            link.href = URL.createObjectURL(blob);
            link.click();
            URL.revokeObjectURL(link.href);

            showToast('SVG exported successfully');
            toolsMenu.classList.remove('show');
        } catch (error) {
            showToast('Failed to export SVG');
            console.error('SVG export error:', error);
        }
    }

    // Pressure normalization constants
    const PRESSURE_MIN = 0.1;      // Minimum pressure to avoid zero-width strokes
    const PRESSURE_MAX = 1.5;      // Maximum pressure to avoid excessive width
    const PRESSURE_SCALE = 2;      // Scale factor for stylus pressure sensitivity

    // Normalize pressure value for all pointer types
    function normalizePressure(e) {
        // Pointer events provide pressure values between 0 and 1
        // According to the spec:
        // - For mice: pressure is 0 when no button is pressed, 0.5 when button is pressed
        // - For pens/stylus: pressure ranges from 0 to 1 based on actual pressure applied
        // - For touch: pressure may be 0, 0.5, or unavailable (undefined/null)
        
        if (e.pressure === undefined || e.pressure === null) {
            // No pressure information available (older browsers or certain devices)
            return 1;
        }
        
        if (e.pressure === 0) {
            // No button pressed (shouldn't happen during drawing, but handle it)
            return 1;
        }
        
        // For stylus/pen devices, apply pressure scaling for better sensitivity
        // For mouse/touch, use the pressure value directly (typically 0.5 for mouse)
        if (e.pointerType === 'pen') {
            // Scale pen pressure for better feel (0-1 → 0.1-1.5 range)
            return Math.max(PRESSURE_MIN, Math.min(PRESSURE_MAX, e.pressure * PRESSURE_SCALE));
        }
        
        // For mouse and touch, return pressure value directly (no scaling)
        // This gives a consistent baseline (0.5 for mouse, varies for touch)
        return e.pressure;
    }

    // Drawing functions
    function startDrawing(e) {
        e.preventDefault();
        
        // Only handle one pointer at a time
        if (state.currentPointerId !== null && state.currentPointerId !== e.pointerId) {
            console.log('Ignoring pointer - already tracking', state.currentPointerId);
            return;
        }
        
        state.currentPointerId = e.pointerId;
        try {
            drawCanvas.setPointerCapture(e.pointerId);
        } catch (err) {
            // Pointer capture may fail in some cases, that's okay
            console.log('setPointerCapture failed:', err.message);
        }
        
        const rect = drawCanvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        
        // Convert to world coordinates
        const world = screenToWorld(screenX, screenY);
        const x = world.x;
        const y = world.y;
        
        console.log('pointerdown:', {
            activeTool: state.activeTool,
            activeShape: state.activeShape,
            pointerType: e.pointerType,
            pointerId: e.pointerId,
            normalizedPressure: normalizePressure(e),
            screenX, screenY, worldX: x, worldY: y, zoom: state.zoom
        });

        // Handle pan tool
        if (state.activeTool === 'pan') {
            state.isPanning = true;
            state.panStartX = e.clientX - state.panX;
            state.panStartY = e.clientY - state.panY;
            drawCanvas.style.cursor = 'grabbing';
            return;
        }

        // Handle text tool
        if (state.activeTool === 'text') {
            state.textX = x;
            state.textY = y;
            textDialog.classList.remove('hidden');
            textInput.focus();
            state.currentPointerId = null;
            return;
        }

        // Handle select tool
        if (state.activeTool === 'select') {
            const selectedObj = findObjectAt(x, y);
            if (selectedObj) {
                state.selectedObject = selectedObj;
                // Check if clicking on a resize handle
                const handle = getResizeHandleAt(x, y, selectedObj);
                if (handle) {
                    state.isResizing = true;
                    state.resizeHandle = handle;
                    state.resizeStartX = x;
                    state.resizeStartY = y;
                    state.resizeOriginalBounds = {
                        x1: selectedObj.x1,
                        y1: selectedObj.y1,
                        x2: selectedObj.x2,
                        y2: selectedObj.y2
                    };
                } else {
                    state.isDraggingObject = true;
                    state.dragStartX = x;
                    state.dragStartY = y;
                    state.dragOriginalX1 = selectedObj.x1;
                    state.dragOriginalY1 = selectedObj.y1;
                    state.dragOriginalX2 = selectedObj.x2;
                    state.dragOriginalY2 = selectedObj.y2;
                }
                redrawCanvas();
            } else {
                // Clicked empty space - deselect
                if (state.selectedObject) {
                    state.selectedObject = null;
                    redrawCanvas();
                }
            }
            return;
        }
        
        // Handle shape tool
        if (state.activeTool === 'shape' && state.activeShape) {
            state.isDrawingShape = true;
            state.shapeStartX = x;
            state.shapeStartY = y;
            // Save state ONCE at start for undo
            saveHistoryState();
            console.log('Shape drawing started:', state.activeShape);
            return;
        }
        
        // Handle brush/eraser tool
        if (state.activeTool === 'brush' || state.activeTool === 'eraser') {
            state.isDrawing = true;
            state.lastX = x;
            state.lastY = y;
            
            // Save state for undo
            saveHistoryState();
            
            // Start path
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            // Create sync event with normalized pressure
            Sync.createStrokeBegin(x, y, normalizePressure(e));
            return;
        }
    }

    function draw(e) {
        e.preventDefault();
        
        // Only handle the tracked pointer
        if (state.currentPointerId !== e.pointerId) {
            return;
        }
        
        const rect = drawCanvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        
        // Convert to world coordinates
        const world = screenToWorld(screenX, screenY);
        const x = world.x;
        const y = world.y;
        
        // Handle panning
        if (state.isPanning && state.activeTool === 'pan') {
            state.panX = e.clientX - state.panStartX;
            state.panY = e.clientY - state.panStartY;
            
            // Apply CSS transform for pan
            applyCanvasTransform();
            return;
        }
        
        // Handle object dragging
        if (state.isDraggingObject && state.selectedObject) {
            const deltaX = x - state.dragStartX;
            const deltaY = y - state.dragStartY;
            
            state.selectedObject.x1 = state.dragOriginalX1 + deltaX;
            state.selectedObject.y1 = state.dragOriginalY1 + deltaY;
            state.selectedObject.x2 = state.dragOriginalX2 + deltaX;
            state.selectedObject.y2 = state.dragOriginalY2 + deltaY;
            
            redrawCanvas();
            return;
        }
        
        // Handle object resizing
        if (state.isResizing && state.selectedObject) {
            const deltaX = x - state.resizeStartX;
            const deltaY = y - state.resizeStartY;
            
            const handle = state.resizeHandle;
            const obj = state.selectedObject;
            const orig = state.resizeOriginalBounds;
            
            // Update bounds based on which handle is being dragged
            if (handle === 'nw') {
                obj.x1 = orig.x1 + deltaX;
                obj.y1 = orig.y1 + deltaY;
            } else if (handle === 'ne') {
                obj.x2 = orig.x2 + deltaX;
                obj.y1 = orig.y1 + deltaY;
            } else if (handle === 'sw') {
                obj.x1 = orig.x1 + deltaX;
                obj.y2 = orig.y2 + deltaY;
            } else if (handle === 'se') {
                obj.x2 = orig.x2 + deltaX;
                obj.y2 = orig.y2 + deltaY;
            } else if (handle === 'n') {
                obj.y1 = orig.y1 + deltaY;
            } else if (handle === 's') {
                obj.y2 = orig.y2 + deltaY;
            } else if (handle === 'e') {
                obj.x2 = orig.x2 + deltaX;
            } else if (handle === 'w') {
                obj.x1 = orig.x1 + deltaX;
            }
            
            redrawCanvas();
            return;
        }
        
        // Handle shape preview
        if (state.isDrawingShape && state.activeTool === 'shape' && state.activeShape) {
            // Clear overlay
            const dpr = window.devicePixelRatio || 1;
            overlayCtx.save();
            overlayCtx.setTransform(1, 0, 0, 1, 0, 0);
            overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
            overlayCtx.restore();
            applyOverlayTransform();
            
            // Draw shape preview on overlay
            drawShapePreview(state.shapeStartX, state.shapeStartY, x, y, state.activeShape);
            return;
        }
        
        // Handle brush/eraser drawing
        if (!state.isDrawing || (state.activeTool !== 'brush' && state.activeTool !== 'eraser')) {
            return;
        }
        
        // Get normalized pressure for all input types
        const pressure = normalizePressure(e);
        
        // Calculate size with pressure
        const size = state.currentSize * pressure;
        
        // Draw based on texture
        if (state.isEraser) {
            drawEraser(state.lastX, state.lastY, x, y, size);
        } else {
            switch (state.currentTexture) {
                case 'ink':
                    drawInk(state.lastX, state.lastY, x, y, size);
                    break;
                case 'pencil':
                    drawPencil(state.lastX, state.lastY, x, y, size);
                    break;
                case 'marker':
                    drawMarker(state.lastX, state.lastY, x, y, size);
                    break;
                case 'spray':
                    drawSpray(state.lastX, state.lastY, x, y, size);
                    break;
                case 'charcoal':
                    drawCharcoal(state.lastX, state.lastY, x, y, size);
                    break;
            }
        }
        
        // Create sync event
        Sync.createStrokePoint(x, y, pressure);
        
        state.lastX = x;
        state.lastY = y;
    }

    function stopDrawing(e) {
        e.preventDefault();
        
        // Only handle the tracked pointer
        if (state.currentPointerId !== e.pointerId) {
            return;
        }
        
        console.log('pointerup:', {
            activeTool: state.activeTool,
            activeShape: state.activeShape,
            pointerId: e.pointerId
        });
        
        const rect = drawCanvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        
        // Convert to world coordinates
        const world = screenToWorld(screenX, screenY);
        const x = world.x;
        const y = world.y;
        
        // Handle pan end
        if (state.isPanning && state.activeTool === 'pan') {
            state.isPanning = false;
            drawCanvas.style.cursor = 'crosshair';
            state.currentPointerId = null;
            return;
        }
        
        // Handle object drag end
        if (state.isDraggingObject) {
            state.isDraggingObject = false;
            saveHistoryState();
            saveCanvasToStorage();
            state.currentPointerId = null;
            return;
        }
        
        // Handle object resize end
        if (state.isResizing) {
            state.isResizing = false;
            state.resizeHandle = null;
            state.resizeOriginalBounds = null;
            saveHistoryState();
            saveCanvasToStorage();
            state.currentPointerId = null;
            return;
        }
        
        // Handle shape finalization
        if (state.isDrawingShape && state.activeTool === 'shape' && state.activeShape) {
            // Clear overlay
            const dpr = window.devicePixelRatio || 1;
            overlayCtx.save();
            overlayCtx.setTransform(1, 0, 0, 1, 0, 0);
            overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
            overlayCtx.restore();
            applyOverlayTransform();
            
            // Draw final shape to main canvas
            drawShapeFinal(state.shapeStartX, state.shapeStartY, x, y, state.activeShape);
            
            state.isDrawingShape = false;
            console.log('Shape drawing completed:', state.activeShape);
            
            // Autosave
            saveCanvasToStorage();
            
            state.currentPointerId = null;
            return;
        }
        
        // Handle brush/eraser finalization
        if (state.isDrawing) {
            state.isDrawing = false;
            
            // Create sync event
            Sync.createStrokeEnd();
            
            // Autosave after stroke
            saveCanvasToStorage();
        }
        
        state.currentPointerId = null;
    }

    // Brush texture implementations
    function drawInk(x1, y1, x2, y2, size) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = state.currentColor;
        ctx.lineWidth = size;
        ctx.globalAlpha = 1;
        
        // Smooth line with quadratic curve
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(x1, y1, midX, midY);
        ctx.stroke();
    }

    function drawPencil(x1, y1, x2, y2, size) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = state.currentColor;
        ctx.lineWidth = size * 0.7;
        ctx.globalAlpha = 0.6;
        
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(x1, y1, midX, midY);
        ctx.stroke();
    }

    function drawMarker(x1, y1, x2, y2, size) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = state.currentColor;
        ctx.lineWidth = size * 1.5;
        ctx.globalAlpha = 0.5;
        
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(x1, y1, midX, midY);
        ctx.stroke();
    }

    function drawSpray(x1, y1, x2, y2, size) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = state.currentColor;
        ctx.globalAlpha = 0.1;
        
        const distance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        const steps = Math.max(1, Math.floor(distance / 2));
        
        for (let i = 0; i < steps; i++) {
            const t = i / steps;
            const x = x1 + (x2 - x1) * t;
            const y = y1 + (y2 - y1) * t;
            
            // Scatter dots
            for (let j = 0; j < 10; j++) {
                const offsetX = (Math.random() - 0.5) * size * 2;
                const offsetY = (Math.random() - 0.5) * size * 2;
                
                ctx.beginPath();
                ctx.arc(x + offsetX, y + offsetY, 1, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    function drawCharcoal(x1, y1, x2, y2, size) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = state.currentColor;
        ctx.globalAlpha = 0.4;
        
        // Draw multiple jittered strokes
        for (let i = 0; i < 3; i++) {
            const offsetX = (Math.random() - 0.5) * size * 0.5;
            const offsetY = (Math.random() - 0.5) * size * 0.5;
            
            ctx.lineWidth = size * (0.8 + Math.random() * 0.4);
            
            ctx.beginPath();
            ctx.moveTo(x1 + offsetX, y1 + offsetY);
            ctx.lineTo(x2 + offsetX, y2 + offsetY);
            ctx.stroke();
        }
    }

    function drawEraser(x1, y1, x2, y2, size) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = size * 2;
        ctx.globalAlpha = 1;
        
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(x1, y1, midX, midY);
        ctx.stroke();
        
        ctx.globalCompositeOperation = 'source-over';
    }

    // History management
    function saveHistoryState() {
        // Remove any states after current step
        state.history = state.history.slice(0, state.historyStep + 1);
        
        // Add new state
        state.history.push(drawCanvas.toDataURL());
        
        // Limit history size
        if (state.history.length > state.maxHistory) {
            state.history.shift();
        } else {
            state.historyStep++;
        }
    }

    function undo() {
        if (state.historyStep > 0) {
            state.historyStep--;
            restoreHistoryState(state.history[state.historyStep]);
        }
    }

    function redo() {
        if (state.historyStep < state.history.length - 1) {
            state.historyStep++;
            restoreHistoryState(state.history[state.historyStep]);
        }
    }

    function restoreHistoryState(dataUrl) {
        const img = new Image();
        img.onload = function() {
            // Clear canvas and restore image in canvas pixel space
            const dpr = window.devicePixelRatio || 1;
            
            // Reset to identity transform
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            
            // Clear entire canvas
            ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
            
            // Draw saved image pixel-for-pixel at canvas resolution
            // The saved image is the full canvas bitmap, so we draw it 1:1
            ctx.drawImage(img, 0, 0);
            
            // Reapply the current zoom/pan transform for future drawing
            applyDrawTransform();
        };
        img.src = dataUrl;
    }

    function clearCanvas() {
        if (confirm('Clear the entire canvas? This cannot be undone.')) {
            saveHistoryState();
            const dpr = window.devicePixelRatio || 1;
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
            ctx.restore();
            applyDrawTransform();
            
            // Create sync event
            Sync.createClearEvent();
            
            saveCanvasToStorage();
        }
    }

    // Save and load
    function saveImage() {
        try {
            // Create a temporary canvas to combine bg and drawing
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            const dpr = window.devicePixelRatio || 1;
            
            // Set size to match current view
            tempCanvas.width = bgCanvas.width;
            tempCanvas.height = bgCanvas.height;
            
            // Draw background at 100% scale
            tempCtx.drawImage(bgCanvas, 0, 0);
            
            // Draw drawing layer at current zoom/pan
            tempCtx.drawImage(drawCanvas, 0, 0);
            
            const link = document.createElement('a');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            link.download = `lifepad-${timestamp}.png`;
            link.href = tempCanvas.toDataURL('image/png');
            link.click();
            showToast('Image saved successfully');
        } catch (error) {
            showToast('Failed to save image');
        }
    }

    function saveCanvasToStorage() {
        try {
            const dataUrl = drawCanvas.toDataURL('image/png');
            localStorage.setItem('lifepad-canvas', dataUrl);
            
            // Also save background if present
            if (state.bgImageLoaded) {
                const bgUrl = bgCanvas.toDataURL('image/png');
                localStorage.setItem('lifepad-bg-canvas', bgUrl);
            }
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
        }
    }

    function loadCanvasFromStorage() {
        try {
            // Load background
            const bgDataUrl = localStorage.getItem('lifepad-bg-canvas');
            if (bgDataUrl) {
                const bgImg = new Image();
                bgImg.onload = function() {
                    state.bgImageLoaded = true;
                    const dpr = window.devicePixelRatio || 1;
                    bgCtx.drawImage(bgImg, 0, 0, bgCanvas.width / dpr, bgCanvas.height / dpr);
                };
                bgImg.src = bgDataUrl;
            }
            
            // Load drawing
            const dataUrl = localStorage.getItem('lifepad-canvas');
            if (dataUrl) {
                const img = new Image();
                img.onload = function() {
                    const dpr = window.devicePixelRatio || 1;
                    ctx.drawImage(img, 0, 0, drawCanvas.width / dpr, drawCanvas.height / dpr);
                    saveHistoryState();
                };
                img.src = dataUrl;
            }
        } catch (error) {
            console.error('Failed to load from localStorage:', error);
        }
    }

    // Settings
    function toggleTheme() {
        state.theme = state.theme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', state.theme);
        localStorage.setItem('lifepad-theme', state.theme);
    }

    function togglePaperMode() {
        state.paperMode = paperBgCheckbox.checked;
        canvasContainer.classList.toggle('paper-mode', state.paperMode);
        localStorage.setItem('lifepad-paper-mode', state.paperMode);
    }
    
    // Zoom and pan functions
    function zoomIn() {
        const rect = drawCanvas.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        zoomAt(centerX, centerY, 1.1);
    }
    
    function zoomOut() {
        const rect = drawCanvas.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        zoomAt(centerX, centerY, 1 / 1.1);
    }
    
    function resetZoom() {
        state.zoom = 1.0;
        state.panX = 0;
        state.panY = 0;
        updateZoomDisplay();
        applyCanvasTransform();
        
        showToast('Zoom reset to 100%');
    }
    
    function zoomAt(screenX, screenY, factor) {
        // Apply zoom
        const oldZoom = state.zoom;
        const newZoom = Math.max(state.minZoom, Math.min(state.maxZoom, state.zoom * factor));
        
        if (newZoom === oldZoom) {
            // Already at limit
            return;
        }
        
        state.zoom = newZoom;
        
        // Adjust pan to keep the point under cursor stationary
        // With CSS transform order translate-then-scale, we need to adjust pan in unscaled space
        const zoomRatio = newZoom / oldZoom;
        state.panX = screenX - (screenX - state.panX) * zoomRatio;
        state.panY = screenY - (screenY - state.panY) * zoomRatio;
        
        updateZoomDisplay();
        applyCanvasTransform();
    }
    
    function updateZoomDisplay() {
        if (zoomLevel) {
            zoomLevel.textContent = Math.round(state.zoom * 100) + '%';
        }
    }
    
    function handleWheel(e) {
        e.preventDefault();
        
        // Get cursor position relative to canvas
        const rect = drawCanvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        
        // Determine zoom direction
        const delta = e.deltaY;
        const zoomFactor = delta > 0 ? 1 / 1.1 : 1.1;
        
        zoomAt(screenX, screenY, zoomFactor);
    }
    
    function handleKeyboard(e) {
        // Zoom in: Ctrl/Cmd + Plus or Ctrl/Cmd + =
        if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) {
            e.preventDefault();
            zoomIn();
        }
        // Zoom out: Ctrl/Cmd + Minus
        else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
            e.preventDefault();
            zoomOut();
        }
        // Reset zoom: Ctrl/Cmd + 0
        else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
            e.preventDefault();
            resetZoom();
        }
    }

    // State management
    function loadState() {
        // Load theme
        const savedTheme = localStorage.getItem('lifepad-theme');
        if (savedTheme) {
            state.theme = savedTheme;
            document.documentElement.setAttribute('data-theme', state.theme);
        }
        
        // Load paper mode
        const savedPaperMode = localStorage.getItem('lifepad-paper-mode');
        if (savedPaperMode === 'true') {
            state.paperMode = true;
            paperBgCheckbox.checked = true;
            canvasContainer.classList.add('paper-mode');
        }
        
        // Load hue shift
        const savedHueShift = localStorage.getItem('lifepad-hue-shift');
        if (savedHueShift !== null) {
            const parsedHueShift = parseInt(savedHueShift);
            if (!isNaN(parsedHueShift) && parsedHueShift >= -180 && parsedHueShift <= 180) {
                state.hueShift = parsedHueShift;
                if (hueShiftSlider) {
                    hueShiftSlider.value = state.hueShift;
                    hueShiftValue.textContent = state.hueShift + '°';
                }
                updateCurrentColor();
                updateColorSwatchesDisplay();
            }
        }
        
        // Load canvas
        loadCanvasFromStorage();
    }

    // Intro overlay
    function checkIntroPreference() {
        const dontShow = localStorage.getItem('lifepad-no-intro');
        if (dontShow === 'true') {
            closeIntro();
        }
    }

    function showIntro() {
        introOverlay.classList.remove('hidden');
    }

    function closeIntro() {
        if (dontShowAgainCheckbox.checked) {
            localStorage.setItem('lifepad-no-intro', 'true');
        }
        introOverlay.classList.add('hidden');
    }

    function openSampleCanvas() {
        // Draw a sample stroke
        ctx.strokeStyle = '#5a8dee';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.globalAlpha = 1;
        
        const centerX = drawCanvas.width / (window.devicePixelRatio || 1) / 2;
        const centerY = drawCanvas.height / (window.devicePixelRatio || 1) / 2;
        
        ctx.beginPath();
        ctx.moveTo(centerX - 100, centerY - 50);
        ctx.bezierCurveTo(centerX - 50, centerY - 100, centerX + 50, centerY + 100, centerX + 100, centerY + 50);
        ctx.stroke();
        
        ctx.font = '24px sans-serif';
        ctx.fillStyle = '#666666';
        ctx.textAlign = 'center';
        ctx.fillText('Welcome to lifePAD', centerX, centerY + 100);
        
        saveHistoryState();
        saveCanvasToStorage();
        closeIntro();
    }

    // Toast notifications
    function showToast(message, action) {
        toast.textContent = message;
        if (action) {
            const btn = document.createElement('button');
            btn.textContent = action.text;
            btn.onclick = action.callback;
            toast.appendChild(btn);
        }
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.textContent = '';
            }, 300);
        }, 3000);
    }

    // Tools dropdown
    function toggleToolsMenu(e) {
        e.stopPropagation();
        toolsMenu.classList.toggle('show');
    }

    // Shapes panel
    function openShapesPanel() {
        shapesPanel.classList.remove('hidden');
        toolsMenu.classList.remove('show');
        showToast('Click a shape, then drag on canvas to draw');
    }

    function closeShapesPanel() {
        shapesPanel.classList.add('hidden');
        state.activeShape = null;
        state.activeTool = 'brush';
        shapeButtons.forEach(btn => btn.classList.remove('active'));
        updateToolButtons();
        updateToolStatus();
    }

    function selectShape(shape) {
        console.log('Shape selected:', shape);
        state.activeShape = shape;
        state.activeTool = 'shape';
        state.isEraser = false;
        updateToolButtons();
        updateToolStatus();
        shapeButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.shape === shape);
        });
        showToast(`Selected: ${shape}`);
    }

    // Shape drawing functions
    function drawShapePreview(x1, y1, x2, y2, shape) {
        const width = x2 - x1;
        const height = y2 - y1;
        
        overlayCtx.strokeStyle = state.currentColor;
        overlayCtx.lineWidth = state.currentSize;
        overlayCtx.lineCap = 'round';
        overlayCtx.lineJoin = 'round';
        overlayCtx.globalAlpha = 0.5;
        
        if (state.shapeFill) {
            overlayCtx.fillStyle = state.currentColor;
        }
        
        drawShapeGeometry(overlayCtx, x1, y1, x2, y2, width, height, shape, state.shapeFill);
        
        overlayCtx.globalAlpha = 1;
    }

    function drawShapeFinal(x1, y1, x2, y2, shape) {
        const width = x2 - x1;
        const height = y2 - y1;
        
        ctx.strokeStyle = state.currentColor;
        ctx.lineWidth = state.currentSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = 1;
        
        if (state.shapeFill) {
            ctx.fillStyle = state.currentColor;
        }
        
        drawShapeGeometry(ctx, x1, y1, x2, y2, width, height, shape, state.shapeFill);
        
        // Apply hand-drawn effect if enabled
        if (state.shapeHandDrawn) {
            applyHandDrawnEffect(ctx, x1, y1, x2, y2, width, height, shape);
        }
        
        // Store shape object for later selection/manipulation
        const shapeObj = {
            type: 'shape',
            shape: shape,
            x1: x1,
            y1: y1,
            x2: x2,
            y2: y2,
            color: state.currentColor,
            lineWidth: state.currentSize,
            fill: state.shapeFill,
            handDrawn: state.shapeHandDrawn
        };
        state.objects.push(shapeObj);
    }

    function drawShapeGeometry(context, x1, y1, x2, y2, width, height, shape, fill) {
        switch (shape) {
            case 'rectangle':
                if (fill) {
                    context.fillRect(x1, y1, width, height);
                } else {
                    context.strokeRect(x1, y1, width, height);
                }
                break;
                
            case 'circle':
            case 'ellipse':
                context.beginPath();
                const radiusX = Math.abs(width) / 2;
                const radiusY = Math.abs(height) / 2;
                const centerX = x1 + width / 2;
                const centerY = y1 + height / 2;
                
                context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
                if (fill) {
                    context.fill();
                } else {
                    context.stroke();
                }
                break;
                
            case 'line':
                context.beginPath();
                context.moveTo(x1, y1);
                context.lineTo(x2, y2);
                context.stroke();
                break;
                
            case 'arrow':
                const angle = Math.atan2(y2 - y1, x2 - x1);
                const headLength = Math.min(20, Math.abs(width) / 3, Math.abs(height) / 3);
                
                // Draw line
                context.beginPath();
                context.moveTo(x1, y1);
                context.lineTo(x2, y2);
                context.stroke();
                
                // Draw arrowhead
                context.beginPath();
                context.moveTo(x2, y2);
                context.lineTo(
                    x2 - headLength * Math.cos(angle - Math.PI / 6),
                    y2 - headLength * Math.sin(angle - Math.PI / 6)
                );
                context.moveTo(x2, y2);
                context.lineTo(
                    x2 - headLength * Math.cos(angle + Math.PI / 6),
                    y2 - headLength * Math.sin(angle + Math.PI / 6)
                );
                context.stroke();
                break;
                
            case 'triangle':
                context.beginPath();
                const topX = x1 + width / 2;
                const topY = y1;
                const leftX = x1;
                const leftY = y2;
                const rightX = x2;
                const rightY = y2;
                
                context.moveTo(topX, topY);
                context.lineTo(leftX, leftY);
                context.lineTo(rightX, rightY);
                context.closePath();
                
                if (fill) {
                    context.fill();
                } else {
                    context.stroke();
                }
                break;
                
            case 'star':
                context.beginPath();
                const centerStarX = x1 + width / 2;
                const centerStarY = y1 + height / 2;
                const outerRadius = Math.min(Math.abs(width), Math.abs(height)) / 2;
                const innerRadius = outerRadius / 2;
                const spikes = 5;
                
                for (let i = 0; i < spikes * 2; i++) {
                    const radius = i % 2 === 0 ? outerRadius : innerRadius;
                    const angleRad = (i * Math.PI) / spikes - Math.PI / 2;
                    const px = centerStarX + radius * Math.cos(angleRad);
                    const py = centerStarY + radius * Math.sin(angleRad);
                    
                    if (i === 0) {
                        context.moveTo(px, py);
                    } else {
                        context.lineTo(px, py);
                    }
                }
                context.closePath();
                
                if (fill) {
                    context.fill();
                } else {
                    context.stroke();
                }
                break;

            case 'diamond':
                context.beginPath();
                const diamondCenterX = x1 + width / 2;
                const diamondCenterY = y1 + height / 2;
                
                context.moveTo(diamondCenterX, y1); // top
                context.lineTo(x2, diamondCenterY); // right
                context.lineTo(diamondCenterX, y2); // bottom
                context.lineTo(x1, diamondCenterY); // left
                context.closePath();
                
                if (fill) {
                    context.fill();
                } else {
                    context.stroke();
                }
                break;
        }
    }

    // Apply hand-drawn/sketch effect to shapes
    function applyHandDrawnEffect(context, x1, y1, x2, y2, width, height, shape) {
        const originalLineWidth = context.lineWidth;
        context.lineWidth = Math.max(1, originalLineWidth * 0.8);
        context.globalAlpha = 0.3;
        
        const jitter = 2; // Amount of randomness
        
        // Draw 2 slightly offset versions for hand-drawn effect
        for (let i = 0; i < 2; i++) {
            const offsetX = (Math.random() - 0.5) * jitter;
            const offsetY = (Math.random() - 0.5) * jitter;
            
            context.beginPath();
            
            switch (shape) {
                case 'rectangle':
                    context.strokeRect(x1 + offsetX, y1 + offsetY, width, height);
                    break;
                    
                case 'circle':
                case 'ellipse':
                    const radiusX = Math.abs(width) / 2;
                    const radiusY = Math.abs(height) / 2;
                    const centerX = x1 + width / 2;
                    const centerY = y1 + height / 2;
                    context.ellipse(centerX + offsetX, centerY + offsetY, radiusX, radiusY, 0, 0, Math.PI * 2);
                    context.stroke();
                    break;
                    
                case 'line':
                case 'arrow':
                    context.moveTo(x1 + offsetX, y1 + offsetY);
                    context.lineTo(x2 + offsetX, y2 + offsetY);
                    context.stroke();
                    break;
                    
                case 'triangle':
                    const topX = x1 + width / 2;
                    const topY = y1;
                    const leftX = x1;
                    const leftY = y2;
                    const rightX = x2;
                    const rightY = y2;
                    
                    context.moveTo(topX + offsetX, topY + offsetY);
                    context.lineTo(leftX + offsetX, leftY + offsetY);
                    context.lineTo(rightX + offsetX, rightY + offsetY);
                    context.closePath();
                    context.stroke();
                    break;
                    
                case 'diamond':
                    const diamondCenterX = x1 + width / 2;
                    const diamondCenterY = y1 + height / 2;
                    
                    context.moveTo(diamondCenterX + offsetX, y1 + offsetY);
                    context.lineTo(x2 + offsetX, diamondCenterY + offsetY);
                    context.lineTo(diamondCenterX + offsetX, y2 + offsetY);
                    context.lineTo(x1 + offsetX, diamondCenterY + offsetY);
                    context.closePath();
                    context.stroke();
                    break;
                    
                case 'star':
                    const centerStarX = x1 + width / 2;
                    const centerStarY = y1 + height / 2;
                    const outerRadius = Math.min(Math.abs(width), Math.abs(height)) / 2;
                    const innerRadius = outerRadius / 2;
                    const spikes = 5;
                    
                    for (let j = 0; j < spikes * 2; j++) {
                        const radius = j % 2 === 0 ? outerRadius : innerRadius;
                        const angleRad = (j * Math.PI) / spikes - Math.PI / 2;
                        const px = centerStarX + radius * Math.cos(angleRad) + offsetX;
                        const py = centerStarY + radius * Math.sin(angleRad) + offsetY;
                        
                        if (j === 0) {
                            context.moveTo(px, py);
                        } else {
                            context.lineTo(px, py);
                        }
                    }
                    context.closePath();
                    context.stroke();
                    break;
            }
        }
        
        context.lineWidth = originalLineWidth;
        context.globalAlpha = 1;
    }

    // Ruler state
    const rulerState = {
        pixelsPerMeter: 100, // Scale: 100 pixels = 1 meter
        horizontalWidth: 600,
        verticalHeight: 600,
        isDraggingH: false,
        isDraggingV: false,
        isResizingH: false,
        isResizingV: false,
        dragStartX: 0,
        dragStartY: 0,
        rulerStartX: 0,
        rulerStartY: 0,
        resizeStartWidth: 0,
        resizeStartHeight: 0
    };

    // Ruler
    function openRuler() {
        rulerOverlay.classList.remove('hidden');
        toolsMenu.classList.remove('show');
        initializeRulers();
        setupRulerControls();
        showToast('Drag rulers to move, drag edges to resize. Units: meters (horizontal) and milliradians (vertical)');
    }

    function closeRuler() {
        rulerOverlay.classList.add('hidden');
        removeRulerControls();
    }

    function resetRulerPositions() {
        // Reset horizontal ruler position
        horizontalRuler.style.top = '20px';
        horizontalRuler.style.left = '50%';
        horizontalRuler.style.transform = 'translateX(-50%)';
        horizontalRuler.style.width = '600px';
        rulerState.horizontalWidth = 600;
        
        // Reset vertical ruler position
        verticalRuler.style.top = '50%';
        verticalRuler.style.left = '20px';
        verticalRuler.style.transform = 'translateY(-50%)';
        verticalRuler.style.height = '600px';
        rulerState.verticalHeight = 600;
        
        // Update measurements
        updateRulerMeasurements();
        showToast('Ruler positions reset');
    }

    function setupRulerControls() {
        // Add dragging for horizontal ruler
        horizontalRuler.addEventListener('pointerdown', startDragHorizontal);
        
        // Add dragging for vertical ruler
        verticalRuler.addEventListener('pointerdown', startDragVertical);
        
        // Add resize handles
        addResizeHandles();
    }

    function removeRulerControls() {
        horizontalRuler.removeEventListener('pointerdown', startDragHorizontal);
        verticalRuler.removeEventListener('pointerdown', startDragVertical);
    }

    function addResizeHandles() {
        // Add resize handle to horizontal ruler
        if (!horizontalRuler.querySelector('.resize-handle')) {
            const hHandle = document.createElement('div');
            hHandle.className = 'resize-handle resize-handle-h';
            hHandle.addEventListener('pointerdown', startResizeHorizontal);
            horizontalRuler.appendChild(hHandle);
        }

        // Add resize handle to vertical ruler
        if (!verticalRuler.querySelector('.resize-handle')) {
            const vHandle = document.createElement('div');
            vHandle.className = 'resize-handle resize-handle-v';
            vHandle.addEventListener('pointerdown', startResizeVertical);
            verticalRuler.appendChild(vHandle);
        }
    }

    function startDragHorizontal(e) {
        if (e.target.classList.contains('resize-handle')) return;
        e.preventDefault();
        e.stopPropagation();
        
        rulerState.isDraggingH = true;
        rulerState.dragStartX = e.clientX;
        rulerState.dragStartY = e.clientY;
        
        const rect = horizontalRuler.getBoundingClientRect();
        const containerRect = canvasContainer.getBoundingClientRect();
        rulerState.rulerStartX = rect.left - containerRect.left;
        rulerState.rulerStartY = rect.top - containerRect.top;
        
        document.addEventListener('pointermove', dragHorizontalRuler);
        document.addEventListener('pointerup', stopDragHorizontal);
    }

    function dragHorizontalRuler(e) {
        if (!rulerState.isDraggingH) return;
        
        const deltaX = e.clientX - rulerState.dragStartX;
        const deltaY = e.clientY - rulerState.dragStartY;
        
        const newX = rulerState.rulerStartX + deltaX;
        const newY = rulerState.rulerStartY + deltaY;
        
        horizontalRuler.style.left = newX + 'px';
        horizontalRuler.style.top = newY + 'px';
        horizontalRuler.style.transform = 'none';
    }

    function stopDragHorizontal() {
        rulerState.isDraggingH = false;
        document.removeEventListener('pointermove', dragHorizontalRuler);
        document.removeEventListener('pointerup', stopDragHorizontal);
    }

    function startDragVertical(e) {
        if (e.target.classList.contains('resize-handle')) return;
        e.preventDefault();
        e.stopPropagation();
        
        rulerState.isDraggingV = true;
        rulerState.dragStartX = e.clientX;
        rulerState.dragStartY = e.clientY;
        
        const rect = verticalRuler.getBoundingClientRect();
        const containerRect = canvasContainer.getBoundingClientRect();
        rulerState.rulerStartX = rect.left - containerRect.left;
        rulerState.rulerStartY = rect.top - containerRect.top;
        
        document.addEventListener('pointermove', dragVerticalRuler);
        document.addEventListener('pointerup', stopDragVertical);
    }

    function dragVerticalRuler(e) {
        if (!rulerState.isDraggingV) return;
        
        const deltaX = e.clientX - rulerState.dragStartX;
        const deltaY = e.clientY - rulerState.dragStartY;
        
        const newX = rulerState.rulerStartX + deltaX;
        const newY = rulerState.rulerStartY + deltaY;
        
        verticalRuler.style.left = newX + 'px';
        verticalRuler.style.top = newY + 'px';
        verticalRuler.style.transform = 'none';
    }

    function stopDragVertical() {
        rulerState.isDraggingV = false;
        document.removeEventListener('pointermove', dragVerticalRuler);
        document.removeEventListener('pointerup', stopDragVertical);
    }

    function startResizeHorizontal(e) {
        e.preventDefault();
        e.stopPropagation();
        
        rulerState.isResizingH = true;
        rulerState.dragStartX = e.clientX;
        rulerState.resizeStartWidth = rulerState.horizontalWidth;
        
        document.addEventListener('pointermove', resizeHorizontalRuler);
        document.addEventListener('pointerup', stopResizeHorizontal);
    }

    function resizeHorizontalRuler(e) {
        if (!rulerState.isResizingH) return;
        
        const deltaX = e.clientX - rulerState.dragStartX;
        const newWidth = Math.max(200, rulerState.resizeStartWidth + deltaX);
        
        rulerState.horizontalWidth = newWidth;
        horizontalRuler.style.width = newWidth + 'px';
        
        updateRulerMeasurements();
    }

    function stopResizeHorizontal() {
        rulerState.isResizingH = false;
        document.removeEventListener('pointermove', resizeHorizontalRuler);
        document.removeEventListener('pointerup', stopResizeHorizontal);
    }

    function startResizeVertical(e) {
        e.preventDefault();
        e.stopPropagation();
        
        rulerState.isResizingV = true;
        rulerState.dragStartY = e.clientY;
        rulerState.resizeStartHeight = rulerState.verticalHeight;
        
        document.addEventListener('pointermove', resizeVerticalRuler);
        document.addEventListener('pointerup', stopResizeVertical);
    }

    function resizeVerticalRuler(e) {
        if (!rulerState.isResizingV) return;
        
        const deltaY = e.clientY - rulerState.dragStartY;
        const newHeight = Math.max(200, rulerState.resizeStartHeight + deltaY);
        
        rulerState.verticalHeight = newHeight;
        verticalRuler.style.height = newHeight + 'px';
        
        updateRulerMeasurements();
    }

    function stopResizeVertical() {
        rulerState.isResizingV = false;
        document.removeEventListener('pointermove', resizeVerticalRuler);
        document.removeEventListener('pointerup', stopResizeVertical);
    }

    function initializeRulers() {
        updateRulerMeasurements();
    }

    function updateRulerMeasurements() {
        // Create measurements for horizontal ruler (in meters)
        const hMeasurements = horizontalRuler.querySelector('.ruler-measurements');
        hMeasurements.innerHTML = '';
        
        const hWidth = rulerState.horizontalWidth;
        const metersPerPixel = 1 / rulerState.pixelsPerMeter;
        const totalMeters = hWidth * metersPerPixel;
        
        // Determine appropriate interval based on total length
        let meterInterval;
        if (totalMeters < 2) {
            meterInterval = 0.1; // 10cm intervals for short rulers
        } else if (totalMeters < 10) {
            meterInterval = 0.5; // 50cm intervals
        } else {
            meterInterval = 1; // 1m intervals for long rulers
        }
        
        const pixelInterval = meterInterval * rulerState.pixelsPerMeter;
        
        for (let meters = 0; meters <= totalMeters; meters += meterInterval) {
            const pixelPos = meters * rulerState.pixelsPerMeter;
            if (pixelPos > hWidth) break;
            
            const mark = document.createElement('div');
            const isMajor = Math.abs(meters % 1) < 0.01; // Major marks at whole meters
            mark.className = isMajor ? 'ruler-mark major' : 'ruler-mark minor';
            mark.style.left = pixelPos + 'px';
            
            if (isMajor) {
                const label = document.createElement('span');
                label.className = 'ruler-label';
                label.textContent = meters.toFixed(1) + 'm';
                label.style.left = (pixelPos + 5) + 'px';
                hMeasurements.appendChild(label);
            }
            
            hMeasurements.appendChild(mark);
        }
        
        // Create measurements for vertical ruler (in milliradians)
        const vMeasurements = verticalRuler.querySelector('.ruler-measurements');
        vMeasurements.innerHTML = '';
        
        const vHeight = rulerState.verticalHeight;
        // Milliradians: assume reference distance is such that pixels map to mrad
        // For simplicity: 10 pixels = 1 milliradian
        const pixelsPerMrad = 10;
        const totalMrad = vHeight / pixelsPerMrad;
        
        // Determine appropriate interval based on total length
        let mradInterval;
        if (totalMrad < 20) {
            mradInterval = 1; // 1 mrad intervals
        } else if (totalMrad < 100) {
            mradInterval = 5; // 5 mrad intervals
        } else {
            mradInterval = 10; // 10 mrad intervals
        }
        
        const mradPixelInterval = mradInterval * pixelsPerMrad;
        
        for (let mrad = 0; mrad <= totalMrad; mrad += mradInterval) {
            const pixelPos = mrad * pixelsPerMrad;
            if (pixelPos > vHeight) break;
            
            const mark = document.createElement('div');
            const isMajor = mrad % (mradInterval * 2) === 0;
            mark.className = isMajor ? 'ruler-mark major' : 'ruler-mark minor';
            mark.style.top = pixelPos + 'px';
            
            if (isMajor || mrad === 0) {
                const label = document.createElement('span');
                label.className = 'ruler-label';
                label.textContent = mrad.toFixed(0) + 'mrad';
                label.style.top = (pixelPos + 5) + 'px';
                vMeasurements.appendChild(label);
            }
            
            vMeasurements.appendChild(mark);
        }
    }

    // Service Worker registration and PWA install
    let deferredInstallPrompt = null;
    
    // iOS detection helper
    function isIOSDevice() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    }
    
    function isStandaloneMode() {
        return window.matchMedia('(display-mode: standalone)').matches 
            || window.navigator.standalone === true;
    }
    
    function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js')
                .then(registration => {
                    console.log('Service Worker registered:', registration);
                    
                    // Check for updates
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                showUpdateAvailable(newWorker);
                            }
                        });
                    });
                })
                .catch(error => {
                    console.error('Service Worker registration failed:', error);
                });
            
            // Show offline ready message when SW is controlling
            navigator.serviceWorker.ready.then(() => {
                showToast('Offline ready');
            });
        }
        
        // Handle PWA install prompt
        setupInstallPrompt();
    }
    
    function showUpdateAvailable(newWorker) {
        showToast('Update available', {
            text: 'Reload',
            callback: () => {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
            }
        });
    }
    
    function setupInstallPrompt() {
        // Detect iOS and standalone mode
        const isIOS = isIOSDevice();
        const isStandalone = isStandaloneMode();
        
        if (isIOS && !isStandalone) {
            // Show install button for iOS (will open help modal)
            if (installBtn) {
                installBtn.style.display = 'inline-block';
            }
        } else {
            // Handle beforeinstallprompt for Android/Desktop
            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                deferredInstallPrompt = e;
                
                // Show install button
                if (installBtn) {
                    installBtn.style.display = 'inline-block';
                }
            });
            
            // Handle successful install
            window.addEventListener('appinstalled', () => {
                deferredInstallPrompt = null;
                if (installBtn) {
                    installBtn.style.display = 'none';
                }
                showToast('lifePAD installed successfully');
            });
        }
    }
    
    function handleInstallClick() {
        // Detect iOS
        const isIOS = isIOSDevice();
        
        if (isIOS) {
            // Show iOS install instructions
            iosInstallModal.classList.remove('hidden');
        } else if (deferredInstallPrompt) {
            // Show install prompt for Android/Desktop
            deferredInstallPrompt.prompt();
            
            deferredInstallPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the install prompt');
                    if (installBtn) {
                        installBtn.style.display = 'none';
                    }
                } else {
                    console.log('User dismissed the install prompt');
                }
                deferredInstallPrompt = null;
            });
        }
    }
    
    function closeIosInstallModal() {
        iosInstallModal.classList.add('hidden');
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ============================================
    // COLLABORATION UI HANDLERS
    // ============================================
    
    function openCollabModal() {
        collabModal.classList.remove('hidden');
    }
    
    function closeCollabModalFn() {
        collabModal.classList.add('hidden');
    }
    
    function switchTab(tab) {
        if (tab === 'host') {
            hostTabBtn.classList.add('active');
            joinTabBtn.classList.remove('active');
            hostTab.classList.add('active');
            joinTab.classList.remove('active');
        } else {
            joinTabBtn.classList.add('active');
            hostTabBtn.classList.remove('active');
            joinTab.classList.add('active');
            hostTab.classList.remove('active');
        }
    }
    
    async function handleCreateOffer() {
        try {
            const passphrase = hostPassphrase.value.trim();
            
            if (!passphrase) {
                showCollabError('Please enter a passphrase');
                return;
            }
            
            if (passphrase.length < 8) {
                showCollabError('Passphrase must be at least 8 characters');
                return;
            }
            
            clearCollabError();
            createOfferBtn.disabled = true;
            createOfferBtn.textContent = 'Creating...';
            updateCollabStatus('Creating offer');
            
            const offerBlobObj = await RTC.createOffer(passphrase);
            
            const offerText = JSON.stringify(offerBlobObj, null, 2);
            offerBlob.value = offerText;
            offerOutput.classList.remove('hidden');
            answerInput.classList.remove('hidden');
            disconnectBtn.classList.remove('hidden');
            
            // Auto-copy to clipboard
            try {
                await copyToClipboard(offerText);
                updateCollabStatus('Waiting for answer');
                createOfferBtn.textContent = 'Offer Created (Copied!)';
                showToast('Offer copied to clipboard! Send it to your partner.');
                
                // Reset button text after delay
                setTimeout(() => {
                    if (createOfferBtn.textContent === 'Offer Created (Copied!)') {
                        createOfferBtn.textContent = 'Offer Created';
                    }
                }, BUTTON_RESET_DELAY);
            } catch (error) {
                updateCollabStatus('Waiting for answer');
                createOfferBtn.textContent = 'Offer Created';
                showToast('Offer created. Please copy it manually and send to your partner.');
            }
            
        } catch (error) {
            console.error('Create offer error:', error);
            showCollabError('Failed to create offer: ' + error.message);
            createOfferBtn.disabled = false;
            createOfferBtn.textContent = 'Create Offer';
            updateCollabStatus('Disconnected');
        }
    }
    
    async function handleApplyAnswer() {
        try {
            const answerText = answerBlobInput.value.trim();
            
            if (!answerText) {
                showCollabError('Please paste the response data');
                return;
            }
            
            let answerBlobObj;
            try {
                answerBlobObj = JSON.parse(answerText);
            } catch (e) {
                showCollabError('Invalid response data format');
                return;
            }
            
            if (answerBlobObj.app !== 'lifePAD' || answerBlobObj.v !== 1 || answerBlobObj.type !== 'answer') {
                showCollabError('Invalid response data - please check and try again');
                return;
            }
            
            clearCollabError();
            applyAnswerBtn.disabled = true;
            applyAnswerBtn.textContent = 'Connecting...';
            updateCollabStatus('Connecting');
            
            await RTC.applyAnswer(answerBlobObj);
            
            applyAnswerBtn.textContent = 'Applied';
            // Toast notification will be shown after handshake completes
            
            // Reset button text after delay
            setTimeout(() => {
                if (applyAnswerBtn.textContent === 'Applied') {
                    applyAnswerBtn.textContent = 'Connect';
                }
            }, BUTTON_RESET_DELAY);
            
        } catch (error) {
            console.error('Apply answer error:', error);
            showCollabError('Failed to apply answer: ' + error.message);
            applyAnswerBtn.disabled = false;
            applyAnswerBtn.textContent = 'Connect';
        }
    }
    
    async function handleCreateAnswer() {
        try {
            const passphrase = joinPassphrase.value.trim();
            const offerText = offerBlobInput.value.trim();
            
            if (!passphrase) {
                showCollabError('Please enter the passphrase');
                return;
            }
            
            if (passphrase.length < 8) {
                showCollabError('Passphrase must be at least 8 characters');
                return;
            }
            
            if (!offerText) {
                showCollabError('Please paste the connection data');
                return;
            }
            
            let offerBlobObj;
            try {
                offerBlobObj = JSON.parse(offerText);
            } catch (e) {
                showCollabError('Invalid connection data format');
                return;
            }
            
            if (offerBlobObj.app !== 'lifePAD' || offerBlobObj.v !== 1 || offerBlobObj.type !== 'offer') {
                showCollabError('Invalid connection data - please check and try again');
                return;
            }
            
            clearCollabError();
            createAnswerBtn.disabled = true;
            createAnswerBtn.textContent = 'Creating...';
            updateCollabStatus('Ready to join');
            
            const answerBlobObj = await RTC.createAnswer(passphrase, offerBlobObj);
            
            const answerText = JSON.stringify(answerBlobObj, null, 2);
            answerBlob.value = answerText;
            answerOutput.classList.remove('hidden');
            disconnectBtn.classList.remove('hidden');
            
            // Auto-copy to clipboard
            try {
                await copyToClipboard(answerText);
                updateCollabStatus('Connecting');
                createAnswerBtn.textContent = 'Answer Created (Copied!)';
                showToast('Answer copied to clipboard! Send it to the host.');
                
                // Reset button text after delay
                setTimeout(() => {
                    if (createAnswerBtn.textContent === 'Answer Created (Copied!)') {
                        createAnswerBtn.textContent = 'Answer Created';
                    }
                }, BUTTON_RESET_DELAY);
            } catch (error) {
                updateCollabStatus('Connecting');
                createAnswerBtn.textContent = 'Answer Created';
                showToast('Answer created. Please copy it manually and send to the host.');
            }
            
        } catch (error) {
            console.error('Create answer error:', error);
            showCollabError('Failed to create answer: ' + error.message);
            createAnswerBtn.disabled = false;
            createAnswerBtn.textContent = 'Create Answer';
            updateCollabStatus('Disconnected');
        }
    }
    
    function handleDisconnect() {
        RTC.disconnect();
        
        // Reset UI
        hostPassphrase.value = '';
        joinPassphrase.value = '';
        offerBlob.value = '';
        answerBlobInput.value = '';
        offerBlobInput.value = '';
        answerBlob.value = '';
        
        offerOutput.classList.add('hidden');
        answerInput.classList.add('hidden');
        answerOutput.classList.add('hidden');
        disconnectBtn.classList.add('hidden');
        
        createOfferBtn.disabled = false;
        createOfferBtn.textContent = 'Create Offer';
        applyAnswerBtn.disabled = false;
        applyAnswerBtn.textContent = 'Connect';
        createAnswerBtn.disabled = false;
        createAnswerBtn.textContent = 'Create Answer';
        
        clearCollabError();
        showToast('Disconnected from collaboration session');
    }
    
    function updateCollabStatus(status) {
        collabStatus.textContent = status;
        
        // Update CSS class for styling
        collabStatus.className = 'collab-status';
        
        const statusLower = status.toLowerCase().replace(/\s+/g, '-');
        collabStatus.classList.add(statusLower);
    }
    
    function showCollabError(message) {
        collabError.textContent = message;
        collabError.classList.remove('hidden');
    }
    
    function clearCollabError() {
        collabError.textContent = '';
        collabError.classList.add('hidden');
    }
    
    async function copyToClipboard(text) {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                return; // Success
            }
        } catch (error) {
            // Modern API failed, try fallback
        }
        
        // Fallback for older browsers or when modern API fails
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        
        if (!success) {
            throw new Error('Copy command failed');
        }
        // Caller handles success/error messages
    }

    // ============================================
    // SHAPE SELECTION AND MANIPULATION HELPERS
    // ============================================
    
    // Find object at given coordinates
    function findObjectAt(x, y) {
        // Search from end to start (top to bottom in z-order)
        for (let i = state.objects.length - 1; i >= 0; i--) {
            const obj = state.objects[i];
            if (obj.type === 'shape') {
                if (isPointInShape(x, y, obj)) {
                    return obj;
                }
            } else if (obj.type === 'text') {
                // Simple bounding box check for text
                const bbox = getTextBoundingBox(obj);
                if (x >= bbox.x && x <= bbox.x + bbox.width &&
                    y >= bbox.y && y <= bbox.y + bbox.height) {
                    return obj;
                }
            }
        }
        return null;
    }
    
    // Check if point is inside a shape
    function isPointInShape(x, y, obj) {
        const x1 = Math.min(obj.x1, obj.x2);
        const y1 = Math.min(obj.y1, obj.y2);
        const x2 = Math.max(obj.x1, obj.x2);
        const y2 = Math.max(obj.y1, obj.y2);
        const cx = (obj.x1 + obj.x2) / 2;
        const cy = (obj.y1 + obj.y2) / 2;
        const width = Math.abs(obj.x2 - obj.x1);
        const height = Math.abs(obj.y2 - obj.y1);
        
        switch (obj.shape) {
            case 'rectangle':
            case 'diamond':
            case 'triangle':
                // Simple bounding box check for these shapes
                return x >= x1 - 5 && x <= x2 + 5 && y >= y1 - 5 && y <= y2 + 5;
            
            case 'circle':
            case 'ellipse':
                // Ellipse contains check
                const rx = width / 2;
                const ry = height / 2;
                const dx = x - cx;
                const dy = y - cy;
                return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1.2; // 1.2 for tolerance
            
            case 'line':
            case 'arrow':
                // Distance from point to line
                const distToLine = pointToLineDistance(x, y, obj.x1, obj.y1, obj.x2, obj.y2);
                return distToLine <= 10; // 10 pixel tolerance
            
            case 'star':
                // Simple bounding box check for star
                return x >= x1 - 5 && x <= x2 + 5 && y >= y1 - 5 && y <= y2 + 5;
            
            default:
                return false;
        }
    }
    
    // Distance from point to line segment
    function pointToLineDistance(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        
        if (lenSq !== 0) {
            param = dot / lenSq;
        }
        
        let xx, yy;
        
        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }
        
        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    // Get text bounding box
    function getTextBoundingBox(obj) {
        // Approximate text dimensions
        const charWidth = 14; // Approximate character width at 24px font
        const lineHeight = 28;
        return {
            x: obj.x,
            y: obj.y,
            width: obj.text.length * charWidth,
            height: lineHeight
        };
    }
    
    // Get resize handle at coordinates
    function getResizeHandleAt(x, y, obj) {
        if (!obj || obj.type !== 'shape') return null;
        
        const x1 = Math.min(obj.x1, obj.x2);
        const y1 = Math.min(obj.y1, obj.y2);
        const x2 = Math.max(obj.x1, obj.x2);
        const y2 = Math.max(obj.y1, obj.y2);
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2;
        const handleSize = 8;
        
        // Check corner handles
        if (Math.abs(x - x1) <= handleSize && Math.abs(y - y1) <= handleSize) return 'nw';
        if (Math.abs(x - x2) <= handleSize && Math.abs(y - y1) <= handleSize) return 'ne';
        if (Math.abs(x - x1) <= handleSize && Math.abs(y - y2) <= handleSize) return 'sw';
        if (Math.abs(x - x2) <= handleSize && Math.abs(y - y2) <= handleSize) return 'se';
        
        // Check edge handles
        if (Math.abs(x - cx) <= handleSize && Math.abs(y - y1) <= handleSize) return 'n';
        if (Math.abs(x - cx) <= handleSize && Math.abs(y - y2) <= handleSize) return 's';
        if (Math.abs(x - x2) <= handleSize && Math.abs(y - cy) <= handleSize) return 'e';
        if (Math.abs(x - x1) <= handleSize && Math.abs(y - cy) <= handleSize) return 'w';
        
        return null;
    }
    
    // Redraw entire canvas with all objects
    function redrawCanvas() {
        // Clear main canvas
        const dpr = window.devicePixelRatio || 1;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
        ctx.restore();
        applyDrawTransform();
        
        // Redraw all objects
        state.objects.forEach(obj => {
            if (obj.type === 'shape') {
                drawShape(obj);
            } else if (obj.type === 'text') {
                drawText(obj);
            }
        });
        
        // Draw selection handles on overlay
        if (state.selectedObject) {
            drawSelectionHandles(state.selectedObject);
        }
    }
    
    // Draw a shape object
    function drawShape(obj) {
        const width = obj.x2 - obj.x1;
        const height = obj.y2 - obj.y1;
        
        ctx.strokeStyle = obj.color;
        ctx.lineWidth = obj.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = 1;
        
        if (obj.fill) {
            ctx.fillStyle = obj.color;
        }
        
        drawShapeGeometry(ctx, obj.x1, obj.y1, obj.x2, obj.y2, width, height, obj.shape, obj.fill);
        
        // Apply hand-drawn effect if enabled
        if (obj.handDrawn) {
            applyHandDrawnEffect(ctx, obj.x1, obj.y1, obj.x2, obj.y2, width, height, obj.shape);
        }
    }
    
    // Draw a text object
    function drawText(obj) {
        ctx.font = obj.font || '24px sans-serif';
        ctx.fillStyle = obj.color;
        ctx.textBaseline = 'top';
        ctx.fillText(obj.text, obj.x, obj.y);
    }
    
    // Draw selection handles
    function drawSelectionHandles(obj) {
        if (!obj || obj.type !== 'shape') return;
        
        // Clear overlay
        const dpr = window.devicePixelRatio || 1;
        overlayCtx.save();
        overlayCtx.setTransform(1, 0, 0, 1, 0, 0);
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        overlayCtx.restore();
        applyOverlayTransform();
        
        const x1 = Math.min(obj.x1, obj.x2);
        const y1 = Math.min(obj.y1, obj.y2);
        const x2 = Math.max(obj.x1, obj.x2);
        const y2 = Math.max(obj.y1, obj.y2);
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2;
        
        // Draw bounding box
        overlayCtx.strokeStyle = '#5a8dee';
        overlayCtx.lineWidth = 2;
        overlayCtx.setLineDash([5, 5]);
        overlayCtx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        overlayCtx.setLineDash([]);
        
        // Draw handles
        const handleSize = 8;
        overlayCtx.fillStyle = '#ffffff';
        overlayCtx.strokeStyle = '#5a8dee';
        overlayCtx.lineWidth = 2;
        
        const handles = [
            [x1, y1], [cx, y1], [x2, y1],
            [x1, cy],           [x2, cy],
            [x1, y2], [cx, y2], [x2, y2]
        ];
        
        handles.forEach(([hx, hy]) => {
            overlayCtx.fillRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
            overlayCtx.strokeRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
        });
    }

    // ============================================
    // CRYPTO MODULE - Application-layer encryption
    // ============================================
    
    const Crypto = {
        // Base64 encoding/decoding helpers
        arrayBufferToBase64(buffer) {
            const bytes = new Uint8Array(buffer);
            let binary = '';
            for (let i = 0; i < bytes.length; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return btoa(binary);
        },
        
        base64ToArrayBuffer(base64) {
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            return bytes.buffer;
        },
        
        // Generate random bytes
        generateRandomBytes(length) {
            const array = new Uint8Array(length);
            crypto.getRandomValues(array);
            return array.buffer;
        },
        
        // Derive AES-GCM key from passphrase using PBKDF2
        async deriveKey(passphrase, saltBuffer) {
            const encoder = new TextEncoder();
            const passphraseBuffer = encoder.encode(passphrase);
            
            // Import passphrase as key material
            const keyMaterial = await crypto.subtle.importKey(
                'raw',
                passphraseBuffer,
                'PBKDF2',
                false,
                ['deriveKey']
            );
            
            // Derive AES-GCM key
            const key = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: saltBuffer,
                    iterations: 150000,
                    hash: 'SHA-256'
                },
                keyMaterial,
                {
                    name: 'AES-GCM',
                    length: 256
                },
                false,
                ['encrypt', 'decrypt']
            );
            
            return key;
        },
        
        // Encrypt plaintext with AES-GCM
        async encrypt(key, plaintext) {
            const encoder = new TextEncoder();
            const plaintextBuffer = encoder.encode(plaintext);
            const iv = this.generateRandomBytes(12);
            
            const ciphertext = await crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                key,
                plaintextBuffer
            );
            
            return {
                ivB64: this.arrayBufferToBase64(iv),
                ctB64: this.arrayBufferToBase64(ciphertext)
            };
        },
        
        // Decrypt ciphertext with AES-GCM
        async decrypt(key, ivB64, ctB64) {
            const iv = this.base64ToArrayBuffer(ivB64);
            const ciphertext = this.base64ToArrayBuffer(ctB64);
            
            const plaintext = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                key,
                ciphertext
            );
            
            const decoder = new TextDecoder();
            return decoder.decode(plaintext);
        }
    };

    // ============================================
    // RTC MODULE - WebRTC connection and signaling
    // ============================================
    
    const RTC = {
        peerConnection: null,
        dataChannel: null,
        isHost: false,
        encryptionKey: null,
        salt: null,
        handshakeComplete: false,
        
        // Configuration constants
        ICE_GATHERING_TIMEOUT: 30000, // 30 seconds
        
        // STUN server configuration
        stunServers: [
            'stun:stun.l.google.com:19302',
            'stun:stun1.l.google.com:19302',
            'stun:stun2.l.google.com:19302'
        ],
        
        // Initialize peer connection
        createPeerConnection() {
            const config = {
                iceServers: this.stunServers.map(url => ({ urls: url }))
            };
            
            this.peerConnection = new RTCPeerConnection(config);
            
            // ICE candidate handling
            this.peerConnection.onicecandidate = (event) => {
                // Using non-trickle ICE, so we wait for gathering to complete
            };
            
            // Connection state changes
            this.peerConnection.onconnectionstatechange = () => {
                const state = this.peerConnection.connectionState;
                console.log('Connection state:', state);
                
                if (state === 'connected') {
                    updateCollabStatus('Connected');
                } else if (state === 'failed' || state === 'disconnected' || state === 'closed') {
                    this.handleDisconnect();
                }
            };
            
            return this.peerConnection;
        },
        
        // Create data channel (host)
        createDataChannel() {
            this.dataChannel = this.peerConnection.createDataChannel('lifepad-collab', {
                ordered: true
            });
            
            this.setupDataChannelHandlers();
            return this.dataChannel;
        },
        
        // Setup data channel event handlers
        setupDataChannelHandlers() {
            this.dataChannel.onopen = async () => {
                console.log('Data channel opened');
                // Start encrypted handshake
                await this.sendHandshake();
            };
            
            this.dataChannel.onclose = () => {
                console.log('Data channel closed');
                this.handleDisconnect();
            };
            
            this.dataChannel.onerror = (error) => {
                console.error('Data channel error:', error);
                showCollabError('Data channel error occurred');
            };
            
            this.dataChannel.onmessage = async (event) => {
                try {
                    await this.handleMessage(event.data);
                } catch (error) {
                    console.error('Message handling error:', error);
                }
            };
        },
        
        // Create offer (host)
        async createOffer(passphrase) {
            this.isHost = true;
            this.salt = Crypto.generateRandomBytes(16);
            this.encryptionKey = await Crypto.deriveKey(passphrase, this.salt);
            
            this.createPeerConnection();
            this.createDataChannel();
            
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            
            // Wait for ICE gathering to complete
            await this.waitForICEGathering();
            
            // Return offer blob
            return {
                app: 'lifePAD',
                v: 1,
                type: 'offer',
                sdp: this.peerConnection.localDescription.sdp,
                saltB64: Crypto.arrayBufferToBase64(this.salt)
            };
        },
        
        // Apply answer (host)
        async applyAnswer(answerBlob) {
            const answer = {
                type: 'answer',
                sdp: answerBlob.sdp
            };
            
            await this.peerConnection.setRemoteDescription(answer);
        },
        
        // Create answer (joiner)
        async createAnswer(passphrase, offerBlob) {
            this.isHost = false;
            this.salt = Crypto.base64ToArrayBuffer(offerBlob.saltB64);
            this.encryptionKey = await Crypto.deriveKey(passphrase, this.salt);
            
            this.createPeerConnection();
            
            // Setup data channel handler for joiner
            this.peerConnection.ondatachannel = (event) => {
                this.dataChannel = event.channel;
                this.setupDataChannelHandlers();
            };
            
            const offer = {
                type: 'offer',
                sdp: offerBlob.sdp
            };
            
            await this.peerConnection.setRemoteDescription(offer);
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            
            // Wait for ICE gathering to complete
            await this.waitForICEGathering();
            
            // Return answer blob
            return {
                app: 'lifePAD',
                v: 1,
                type: 'answer',
                sdp: this.peerConnection.localDescription.sdp,
                saltB64: offerBlob.saltB64 // Echo back salt
            };
        },
        
        // Wait for ICE gathering to complete
        waitForICEGathering() {
            return new Promise((resolve, reject) => {
                if (this.peerConnection.iceGatheringState === 'complete') {
                    resolve();
                    return;
                }
                
                const timeout = setTimeout(() => {
                    reject(new Error('ICE gathering timeout'));
                }, this.ICE_GATHERING_TIMEOUT);
                
                this.peerConnection.addEventListener('icegatheringstatechange', () => {
                    if (this.peerConnection.iceGatheringState === 'complete') {
                        clearTimeout(timeout);
                        resolve();
                    }
                });
            });
        },
        
        // Send encrypted handshake
        async sendHandshake() {
            const nonce = Crypto.arrayBufferToBase64(Crypto.generateRandomBytes(16));
            const handshake = {
                kind: 'hello',
                nonce: nonce,
                time: Date.now()
            };
            
            await this.sendEncrypted(handshake);
        },
        
        // Handle incoming message
        async handleMessage(data) {
            try {
                // Parse encrypted envelope
                const envelope = JSON.parse(data);
                
                // Decrypt payload
                const plaintext = await Crypto.decrypt(
                    this.encryptionKey,
                    envelope.ivB64,
                    envelope.ctB64
                );
                
                const message = JSON.parse(plaintext);
                
                // Route message by kind
                if (message.kind === 'hello') {
                    await this.handleHello(message);
                } else if (message.kind === 'hello_ack') {
                    await this.handleHelloAck(message);
                } else if (message.kind === 'snapshot') {
                    Sync.handleSnapshot(message);
                } else if (message.kind === 'draw_event') {
                    Sync.handleDrawEvent(message);
                }
                
            } catch (error) {
                console.error('Decryption failed:', error);
                showCollabError('Key mismatch - wrong passphrase');
                this.disconnect();
            }
        },
        
        // Complete handshake and notify user
        completeHandshake() {
            this.handshakeComplete = true;
            updateCollabStatus('Connected with peer');
            closeCollabModalFn();
            showToast('Connection established! You are now collaborating.');
        },
        
        // Handle hello handshake
        async handleHello(message) {
            // Send ack back
            const ack = {
                kind: 'hello_ack',
                nonce: message.nonce
            };
            
            await this.sendEncrypted(ack);
            
            // Complete handshake
            this.completeHandshake();
            
            // If host, send snapshot
            if (this.isHost) {
                await Sync.sendSnapshot();
            }
        },
        
        // Handle hello ack
        async handleHelloAck(message) {
            // Complete handshake
            this.completeHandshake();
        },
        
        // Send encrypted message
        async sendEncrypted(payload) {
            if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
                throw new Error('Data channel not open');
            }
            
            const plaintext = JSON.stringify(payload);
            const encrypted = await Crypto.encrypt(this.encryptionKey, plaintext);
            
            const envelope = {
                v: 1,
                ivB64: encrypted.ivB64,
                ctB64: encrypted.ctB64
            };
            
            this.dataChannel.send(JSON.stringify(envelope));
        },
        
        // Disconnect
        disconnect() {
            if (this.dataChannel) {
                this.dataChannel.close();
                this.dataChannel = null;
            }
            
            if (this.peerConnection) {
                this.peerConnection.close();
                this.peerConnection = null;
            }
            
            this.isHost = false;
            this.encryptionKey = null;
            this.salt = null;
            this.handshakeComplete = false;
            
            updateCollabStatus('Disconnected');
        },
        
        // Handle disconnect
        handleDisconnect() {
            showToast('Collaboration session ended');
            this.disconnect();
        }
    };

    // ============================================
    // SYNC MODULE - Drawing event synchronization
    // ============================================
    
    const Sync = {
        eventLog: [],
        maxEvents: 1000,
        currentStrokeId: null,
        processedEventIds: new Set(),
        strokeBeginEvents: new Map(), // Cache for stroke begin events by ID
        
        // Generate unique event ID
        generateEventId() {
            return Date.now() + '_' + Math.random().toString(36).slice(2, 11);
        },
        
        // Normalize point to 0..1 range
        normalizePoint(x, y) {
            const rect = drawCanvas.getBoundingClientRect();
            return {
                x: x / rect.width,
                y: y / rect.height
            };
        },
        
        // Denormalize point from 0..1 range
        denormalizePoint(nx, ny) {
            const rect = drawCanvas.getBoundingClientRect();
            return {
                x: nx * rect.width,
                y: ny * rect.height
            };
        },
        
        // Create stroke_begin event
        createStrokeBegin(x, y, pressure) {
            const normalized = this.normalizePoint(x, y);
            const event = {
                kind: 'draw_event',
                type: 'stroke_begin',
                id: this.generateEventId(),
                t: Date.now(),
                brush: {
                    color: state.currentColor,
                    size: state.currentSize,
                    texture: state.currentTexture,
                    erase: state.isEraser
                },
                p: {
                    x: normalized.x,
                    y: normalized.y,
                    pressure: pressure
                }
            };
            
            this.currentStrokeId = event.id;
            this.strokeBeginEvents.set(event.id, event);
            this.addEvent(event);
            return event;
        },
        
        // Create stroke_point event
        createStrokePoint(x, y, pressure) {
            if (!this.currentStrokeId) return null;
            
            const normalized = this.normalizePoint(x, y);
            const event = {
                kind: 'draw_event',
                type: 'stroke_point',
                id: this.currentStrokeId,
                t: Date.now(),
                p: {
                    x: normalized.x,
                    y: normalized.y,
                    pressure: pressure
                }
            };
            
            this.addEvent(event);
            return event;
        },
        
        // Create stroke_end event
        createStrokeEnd() {
            if (!this.currentStrokeId) return null;
            
            const event = {
                kind: 'draw_event',
                type: 'stroke_end',
                id: this.currentStrokeId,
                t: Date.now()
            };
            
            this.addEvent(event);
            this.currentStrokeId = null;
            return event;
        },
        
        // Create clear event
        createClearEvent() {
            const event = {
                kind: 'draw_event',
                type: 'clear',
                t: Date.now()
            };
            
            this.addEvent(event);
            return event;
        },
        
        // Add event to log
        addEvent(event) {
            this.eventLog.push(event);
            
            // Cap log size
            if (this.eventLog.length > this.maxEvents) {
                this.eventLog.shift();
            }
            
            // Broadcast if connected
            if (RTC.handshakeComplete) {
                RTC.sendEncrypted(event).catch(err => {
                    console.error('Failed to send event:', err);
                });
            }
        },
        
        // Send snapshot to peer
        async sendSnapshot() {
            const rect = drawCanvas.getBoundingClientRect();
            const snapshot = {
                kind: 'snapshot',
                events: this.eventLog,
                canvas: {
                    w: rect.width,
                    h: rect.height,
                    bg: canvasContainer.classList.contains('paper-mode') ? 'paper' : 'white'
                }
            };
            
            await RTC.sendEncrypted(snapshot);
        },
        
        // Handle snapshot from peer
        handleSnapshot(snapshot) {
            // Clear canvas
            const dpr = window.devicePixelRatio || 1;
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
            ctx.restore();
            applyDrawTransform();
            
            // Apply background
            if (snapshot.canvas.bg === 'paper' && !state.paperMode) {
                paperBgCheckbox.checked = true;
                togglePaperMode();
            }
            
            // Replay events
            snapshot.events.forEach(event => {
                this.replayEvent(event);
            });
            
            showToast('Canvas synchronized');
        },
        
        // Handle draw event from peer
        handleDrawEvent(event) {
            // Check for duplicates
            const eventKey = event.id + '_' + event.t;
            if (this.processedEventIds.has(eventKey)) {
                return;
            }
            this.processedEventIds.add(eventKey);
            
            // Limit processed IDs set size with FIFO approach
            if (this.processedEventIds.size > this.maxEvents) {
                // Convert to array, remove oldest items, convert back
                const ids = Array.from(this.processedEventIds);
                const toRemove = ids.slice(0, this.processedEventIds.size - this.maxEvents);
                toRemove.forEach(id => this.processedEventIds.delete(id));
            }
            
            this.replayEvent(event);
        },
        
        // Replay a single event
        replayEvent(event) {
            if (event.type === 'stroke_begin') {
                const point = this.denormalizePoint(event.p.x, event.p.y);
                
                // Cache the begin event for later lookup
                this.strokeBeginEvents.set(event.id, event);
                
                // Set brush state
                state.lastX = point.x;
                state.lastY = point.y;
                
                // Save for undo
                saveHistoryState();
                
            } else if (event.type === 'stroke_point') {
                const point = this.denormalizePoint(event.p.x, event.p.y);
                
                // Draw stroke segment
                const pressure = event.p.pressure || 1;
                
                // Get brush from cached begin event
                const beginEvent = this.strokeBeginEvents.get(event.id);
                
                if (beginEvent) {
                    // Draw with remote brush settings
                    this.drawRemoteStroke(
                        state.lastX,
                        state.lastY,
                        point.x,
                        point.y,
                        beginEvent.brush,
                        pressure
                    );
                }
                
                state.lastX = point.x;
                state.lastY = point.y;
                
            } else if (event.type === 'stroke_end') {
                // Clean up cached begin event
                this.strokeBeginEvents.delete(event.id);
                
                // Autosave
                saveCanvasToStorage();
                
            } else if (event.type === 'clear') {
                const dpr = window.devicePixelRatio || 1;
                ctx.save();
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
                ctx.restore();
                applyDrawTransform();
                saveCanvasToStorage();
            }
        },
        
        // Draw remote stroke with specified brush
        drawRemoteStroke(x1, y1, x2, y2, brush, pressure) {
            const size = brush.size * pressure;
            
            if (brush.erase) {
                drawEraser(x1, y1, x2, y2, size);
            } else {
                // Save current state
                const savedColor = state.currentColor;
                const savedTexture = state.currentTexture;
                
                // Apply remote brush
                state.currentColor = brush.color;
                state.currentTexture = brush.texture;
                
                // Draw
                switch (brush.texture) {
                    case 'ink':
                        drawInk(x1, y1, x2, y2, size);
                        break;
                    case 'pencil':
                        drawPencil(x1, y1, x2, y2, size);
                        break;
                    case 'marker':
                        drawMarker(x1, y1, x2, y2, size);
                        break;
                    case 'spray':
                        drawSpray(x1, y1, x2, y2, size);
                        break;
                    case 'charcoal':
                        drawCharcoal(x1, y1, x2, y2, size);
                        break;
                }
                
                // Restore state
                state.currentColor = savedColor;
                state.currentTexture = savedTexture;
            }
        }
    };

})();
