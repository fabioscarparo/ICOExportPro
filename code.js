// Figma Plugin - ICO Export Pro

// themeColors injects Figma's --figma-color-* CSS variables into the UI,
// so it follows the editor's light/dark theme automatically
figma.showUI(__html__, { width: 320, height: 560, themeColors: true });

const PREVIEW_SIZE = 128;

// Export a node as PNG with its longest side rendered at `size` px.
// Rendering from the vector source at each target size keeps icons crisp
// instead of rescaling a single 1x bitmap.
async function exportNodeAtSize(node, size) {
  const constraint = node.width >= node.height
    ? { type: 'WIDTH', value: size }
    : { type: 'HEIGHT', value: size };
  return node.exportAsync({ format: 'PNG', constraint });
}

// Check if node is a valid frame type
function isValidFrame(node) {
  return node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE';
}

// Get all valid frames from selection
function getValidFrames(selection) {
  return selection.filter(node => isValidFrame(node));
}

// Handle selection changes
function handleSelectionChange() {
  const selection = figma.currentPage.selection;
  const validFrames = getValidFrames(selection);

  if (selection.length === 0) {
    figma.ui.postMessage({
      type: 'selection-changed',
      hasSelection: false,
      message: 'Select frames to start',
      frames: []
    });
    return;
  }

  if (validFrames.length === 0) {
    figma.ui.postMessage({
      type: 'selection-changed',
      hasSelection: false,
      message: 'Select valid frames (Frame, Component or Instance)',
      frames: []
    });
    return;
  }

  // Valid frames selected
  const frameData = validFrames.map(node => ({
    id: node.id,
    name: node.name,
    width: Math.round(node.width),
    height: Math.round(node.height)
  }));

  figma.ui.postMessage({
    type: 'selection-changed',
    hasSelection: true,
    message: `${validFrames.length} frame${validFrames.length > 1 ? 's' : ''} selected`,
    frames: frameData
  });
}

// Listen for selection changes
figma.on('selectionchange', handleSelectionChange);

// Handle UI messages
figma.ui.onmessage = async (msg) => {
  switch (msg.type) {
    case 'get-preview': {
      const validFrames = getValidFrames(figma.currentPage.selection);

      if (validFrames.length === 0) {
        figma.ui.postMessage({
          type: 'error',
          message: 'No valid frames selected'
        });
        return;
      }

      try {
        figma.ui.postMessage({
          type: 'loading',
          message: 'Generating preview...'
        });

        // Find target frame
        const targetFrame = msg.frameId ?
          validFrames.find(f => f.id === msg.frameId) :
          validFrames[0];

        if (!targetFrame) {
          figma.ui.postMessage({
            type: 'error',
            message: 'Frame not found'
          });
          return;
        }

        const imageBytes = await exportNodeAtSize(targetFrame, PREVIEW_SIZE);

        figma.ui.postMessage({
          type: 'preview-ready',
          frameId: targetFrame.id,
          imageBytes: imageBytes,
          frameName: targetFrame.name,
          frameSize: {
            width: Math.round(targetFrame.width),
            height: Math.round(targetFrame.height)
          }
        });
      } catch (error) {
        figma.ui.postMessage({
          type: 'error',
          message: 'Preview error: ' + error.message
        });
      }
      break;
    }

    case 'batch-export': {
      const validFrames = getValidFrames(figma.currentPage.selection);
      const sizes = Array.isArray(msg.sizes) ? msg.sizes : [];

      if (validFrames.length === 0) {
        figma.ui.postMessage({
          type: 'error',
          message: 'No valid frames selected for export'
        });
        return;
      }

      if (sizes.length === 0) {
        figma.ui.postMessage({
          type: 'error',
          message: 'No valid sizes requested'
        });
        return;
      }

      try {
        figma.ui.postMessage({
          type: 'batch-started',
          totalFrames: validFrames.length
        });

        const results = [];

        for (let i = 0; i < validFrames.length; i++) {
          const frame = validFrames[i];
          const images = [];

          // Render each requested size from the source frame
          for (const size of sizes) {
            figma.ui.postMessage({
              type: 'batch-progress',
              currentFrame: i + 1,
              totalFrames: validFrames.length,
              frameName: frame.name,
              frameId: frame.id,
              size: size
            });

            try {
              const bytes = await exportNodeAtSize(frame, size);
              images.push({ size: size, bytes: bytes });
            } catch (error) {
              console.error(`Export failed for "${frame.name}" at ${size}px:`, error);
            }
          }

          if (images.length === 0) {
            figma.ui.postMessage({
              type: 'frame-export-error',
              frameId: frame.id,
              frameName: frame.name,
              error: 'Failed to export PNG'
            });
            continue;
          }

          results.push({
            frameId: frame.id,
            frameName: frame.name,
            images: images
          });
        }

        // Send all results to UI; the document name becomes the ZIP filename
        figma.ui.postMessage({
          type: 'batch-complete',
          results: results,
          fileName: figma.root.name
        });

      } catch (error) {
        figma.ui.postMessage({
          type: 'error',
          message: 'Batch export error: ' + error.message
        });
      }
      break;
    }

    case 'close-plugin':
      figma.closePlugin();
      break;
  }
};

// Initialize
handleSelectionChange();
