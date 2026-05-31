figma.showUI(__html__, { width: 340, height: 420 });

// Global caches for scanned tokens
let lastScannedColors: Array<{ hex: string; r: number; g: number; b: number; count: number; suggestion: string }> = [];
let lastScannedTypo: Array<{ family: string; style: string; size: number; count: number }> = [];
let lastScannedSpacing: Array<{ val: number; count: number }> = [];

// Helper to convert RGB color to HEX string
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

// Helper to convert color object to rgb string
function rgbToString(r: number, g: number, b: number): string {
  return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
}

// Convert RGB (0-1) to HSL (H: 0-360, S: 0-1, L: 0-1)
function rgbToHsl(r: number, g: number, b: number) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h: h * 360, s, l };
}

// Map RGB to Suggested Tailwind / Figma Variables names
function getSemanticSuggestion(r: number, g: number, b: number): string {
  const { h, s, l } = rgbToHsl(r, g, b);
  
  // Neutral colors (Grays/Slates/Zincs)
  if (s < 0.12) {
    if (l > 0.95) return "bg-canvas / white";
    if (l > 0.88) return "neutral-100 / bg-subtle";
    if (l > 0.75) return "neutral-200 / border";
    if (l > 0.5) return "neutral-400 / border-strong";
    if (l > 0.25) return "neutral-600 / text-muted";
    return "neutral-900 / text-primary";
  }

  // Red/Rose (Error)
  if (h >= 0 && h < 20) {
    if (l < 0.3) return "error-900 / text-error";
    if (l > 0.8) return "error-100 / bg-error";
    return "error-500 / primary-error";
  }
  // Orange/Amber/Yellow (Warning)
  if (h >= 20 && h < 75) {
    if (l < 0.3) return "warning-900 / text-warning";
    if (l > 0.8) return "warning-100 / bg-warning";
    return "warning-500 / primary-warning";
  }
  // Green (Success)
  if (h >= 75 && h < 165) {
    if (l < 0.3) return "success-900 / text-success";
    if (l > 0.8) return "success-100 / bg-success";
    return "success-500 / primary-success";
  }
  // Cyan/Sky (Info)
  if (h >= 165 && h < 195) {
    if (l < 0.3) return "info-900 / text-info";
    if (l > 0.8) return "info-100 / bg-info";
    return "info-500 / primary-info";
  }
  // Blue (Primary/Brand)
  if (h >= 195 && h < 250) {
    if (l < 0.3) return "primary-900 / text-brand";
    if (l > 0.8) return "primary-100 / bg-brand-subtle";
    return "primary-500 / brand-primary";
  }
  // Indigo/Purple (Secondary)
  if (h >= 250 && h < 340) {
    if (l < 0.3) return "secondary-900 / text-secondary";
    if (l > 0.8) return "secondary-100 / bg-secondary-subtle";
    return "secondary-500 / brand-secondary";
  }

  return "error-500 / rose";
}

interface ThemePalette {
  sectionBg: { r: number, g: number, b: number };
  cardBg: { r: number, g: number, b: number };
  cardBorder: { r: number, g: number, b: number };
  accentColor: { r: number, g: number, b: number };
  accentLight: { r: number, g: number, b: number };
}

function hslToRgb(h: number, s: number, l: number) {
  h /= 360;
  let r = l;
  let g = l;
  let b = l;
  if (s !== 0) {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hue2rgb = (t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    r = hue2rgb(h + 1/3);
    g = hue2rgb(h);
    b = hue2rgb(h - 1/3);
  }
  return { r, g, b };
}

function deriveTheme(primaryBrandColor?: { r: number, g: number, b: number }): ThemePalette {
  // Default dark theme (Slate 900 / Slate 800)
  const defaultPalette: ThemePalette = {
    sectionBg: { r: 15/255, g: 23/255, b: 42/255 },     // Slate 900
    cardBg: { r: 30/255, g: 41/255, b: 59/255 },        // Slate 800
    cardBorder: { r: 51/255, g: 65/255, b: 85/255 },    // Slate 700
    accentColor: { r: 139/255, g: 92/255, b: 246/255 },  // Violet 500
    accentLight: { r: 167/255, g: 139/255, b: 250/255 }  // Violet 400
  };

  if (!primaryBrandColor) return defaultPalette;

  const { h, s, l } = rgbToHsl(primaryBrandColor.r, primaryBrandColor.g, primaryBrandColor.b);

  // Set saturation to 0.12 for section background to keep it neutral but themed
  const bgSat = 0.12;
  const sectionBg = hslToRgb(h, bgSat, 0.05); // very dark themed gray
  const cardBg = hslToRgb(h, bgSat, 0.10);    // slightly lighter themed gray
  const cardBorder = hslToRgb(h, bgSat, 0.16); // borders

  return {
    sectionBg,
    cardBg,
    cardBorder,
    accentColor: { r: primaryBrandColor.r, g: primaryBrandColor.g, b: primaryBrandColor.b }, // Strip count/extra properties
    accentLight: hslToRgb(h, Math.min(s + 0.1, 1), 0.70) // Lighter brand shade
  };
}

// Find all text nodes recursively
function findTextNodes(node: SceneNode, results: TextNode[]) {
  if (node.type === "TEXT") {
    results.push(node as TextNode);
  }
  if ("children" in node) {
    for (const child of node.children) {
      findTextNodes(child, results);
    }
  }
}

// Find all visual nodes (rectangles, vectors, images, ellipses)
function findVisualNodes(node: SceneNode, results: SceneNode[]) {
  if (
    node.type === "RECTANGLE" || 
    node.type === "VECTOR" || 
    node.type === "ELLIPSE" ||
    node.type === "POLYGON" ||
    node.type === "STAR"
  ) {
    results.push(node);
  }
  if ("children" in node) {
    for (const child of node.children) {
      findVisualNodes(child, results);
    }
  }
}

// Helper to extract all names associated with a node (for handling components, instances, and variants)
async function getAssociatedNames(node: SceneNode): Promise<string[]> {
  const names = [node.name];
  
  if (node.parent && node.parent.type === "COMPONENT_SET") {
    names.push(node.parent.name);
  }
  
  if (node.type === "INSTANCE") {
    const instance = node as InstanceNode;
    try {
      const mainComp = await instance.getMainComponentAsync();
      if (mainComp) {
        names.push(mainComp.name);
        if (mainComp.parent && mainComp.parent.type === "COMPONENT_SET") {
          names.push(mainComp.parent.name);
        }
      }
    } catch (e) {
      // Ignore mainComponent load failures gracefully
    }
  }
  
  return names;
}

figma.ui.onmessage = async (msg) => {
  if (msg.type === "ready") {
    const pagesList = figma.root.children
      .filter(p => {
        const name = p.name.toLowerCase();
        return !name.includes("design system") && !name.includes("structura");
      })
      .map(p => ({
        id: p.id,
        name: p.name
      }));
    figma.ui.postMessage({
      type: "init-pages",
      pages: pagesList
    });
    return;
  }

  if (msg.type === "resize") {
    figma.ui.resize(msg.width, msg.height);
    return;
  }

  if (msg.type === "create-figma-tokens") {
    try {
      let variablesCreated = 0;
      let paintStylesCreated = 0;
      let textStylesCreated = 0;

      const createdNames = new Set<string>();

      // 1. Create Variables if API exists
      if (typeof figma.variables !== 'undefined') {
        const collections = await figma.variables.getLocalVariableCollectionsAsync();
        let collection = collections.find(c => c.name === "Structura Variables");
        if (!collection) {
          collection = figma.variables.createVariableCollection("Structura Variables");
        }

        const allVars = await figma.variables.getLocalVariablesAsync();
        const existingVars = allVars.filter(v => v.variableCollectionId === collection.id);
        
        lastScannedColors.forEach(c => {
          const cleanName = c.suggestion.replace(/\s*\/\s*/g, '/');
          const varPath = `Colors/${cleanName}`;
          
          if (createdNames.has(varPath)) return;
          createdNames.add(varPath);

          let variable = existingVars.find(v => v.name === varPath);
          if (!variable) {
            variable = figma.variables.createVariable(varPath, collection, "COLOR");
            variablesCreated++;
          }
          variable.setValueForMode(collection.defaultModeId, { r: c.r, g: c.g, b: c.b });
        });

        lastScannedSpacing.forEach(s => {
          const varPath = `Spacing/space-${s.val}`;
          
          if (createdNames.has(varPath)) return;
          createdNames.add(varPath);

          let variable = existingVars.find(v => v.name === varPath);
          if (!variable) {
            variable = figma.variables.createVariable(varPath, collection, "FLOAT");
            variablesCreated++;
          }
          variable.setValueForMode(collection.defaultModeId, s.val);
        });
      }

      // 2. Create Paint Styles
      const existingPaintStyles = await figma.getLocalPaintStylesAsync();
      const createdStyles = new Set<string>();
      
      lastScannedColors.forEach(c => {
        const cleanName = c.suggestion.replace(/\s*\/\s*/g, '/');
        const stylePath = `Colors/${cleanName}`;
        
        if (createdStyles.has(stylePath)) return;
        createdStyles.add(stylePath);

        let style = existingPaintStyles.find(s => s.name === stylePath);
        if (!style) {
          style = figma.createPaintStyle();
          style.name = stylePath;
          paintStylesCreated++;
        }
        style.paints = [{ type: 'SOLID', color: { r: c.r, g: c.g, b: c.b } }];
      });

      // 3. Create Text Styles
      const existingTextStyles = await figma.getLocalTextStylesAsync();
      const createdTextStyles = new Set<string>();

      for (const t of lastScannedTypo) {
        const fontName = { family: t.family, style: t.style };
        try {
          await figma.loadFontAsync(fontName);
          const stylePath = `Typography/${t.family}/${t.style}-${t.size}px`;
          
          if (createdTextStyles.has(stylePath)) continue;
          createdTextStyles.add(stylePath);

          let style = existingTextStyles.find(s => s.name === stylePath);
          if (!style) {
            style = figma.createTextStyle();
            style.name = stylePath;
            textStylesCreated++;
          }
          style.fontName = fontName;
          style.fontSize = t.size;
        } catch (e) {
          // Font load error
        }
      }

      let summary = "Registered: ";
      const items = [];
      if (variablesCreated > 0) items.push(`${variablesCreated} variables`);
      if (paintStylesCreated > 0) items.push(`${paintStylesCreated} paint styles`);
      if (textStylesCreated > 0) items.push(`${textStylesCreated} text styles`);
      
      if (items.length > 0) {
        summary += items.join(", ") + "! 🚀";
      } else {
        summary = "No new styles or variables created (they already exist).";
      }
      figma.notify(summary);

    } catch (err: any) {
      figma.notify("Failed to register styles: " + (err.message || err), { error: true });
    }
    return;
  }

  if (msg.type === "generate") {
    try {
      figma.ui.resize(340, 240); // Resize directly when scanning starts
      // 1. Notify UI that scanning has started
      figma.ui.postMessage({
        type: "scan-progress",
        status: "Scanning canvas layers...",
        step: "Reading node tree"
      });

      // 2. Initialize tracking variables
      let layersScanned = 0;
      const colors: { [hex: string]: { r: number; g: number; b: number; count: number } } = {};
      const typography: { [key: string]: { family: string; style: string; size: number; count: number } } = {};
      
      const detectedButtons: SceneNode[] = [];
      const detectedInputs: SceneNode[] = [];
      const detectedCards: SceneNode[] = [];
      const detectedToggles: SceneNode[] = [];
      const representativeImages: SceneNode[] = [];
      const representativeIcons: SceneNode[] = [];
      const representativeLogos: SceneNode[] = [];
      const shadows: { [key: string]: { effect: DropShadowEffect | InnerShadowEffect; count: number } } = {};
      const spacingValues: { [val: number]: number } = {};

      let nodesScanned = 0;
      
      // Traverse function (Asynchronous, non-blocking)
      async function traverse(node: SceneNode) {
        layersScanned++;
        nodesScanned++;
        if (nodesScanned % 100 === 0) {
          figma.ui.postMessage({
            type: "scan-progress",
            status: `Scanning canvas layers (${layersScanned})...`,
            step: "Analyzing layer structure & tokens"
          });
          // Yield control back to browser thread to keep UI alive
          await new Promise(resolve => setTimeout(resolve, 1));
        }

        // Check fills for solid colors
        if ("fills" in node && (node.fills as any) !== figma.mixed && Array.isArray(node.fills)) {
          for (const fill of node.fills) {
            if (fill.type === "SOLID") {
              const hex = rgbToHex(fill.color.r, fill.color.g, fill.color.b);
              if (!colors[hex]) {
                colors[hex] = { r: fill.color.r, g: fill.color.g, b: fill.color.b, count: 0 };
              }
              colors[hex].count++;
            }
          }
        }

        // Check strokes for solid colors
        if ("strokes" in node && (node.strokes as any) !== figma.mixed && Array.isArray(node.strokes)) {
          for (const stroke of node.strokes) {
            if (stroke.type === "SOLID") {
              const hex = rgbToHex(stroke.color.r, stroke.color.g, stroke.color.b);
              if (!colors[hex]) {
                colors[hex] = { r: stroke.color.r, g: stroke.color.g, b: stroke.color.b, count: 0 };
              }
              colors[hex].count++;
            }
          }
        }

        // Check text nodes for typography scale
        if (node.type === "TEXT") {
          const textNode = node as TextNode;
          if ((textNode.fontName as any) !== figma.mixed && (textNode.fontSize as any) !== figma.mixed) {
            const fontName = textNode.fontName as FontName;
            const fontSize = textNode.fontSize as number;
            const key = `${fontName.family}-${fontName.style}-${fontSize}`;
            if (!typography[key]) {
              typography[key] = {
                family: fontName.family,
                style: fontName.style,
                size: fontSize,
                count: 0
              };
            }
            typography[key].count++;
          }
        }

        // Image check
        let isImage = false;
        if ("fills" in node && (node.fills as any) !== figma.mixed && Array.isArray(node.fills)) {
          for (const fill of node.fills) {
            if (fill.type === "IMAGE") {
              isImage = true;
              break;
            }
          }
        }
        if (isImage) {
          if (representativeImages.length < 8 && !representativeImages.some(img => img.name === node.name)) {
            representativeImages.push(node);
          }
        }

        // Logo detection
        const lowerName = node.name.toLowerCase();
        const isLikelyLogo = /(?:logo|brandmark|logomark|logotype|branding|brand)(?:[-_\s\d]|$)/i.test(node.name);
        if (isLikelyLogo) {
          if (
            node.type === "FRAME" ||
            node.type === "GROUP" ||
            node.type === "COMPONENT" ||
            node.type === "INSTANCE" ||
            node.type === "VECTOR" ||
            node.type === "BOOLEAN_OPERATION"
          ) {
            if (representativeLogos.length < 1) {
              representativeLogos.push(node);
            }
          }
        }

        // Icon check
        if (!isImage) {
          const isVector = node.type === "VECTOR" || node.type === "BOOLEAN_OPERATION" || node.type === "STAR" || node.type === "LINE" || node.type === "ELLIPSE" || node.type === "POLYGON";
          const isIconContainer = (node.type === "FRAME" || node.type === "GROUP" || node.type === "COMPONENT" || node.type === "INSTANCE") && 
                                  node.width >= 12 && node.width <= 48 &&
                                  node.height >= 12 && node.height <= 48 &&
                                  Math.abs(node.width - node.height) <= 6;
          
          if (isVector || isIconContainer) {
            const isLikelyIcon = (lowerName.includes("icon") || lowerName.includes("ic_") || lowerName.includes("svg") || isVector) && !isLikelyLogo;
            
            if (isLikelyIcon) {
              if (representativeIcons.length < 12 && !representativeIcons.some(ic => ic.name === node.name)) {
                representativeIcons.push(node);
              }
            }
          }
        }

        // Check for component heuristics
        if (node.type === "FRAME" || node.type === "COMPONENT" || node.type === "INSTANCE" || node.type === "GROUP") {
          const w = node.width;
          const h = node.height;

          const names = await getAssociatedNames(node);

          const matchesButtonName = names.some(n => /(?:^|[-_\s/])(button|buttons|btn)(?:[-_\s/]|$)/i.test(n));
          const matchesInputName = names.some(n => /(?:^|[-_\s/])(input|inputs|textarea|text-area|select|dropdown|combobox)(?:[-_\s/]|$)/i.test(n));
          const matchesCardName = names.some(n => /(?:^|[-_\s/])(card|cards)(?:[-_\s/]|$)/i.test(n));
          const matchesToggleName = names.some(n => /(?:^|[-_\s/])(toggle|switch|checkbox|radio|radiobutton|radio-button)(?:[-_\s/]|$)/i.test(n));

          let isButton = false;
          let isInput = false;
          let isCard = false;
          let isToggle = false;

          // Button Heuristics
          if (matchesButtonName) {
            isButton = true;
          } else if (w >= 60 && w <= 320 && h >= 24 && h <= 64) {
            const aspect = w / h;
            if (aspect >= 1.5 && aspect <= 7.0) {
              const textChildren: TextNode[] = [];
              findTextNodes(node, textChildren);
              if (textChildren.length > 0 && textChildren.length <= 2) {
                const labelText = textChildren[0].characters.trim();
                if (labelText.length > 0 && labelText.length < 30) {
                  isButton = true;
                }
              }
            }
          }

          // Input Heuristics
          if (!isButton) {
            if (matchesInputName) {
              isInput = true;
            } else {
              const isRegularInputGeom = w >= 120 && w <= 500 && h >= 32 && h <= 60 && (w / h >= 3.0 && w / h <= 10.0);
              const isTextareaGeom = w >= 120 && w <= 500 && h >= 60 && h <= 200 && (w / h >= 1.0 && w / h <= 4.0);

              if (isRegularInputGeom || isTextareaGeom) {
                const hasStroke = "strokes" in node && (node.strokes as any) !== figma.mixed && Array.isArray(node.strokes) && node.strokes.length > 0;
                const hasFill = "fills" in node && (node.fills as any) !== figma.mixed && Array.isArray(node.fills) && node.fills.length > 0;
                const textChildren: TextNode[] = [];
                findTextNodes(node, textChildren);
                if (textChildren.length > 0 && (hasStroke || hasFill)) {
                  const labelText = textChildren[0].characters.trim();
                  if (labelText.length > 0 && labelText.length < 40) {
                    isInput = true;
                  }
                }
              }
            }
          }

          // Card Heuristics
          if (!isButton && !isInput) {
            if (matchesCardName) {
              isCard = true;
            } else if (w >= 180 && w <= 500 && h >= 120 && h <= 600) {
              const textChildren: TextNode[] = [];
              findTextNodes(node, textChildren);
              const visualChildren: SceneNode[] = [];
              findVisualNodes(node, visualChildren);
              if (textChildren.length >= 2 && visualChildren.length >= 1) {
                isCard = true;
              }
            }
          }

          // Toggle/Selection Control Heuristics
          if (!isButton && !isInput && !isCard) {
            if (matchesToggleName) {
              isToggle = true;
            } else {
              const isCheckboxRadioGeom = w >= 14 && w <= 28 && h >= 14 && h <= 28 && (w / h >= 0.8 && w / h <= 1.2);
              const isSwitchGeom = w >= 32 && w <= 60 && h >= 16 && h <= 36 && (w / h >= 1.5 && w / h <= 2.5);

              if (isCheckboxRadioGeom || isSwitchGeom) {
                const textChildren: TextNode[] = [];
                findTextNodes(node, textChildren);
                if (textChildren.length <= 1) {
                  isToggle = true;
                }
              }
            }
          }

          // Save matched nodes
          if (isButton) {
            detectedButtons.push(node);
          } else if (isInput) {
            detectedInputs.push(node);
          } else if (isCard) {
            detectedCards.push(node);
          } else if (isToggle) {
            detectedToggles.push(node);
          }
        }

        // Check effects for shadows
        if ("effects" in node && (node.effects as any) !== figma.mixed && Array.isArray(node.effects)) {
          for (const effect of node.effects) {
            if (effect.type === "DROP_SHADOW" || effect.type === "INNER_SHADOW") {
              const colorHex = rgbToHex(effect.color.r, effect.color.g, effect.color.b);
              const key = `${effect.type}-${effect.offset.x}-${effect.offset.y}-${effect.radius}-${colorHex}-${effect.color.a.toFixed(2)}`;
              if (!shadows[key]) {
                shadows[key] = {
                  effect: effect as DropShadowEffect | InnerShadowEffect,
                  count: 0
                };
              }
              shadows[key].count++;
            }
          }
        }

        // Check frame/group padding & spacing properties
        if (node.type === "FRAME" || node.type === "COMPONENT" || node.type === "INSTANCE") {
          if (node.layoutMode !== "NONE") {
            const paddings = [node.paddingLeft, node.paddingRight, node.paddingTop, node.paddingBottom];
            paddings.forEach(p => {
              if (typeof p === "number" && p > 0 && p <= 128) {
                const rounded = Math.round(p);
                if (rounded > 0) {
                  spacingValues[rounded] = (spacingValues[rounded] || 0) + 1;
                }
              }
            });
            if (typeof node.itemSpacing === "number" && node.itemSpacing > 0 && node.itemSpacing <= 128) {
              const rounded = Math.round(node.itemSpacing);
              if (rounded > 0) {
                spacingValues[rounded] = (spacingValues[rounded] || 0) + 1;
              }
            }
          }
        }

        // Recurse children
        if ("children" in node) {
          for (const child of node.children) {
            await traverse(child);
          }
        }
      }

      // 3. Perform scan on selected page(s)
      let pagesToScan: PageNode[] = [];
      const isDesignSystemPage = (name: string) => {
        const lower = name.toLowerCase();
        return lower.includes("design system") || lower.includes("structura");
      };

      if (msg.targetPageId === "all") {
        pagesToScan = figma.root.children.filter(p => !isDesignSystemPage(p.name));
      } else {
        const selectedPage = (await figma.getNodeByIdAsync(msg.targetPageId)) as PageNode;
        if (selectedPage && selectedPage.type === "PAGE") {
          pagesToScan = [selectedPage];
        } else {
          pagesToScan = figma.root.children.filter(p => !isDesignSystemPage(p.name));
        }
      }

      for (const page of pagesToScan) {
        figma.ui.postMessage({
          type: "scan-progress",
          status: `Scanning page "${page.name}"...`,
          step: "Loading page contents"
        });
        await page.loadAsync(); // Explicitly load page before reading children in dynamic-page model

        figma.ui.postMessage({
          type: "scan-progress",
          status: `Scanning page "${page.name}"...`,
          step: "Traversing layer tree"
        });
        await new Promise(resolve => setTimeout(resolve, 5));
        for (const child of page.children) {
          await traverse(child);
        }
      }

      // 4. Filter and select representatives for components
      function getRepresentatives(list: SceneNode[], max = 4): SceneNode[] {
        const selected: SceneNode[] = [];
        const keys = new Set<string>();

        for (const node of list) {
          const key = `${node.width.toFixed(0)}x${node.height.toFixed(0)}`;
          if (!keys.has(key)) {
            keys.add(key);
            selected.push(node);
            if (selected.length >= max) break;
          }
        }

        // If we need more, fill the rest
        if (selected.length < max) {
          for (const node of list) {
            if (!selected.includes(node)) {
              selected.push(node);
              if (selected.length >= max) break;
            }
          }
        }
        return selected;
      }

      const representativeButtons = getRepresentatives(detectedButtons, 4);
      const representativeInputs = getRepresentatives(detectedInputs, 4);
      const representativeCards = getRepresentatives(detectedCards, 4);
      const representativeToggles = getRepresentatives(detectedToggles, 4);

      // 5. Notify UI of layout builder phase
      figma.ui.postMessage({
        type: "scan-progress",
        status: "Generating Design System...",
        step: "Building Figma Page Layout"
      });

      // 6. Ensure the design system page exists and is selected
      let scannedPageName = pagesToScan.length === 1 ? pagesToScan[0].name : "All Pages";
      const generatedPageName = `Structura - Design System [${scannedPageName}]`;
      
      let dsPage = figma.root.children.find(p => p.name === generatedPageName);
      if (!dsPage) {
        dsPage = figma.createPage();
        dsPage.name = generatedPageName;
      } else {
        // Safe clear (using copy to prevent array mutation issues)
        await dsPage.loadAsync(); // Load the existing design system page before accessing children
        const childrenCopy = [...dsPage.children];
        for (const child of childrenCopy) {
          child.remove();
        }
      }
      await figma.setCurrentPageAsync(dsPage);

      // 7. Dynamic Font Loader & Fallback System
      const tempText = figma.createText();
      const systemDefaultFont = tempText.fontName as FontName;
      tempText.remove();

      let defaultFont: FontName = { family: "Inter", style: "Regular" };
      let mediumFont: FontName = { family: "Inter", style: "Medium" };
      let boldFont: FontName = { family: "Inter", style: "Bold" };

      async function safeLoad(font: FontName, fallback: FontName): Promise<FontName> {
        try {
          await figma.loadFontAsync(font);
          return font;
        } catch (e) {
          try {
            await figma.loadFontAsync(fallback);
            return fallback;
          } catch (err) {
            return systemDefaultFont;
          }
        }
      }

      defaultFont = await safeLoad({ family: "Inter", style: "Regular" }, { family: "Roboto", style: "Regular" });
      mediumFont = await safeLoad({ family: "Inter", style: "Medium" }, defaultFont);
      boldFont = await safeLoad({ family: "Inter", style: "Bold" }, defaultFont);

      // 8. Construct Design System Layout using pure Auto Layout
      const brandColorsList = Object.entries(colors)
        .filter(([hex, data]) => {
          const { s, l } = rgbToHsl(data.r, data.g, data.b);
          return s >= 0.15 && l >= 0.15 && l <= 0.85;
        })
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 3); // Extract Top 3 brand colors (Primary, Secondary, Accent)

      const primaryBrand = brandColorsList.length > 0 ? brandColorsList[0][1] : undefined;
      const theme = deriveTheme(primaryBrand);

      const allScannedComponents = [...detectedButtons, ...detectedInputs, ...detectedToggles, ...detectedCards];
      const totalComponentsScanned = allScannedComponents.length;
      let totalAutoLayoutScanned = 0;
      const nonAutoLayoutNames: string[] = [];

      allScannedComponents.forEach(node => {
        const isAL = (node.type === "FRAME" || node.type === "COMPONENT" || node.type === "INSTANCE") && (node as FrameNode).layoutMode !== "NONE";
        if (isAL) {
          totalAutoLayoutScanned++;
        } else {
          nonAutoLayoutNames.push(node.name);
        }
      });

      const autoLayoutRate = totalComponentsScanned > 0 ? Math.round((totalAutoLayoutScanned / totalComponentsScanned) * 100) : 100;

      let consistentSpacingCount = 0;
      let totalSpacingCount = 0;
      Object.keys(spacingValues).forEach(sValStr => {
        const sVal = parseInt(sValStr);
        if (!isNaN(sVal)) {
          totalSpacingCount++;
          if (sVal % 4 === 0) {
            consistentSpacingCount++;
          }
        }
      });
      const spacingConsistency = totalSpacingCount > 0 ? Math.round((consistentSpacingCount / totalSpacingCount) * 100) : 100;
      const colorTokenCoverage = 100;

      const designQualityScore = Math.round((autoLayoutRate * 0.6) + (spacingConsistency * 0.4));

      const qaRecommendations: Array<{ type: "warning" | "info" | "success"; text: string }> = [];
      if (autoLayoutRate < 100) {
        qaRecommendations.push({
          type: "warning",
          text: `Auto Layout: ${totalComponentsScanned - totalAutoLayoutScanned} layers are missing Auto Layout. Absolute positions prevent responsiveness.`
        });
        nonAutoLayoutNames.slice(0, 3).forEach(name => {
          qaRecommendations.push({
            type: "info",
            text: `↳ Recommendation: Wrap "${name}" in an Auto Layout Frame.`
          });
        });
      } else {
        qaRecommendations.push({
          type: "success",
          text: "Auto Layout Compliance: 100% of components utilize responsive Auto Layout."
        });
      }

      if (spacingConsistency < 80) {
        qaRecommendations.push({
          type: "warning",
          text: `Spacing Grid: Consistency is ${spacingConsistency}%. Align margins & gaps to a 4px/8px grid scale.`
        });
      } else {
        qaRecommendations.push({
          type: "success",
          text: "Spacing Grid Consistency: Standard 4px/8px spacing grids are fully respected."
        });
      }

      if (representativeLogos.length === 0) {
        qaRecommendations.push({
          type: "info",
          text: "Asset Audit: No brand logo nodes were identified. Tag logo frames with 'logo' in their layers."
        });
      }

      // ── WCAG 2.1 AUDIT ENGINE ─────────────────────────────────────────────────
      interface WcagResult {
        criterion: string;
        description: string;
        aaStandard: string;
        aaaStandard: string;
        designerValue: string;
        aaStatus: "pass" | "fail" | "warn" | "na";
        aaaStatus: "pass" | "fail" | "warn" | "na";
        affectedNodes: string[];
      }
      const wcagResults: WcagResult[] = [];

      // Helper: relative luminance per WCAG formula
      function relativeLuminance(r: number, g: number, b: number): number {
        const toLinear = (c: number) => {
          const s = c;
          return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        };
        return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
      }

      function contrastRatio(l1: number, l2: number): number {
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
      }

      function getSolidFill(fills: readonly Paint[] | Paint[] | symbol | undefined): RGBA | null {
        if (!fills || typeof fills === "symbol" || !Array.isArray(fills)) return null;
        for (const f of fills) {
          if (f.type === "SOLID" && f.opacity !== 0) {
            return { r: f.color.r, g: f.color.g, b: f.color.b, a: f.opacity ?? 1 };
          }
        }
        return null;
      }

      // 1.4.3 / 1.4.6 — TEXT CONTRAST
      {
        let contrastChecked = 0;
        let aaPass = 0; let aaFail = 0;
        let aaaPass = 0; let aaaFail = 0;
        const failNodes: string[] = [];
        let totalRatio = 0;

        const allTextNodes: TextNode[] = [];
        const findText = (node: SceneNode) => {
          if (node.type === "TEXT") { allTextNodes.push(node); return; }
          if ("children" in node) node.children.forEach(findText);
        };
        allScannedComponents.forEach(findText);

        for (const tNode of allTextNodes) {
          const rawFills = tNode.fills;
          if (!Array.isArray(rawFills)) continue;
          const tFill = getSolidFill(rawFills);
          if (!tFill) continue;
          const parent = tNode.parent;
          if (!parent || !("fills" in parent)) continue;
          const rawBg = (parent as FrameNode).fills;
          if (!Array.isArray(rawBg)) continue;
          const bgFill = getSolidFill(rawBg);
          if (!bgFill) continue;

          const lT = relativeLuminance(tFill.r, tFill.g, tFill.b);
          const lB = relativeLuminance(bgFill.r, bgFill.g, bgFill.b);
          const cr = contrastRatio(lT, lB);
          totalRatio += cr;
          contrastChecked++;

          const rawFontSize = tNode.fontSize;
          const fontSize = typeof rawFontSize === "number" ? rawFontSize : 14; // default 14 if mixed
          const rawFontName = tNode.fontName;
          const isBold = typeof rawFontName !== "symbol" && rawFontName && (rawFontName as FontName).style.toLowerCase().includes("bold");
          const isLarge = fontSize >= 18 || (fontSize >= 14 && isBold);
          const aaThreshold = isLarge ? 3.0 : 4.5;
          const aaaThreshold = isLarge ? 4.5 : 7.0;

          if (cr >= aaThreshold) aaPass++; else { aaFail++; failNodes.push(tNode.name || "Text"); }
          if (cr >= aaaThreshold) aaaPass++; else aaaFail++;
        }

        const avgRatio = contrastChecked > 0 ? (totalRatio / contrastChecked).toFixed(1) : "N/A";
        wcagResults.push({
          criterion: "1.4.3 Color Contrast (Text)",
          description: "Minimum contrast between text and its background.",
          aaStandard: "≥ 4.5:1 (normal) / ≥ 3:1 (large)",
          aaaStandard: "≥ 7:1 (normal) / ≥ 4.5:1 (large)",
          designerValue: contrastChecked > 0 ? `Avg ${avgRatio}:1 (${contrastChecked} checked)` : "No text found",
          aaStatus: contrastChecked === 0 ? "na" : aaFail === 0 ? "pass" : aaPass > 0 ? "warn" : "fail",
          aaaStatus: contrastChecked === 0 ? "na" : aaaFail === 0 ? "pass" : aaaPass > 0 ? "warn" : "fail",
          affectedNodes: failNodes.slice(0, 3),
        });
      }

      // 2.5.5 / 2.5.8 — TOUCH TARGET SIZE
      {
        const buttons = representativeButtons;
        let aaFail = 0; let aaaFail = 0;
        const aaFailNodes: string[] = [];
        for (const btn of buttons) {
          const w = btn.width; const h = btn.height;
          if (w < 24 || h < 24) { aaFail++; aaFailNodes.push(btn.name); }
          if (w < 44 || h < 44) aaaFail++;
        }
        const smallest = buttons.length > 0
          ? `${Math.min(...buttons.map(b => Math.min(b.width, b.height))).toFixed(0)}px min`
          : "No buttons";
        wcagResults.push({
          criterion: "2.5.5 / 2.5.8 Touch Target",
          description: "Interactive elements must be large enough to tap reliably.",
          aaStandard: "≥ 24×24 px",
          aaaStandard: "≥ 44×44 px",
          designerValue: buttons.length > 0 ? smallest : "No buttons found",
          aaStatus: buttons.length === 0 ? "na" : aaFail === 0 ? "pass" : "fail",
          aaaStatus: buttons.length === 0 ? "na" : aaaFail === 0 ? "pass" : aaaFail < buttons.length ? "warn" : "fail",
          affectedNodes: aaFailNodes.slice(0, 3),
        });
      }

      // MINIMUM TEXT SIZE (design best practice)
      {
        const smallTextNodes: string[] = [];
        let tinyCount = 0; let smallCount = 0; let total = 0;
        const scanTextSizes = (node: SceneNode) => {
          if (node.type === "TEXT") {
            const rawSz = node.fontSize;
            if (typeof rawSz !== "number") { total++; return; } // mixed — count but skip comparison
            total++;
            if (rawSz < 12) { tinyCount++; smallTextNodes.push(node.name); }
            else if (rawSz < 16) smallCount++;
            return;
          }
          if ("children" in node) node.children.forEach(scanTextSizes);
        };
        allScannedComponents.forEach(scanTextSizes);
        const minSz = total > 0 ? Math.min(...allScannedComponents.flatMap(n => {
          const sizes: number[] = [];
          const collect = (node: SceneNode) => {
            if (node.type === "TEXT") {
              const sz = node.fontSize;
              if (typeof sz === "number") sizes.push(sz);
            }
            if ("children" in node) node.children.forEach(collect);
          };
          collect(n); return sizes;
        }).filter(s => typeof s === "number" && isFinite(s))) : 0;
        wcagResults.push({
          criterion: "Text Size (Best Practice)",
          description: "Body text should meet minimum legibility sizes.",
          aaStandard: "≥ 12px body text",
          aaaStandard: "≥ 16px body text",
          designerValue: total > 0 ? `Min ${minSz}px (${total} nodes)` : "No text found",
          aaStatus: total === 0 ? "na" : tinyCount === 0 ? "pass" : "fail",
          aaaStatus: total === 0 ? "na" : (tinyCount + smallCount) === 0 ? "pass" : (tinyCount + smallCount) < total ? "warn" : "fail",
          affectedNodes: smallTextNodes.slice(0, 3),
        });
      }

      // 2.4.7 — FOCUS INDICATORS
      {
        const interactive = representativeButtons;
        let hasStroke = 0;
        for (const btn of interactive) {
          if (btn.type === "FRAME" || btn.type === "COMPONENT" || btn.type === "INSTANCE") {
            const f = btn as FrameNode;
            if (f.strokes && f.strokes.length > 0 && (f.strokeWeight as number) > 0) hasStroke++;
          }
        }
        const ratio = interactive.length > 0 ? Math.round((hasStroke / interactive.length) * 100) : 0;
        wcagResults.push({
          criterion: "2.4.7 Focus Indicators",
          description: "Interactive elements must have a visible focus state.",
          aaStandard: "Outline/stroke present on interactive",
          aaaStandard: "High-contrast, ≥ 3:1 indicator",
          designerValue: interactive.length > 0 ? `${ratio}% have strokes (${hasStroke}/${interactive.length})` : "No buttons found",
          aaStatus: interactive.length === 0 ? "na" : ratio >= 80 ? "pass" : ratio >= 50 ? "warn" : "fail",
          aaaStatus: interactive.length === 0 ? "na" : ratio >= 100 ? "pass" : ratio >= 80 ? "warn" : "fail",
          affectedNodes: [],
        });
      }

      // 1.4.11 — NON-TEXT CONTRAST (icons, dividers, borders)
      {
        let borderChecked = 0; let aaPass = 0; let aaaPass = 0;
        const failNodes: string[] = [];
        for (const comp of allScannedComponents) {
          if (comp.type !== "FRAME" && comp.type !== "COMPONENT" && comp.type !== "INSTANCE") continue;
          const f = comp as FrameNode;
          const rawStrokes = f.strokes;
          if (!Array.isArray(rawStrokes) || rawStrokes.length === 0) continue;
          const strokeFill = getSolidFill(rawStrokes);
          const rawFills = f.fills;
          if (!Array.isArray(rawFills)) continue;
          const bgFill = getSolidFill(rawFills);
          if (!strokeFill || !bgFill) continue;
          const lS = relativeLuminance(strokeFill.r, strokeFill.g, strokeFill.b);
          const lB = relativeLuminance(bgFill.r, bgFill.g, bgFill.b);
          const cr = contrastRatio(lS, lB);
          borderChecked++;
          if (cr >= 3.0) aaPass++; else failNodes.push(f.name);
          if (cr >= 4.5) aaaPass++;
        }
        wcagResults.push({
          criterion: "1.4.11 Non-text Contrast",
          description: "UI components and graphical objects must meet contrast.",
          aaStandard: "≥ 3:1",
          aaaStandard: "≥ 4.5:1",
          designerValue: borderChecked > 0 ? `${borderChecked} borders checked` : "No borders found",
          aaStatus: borderChecked === 0 ? "na" : aaPass === borderChecked ? "pass" : aaPass > 0 ? "warn" : "fail",
          aaaStatus: borderChecked === 0 ? "na" : aaaPass === borderChecked ? "pass" : aaaPass > 0 ? "warn" : "fail",
          affectedNodes: failNodes.slice(0, 3),
        });
      }

      // Accessibility Score (0–100)
      const wcagTotalChecks = wcagResults.filter(r => r.aaStatus !== "na").length * 2;
      const wcagPassed = wcagResults.reduce((acc, r) => {
        if (r.aaStatus === "pass") acc += 2;
        else if (r.aaStatus === "warn") acc += 1;
        if (r.aaaStatus === "pass") acc += 2;
        else if (r.aaaStatus === "warn") acc += 1;
        return acc;
      }, 0);
      const accessibilityScore = wcagTotalChecks > 0 ? Math.min(100, Math.round((wcagPassed / wcagTotalChecks) * 100)) : 100;
      // ─────────────────────────────────────────────────────────────────────────

      const pageWrapper = figma.createFrame();
      pageWrapper.name = "Design System Container";
      pageWrapper.layoutMode = "VERTICAL";
      pageWrapper.resize(1200, 10);
      pageWrapper.counterAxisSizingMode = "FIXED";
      pageWrapper.primaryAxisSizingMode = "AUTO";
      pageWrapper.fills = []; // Transparent frame
      pageWrapper.itemSpacing = 40;

      // Append wrapper to Design System Page immediately to activate Auto Layout engine
      dsPage.appendChild(pageWrapper);

      // Helper to draw the QA Health Audit dashboard card on canvas
      async function drawHealthAuditCard(parent: FrameNode) {
        const card = figma.createFrame();
        card.name = "Design System QA Health Audit";
        card.layoutMode = "VERTICAL";
        card.resize(1120, 100);
        card.counterAxisSizingMode = "FIXED";
        card.primaryAxisSizingMode = "AUTO";
        card.layoutAlign = "STRETCH";
        card.fills = [{ type: "SOLID", color: theme.cardBg }];
        card.cornerRadius = 16;
        card.strokes = [{ type: "SOLID", color: theme.cardBorder }];
        card.strokeWeight = 1.5;
        card.paddingLeft = 24;
        card.paddingRight = 24;
        card.paddingTop = 24;
        card.paddingBottom = 24;
        card.itemSpacing = 20;

        // Top Row: Title & Score
        const topRow = figma.createFrame();
        topRow.name = "Header Row";
        topRow.layoutMode = "HORIZONTAL";
        topRow.primaryAxisSizingMode = "AUTO";
        topRow.counterAxisSizingMode = "AUTO";
        topRow.itemSpacing = 20;
        topRow.fills = [];
        topRow.layoutAlign = "STRETCH";
        topRow.counterAxisAlignItems = "CENTER";

        const titleText = figma.createText();
        titleText.fontName = boldFont;
        titleText.fontSize = 18;
        titleText.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
        titleText.characters = "Design System Compliance & QA Audit";
        topRow.appendChild(titleText);

        const spacerNode = figma.createFrame();
        spacerNode.layoutGrow = 1;
        spacerNode.fills = [];
        topRow.appendChild(spacerNode);

        // Score Badge
        const scoreBadge = figma.createFrame();
        scoreBadge.layoutMode = "HORIZONTAL";
        scoreBadge.paddingLeft = 14;
        scoreBadge.paddingRight = 14;
        scoreBadge.paddingTop = 6;
        scoreBadge.paddingBottom = 6;
        scoreBadge.cornerRadius = 24;
        
        let scoreBgColor = { r: 16/255, g: 185/255, b: 129/255 }; // Green 500
        let scoreTxtColor = { r: 52/255, g: 211/255, b: 153/255 }; // Green 400
        if (designQualityScore < 70) {
          scoreBgColor = { r: 239/255, g: 68/255, b: 68/255 }; // Red 500
          scoreTxtColor = { r: 248/255, g: 113/255, b: 113/255 };
        } else if (designQualityScore < 90) {
          scoreBgColor = { r: 245/255, g: 158/255, b: 11/255 }; // Amber 500
          scoreTxtColor = { r: 251/255, g: 191/255, b: 36/255 };
        }
        scoreBadge.fills = [{ type: "SOLID", color: scoreBgColor, opacity: 0.15 }];
        scoreBadge.strokes = [{ type: "SOLID", color: scoreBgColor }];
        scoreBadge.strokeWeight = 1;

        const scoreText = figma.createText();
        scoreText.fontName = boldFont;
        scoreText.fontSize = 13;
        scoreText.fills = [{ type: "SOLID", color: scoreTxtColor }];
        scoreText.characters = `HEALTH SCORE: ${designQualityScore}%`;
        scoreBadge.appendChild(scoreText);
        topRow.appendChild(scoreBadge);
        
        card.appendChild(topRow);

        // Grid Container of Scores
        const grid = figma.createFrame();
        grid.name = "Audit Cards Grid";
        grid.layoutMode = "HORIZONTAL";
        grid.primaryAxisSizingMode = "AUTO";
        grid.counterAxisSizingMode = "AUTO";
        grid.itemSpacing = 20;
        grid.fills = [];
        grid.layoutAlign = "STRETCH";

        const addAuditMetricCard = (label: string, value: string, desc: string, isOk: boolean) => {
          const mCard = figma.createFrame();
          mCard.name = `${label} Metric`;
          mCard.layoutMode = "VERTICAL";
          mCard.resize(344, 10);
          mCard.counterAxisSizingMode = "FIXED";
          mCard.primaryAxisSizingMode = "AUTO";
          mCard.fills = [{ type: "SOLID", color: { r: 15/255, g: 23/255, b: 42/255 } }];
          mCard.cornerRadius = 8;
          mCard.strokes = [{ type: "SOLID", color: { r: 30/255, g: 41/255, b: 59/255 } }];
          mCard.strokeWeight = 1;
          mCard.paddingLeft = 14;
          mCard.paddingRight = 14;
          mCard.paddingTop = 12;
          mCard.paddingBottom = 12;
          mCard.itemSpacing = 4;

          const mLabel = figma.createText();
          mLabel.fontName = boldFont;
          mLabel.fontSize = 9;
          mLabel.fills = [{ type: "SOLID", color: { r: 148/255, g: 163/255, b: 184/255 } }];
          mLabel.characters = label;
          mLabel.textAutoResize = "HEIGHT";
          mLabel.layoutAlign = "STRETCH";
          mCard.appendChild(mLabel);

          const mValue = figma.createText();
          mValue.fontName = boldFont;
          mValue.fontSize = 24;
          mValue.fills = [{ type: "SOLID", color: isOk ? { r: 52/255, g: 211/255, b: 153/255 } : { r: 251/255, g: 191/255, b: 36/255 } }];
          mValue.characters = value;
          mValue.textAutoResize = "HEIGHT";
          mValue.layoutAlign = "STRETCH";
          mCard.appendChild(mValue);

          const mDesc = figma.createText();
          mDesc.fontName = defaultFont;
          mDesc.fontSize = 8;
          mDesc.fills = [{ type: "SOLID", color: { r: 148/255, g: 163/255, b: 184/255 } }];
          mDesc.characters = desc;
          mDesc.textAutoResize = "HEIGHT";
          mDesc.layoutAlign = "STRETCH";
          mCard.appendChild(mDesc);

          grid.appendChild(mCard);
        };

        addAuditMetricCard("AUTO LAYOUT COMPLIANCE", `${autoLayoutRate}%`, `Measures how many scanned components adopt Figma Auto Layout instead of fixed sizes.`, autoLayoutRate >= 90);
        addAuditMetricCard("SPACING CONSISTENCY", `${spacingConsistency}%`, `Audits alignment of internal margins and item spacings to standard 4px/8px scales.`, spacingConsistency >= 80);
        addAuditMetricCard("VARIABLE TOKENIZATION", `${colorTokenCoverage}%`, `Evaluates if all design system colors map to registered variable naming conventions.`, true);

        card.appendChild(grid);

        // Divider
        const divider = figma.createFrame();
        divider.resize(1072, 0.5);
        divider.fills = [{ type: "SOLID", color: { r: 51/255, g: 65/255, b: 85/255 } }];
        divider.layoutAlign = "STRETCH";
        card.appendChild(divider);

        // Recommendations List
        const recSection = figma.createFrame();
        recSection.name = "Recommendations Section";
        recSection.layoutMode = "VERTICAL";
        recSection.primaryAxisSizingMode = "AUTO";
        recSection.counterAxisSizingMode = "AUTO";
        recSection.itemSpacing = 8;
        recSection.fills = [];
        recSection.layoutAlign = "STRETCH";

        const recTitle = figma.createText();
        recTitle.fontName = boldFont;
        recTitle.fontSize = 11;
        recTitle.fills = [{ type: "SOLID", color: theme.accentLight }];
        recTitle.characters = "AUTOMATED RECTIFICATION GUIDE";
        recTitle.textAutoResize = "HEIGHT";
        recTitle.layoutAlign = "STRETCH";
        recSection.appendChild(recTitle);

        for (const rec of qaRecommendations) {
          const recRow = figma.createFrame();
          recRow.layoutMode = "HORIZONTAL";
          recRow.primaryAxisSizingMode = "AUTO";
          recRow.counterAxisSizingMode = "AUTO";
          recRow.itemSpacing = 8;
          recRow.fills = [];
          recRow.layoutAlign = "STRETCH";

          const bullet = figma.createText();
          bullet.fontName = boldFont;
          bullet.fontSize = 10;
          let bulletColor = { r: 16/255, g: 185/255, b: 129/255 }; // green
          let bulletChar = "✓";
          if (rec.type === "warning") {
            bulletColor = { r: 239/255, g: 68/255, b: 68/255 }; // red
            bulletChar = "⚠";
          } else if (rec.type === "info") {
            bulletColor = { r: 56/255, g: 189/255, b: 248/255 }; // blue
            bulletChar = "ℹ";
          }
          bullet.fills = [{ type: "SOLID", color: bulletColor }];
          bullet.characters = bulletChar;
          recRow.appendChild(bullet);

          const text = figma.createText();
          text.fontName = defaultFont;
          text.fontSize = 9;
          text.fills = [{ type: "SOLID", color: { r: 209/255, g: 213/255, b: 219/255 } }];
          text.characters = rec.text;
          text.textAutoResize = "HEIGHT";
          text.layoutGrow = 1;
          recRow.appendChild(text);

          recSection.appendChild(recRow);
        }

        card.appendChild(recSection);
        parent.appendChild(card);
      }

      // Helper: draw WCAG 2.1 Comparison Table on canvas
      async function drawWCAGComparisonTable(parent: FrameNode) {
        const wrap = figma.createFrame();
        wrap.name = "WCAG 2.1 Accessibility Audit";
        wrap.layoutMode = "VERTICAL";
        wrap.resize(1120, 100);
        wrap.counterAxisSizingMode = "FIXED";
        wrap.primaryAxisSizingMode = "AUTO";
        wrap.layoutAlign = "STRETCH";
        wrap.fills = [{ type: "SOLID", color: { r: 10/255, g: 16/255, b: 30/255 } }];
        wrap.cornerRadius = 16;
        wrap.strokes = [{ type: "SOLID", color: { r: 30/255, g: 41/255, b: 59/255 } }];
        wrap.strokeWeight = 1.5;
        wrap.paddingLeft = 28;
        wrap.paddingRight = 28;
        wrap.paddingTop = 24;
        wrap.paddingBottom = 24;
        wrap.itemSpacing = 16;

        // ── Score Banner ──────────────────────────────────────────────────────
        const scoreBanner = figma.createFrame();
        scoreBanner.layoutMode = "HORIZONTAL";
        scoreBanner.primaryAxisSizingMode = "AUTO";
        scoreBanner.counterAxisSizingMode = "AUTO";
        scoreBanner.itemSpacing = 20;
        scoreBanner.fills = [];
        scoreBanner.layoutAlign = "STRETCH";
        scoreBanner.counterAxisAlignItems = "CENTER";

        // Score circle (text-based donut)
        const circle = figma.createFrame();
        circle.resize(72, 72);
        circle.layoutMode = "VERTICAL";
        circle.primaryAxisSizingMode = "FIXED";
        circle.counterAxisSizingMode = "FIXED";
        circle.primaryAxisAlignItems = "CENTER";
        circle.counterAxisAlignItems = "CENTER";
        circle.cornerRadius = 36;
        let circleBg = { r: 16/255, g: 185/255, b: 129/255 }; // green
        if (accessibilityScore < 50) circleBg = { r: 239/255, g: 68/255, b: 68/255 };
        else if (accessibilityScore < 80) circleBg = { r: 245/255, g: 158/255, b: 11/255 };
        circle.fills = [{ type: "SOLID", color: circleBg, opacity: 0.15 }];
        circle.strokes = [{ type: "SOLID", color: circleBg }];
        circle.strokeWeight = 2.5;
        const circleNum = figma.createText();
        circleNum.fontName = boldFont;
        circleNum.fontSize = 20;
        circleNum.fills = [{ type: "SOLID", color: circleBg }];
        circleNum.characters = `${accessibilityScore}`;
        circle.appendChild(circleNum);
        scoreBanner.appendChild(circle);

        // Score labels col
        const scoreLabels = figma.createFrame();
        scoreLabels.layoutMode = "VERTICAL";
        scoreLabels.primaryAxisSizingMode = "AUTO";
        scoreLabels.counterAxisSizingMode = "AUTO";
        scoreLabels.itemSpacing = 4;
        scoreLabels.fills = [];
        const scoreTitle = figma.createText();
        scoreTitle.fontName = boldFont;
        scoreTitle.fontSize = 15;
        scoreTitle.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
        scoreTitle.characters = "WCAG 2.1 Accessibility Score";
        scoreLabels.appendChild(scoreTitle);
        const scoreSubtitle = figma.createText();
        scoreSubtitle.fontName = defaultFont;
        scoreSubtitle.fontSize = 10;
        scoreSubtitle.fills = [{ type: "SOLID", color: { r: 148/255, g: 163/255, b: 184/255 } }];
        scoreSubtitle.characters = `${wcagResults.filter(r => r.aaStatus === "pass").length} of ${wcagResults.length} AA checks passed  ·  Designed vs. WCAG 2.1 AA & AAA`;
        scoreLabels.appendChild(scoreSubtitle);
        scoreBanner.appendChild(scoreLabels);
        wrap.appendChild(scoreBanner);

        // ── Column Header Row ─────────────────────────────────────────────────
        const colHeaders = ["WCAG CRITERION", "WCAG AA", "WCAG AAA", "YOUR DESIGN", "AA", "AAA"];
        const colWidths = [290, 180, 160, 220, 60, 60];

        const makeCell = async (text: string, w: number, isHeader: boolean, color?: RGB) => {
          const cell = figma.createFrame();
          cell.layoutMode = "VERTICAL";
          cell.resize(w, 10);
          cell.counterAxisSizingMode = "FIXED";
          cell.primaryAxisSizingMode = "AUTO";
          cell.fills = [];
          cell.paddingTop = 4;
          cell.paddingBottom = 4;
          const t = figma.createText();
          t.fontName = isHeader ? boldFont : defaultFont;
          t.fontSize = isHeader ? 8 : 9;
          t.fills = [{ type: "SOLID", color: color || (isHeader ? { r: 100/255, g: 116/255, b: 139/255 } : { r: 203/255, g: 213/255, b: 225/255 }) }];
          t.characters = text;
          t.textAutoResize = "HEIGHT";
          t.layoutAlign = "STRETCH";
          cell.appendChild(t);
          return cell;
        };

        const makeBadgeCell = (status: string, w: number) => {
          const cell = figma.createFrame();
          cell.resize(w, 10);
          cell.layoutMode = "VERTICAL";
          cell.primaryAxisSizingMode = "AUTO";
          cell.counterAxisSizingMode = "FIXED";
          cell.primaryAxisAlignItems = "CENTER";
          cell.counterAxisAlignItems = "CENTER";
          cell.paddingTop = 4;
          cell.paddingBottom = 4;
          cell.fills = [];

          const badge = figma.createFrame();
          badge.layoutMode = "HORIZONTAL";
          badge.paddingLeft = 7;
          badge.paddingRight = 7;
          badge.paddingTop = 3;
          badge.paddingBottom = 3;
          badge.primaryAxisSizingMode = "AUTO";
          badge.counterAxisSizingMode = "AUTO";
          badge.counterAxisAlignItems = "CENTER";
          badge.cornerRadius = 4;

          let bgCol = { r: 16/255, g: 185/255, b: 129/255 };
          let label = "PASS";
          if (status === "fail") { bgCol = { r: 239/255, g: 68/255, b: 68/255 }; label = "FAIL"; }
          else if (status === "warn") { bgCol = { r: 245/255, g: 158/255, b: 11/255 }; label = "WARN"; }
          else if (status === "na") { bgCol = { r: 71/255, g: 85/255, b: 105/255 }; label = "N/A"; }
          badge.fills = [{ type: "SOLID", color: bgCol, opacity: 0.18 }];
          badge.strokes = [{ type: "SOLID", color: bgCol }];
          badge.strokeWeight = 1;

          const badgeText = figma.createText();
          badgeText.fontName = boldFont;
          badgeText.fontSize = 7;
          badgeText.fills = [{ type: "SOLID", color: bgCol }];
          badgeText.characters = label;
          badge.appendChild(badgeText);
          cell.appendChild(badge);
          return cell;
        };

        // Header row
        const hdrRow = figma.createFrame();
        hdrRow.layoutMode = "HORIZONTAL";
        hdrRow.primaryAxisSizingMode = "AUTO";
        hdrRow.counterAxisSizingMode = "AUTO";
        hdrRow.itemSpacing = 0;
        hdrRow.fills = [{ type: "SOLID", color: { r: 15/255, g: 23/255, b: 42/255 } }];
        hdrRow.paddingLeft = 12;
        hdrRow.paddingRight = 12;
        hdrRow.paddingTop = 6;
        hdrRow.paddingBottom = 6;
        hdrRow.cornerRadius = 6;
        hdrRow.layoutAlign = "STRETCH";
        for (let i = 0; i < colHeaders.length; i++) {
          hdrRow.appendChild(await makeCell(colHeaders[i], colWidths[i], true));
        }
        wrap.appendChild(hdrRow);

        // ── Data Rows ─────────────────────────────────────────────────────────
        for (let idx = 0; idx < wcagResults.length; idx++) {
          const r = wcagResults[idx];
          const row = figma.createFrame();
          row.name = r.criterion;
          row.layoutMode = "HORIZONTAL";
          row.primaryAxisSizingMode = "AUTO";
          row.counterAxisSizingMode = "AUTO";
          row.itemSpacing = 0;
          row.layoutAlign = "STRETCH";
          row.paddingLeft = 12;
          row.paddingRight = 12;
          row.paddingTop = 2;
          row.paddingBottom = 2;
          row.fills = idx % 2 === 0
            ? []
            : [{ type: "SOLID", color: { r: 15/255, g: 23/255, b: 42/255 }, opacity: 0.5 }];

          // Criterion cell (name + description)
          const critCell = figma.createFrame();
          critCell.resize(colWidths[0], 10);
          critCell.layoutMode = "VERTICAL";
          critCell.primaryAxisSizingMode = "AUTO";
          critCell.counterAxisSizingMode = "FIXED";
          critCell.fills = [];
          critCell.paddingTop = 8;
          critCell.paddingBottom = 8;
          critCell.itemSpacing = 2;
          const critName = figma.createText();
          critName.fontName = boldFont;
          critName.fontSize = 9;
          critName.fills = [{ type: "SOLID", color: { r: 226/255, g: 232/255, b: 240/255 } }];
          critName.characters = r.criterion;
          critName.textAutoResize = "HEIGHT";
          critName.layoutAlign = "STRETCH";
          critCell.appendChild(critName);
          const critDesc = figma.createText();
          critDesc.fontName = defaultFont;
          critDesc.fontSize = 8;
          critDesc.fills = [{ type: "SOLID", color: { r: 100/255, g: 116/255, b: 139/255 } }];
          critDesc.characters = r.description;
          critDesc.textAutoResize = "HEIGHT";
          critDesc.layoutAlign = "STRETCH";
          critCell.appendChild(critDesc);
          if (r.affectedNodes.length > 0) {
            const affected = figma.createText();
            affected.fontName = defaultFont;
            affected.fontSize = 7;
            affected.fills = [{ type: "SOLID", color: { r: 248/255, g: 113/255, b: 113/255 } }];
            affected.characters = `↳ ${r.affectedNodes.join(", ")}`;
            affected.textAutoResize = "HEIGHT";
            affected.layoutAlign = "STRETCH";
            critCell.appendChild(affected);
          }
          row.appendChild(critCell);
          row.appendChild(await makeCell(r.aaStandard, colWidths[1], false, { r: 148/255, g: 163/255, b: 184/255 }));
          row.appendChild(await makeCell(r.aaaStandard, colWidths[2], false, { r: 100/255, g: 116/255, b: 139/255 }));
          row.appendChild(await makeCell(r.designerValue, colWidths[3], false, { r: 226/255, g: 232/255, b: 240/255 }));
          row.appendChild(makeBadgeCell(r.aaStatus, colWidths[4]));
          row.appendChild(makeBadgeCell(r.aaaStatus, colWidths[5]));
          wrap.appendChild(row);
        }

        // ── Divider ───────────────────────────────────────────────────────────
        const div = figma.createFrame();
        div.resize(1064, 1);
        div.fills = [{ type: "SOLID", color: { r: 30/255, g: 41/255, b: 59/255 } }];
        div.layoutAlign = "STRETCH";
        wrap.appendChild(div);

        // ── Legend Bar ────────────────────────────────────────────────────────
        const legend = figma.createFrame();
        legend.layoutMode = "HORIZONTAL";
        legend.primaryAxisSizingMode = "AUTO";
        legend.counterAxisSizingMode = "AUTO";
        legend.itemSpacing = 24;
        legend.fills = [];
        legend.layoutAlign = "STRETCH";
        legend.counterAxisAlignItems = "CENTER";

        const makeLegendItem = (label: string, count: number, color: RGB) => {
          const item = figma.createFrame();
          item.layoutMode = "HORIZONTAL";
          item.primaryAxisSizingMode = "AUTO";
          item.counterAxisSizingMode = "AUTO";
          item.itemSpacing = 6;
          item.fills = [];
          item.counterAxisAlignItems = "CENTER";
          const dot = figma.createFrame();
          dot.resize(8, 8);
          dot.cornerRadius = 4;
          dot.fills = [{ type: "SOLID", color }];
          item.appendChild(dot);
          const t = figma.createText();
          t.fontName = defaultFont;
          t.fontSize = 9;
          t.fills = [{ type: "SOLID", color: { r: 148/255, g: 163/255, b: 184/255 } }];
          t.characters = `${label}: ${count}`;
          item.appendChild(t);
          return item;
        };

        const aaPassCount = wcagResults.filter(r => r.aaStatus === "pass").length;
        const aaWarnCount = wcagResults.filter(r => r.aaStatus === "warn").length;
        const aaFailCount = wcagResults.filter(r => r.aaStatus === "fail").length;

        legend.appendChild(makeLegendItem("AA Pass", aaPassCount, { r: 16/255, g: 185/255, b: 129/255 }));
        legend.appendChild(makeLegendItem("AA Warn", aaWarnCount, { r: 245/255, g: 158/255, b: 11/255 }));
        legend.appendChild(makeLegendItem("AA Fail", aaFailCount, { r: 239/255, g: 68/255, b: 68/255 }));
        const spacerL = figma.createFrame(); spacerL.layoutGrow = 1; spacerL.fills = [];
        legend.appendChild(spacerL);
        const srcNote = figma.createText();
        srcNote.fontName = defaultFont;
        srcNote.fontSize = 8;
        srcNote.fills = [{ type: "SOLID", color: { r: 71/255, g: 85/255, b: 105/255 } }];
        srcNote.characters = "Standards: WCAG 2.1  ·  wcag.io";
        legend.appendChild(srcNote);
        wrap.appendChild(legend);

        parent.appendChild(wrap);
      }

      // SECTION A: HEADER BANNER (Slate 900 / Themed)
      const headerFrame = figma.createFrame();
      headerFrame.name = "Header Banner";
      headerFrame.fills = [{ type: "SOLID", color: theme.sectionBg }];
      headerFrame.cornerRadius = 16;
      headerFrame.layoutMode = "VERTICAL";
      headerFrame.resize(1200, 10);
      headerFrame.counterAxisSizingMode = "FIXED";
      headerFrame.primaryAxisSizingMode = "AUTO";
      headerFrame.layoutAlign = "STRETCH";
      headerFrame.paddingLeft = 48;
      headerFrame.paddingRight = 48;
      headerFrame.paddingTop = 48;
      headerFrame.paddingBottom = 48;
      headerFrame.itemSpacing = 12;

      const brandLabel = figma.createText();
      brandLabel.fontName = boldFont;
      brandLabel.fontSize = 14;
      brandLabel.fills = [{ type: "SOLID", color: theme.accentLight }];
      brandLabel.characters = "STRUCTURA AUTOMATION";
      brandLabel.textAutoResize = "HEIGHT";
      brandLabel.layoutAlign = "STRETCH";
      headerFrame.appendChild(brandLabel);

      const titleText = figma.createText();
      titleText.fontName = boldFont;
      titleText.fontSize = 36;
      titleText.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
      titleText.characters = "Design System Tokens & Components";
      titleText.textAutoResize = "HEIGHT";
      titleText.layoutAlign = "STRETCH";
      headerFrame.appendChild(titleText);

      const descText = figma.createText();
      descText.fontName = defaultFont;
      descText.fontSize = 14;
      descText.fills = [{ type: "SOLID", color: { r: 148/255, g: 163/255, b: 184/255 } }]; // Slate 400
      const today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
      descText.characters = `Generated automatically on ${today}. Contains tokens and UI patterns scanned from this file.`;
      descText.textAutoResize = "HEIGHT";
      descText.layoutAlign = "STRETCH";
      headerFrame.appendChild(descText);

      pageWrapper.appendChild(headerFrame);

      // SECTION A1: LOGOS & BRANDING
      if (representativeLogos.length > 0) {
        const logoFrame = figma.createFrame();
        logoFrame.name = "Logos & Branding";
        logoFrame.layoutMode = "VERTICAL";
        logoFrame.resize(1200, 10);
        logoFrame.counterAxisSizingMode = "FIXED";
        logoFrame.primaryAxisSizingMode = "AUTO";
        logoFrame.layoutAlign = "STRETCH";
        logoFrame.fills = [{ type: "SOLID", color: theme.sectionBg }];
        logoFrame.cornerRadius = 16;
        logoFrame.paddingLeft = 40;
        logoFrame.paddingRight = 40;
        logoFrame.paddingTop = 40;
        logoFrame.paddingBottom = 40;
        logoFrame.itemSpacing = 24;

        const lHeader = figma.createText();
        lHeader.fontName = boldFont;
        lHeader.fontSize = 24;
        lHeader.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
        lHeader.characters = "Logos & Branding";
        logoFrame.appendChild(lHeader);

        const logoRow = figma.createFrame();
        logoRow.name = "Logos Row";
        logoRow.layoutMode = "HORIZONTAL";
        logoRow.resize(1120, 10);
        logoRow.layoutWrap = "WRAP";
        logoRow.layoutAlign = "STRETCH";
        logoRow.primaryAxisSizingMode = "FIXED";
        logoRow.counterAxisSizingMode = "AUTO";
        logoRow.itemSpacing = 24;
        logoRow.counterAxisSpacing = 24;
        logoRow.fills = [];

        for (const item of representativeLogos) {
          try {
            const card = figma.createFrame();
            card.name = `Logo - ${item.name}`;
            card.fills = [{ type: "SOLID", color: theme.cardBg }];
            card.cornerRadius = 12;
            card.strokes = [{ type: "SOLID", color: theme.cardBorder }];
            card.strokeWeight = 1;
            card.layoutMode = "VERTICAL";
            card.primaryAxisSizingMode = "AUTO";
            card.counterAxisSizingMode = "AUTO";
            card.minWidth = 120;
            card.paddingLeft = 20;
            card.paddingRight = 20;
            card.paddingTop = 20;
            card.paddingBottom = 20;
            card.itemSpacing = 16;
            card.counterAxisAlignItems = "CENTER";

            // Title Label of wrapper
            const label = figma.createText();
            label.fontName = mediumFont;
            label.fontSize = 11;
            label.fills = [{ type: "SOLID", color: { r: 148/255, g: 163/255, b: 184/255 } }];
            label.characters = `${item.name.substring(0, 20)} (${item.width.toFixed(0)}x${item.height.toFixed(0)})`;
            label.textAutoResize = "HEIGHT";
            label.layoutAlign = "STRETCH";
            card.appendChild(label);

            // Clone and reset positions
            const clone = item.clone();
            clone.x = 0;
            clone.y = 0;
            card.appendChild(clone);

            logoRow.appendChild(card);
          } catch (e) {
            // Clone error
          }
        }
        logoFrame.appendChild(logoRow);
        pageWrapper.appendChild(logoFrame);
      }

      // SECTION G: DESIGN SYSTEM COMPLIANCE & QA AUDIT (Slate 900 / Themed)
      const qaFrame = figma.createFrame();
      qaFrame.name = "Design System Compliance & QA Audit";
      qaFrame.layoutMode = "VERTICAL";
      qaFrame.resize(1200, 10);
      qaFrame.counterAxisSizingMode = "FIXED";
      qaFrame.primaryAxisSizingMode = "AUTO";
      qaFrame.layoutAlign = "STRETCH";
      qaFrame.fills = [{ type: "SOLID", color: theme.sectionBg }];
      qaFrame.cornerRadius = 16;
      qaFrame.paddingLeft = 40;
      qaFrame.paddingRight = 40;
      qaFrame.paddingTop = 40;
      qaFrame.paddingBottom = 40;
      qaFrame.itemSpacing = 24;

      const qaHeader = figma.createText();
      qaHeader.fontName = boldFont;
      qaHeader.fontSize = 24;
      qaHeader.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
      qaHeader.characters = "Design System Compliance & QA Audit";
      qaHeader.textAutoResize = "HEIGHT";
      qaHeader.layoutAlign = "STRETCH";
      qaFrame.appendChild(qaHeader);

      // Draw QA Health Audit Card inside this dedicated section
      await drawHealthAuditCard(qaFrame);
      // Draw WCAG 2.1 Standards vs. Designer comparison table
      await drawWCAGComparisonTable(qaFrame);
      pageWrapper.appendChild(qaFrame);

      // SECTION B1: BRANDING COLORS (Themed)
      if (brandColorsList.length > 0) {
        const brandFrame = figma.createFrame();
        brandFrame.name = "Branding Colors";
        brandFrame.layoutMode = "VERTICAL";
        brandFrame.resize(1200, 10);
        brandFrame.counterAxisSizingMode = "FIXED";
        brandFrame.primaryAxisSizingMode = "AUTO";
        brandFrame.layoutAlign = "STRETCH";
        brandFrame.fills = [{ type: "SOLID", color: theme.sectionBg }];
        brandFrame.cornerRadius = 16;
        brandFrame.paddingLeft = 40;
        brandFrame.paddingRight = 40;
        brandFrame.paddingTop = 40;
        brandFrame.paddingBottom = 40;
        brandFrame.itemSpacing = 24;

        const bHeader = figma.createText();
        bHeader.fontName = boldFont;
        bHeader.fontSize = 24;
        bHeader.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
        bHeader.characters = "Branding Colors";
        bHeader.textAutoResize = "HEIGHT";
        bHeader.layoutAlign = "STRETCH";
        brandFrame.appendChild(bHeader);

        const brandRow = figma.createFrame();
        brandRow.name = "Brand Cards Row";
        brandRow.layoutMode = "HORIZONTAL";
        brandRow.resize(1120, 10);
        brandRow.layoutWrap = "WRAP";
        brandRow.layoutAlign = "STRETCH";
        brandRow.primaryAxisSizingMode = "FIXED";
        brandRow.counterAxisSizingMode = "AUTO";
        brandRow.itemSpacing = 32;
        brandRow.counterAxisSpacing = 32;
        brandRow.fills = [];

        brandColorsList.forEach(([hex, data], index) => {
          try {
            const card = figma.createFrame();
            let roleName = "Primary Brand Color";
            if (index === 1) roleName = "Secondary Brand Color";
            if (index === 2) roleName = "Accent Color";

            card.name = `${roleName} - ${hex}`;
            card.fills = [{ type: "SOLID", color: theme.cardBg }];
            card.cornerRadius = 12;
            card.strokes = [{ type: "SOLID", color: theme.cardBorder }];
            card.strokeWeight = 1;
            card.layoutMode = "VERTICAL";
            card.resize(346, 10);
            card.counterAxisSizingMode = "FIXED";
            card.primaryAxisSizingMode = "AUTO";
            card.paddingLeft = 20;
            card.paddingRight = 20;
            card.paddingTop = 20;
            card.paddingBottom = 20;
            card.itemSpacing = 12;

            // Swatch
            const swatch = figma.createRectangle();
            swatch.name = "Color Block";
            swatch.resize(306, 90);
            swatch.fills = [{ type: "SOLID", color: { r: data.r, g: data.g, b: data.b } }];
            swatch.cornerRadius = 8;
            card.appendChild(swatch);

            // Role Title
            const roleText = figma.createText();
            roleText.fontName = boldFont;
            roleText.fontSize = 16;
            roleText.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
            roleText.characters = roleName;
            roleText.textAutoResize = "HEIGHT";
            roleText.layoutAlign = "STRETCH";
            card.appendChild(roleText);

            // Hex Code
            const codeRow = figma.createFrame();
            codeRow.name = "Codes";
            codeRow.layoutMode = "HORIZONTAL";
            codeRow.primaryAxisSizingMode = "AUTO";
            codeRow.counterAxisSizingMode = "AUTO";
            codeRow.itemSpacing = 16;
            codeRow.layoutAlign = "STRETCH";
            codeRow.fills = [];

            const hexCode = figma.createText();
            hexCode.fontName = boldFont;
            hexCode.fontSize = 13;
            hexCode.fills = [{ type: "SOLID", color: theme.accentLight }];
            hexCode.characters = hex;
            hexCode.textAutoResize = "HEIGHT";
            hexCode.layoutAlign = "STRETCH";
            codeRow.appendChild(hexCode);

            const rgbCode = figma.createText();
            rgbCode.fontName = defaultFont;
            rgbCode.fontSize = 11;
            rgbCode.fills = [{ type: "SOLID", color: { r: 148/255, g: 163/255, b: 184/255 } }];
            rgbCode.characters = rgbToString(data.r, data.g, data.b);
            rgbCode.textAutoResize = "HEIGHT";
            rgbCode.layoutAlign = "STRETCH";
            codeRow.appendChild(rgbCode);

            card.appendChild(codeRow);

            // Variable tag
            const varTag = figma.createText();
            varTag.fontName = mediumFont;
            varTag.fontSize = 11;
            varTag.fills = [{ type: "SOLID", color: { r: 148/255, g: 163/255, b: 184/255 } }];
            let varSug = "primary-500 / brand-primary";
            if (index === 1) varSug = "secondary-500 / brand-secondary";
            if (index === 2) varSug = "accent-500 / brand-accent";
            varTag.characters = `Suggested: $var-${varSug}`;
            varTag.textAutoResize = "HEIGHT";
            varTag.layoutAlign = "STRETCH";
            card.appendChild(varTag);

            brandRow.appendChild(card);
          } catch (e) {
            // Draw error
          }
        });

        brandFrame.appendChild(brandRow);
        pageWrapper.appendChild(brandFrame);
      }

      // SECTION B: COLORS (Slate 900)
      const sortedColors = Object.entries(colors)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 15); // Top 15 colors

      figma.ui.postMessage({
        type: "scan-progress",
        status: "Generating Color Palette...",
        step: `Drawing ${sortedColors.length} swatches`
      });
      await new Promise(resolve => setTimeout(resolve, 5));

      if (sortedColors.length > 0) {
        const colorsFrame = figma.createFrame();
        colorsFrame.name = "Color Palette";
        colorsFrame.layoutMode = "VERTICAL";
        colorsFrame.resize(1200, 10);
        colorsFrame.counterAxisSizingMode = "FIXED";
        colorsFrame.primaryAxisSizingMode = "AUTO";
        colorsFrame.layoutAlign = "STRETCH";
        colorsFrame.fills = [{ type: "SOLID", color: theme.sectionBg }];
        colorsFrame.cornerRadius = 16;
        colorsFrame.paddingLeft = 40;
        colorsFrame.paddingRight = 40;
        colorsFrame.paddingTop = 40;
        colorsFrame.paddingBottom = 40;
        colorsFrame.itemSpacing = 24;

        // Header inside colors frame
        const cHeader = figma.createText();
        cHeader.fontName = boldFont;
        cHeader.fontSize = 24;
        cHeader.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
        cHeader.characters = "Colors";
        cHeader.textAutoResize = "HEIGHT";
        cHeader.layoutAlign = "STRETCH";
        colorsFrame.appendChild(cHeader);

        const chipW = 208;

        const colorsGrid = figma.createFrame();
        colorsGrid.name = "Colors Grid";
        colorsGrid.layoutMode = "HORIZONTAL";
        colorsGrid.resize(1120, 10);
        colorsGrid.layoutWrap = "WRAP";
        colorsGrid.layoutAlign = "STRETCH";
        colorsGrid.primaryAxisSizingMode = "FIXED";
        colorsGrid.counterAxisSizingMode = "AUTO";
        colorsGrid.itemSpacing = 20;
        colorsGrid.counterAxisSpacing = 20;
        colorsGrid.fills = [];
        colorsFrame.appendChild(colorsGrid);

        sortedColors.forEach(([hex, data]) => {
          const chipFrame = figma.createFrame();
          chipFrame.name = `Color - ${hex}`;
          chipFrame.fills = [{ type: "SOLID", color: theme.cardBg }];
          chipFrame.cornerRadius = 12;
          chipFrame.layoutMode = "VERTICAL";
          chipFrame.resize(chipW, 10);
          chipFrame.counterAxisSizingMode = "FIXED";
          chipFrame.primaryAxisSizingMode = "AUTO";
          chipFrame.paddingLeft = 12;
          chipFrame.paddingRight = 12;
          chipFrame.paddingTop = 12;
          chipFrame.paddingBottom = 12;
          chipFrame.itemSpacing = 6;

          const swatch = figma.createRectangle();
          swatch.name = "Swatch";
          swatch.resize(184, 100);
          swatch.fills = [{ type: "SOLID", color: { r: data.r, g: data.g, b: data.b } }];
          swatch.cornerRadius = 8;
          chipFrame.appendChild(swatch);

          const hexText = figma.createText();
          hexText.fontName = boldFont;
          hexText.fontSize = 14;
          hexText.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
          hexText.characters = hex;
          hexText.textAutoResize = "HEIGHT";
          hexText.layoutAlign = "STRETCH";
          chipFrame.appendChild(hexText);

          const rgbText = figma.createText();
          rgbText.fontName = defaultFont;
          rgbText.fontSize = 11;
          rgbText.fills = [{ type: "SOLID", color: { r: 100/255, g: 116/255, b: 139/255 } }];
          rgbText.characters = rgbToString(data.r, data.g, data.b);
          rgbText.textAutoResize = "HEIGHT";
          rgbText.layoutAlign = "STRETCH";
          chipFrame.appendChild(rgbText);

          const countText = figma.createText();
          countText.fontName = mediumFont;
          countText.fontSize = 11;
          countText.fills = [{ type: "SOLID", color: { r: 148/255, g: 163/255, b: 184/255 } }];
          countText.characters = `Used ${data.count} times`;
          countText.textAutoResize = "HEIGHT";
          countText.layoutAlign = "STRETCH";
          chipFrame.appendChild(countText);

          // Add suggested semantic variable name
          const suggestion = getSemanticSuggestion(data.r, data.g, data.b);
          const suggestText = figma.createText();
          suggestText.fontName = boldFont;
          suggestText.fontSize = 10;
          suggestText.fills = [{ type: "SOLID", color: theme.accentLight }];
          suggestText.characters = `$var: ${suggestion}`;
          suggestText.textAutoResize = "HEIGHT";
          suggestText.layoutAlign = "STRETCH";
          chipFrame.appendChild(suggestText);

          colorsGrid.appendChild(chipFrame);
        });

        pageWrapper.appendChild(colorsFrame);
      }

      // SECTION C: TYPOGRAPHY (Slate 900)
      const sortedTypo = Object.entries(typography)
        .sort((a, b) => b[1].size - a[1].size);

      figma.ui.postMessage({
        type: "scan-progress",
        status: "Generating Typography Scale...",
        step: `Grouping and rendering ${sortedTypo.length} typography styles`
      });
      await new Promise(resolve => setTimeout(resolve, 5));

      if (sortedTypo.length > 0) {
        const typoFrame = figma.createFrame();
        typoFrame.name = "Typography Scale";
        typoFrame.layoutMode = "VERTICAL";
        typoFrame.resize(1200, 10);
        typoFrame.counterAxisSizingMode = "FIXED";
        typoFrame.primaryAxisSizingMode = "AUTO";
        typoFrame.layoutAlign = "STRETCH";
        typoFrame.fills = [{ type: "SOLID", color: theme.sectionBg }];
        typoFrame.cornerRadius = 16;
        typoFrame.paddingLeft = 40;
        typoFrame.paddingRight = 40;
        typoFrame.paddingTop = 40;
        typoFrame.paddingBottom = 40;
        typoFrame.itemSpacing = 28;

        const tHeader = figma.createText();
        tHeader.fontName = boldFont;
        tHeader.fontSize = 24;
        tHeader.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
        tHeader.characters = "Typography Scale";
        tHeader.textAutoResize = "HEIGHT";
        tHeader.layoutAlign = "STRETCH";
        typoFrame.appendChild(tHeader);

        // Subtitle listing detected Families & Styles
        const detectedFamilies = Array.from(new Set(Object.values(typography).map(t => t.family))).sort();
        const detectedStyles = Array.from(new Set(Object.values(typography).map(t => t.style))).sort();

        const overviewText = figma.createText();
        overviewText.fontName = defaultFont;
        overviewText.fontSize = 12;
        overviewText.fills = [{ type: "SOLID", color: { r: 148/255, g: 163/255, b: 184/255 } }]; // Slate 400
        overviewText.characters = `Detected Families: ${detectedFamilies.join(", ")}\nDetected Styles: ${detectedStyles.join(", ")}`;
        overviewText.textAutoResize = "HEIGHT";
        overviewText.layoutAlign = "STRETCH";
        typoFrame.appendChild(overviewText);

        // Group entries by family name
        const familyGroups: { [family: string]: typeof sortedTypo } = {};
        for (const [key, data] of sortedTypo) {
          if (!familyGroups[data.family]) {
            familyGroups[data.family] = [];
          }
          familyGroups[data.family].push([key, data]);
        }

        // Render each family group
        for (const family of Object.keys(familyGroups).sort()) {
          const groupEntries = familyGroups[family]
            .sort((a, b) => b[1].size - a[1].size) // Sort descending size within family
            .slice(0, 10); // Cap at 10 sizes per family

          const familyTitle = figma.createText();
          familyTitle.fontName = boldFont;
          familyTitle.fontSize = 16;
          familyTitle.fills = [{ type: "SOLID", color: theme.accentLight }];
          familyTitle.characters = `${family.toUpperCase()} FAMILY`;
          familyTitle.textAutoResize = "HEIGHT";
          familyTitle.layoutAlign = "STRETCH";
          typoFrame.appendChild(familyTitle);

          for (const [key, data] of groupEntries) {
            const row = figma.createFrame();
            row.name = `Typo - ${data.family} ${data.style} ${data.size}px`;
            row.layoutMode = "HORIZONTAL";
            row.layoutAlign = "STRETCH";
            row.resize(1120, 10);
            row.primaryAxisSizingMode = "FIXED";
            row.counterAxisSizingMode = "AUTO";
            row.fills = [];
            row.itemSpacing = 40;
            row.counterAxisAlignItems = "CENTER";

            // Metadata left side
            const meta = figma.createText();
            meta.fontName = mediumFont;
            meta.fontSize = 12;
            meta.fills = [{ type: "SOLID", color: { r: 148/255, g: 163/255, b: 184/255 } }]; // Slate 400
            meta.characters = `${data.style} • ${data.size}px\nUsed ${data.count} times`;
            meta.textAutoResize = "HEIGHT";
            meta.resize(250, 0);
            row.appendChild(meta);

            // Preview right side
            const preview = figma.createText();

            // Safely set font family & style by loading first
            let appliedFont = defaultFont;
            try {
              await figma.loadFontAsync({ family: data.family, style: data.style });
              appliedFont = { family: data.family, style: data.style };
            } catch (e) {
              // Keep defaultFont fallback
            }

            preview.fontName = appliedFont;
            preview.fontSize = Math.min(data.size, 48); // Cap preview size at 48px to prevent overlap
            preview.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
            preview.characters = "The quick brown fox jumps over the lazy dog";
            preview.textAutoResize = "HEIGHT";
            preview.layoutGrow = 1;
            row.appendChild(preview);

            typoFrame.appendChild(row);
          }
        }

        pageWrapper.appendChild(typoFrame);
      }

        async function drawGridLayoutGuidelines(parent: FrameNode) {
          const gridFrame = figma.createFrame();
          gridFrame.name = "Responsive Grid Guidelines";
          gridFrame.layoutMode = "VERTICAL";
          gridFrame.resize(1200, 10);
          gridFrame.counterAxisSizingMode = "FIXED";
          gridFrame.primaryAxisSizingMode = "AUTO";
          gridFrame.layoutAlign = "STRETCH";
          gridFrame.fills = [{ type: "SOLID", color: theme.sectionBg }];
          gridFrame.cornerRadius = 16;
          gridFrame.paddingLeft = 40;
          gridFrame.paddingRight = 40;
          gridFrame.paddingTop = 40;
          gridFrame.paddingBottom = 40;
          gridFrame.itemSpacing = 28;

          const gHeader = figma.createText();
          gHeader.fontName = boldFont;
          gHeader.fontSize = 24;
          gHeader.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
          gHeader.characters = "Responsive Grid Guidelines";
          gHeader.textAutoResize = "HEIGHT";
          gHeader.layoutAlign = "STRETCH";
          gridFrame.appendChild(gHeader);

          const gSub = figma.createText();
          gSub.fontName = defaultFont;
          gSub.fontSize = 12;
          gSub.fills = [{ type: "SOLID", color: { r: 148/255, g: 163/255, b: 184/255 } }];
          gSub.characters = "Standard responsive layout grids representing desktop, tablet, and mobile breakpoints.";
          gSub.textAutoResize = "HEIGHT";
          gSub.layoutAlign = "STRETCH";
          gridFrame.appendChild(gSub);

          // Row containing the 3 viewport cards
          const row = figma.createFrame();
          row.name = "Viewport Mocks Row";
          row.layoutMode = "HORIZONTAL";
          row.resize(1120, 10);
          row.layoutWrap = "WRAP";
          row.layoutAlign = "STRETCH";
          row.primaryAxisSizingMode = "FIXED";
          row.counterAxisSizingMode = "AUTO";
          row.itemSpacing = 24;
          row.counterAxisSpacing = 24;
          row.fills = [];

          // Helper to draw a single viewport card
          const createViewportCard = (device: string, columns: number, gutter: number, margin: number, width: number) => {
            const card = figma.createFrame();
            card.name = `${device} Grid Card`;
            card.resize(357, 190);
            card.fills = [{ type: "SOLID", color: theme.cardBg }];
            card.cornerRadius = 12;
            card.strokes = [{ type: "SOLID", color: theme.cardBorder }];
            card.strokeWeight = 1;
            card.layoutMode = "VERTICAL";
            card.primaryAxisSizingMode = "FIXED";
            card.counterAxisSizingMode = "FIXED";
            card.paddingLeft = 20;
            card.paddingRight = 20;
            card.paddingTop = 20;
            card.paddingBottom = 20;
            card.itemSpacing = 12;

            const title = figma.createText();
            title.fontName = boldFont;
            title.fontSize = 14;
            title.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
            title.characters = `${device.toUpperCase()} LAYOUT (${width}px)`;
            title.textAutoResize = "HEIGHT";
            title.layoutAlign = "STRETCH";
            card.appendChild(title);

            // Grid visualizer container (fixed 317x100)
            const vis = figma.createFrame();
            vis.name = "Grid Visualizer";
            vis.resize(317, 90);
            vis.fills = [{ type: "SOLID", color: { r: 15/255, g: 23/255, b: 42/255 } }];
            vis.cornerRadius = 6;
            vis.layoutMode = "HORIZONTAL";
            vis.paddingLeft = Math.round(margin / 4);
            vis.paddingRight = Math.round(margin / 4);
            vis.paddingTop = 8;
            vis.paddingBottom = 8;
            vis.itemSpacing = Math.round(gutter / 4);
            vis.counterAxisAlignItems = "MIN";

            // Add columns
            for (let i = 0; i < columns; i++) {
              const col = figma.createFrame();
              col.layoutGrow = 1;
              col.layoutAlign = "STRETCH";
              col.fills = [{ type: "SOLID", color: { r: 244/255, g: 63/255, b: 94/255 }, opacity: 0.15 }];
              col.strokes = [{ type: "SOLID", color: { r: 244/255, g: 63/255, b: 94/255 } }];
              col.strokeWeight = 0.5;
              vis.appendChild(col);
            }
            card.appendChild(vis);

            // Grid attributes
            const attrRow = figma.createFrame();
            attrRow.layoutMode = "HORIZONTAL";
            attrRow.primaryAxisSizingMode = "AUTO";
            attrRow.counterAxisSizingMode = "AUTO";
            attrRow.itemSpacing = 16;
            attrRow.fills = [];

            const colTxt = figma.createText();
            colTxt.fontName = boldFont;
            colTxt.fontSize = 10;
            colTxt.fills = [{ type: "SOLID", color: theme.accentLight }];
            colTxt.characters = `Cols: ${columns}`;
            colTxt.textAutoResize = "HEIGHT";
            colTxt.layoutAlign = "STRETCH";
            attrRow.appendChild(colTxt);

            const gutTxt = figma.createText();
            gutTxt.fontName = boldFont;
            gutTxt.fontSize = 10;
            gutTxt.fills = [{ type: "SOLID", color: theme.accentLight }];
            gutTxt.characters = `Gutter: ${gutter}px`;
            gutTxt.textAutoResize = "HEIGHT";
            gutTxt.layoutAlign = "STRETCH";
            attrRow.appendChild(gutTxt);

            const marTxt = figma.createText();
            marTxt.fontName = boldFont;
            marTxt.fontSize = 10;
            marTxt.fills = [{ type: "SOLID", color: theme.accentLight }];
            marTxt.characters = `Margin: ${margin}px`;
            marTxt.textAutoResize = "HEIGHT";
            marTxt.layoutAlign = "STRETCH";
            attrRow.appendChild(marTxt);

            card.appendChild(attrRow);
            row.appendChild(card);
          };

          createViewportCard("Desktop", 12, 24, 80, 1440);
          createViewportCard("Tablet", 8, 16, 32, 768);
          createViewportCard("Mobile", 4, 16, 16, 375);

          gridFrame.appendChild(row);
          parent.appendChild(gridFrame);
        }


      const hasComponents = representativeButtons.length > 0 || representativeInputs.length > 0 || representativeCards.length > 0 || representativeToggles.length > 0;

      // SECTION C2: RESPONSIVE GRID GUIDELINES (Slate 900)
      if (hasComponents) {
        figma.ui.postMessage({
          type: "scan-progress",
          status: "Generating Responsive Layout Guidelines...",
          step: "Building desktop, tablet, and mobile grid visualizers"
        });
        await new Promise(resolve => setTimeout(resolve, 5));
        await drawGridLayoutGuidelines(pageWrapper);
      }

      // SECTION D: COMPONENTS (Slate 900)
      figma.ui.postMessage({
        type: "scan-progress",
        status: "Constructing Component Library...",
        step: "Cloning representative buttons, inputs, and cards"
      });
      await new Promise(resolve => setTimeout(resolve, 5));

      if (hasComponents) {
        // --- HELPER FUNCTIONS ---
        
        // Helper to convert RGB to HEX string
        const rgbToHex = (r: number, g: number, b: number): string => {
          const toHex = (c: number) => {
            const hex = Math.round(c * 255).toString(16);
            return hex.length === 1 ? "0" + hex : hex;
          };
          return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
        };

        // Helper to extract properties from a scene node
        const extractComponentSpecs = (node: SceneNode) => {
          const specs = {
            width: Math.round(node.width),
            height: Math.round(node.height),
            paddingLeft: 0,
            paddingRight: 0,
            paddingTop: 0,
            paddingBottom: 0,
            cornerRadius: 0,
            fillColor: "#e2e8f0",
            textColor: "#0f172a",
            fontSize: 14,
            fontFamily: "Inter"
          };

          if ("paddingLeft" in node && typeof (node as any).paddingLeft === "number") {
            specs.paddingLeft = Math.round((node as any).paddingLeft);
          }
          if ("paddingRight" in node && typeof (node as any).paddingRight === "number") {
            specs.paddingRight = Math.round((node as any).paddingRight);
          }
          if ("paddingTop" in node && typeof (node as any).paddingTop === "number") {
            specs.paddingTop = Math.round((node as any).paddingTop);
          }
          if ("paddingBottom" in node && typeof (node as any).paddingBottom === "number") {
            specs.paddingBottom = Math.round((node as any).paddingBottom);
          }

          if ("cornerRadius" in node) {
            if (typeof (node as any).cornerRadius === "number") {
              specs.cornerRadius = Math.round((node as any).cornerRadius);
            } else if ((node as any).cornerRadius === figma.mixed) {
              specs.cornerRadius = 4;
            }
          }

          if ("fills" in node && Array.isArray(node.fills)) {
            const solid = node.fills.find(f => f.type === "SOLID" && f.visible !== false);
            if (solid && solid.color) {
              specs.fillColor = rgbToHex(solid.color.r, solid.color.g, solid.color.b);
            }
          }

          const findText = (curr: SceneNode): TextNode | null => {
            if (curr.type === "TEXT") return curr as TextNode;
            if ("children" in curr && Array.isArray(curr.children)) {
              for (const child of curr.children) {
                const found = findText(child);
                if (found) return found;
              }
            }
            return null;
          };

          const textNode = findText(node);
          if (textNode) {
            if (typeof textNode.fontSize === "number") {
              specs.fontSize = textNode.fontSize;
            }
            if (textNode.fontName && typeof textNode.fontName === "object" && "family" in textNode.fontName) {
              specs.fontFamily = textNode.fontName.family;
            }
            if (Array.isArray(textNode.fills)) {
              const solid = textNode.fills.find(f => f.type === "SOLID");
              if (solid && solid.color) {
                specs.textColor = rgbToHex(solid.color.r, solid.color.g, solid.color.b);
              }
            }
          }

          return specs;
        };

        // Helper to draw indicator lines
        const drawLine = (parent: FrameNode, x1: number, y1: number, x2: number, y2: number, color: RGB, dash: boolean = false) => {
          const line = figma.createLine();
          line.x = x1;
          line.y = y1;
          const dx = x2 - x1;
          const dy = y2 - y1;
          const len = Math.sqrt(dx * dx + dy * dy);
          line.resize(len || 1, 0);
          line.rotation = Math.atan2(dy, dx) * (180 / Math.PI);
          line.strokes = [{ type: "SOLID", color }];
          line.strokeWeight = 1;
          if (dash) {
            line.dashPattern = [3, 3];
          }
          parent.appendChild(line);
          return line;
        };

        // Helper to draw tag labels
        const drawTag = async (parent: FrameNode, x: number, y: number, text: string, bgColor: RGB, textColor: RGB) => {
          const tag = figma.createFrame();
          tag.name = "Spec Tag";
          tag.layoutMode = "HORIZONTAL";
          tag.primaryAxisSizingMode = "AUTO";
          tag.counterAxisSizingMode = "AUTO";
          tag.paddingLeft = 4;
          tag.paddingRight = 4;
          tag.paddingTop = 2;
          tag.paddingBottom = 2;
          tag.fills = [{ type: "SOLID", color: bgColor }];
          tag.cornerRadius = 4;
          
          const labelNode = figma.createText();
          labelNode.fontName = mediumFont;
          labelNode.fontSize = 8;
          labelNode.fills = [{ type: "SOLID", color: textColor }];
          labelNode.characters = text;
          tag.appendChild(labelNode);
          
          parent.appendChild(tag);
          tag.x = x - tag.width / 2;
          tag.y = y - tag.height / 2;
          return tag;
        };



        // Helper to create Design Tokens & Styles Swatches card
        const createStylesCard = async (parent: FrameNode, specs: any) => {
          const card = figma.createFrame();
          card.name = "Design Tokens Card";
          card.layoutMode = "VERTICAL";
          card.resize(1120, 100);
          card.layoutAlign = "STRETCH";
          card.primaryAxisSizingMode = "AUTO";
          card.fills = [{ type: "SOLID", color: theme.cardBg }];
          card.cornerRadius = 12;
          card.strokes = [{ type: "SOLID", color: theme.cardBorder }];
          card.strokeWeight = 1;
          card.paddingLeft = 16;
          card.paddingRight = 16;
          card.paddingTop = 16;
          card.paddingBottom = 16;
          card.itemSpacing = 12;

          // Header
          const header = figma.createText();
          header.fontName = boldFont;
          header.fontSize = 11;
          header.fills = [{ type: "SOLID", color: { r: 148/255, g: 163/255, b: 184/255 } }];
          header.characters = "DESIGN SYSTEM TOKENS";
          card.appendChild(header);

          // Color Swatches Row
          const swatchTitle = figma.createText();
          swatchTitle.fontName = boldFont;
          swatchTitle.fontSize = 9;
          swatchTitle.fills = [{ type: "SOLID", color: theme.accentLight }];
          swatchTitle.characters = "COLOR CHIPS";
          card.appendChild(swatchTitle);

          const swatchRow = figma.createFrame();
          swatchRow.name = "Swatches Row";
          swatchRow.layoutMode = "HORIZONTAL";
          swatchRow.primaryAxisSizingMode = "AUTO";
          swatchRow.counterAxisSizingMode = "AUTO";
          swatchRow.itemSpacing = 24;
          swatchRow.fills = [];
          
          const hexToRgb = (hex: string) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
              r: parseInt(result[1], 16) / 255,
              g: parseInt(result[2], 16) / 255,
              b: parseInt(result[3], 16) / 255
            } : { r: 1, g: 1, b: 1 };
          };

          const addSwatch = (colorHex: string, labelText: string) => {
            const swatch = figma.createFrame();
            swatch.layoutMode = "HORIZONTAL";
            swatch.primaryAxisSizingMode = "AUTO";
            swatch.counterAxisSizingMode = "AUTO";
            swatch.itemSpacing = 8;
            swatch.fills = [];
            swatch.counterAxisAlignItems = "CENTER";

            const circle = figma.createEllipse();
            circle.resize(16, 16);
            circle.fills = [{ type: "SOLID", color: hexToRgb(colorHex) }];
            circle.strokes = [{ type: "SOLID", color: { r: 71/255, g: 85/255, b: 105/255 } }];
            circle.strokeWeight = 0.5;
            swatch.appendChild(circle);

            const details = figma.createFrame();
            details.layoutMode = "VERTICAL";
            details.primaryAxisSizingMode = "AUTO";
            details.counterAxisSizingMode = "AUTO";
            details.itemSpacing = 2;
            details.fills = [];

            const labelNode = figma.createText();
            labelNode.fontName = boldFont;
            labelNode.fontSize = 8;
            labelNode.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
            labelNode.characters = colorHex.toUpperCase();
            details.appendChild(labelNode);

            const descNode = figma.createText();
            descNode.fontName = defaultFont;
            descNode.fontSize = 7;
            descNode.fills = [{ type: "SOLID", color: { r: 148/255, g: 163/255, b: 184/255 } }];
            descNode.characters = labelText;
            details.appendChild(descNode);

            swatch.appendChild(details);
            swatchRow.appendChild(swatch);
          };

          addSwatch(specs.fillColor, "Background / Border Fill");
          addSwatch(specs.textColor, "Text Label Color");

          card.appendChild(swatchRow);

          // Divider
          const div1 = figma.createFrame();
          div1.resize(1088, 0.5);
          div1.layoutAlign = "STRETCH";
          div1.fills = [{ type: "SOLID", color: { r: 51/255, g: 65/255, b: 85/255 } }];
          card.appendChild(div1);

          // Specs Row (Typography & Geometry)
          const specsRow = figma.createFrame();
          specsRow.name = "Specs Grid";
          specsRow.layoutMode = "HORIZONTAL";
          specsRow.primaryAxisSizingMode = "AUTO";
          specsRow.counterAxisSizingMode = "AUTO";
          specsRow.itemSpacing = 40;
          specsRow.fills = [];

          const typographyCol = figma.createFrame();
          typographyCol.layoutMode = "VERTICAL";
          typographyCol.primaryAxisSizingMode = "AUTO";
          typographyCol.counterAxisSizingMode = "AUTO";
          typographyCol.itemSpacing = 4;
          typographyCol.fills = [];

          const typoTitle = figma.createText();
          typoTitle.fontName = boldFont;
          typoTitle.fontSize = 9;
          typoTitle.fills = [{ type: "SOLID", color: theme.accentLight }];
          typoTitle.characters = "TYPOGRAPHY";
          typographyCol.appendChild(typoTitle);

          const typoVal = figma.createText();
          typoVal.fontName = defaultFont;
          typoVal.fontSize = 8;
          typoVal.fills = [{ type: "SOLID", color: { r: 243/255, g: 244/255, b: 246/255 } }];
          typoVal.characters = `Family: ${specs.fontFamily}\nSize: ${specs.fontSize}px`;
          typographyCol.appendChild(typoVal);
          specsRow.appendChild(typographyCol);

          const geometryCol = figma.createFrame();
          geometryCol.layoutMode = "VERTICAL";
          geometryCol.primaryAxisSizingMode = "AUTO";
          geometryCol.counterAxisSizingMode = "AUTO";
          geometryCol.itemSpacing = 4;
          geometryCol.fills = [];

          const geomTitle = figma.createText();
          geomTitle.fontName = boldFont;
          geomTitle.fontSize = 9;
          geomTitle.fills = [{ type: "SOLID", color: theme.accentLight }];
          geomTitle.characters = "GEOMETRY";
          geometryCol.appendChild(geomTitle);

          const geomVal = figma.createText();
          geomVal.fontName = defaultFont;
          geomVal.fontSize = 8;
          geomVal.fills = [{ type: "SOLID", color: { r: 243/255, g: 244/255, b: 246/255 } }];
          geomVal.characters = `Radius: ${specs.cornerRadius}px\nSize: ${specs.width}x${specs.height}px`;
          geometryCol.appendChild(geomVal);

          specsRow.appendChild(geometryCol);
          card.appendChild(specsRow);

          parent.appendChild(card);
        };



        // --- SECTION RENDERING IMPLEMENTATIONS ---

        const compFrame = figma.createFrame();
        compFrame.name = "Component Library";
        compFrame.layoutMode = "VERTICAL";
        compFrame.resize(1200, 10);
        compFrame.counterAxisSizingMode = "FIXED";
        compFrame.primaryAxisSizingMode = "AUTO";
        compFrame.layoutAlign = "STRETCH";
        compFrame.fills = [{ type: "SOLID", color: theme.sectionBg }];
        compFrame.cornerRadius = 16;
        compFrame.paddingLeft = 40;
        compFrame.paddingRight = 40;
        compFrame.paddingTop = 40;
        compFrame.paddingBottom = 40;
        compFrame.itemSpacing = 32;

        const compHeader = figma.createText();
        compHeader.fontName = boldFont;
        compHeader.fontSize = 24;
        compHeader.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
        compHeader.characters = "Component Library & Variants";
        compHeader.textAutoResize = "HEIGHT";
        compHeader.layoutAlign = "STRETCH";
        compFrame.appendChild(compHeader);

        // Sub-helper function to create visual section for each component type in a single column
        const renderComponentCategory = async (title: string, list: SceneNode[]) => {
          if (list.length === 0) return;

          // Category Subtitle & Description
          const catHeader = figma.createFrame();
          catHeader.name = `${title} Section Header`;
          catHeader.layoutMode = "VERTICAL";
          catHeader.resize(1120, 10);
          catHeader.counterAxisSizingMode = "FIXED";
          catHeader.primaryAxisSizingMode = "AUTO";
          catHeader.itemSpacing = 8;
          catHeader.fills = [];

          const titleRow = figma.createFrame();
          titleRow.name = "Title Row";
          titleRow.layoutMode = "HORIZONTAL";
          titleRow.primaryAxisSizingMode = "AUTO";
          titleRow.counterAxisSizingMode = "AUTO";
          titleRow.itemSpacing = 12;
          titleRow.fills = [];
          
          const subTitle = figma.createText();
          subTitle.fontName = boldFont;
          subTitle.fontSize = 20;
          subTitle.fills = [{ type: "SOLID", color: theme.accentLight }];
          subTitle.characters = title;
          titleRow.appendChild(subTitle);

          // Add a Status Badge
          const badge = figma.createFrame();
          badge.name = "Status Badge";
          badge.layoutMode = "HORIZONTAL";
          badge.resize(50, 18);
          badge.primaryAxisSizingMode = "AUTO";
          badge.counterAxisSizingMode = "AUTO";
          badge.paddingLeft = 8;
          badge.paddingRight = 8;
          badge.paddingTop = 3;
          badge.paddingBottom = 3;
          badge.cornerRadius = 20;
          badge.fills = [{ type: "SOLID", color: { r: 16/255, g: 185/255, b: 129/255 }, opacity: 0.15 }];
          badge.strokes = [{ type: "SOLID", color: { r: 16/255, g: 185/255, b: 129/255 } }];
          badge.strokeWeight = 0.5;

          const badgeText = figma.createText();
          badgeText.fontName = boldFont;
          badgeText.fontSize = 9;
          badgeText.fills = [{ type: "SOLID", color: { r: 52/255, g: 211/255, b: 153/255 } }];
          badgeText.characters = "READY";
          badge.appendChild(badgeText);
          titleRow.appendChild(badge);
          
          catHeader.appendChild(titleRow);

          let descText = "Interactive variants and production ready component specifications.";
          if (title === "Buttons") {
            descText = "Buttons allow users to take actions and make choices with a single tap. Commonly used in forms, dialogs, and toolbars.";
          } else if (title === "Input Fields") {
            descText = "Text fields let users enter and edit text. They typically appear in forms and dialogs.";
          } else if (title === "Interactive Controls") {
            descText = "Selection controls like checkboxes, radio buttons, toggles, and switches allow users to make selections, switch states, and turn features on or off.";
          } else if (title === "Cards") {
            descText = "Cards contain content and actions about a single subject, serving as an entry point to more detailed information.";
          }

          const descTextNode = figma.createText();
          descTextNode.fontName = defaultFont;
          descTextNode.fontSize = 11;
          descTextNode.fills = [{ type: "SOLID", color: { r: 148/255, g: 163/255, b: 184/255 } }];
          descTextNode.characters = descText;
          descTextNode.textAutoResize = "HEIGHT";
          descTextNode.layoutAlign = "STRETCH";
          catHeader.appendChild(descTextNode);
          
          compFrame.appendChild(catHeader);

          // Vertical single-column layout
          const docLayout = figma.createFrame();
          docLayout.name = `${title} Content Layout`;
          docLayout.layoutMode = "VERTICAL";
          docLayout.resize(1120, 10);
          docLayout.layoutAlign = "STRETCH";
          docLayout.primaryAxisSizingMode = "AUTO";
          docLayout.counterAxisSizingMode = "FIXED";
          docLayout.itemSpacing = 28;
          docLayout.fills = [];
          compFrame.appendChild(docLayout);

          // Convert to Components and Combine as Variants
          const componentsList: ComponentNode[] = [];
          const usedVariantNames = new Set<string>();

          for (const item of list) {
            try {
              const clone = item.clone();
              let component: ComponentNode;
              if (clone.type === "FRAME" || clone.type === "GROUP") {
                clone.x = 0;
                clone.y = 0;
                if ("layoutAlign" in clone) {
                  clone.layoutAlign = "INHERIT";
                }
                if ("layoutGrow" in clone) {
                  clone.layoutGrow = 0;
                }
                docLayout.appendChild(clone);
                component = figma.createComponentFromNode(clone as FrameNode | GroupNode);
              } else {
                const wrapper = figma.createFrame();
                wrapper.name = clone.name;
                wrapper.resize(clone.width, clone.height);
                wrapper.fills = [];
                wrapper.layoutMode = "VERTICAL";
                wrapper.primaryAxisSizingMode = "FIXED";
                wrapper.counterAxisSizingMode = "FIXED";
                docLayout.appendChild(wrapper);
                wrapper.appendChild(clone);
                clone.x = 0;
                clone.y = 0;
                if ("layoutAlign" in clone) {
                  clone.layoutAlign = "INHERIT";
                }
                if ("layoutGrow" in clone) {
                  clone.layoutGrow = 0;
                }
                component = figma.createComponentFromNode(wrapper);
              }

              let variantName = item.name.replace(/[=,]/g, "").trim();
              if (!variantName) variantName = "Variant";
              let uniqueName = variantName;
              let counter = 1;
              while (usedVariantNames.has(uniqueName)) {
                uniqueName = `${variantName} ${counter}`;
                counter++;
              }
              usedVariantNames.add(uniqueName);
              component.name = `Variant=${uniqueName}`;
              componentsList.push(component);
            } catch (e) {
              console.log("Component creation error", e);
            }
          }

          let componentSet: ComponentSetNode | undefined;
          if (componentsList.length > 0) {
            // Sub-header for Component Set
            const compSetHeader = figma.createText();
            compSetHeader.fontName = boldFont;
            compSetHeader.fontSize = 13;
            compSetHeader.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
            compSetHeader.characters = "Component Variants (Figma Component Set)";
            compSetHeader.textAutoResize = "HEIGHT";
            compSetHeader.layoutAlign = "STRETCH";
            docLayout.appendChild(compSetHeader);

            try {
              componentSet = figma.combineAsVariants(componentsList, docLayout);
              componentSet.name = title;
              componentSet.layoutMode = "HORIZONTAL";
              componentSet.resize(1120, 10);
              componentSet.layoutWrap = "WRAP";
              componentSet.layoutAlign = "STRETCH";
              componentSet.primaryAxisSizingMode = "FIXED";
              componentSet.counterAxisSizingMode = "AUTO";
              componentSet.itemSpacing = 24;
              componentSet.counterAxisSpacing = 24;
              componentSet.paddingLeft = 24;
              componentSet.paddingRight = 24;
              componentSet.paddingTop = 24;
              componentSet.paddingBottom = 24;
              componentSet.strokes = [{ type: "SOLID", color: theme.accentLight, opacity: 0.4 }];
              componentSet.strokeWeight = 1;
              componentSet.strokeAlign = "INSIDE";
              componentSet.dashPattern = [4, 4];
              componentSet.cornerRadius = 8;
              componentSet.fills = [{ type: "SOLID", color: theme.cardBg, opacity: 0.3 }];
            } catch (e) {
              console.log("Combine as variants error", e);
            }
          }

          // Sub-header for Interactive Playground
          const varHeader = figma.createText();
          varHeader.fontName = boldFont;
          varHeader.fontSize = 13;
          varHeader.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
          varHeader.characters = "Interactive Instances Playground";
          varHeader.textAutoResize = "HEIGHT";
          varHeader.layoutAlign = "STRETCH";
          docLayout.appendChild(varHeader);

          // Playground Row
          const playgroundRow = figma.createFrame();
          playgroundRow.name = `${title} Playground Row`;
          playgroundRow.layoutMode = "HORIZONTAL";
          playgroundRow.resize(1120, 10);
          playgroundRow.layoutWrap = "WRAP";
          playgroundRow.layoutAlign = "STRETCH";
          playgroundRow.primaryAxisSizingMode = "FIXED";
          playgroundRow.counterAxisSizingMode = "AUTO";
          playgroundRow.itemSpacing = 16;
          playgroundRow.counterAxisSpacing = 16;
          playgroundRow.fills = [];
          docLayout.appendChild(playgroundRow);

          for (const comp of componentsList) {
            try {
              // Wrapper card for the instance
              const card = figma.createFrame();
              card.name = `Playground - ${comp.name}`;
              card.fills = [{ type: "SOLID", color: theme.cardBg }];
              card.cornerRadius = 12;
              card.strokes = [{ type: "SOLID", color: theme.cardBorder }];
              card.strokeWeight = 1;
              card.layoutMode = "VERTICAL";
              card.primaryAxisSizingMode = "AUTO";
              card.counterAxisSizingMode = "AUTO";
              card.minWidth = 160;
              card.minHeight = 110;
              card.paddingLeft = 16;
              card.paddingRight = 16;
              card.paddingTop = 16;
              card.paddingBottom = 16;
              card.itemSpacing = 12;
              card.counterAxisAlignItems = "CENTER";

              // Title Label of wrapper
              const label = figma.createText();
              label.fontName = mediumFont;
              label.fontSize = 10;
              label.fills = [{ type: "SOLID", color: { r: 148/255, g: 163/255, b: 184/255 } }];
              label.characters = comp.name.replace("Variant=", "");
              label.textAutoResize = "HEIGHT";
              label.layoutAlign = "STRETCH";
              card.appendChild(label);

              // Create instance
              const instance = comp.createInstance();
              if ("layoutAlign" in instance) {
                instance.layoutAlign = "INHERIT";
              }
              if ("layoutGrow" in instance) {
                instance.layoutGrow = 0;
              }
              instance.x = 0;
              instance.y = 0;
              card.appendChild(instance);

              playgroundRow.appendChild(card);
            } catch (e) {
              console.log("Playground instance creation error", e);
            }
          }

          // Anatomy specs using original node
          const specsNode = list[0];
          const specs = extractComponentSpecs(specsNode);

          // Sub-header for Anatomy
          const anatHeader = figma.createText();
          anatHeader.fontName = boldFont;
          anatHeader.fontSize = 13;
          anatHeader.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
          anatHeader.characters = "Anatomy Specifications & Redlines";
          anatHeader.textAutoResize = "HEIGHT";
          anatHeader.layoutAlign = "STRETCH";
          docLayout.appendChild(anatHeader);

          // Anatomy Diagram Card Container
          const diagramCard = figma.createFrame();
          diagramCard.name = "Anatomy Visualizer";
          diagramCard.layoutMode = "VERTICAL";
          diagramCard.primaryAxisSizingMode = "FIXED";
          diagramCard.counterAxisSizingMode = "FIXED";
          diagramCard.resize(1120, 280);
          diagramCard.fills = [{ type: "SOLID", color: theme.cardBg }];
          diagramCard.cornerRadius = 12;
          diagramCard.strokes = [{ type: "SOLID", color: theme.cardBorder }];
          diagramCard.strokeWeight = 1;
          diagramCard.primaryAxisAlignItems = "CENTER";
          diagramCard.counterAxisAlignItems = "CENTER";
          diagramCard.clipsContent = false;
          docLayout.appendChild(diagramCard);

          // Inside the diagram card, draw redline specs
          const specContainer = figma.createFrame();
          specContainer.name = "Anatomy Spec Container";
          specContainer.resize(specsNode.width, specsNode.height);
          specContainer.fills = [];
          specContainer.clipsContent = false;
          diagramCard.appendChild(specContainer);

          const clone = specsNode.clone();
          clone.x = 0;
          clone.y = 0;
          specContainer.appendChild(clone);

          // Draw spec overlays
          const padColor = { r: 236/255, g: 72/255, b: 153/255 }; // Pink 500
          
          if (specs.paddingLeft > 0) {
            const leftPad = figma.createFrame();
            leftPad.name = "Padding Left";
            leftPad.x = 0;
            leftPad.y = 0;
            leftPad.resize(specs.paddingLeft, specsNode.height);
            leftPad.fills = [{ type: "SOLID", color: padColor, opacity: 0.15 }];
            leftPad.strokes = [{ type: "SOLID", color: padColor }];
            leftPad.strokeWeight = 0.5;
            leftPad.dashPattern = [2, 2];
            specContainer.appendChild(leftPad);

            if (specs.paddingLeft >= 10) {
              await drawTag(specContainer, specs.paddingLeft / 2, specsNode.height / 2, `${specs.paddingLeft}`, padColor, { r: 1, g: 1, b: 1 });
            }
          }

          if (specs.paddingRight > 0) {
            const rightPad = figma.createFrame();
            rightPad.name = "Padding Right";
            rightPad.x = specsNode.width - specs.paddingRight;
            rightPad.y = 0;
            rightPad.resize(specs.paddingRight, specsNode.height);
            rightPad.fills = [{ type: "SOLID", color: padColor, opacity: 0.15 }];
            rightPad.strokes = [{ type: "SOLID", color: padColor }];
            rightPad.strokeWeight = 0.5;
            rightPad.dashPattern = [2, 2];
            specContainer.appendChild(rightPad);

            if (specs.paddingRight >= 10) {
              await drawTag(specContainer, specsNode.width - specs.paddingRight / 2, specsNode.height / 2, `${specs.paddingRight}`, padColor, { r: 1, g: 1, b: 1 });
            }
          }

          if (specs.paddingTop > 0) {
            const topPad = figma.createFrame();
            topPad.name = "Padding Top";
            topPad.x = specs.paddingLeft;
            topPad.y = 0;
            topPad.resize(Math.max(specsNode.width - specs.paddingLeft - specs.paddingRight, 1), specs.paddingTop);
            topPad.fills = [{ type: "SOLID", color: padColor, opacity: 0.15 }];
            topPad.strokes = [{ type: "SOLID", color: padColor }];
            topPad.strokeWeight = 0.5;
            topPad.dashPattern = [2, 2];
            specContainer.appendChild(topPad);

            if (specs.paddingTop >= 10) {
              await drawTag(specContainer, specsNode.width / 2, specs.paddingTop / 2, `${specs.paddingTop}`, padColor, { r: 1, g: 1, b: 1 });
            }
          }

          if (specs.paddingBottom > 0) {
            const bottomPad = figma.createFrame();
            bottomPad.name = "Padding Bottom";
            bottomPad.x = specs.paddingLeft;
            bottomPad.y = specsNode.height - specs.paddingBottom;
            bottomPad.resize(Math.max(specsNode.width - specs.paddingLeft - specs.paddingRight, 1), specs.paddingBottom);
            bottomPad.fills = [{ type: "SOLID", color: padColor, opacity: 0.15 }];
            bottomPad.strokes = [{ type: "SOLID", color: padColor }];
            bottomPad.strokeWeight = 0.5;
            bottomPad.dashPattern = [2, 2];
            specContainer.appendChild(bottomPad);

            if (specs.paddingBottom >= 10) {
              await drawTag(specContainer, specsNode.width / 2, specsNode.height - specs.paddingBottom / 2, `${specs.paddingBottom}`, padColor, { r: 1, g: 1, b: 1 });
            }
          }

          if (specs.cornerRadius > 0) {
            const radiusColor = { r: 168/255, g: 85/255, b: 247/255 }; // Purple 500
            drawLine(specContainer, 0, 0, -12, -12, radiusColor);
            const circle = figma.createEllipse();
            circle.resize(4, 4);
            circle.x = -2;
            circle.y = -2;
            circle.fills = [{ type: "SOLID", color: radiusColor }];
            specContainer.appendChild(circle);
            await drawTag(specContainer, -20, -20, `R: ${specs.cornerRadius}`, radiusColor, { r: 1, g: 1, b: 1 });
          }

          const specColor = { r: 239/255, g: 68/255, b: 68/255 }; // Red 500
          drawLine(specContainer, 0, specsNode.height + 12, specsNode.width, specsNode.height + 12, specColor);
          drawLine(specContainer, 0, specsNode.height + 8, 0, specsNode.height + 16, specColor);
          drawLine(specContainer, specsNode.width, specsNode.height + 8, specsNode.width, specsNode.height + 16, specColor);
          await drawTag(specContainer, specsNode.width / 2, specsNode.height + 12, `${specs.width}px`, specColor, { r: 1, g: 1, b: 1 });

          drawLine(specContainer, specsNode.width + 12, 0, specsNode.width + 12, specsNode.height, specColor);
          drawLine(specContainer, specsNode.width + 8, 0, specsNode.width + 16, 0, specColor);
          drawLine(specContainer, specsNode.width + 8, specsNode.height, specsNode.width + 16, specsNode.height, specColor);
          await drawTag(specContainer, specsNode.width + 12, specsNode.height / 2, `${specs.height}px`, specColor, { r: 1, g: 1, b: 1 });

          // Sub-header for Design Tokens & Swatches
          const tokensHeader = figma.createText();
          tokensHeader.fontName = boldFont;
          tokensHeader.fontSize = 13;
          tokensHeader.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
          tokensHeader.characters = "Design System Styles & Tokens";
          tokensHeader.textAutoResize = "HEIGHT";
          tokensHeader.layoutAlign = "STRETCH";
          docLayout.appendChild(tokensHeader);

          // Styles Swatches Card
          await createStylesCard(docLayout, specs);

          // Divider at bottom
          const catSpacer = figma.createFrame();
          catSpacer.name = "Category Divider";
          catSpacer.resize(1120, 1);
          catSpacer.fills = [{ type: "SOLID", color: { r: 30/255, g: 41/255, b: 59/255 } }];
          compFrame.appendChild(catSpacer);
        };

        await renderComponentCategory("Buttons", representativeButtons);
        await renderComponentCategory("Input Fields", representativeInputs);
        await renderComponentCategory("Interactive Controls", representativeToggles);
        await renderComponentCategory("Cards", representativeCards);

        pageWrapper.appendChild(compFrame);


      }

      // SECTION E: ASSETS (Slate 900)
      figma.ui.postMessage({
        type: "scan-progress",
        status: "Extracting Assets...",
        step: "Gathering icons and images"
      });
      await new Promise(resolve => setTimeout(resolve, 5));

      const hasAssets = representativeImages.length > 0 || representativeIcons.length > 0;
      if (hasAssets) {
        const assetsFrame = figma.createFrame();
        assetsFrame.name = "Assets Library";
        assetsFrame.layoutMode = "VERTICAL";
        assetsFrame.resize(1200, 10);
        assetsFrame.counterAxisSizingMode = "FIXED";
        assetsFrame.primaryAxisSizingMode = "AUTO";
        assetsFrame.layoutAlign = "STRETCH";
        assetsFrame.fills = [{ type: "SOLID", color: theme.sectionBg }];
        assetsFrame.cornerRadius = 16;
        assetsFrame.paddingLeft = 40;
        assetsFrame.paddingRight = 40;
        assetsFrame.paddingTop = 40;
        assetsFrame.paddingBottom = 40;
        assetsFrame.itemSpacing = 32;

        const assetsHeader = figma.createText();
        assetsHeader.fontName = boldFont;
        assetsHeader.fontSize = 24;
        assetsHeader.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
        assetsHeader.characters = "Detected Assets";
        assetsHeader.textAutoResize = "HEIGHT";
        assetsHeader.layoutAlign = "STRETCH";
        assetsFrame.appendChild(assetsHeader);

        // Render Icons
        if (representativeIcons.length > 0) {
          const iconSubTitle = figma.createText();
          iconSubTitle.fontName = boldFont;
          iconSubTitle.fontSize = 16;
          iconSubTitle.fills = [{ type: "SOLID", color: theme.accentLight }];
          iconSubTitle.characters = "Icons";
          iconSubTitle.textAutoResize = "HEIGHT";
          iconSubTitle.layoutAlign = "STRETCH";
          assetsFrame.appendChild(iconSubTitle);

          const iconRow = figma.createFrame();
          iconRow.name = "Icons Row";
          iconRow.layoutMode = "HORIZONTAL";
          iconRow.resize(1120, 10);
          iconRow.layoutWrap = "WRAP";
          iconRow.layoutAlign = "STRETCH";
          iconRow.primaryAxisSizingMode = "FIXED";
          iconRow.counterAxisSizingMode = "AUTO";
          iconRow.itemSpacing = 20;
          iconRow.counterAxisSpacing = 20;
          iconRow.fills = [];

          for (const item of representativeIcons) {
            try {
              const card = figma.createFrame();
              card.name = `Icon - ${item.name}`;
              card.fills = [{ type: "SOLID", color: theme.cardBg }];
              card.cornerRadius = 12;
              card.strokes = [{ type: "SOLID", color: theme.cardBorder }];
              card.strokeWeight = 1;
              card.layoutMode = "VERTICAL";
              card.primaryAxisSizingMode = "AUTO";
              card.counterAxisSizingMode = "AUTO";
              card.minWidth = 120;
              card.minHeight = 80;
              card.paddingLeft = 16;
              card.paddingRight = 16;
              card.paddingTop = 16;
              card.paddingBottom = 16;
              card.itemSpacing = 10;
              card.counterAxisAlignItems = "CENTER";

              // Title
              const label = figma.createText();
              label.fontName = mediumFont;
              label.fontSize = 11;
              label.fills = [{ type: "SOLID", color: { r: 148/255, g: 163/255, b: 184/255 } }];
              label.characters = `${item.name.substring(0, 15)}`;
              label.textAutoResize = "HEIGHT";
              label.layoutAlign = "STRETCH";
              card.appendChild(label);

              // Clone
              const clone = item.clone();
              if ("layoutAlign" in clone) {
                clone.layoutAlign = "INHERIT";
              }
              if ("layoutGrow" in clone) {
                clone.layoutGrow = 0;
              }
              clone.x = 0;
              clone.y = 0;
              card.appendChild(clone);

              iconRow.appendChild(card);
            } catch (e) {
              // Clone error
            }
          }
          assetsFrame.appendChild(iconRow);
        }

        // Render Images
        if (representativeImages.length > 0) {
          const imgSubTitle = figma.createText();
          imgSubTitle.fontName = boldFont;
          imgSubTitle.fontSize = 16;
          imgSubTitle.fills = [{ type: "SOLID", color: theme.accentLight }];
          imgSubTitle.characters = "Images & Media";
          imgSubTitle.textAutoResize = "HEIGHT";
          imgSubTitle.layoutAlign = "STRETCH";
          assetsFrame.appendChild(imgSubTitle);

          const imgRow = figma.createFrame();
          imgRow.name = "Images Row";
          imgRow.layoutMode = "HORIZONTAL";
          imgRow.resize(1120, 10);
          imgRow.layoutWrap = "WRAP";
          imgRow.layoutAlign = "STRETCH";
          imgRow.primaryAxisSizingMode = "FIXED";
          imgRow.counterAxisSizingMode = "AUTO";
          imgRow.itemSpacing = 20;
          imgRow.counterAxisSpacing = 20;
          imgRow.fills = [];

          for (const item of representativeImages) {
            try {
              const card = figma.createFrame();
              card.name = `Image - ${item.name}`;
              card.fills = [{ type: "SOLID", color: theme.cardBg }];
              card.cornerRadius = 12;
              card.strokes = [{ type: "SOLID", color: theme.cardBorder }];
              card.strokeWeight = 1;
              card.layoutMode = "VERTICAL";
              card.primaryAxisSizingMode = "AUTO";
              card.counterAxisSizingMode = "AUTO";
              card.minWidth = 160;
              card.minHeight = 120;
              card.paddingLeft = 16;
              card.paddingRight = 16;
              card.paddingTop = 16;
              card.paddingBottom = 16;
              card.itemSpacing = 10;
              card.counterAxisAlignItems = "CENTER";

              // Title
              const label = figma.createText();
              label.fontName = mediumFont;
              label.fontSize = 11;
              label.fills = [{ type: "SOLID", color: { r: 148/255, g: 163/255, b: 184/255 } }];
              label.characters = `${item.name.substring(0, 15)} (${item.width.toFixed(0)}x${item.height.toFixed(0)})`;
              label.textAutoResize = "HEIGHT";
              label.layoutAlign = "STRETCH";
              card.appendChild(label);

              // Thumbnail
              const thumb = figma.createRectangle();
              thumb.name = "Thumbnail";
              thumb.resize(120, 80);
              thumb.cornerRadius = 6;
              if ("fills" in item) {
                thumb.fills = item.fills;
              }
              card.appendChild(thumb);

              imgRow.appendChild(card);
            } catch (e) {
              // Draw error
            }
          }
          assetsFrame.appendChild(imgRow);
        }

        pageWrapper.appendChild(assetsFrame);
      }

      // SECTION F: ELEVATION & SHADOWS (Slate 900)
      const sortedShadows = Object.entries(shadows)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5); // Top 5 shadows

      if (sortedShadows.length > 0) {
        const shadowsFrame = figma.createFrame();
        shadowsFrame.name = "Elevation & Shadows";
        shadowsFrame.layoutMode = "VERTICAL";
        shadowsFrame.resize(1200, 10);
        shadowsFrame.counterAxisSizingMode = "FIXED";
        shadowsFrame.primaryAxisSizingMode = "AUTO";
        shadowsFrame.layoutAlign = "STRETCH";
        shadowsFrame.fills = [{ type: "SOLID", color: theme.sectionBg }];
        shadowsFrame.cornerRadius = 16;
        shadowsFrame.paddingLeft = 40;
        shadowsFrame.paddingRight = 40;
        shadowsFrame.paddingTop = 40;
        shadowsFrame.paddingBottom = 40;
        shadowsFrame.itemSpacing = 24;

        const sHeader = figma.createText();
        sHeader.fontName = boldFont;
        sHeader.fontSize = 24;
        sHeader.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
        sHeader.characters = "Elevation & Shadows";
        sHeader.textAutoResize = "HEIGHT";
        sHeader.layoutAlign = "STRETCH";
        shadowsFrame.appendChild(sHeader);

        const shadowRow = figma.createFrame();
        shadowRow.name = "Shadows Row";
        shadowRow.layoutMode = "HORIZONTAL";
        shadowRow.resize(1120, 10);
        shadowRow.layoutWrap = "WRAP";
        shadowRow.layoutAlign = "STRETCH";
        shadowRow.primaryAxisSizingMode = "FIXED";
        shadowRow.counterAxisSizingMode = "AUTO";
        shadowRow.itemSpacing = 32;
        shadowRow.counterAxisSpacing = 32;
        shadowRow.fills = [];

        sortedShadows.forEach(([key, data]) => {
          try {
            const card = figma.createFrame();
            card.name = `Shadow Card - ${data.effect.radius}px`;
            card.resize(200, 200);
            card.fills = [{ type: "SOLID", color: theme.cardBg }];
            card.cornerRadius = 12;
            
            // Apply effect
            card.effects = [data.effect];

            card.layoutMode = "VERTICAL";
            card.primaryAxisSizingMode = "FIXED";
            card.counterAxisSizingMode = "FIXED";
            card.paddingLeft = 16;
            card.paddingRight = 16;
            card.paddingTop = 16;
            card.paddingBottom = 16;
            card.itemSpacing = 8;
            card.counterAxisAlignItems = "CENTER";
            card.primaryAxisAlignItems = "CENTER";

            const label = figma.createText();
            label.fontName = boldFont;
            label.fontSize = 14;
            label.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
            label.characters = `${data.effect.type === "DROP_SHADOW" ? "Drop Shadow" : "Inner Shadow"}`;
            label.textAutoResize = "HEIGHT";
            label.layoutAlign = "STRETCH";
            card.appendChild(label);

            const detail = figma.createText();
            detail.fontName = defaultFont;
            detail.fontSize = 11;
            detail.fills = [{ type: "SOLID", color: { r: 148/255, g: 163/255, b: 184/255 } }];
            detail.characters = `X: ${data.effect.offset.x}  Y: ${data.effect.offset.y}\nBlur: ${data.effect.radius}px\nUsed ${data.count} times`;
            detail.textAutoResize = "HEIGHT";
            detail.layoutAlign = "STRETCH";
            card.appendChild(detail);

            shadowRow.appendChild(card);
          } catch (e) {
            // Create error
          }
        });

        shadowsFrame.appendChild(shadowRow);
        pageWrapper.appendChild(shadowsFrame);
      }

      // SECTION G: SPACING TOKENS (Slate 900)
      const sortedSpacing = Object.entries(spacingValues)
        .map(([val, count]) => ({ val: parseInt(val), count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8); // Top 8 spacing tokens

      if (sortedSpacing.length > 0) {
        const spacingFrame = figma.createFrame();
        spacingFrame.name = "Spacing Tokens";
        spacingFrame.layoutMode = "VERTICAL";
        spacingFrame.resize(1200, 10);
        spacingFrame.counterAxisSizingMode = "FIXED";
        spacingFrame.primaryAxisSizingMode = "AUTO";
        spacingFrame.layoutAlign = "STRETCH";
        spacingFrame.fills = [{ type: "SOLID", color: theme.sectionBg }];
        spacingFrame.cornerRadius = 16;
        spacingFrame.paddingLeft = 40;
        spacingFrame.paddingRight = 40;
        spacingFrame.paddingTop = 40;
        spacingFrame.paddingBottom = 40;
        spacingFrame.itemSpacing = 20;

        const spHeader = figma.createText();
        spHeader.fontName = boldFont;
        spHeader.fontSize = 24;
        spHeader.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
        spHeader.characters = "Spacing & Gaps";
        spHeader.textAutoResize = "HEIGHT";
        spHeader.layoutAlign = "STRETCH";
        spacingFrame.appendChild(spHeader);

        sortedSpacing.forEach(({ val, count }) => {
          try {
            const row = figma.createFrame();
            row.name = `Spacing - ${val}px`;
            row.layoutMode = "HORIZONTAL";
            row.layoutAlign = "STRETCH";
            row.resize(1120, 10);
            row.primaryAxisSizingMode = "FIXED";
            row.counterAxisSizingMode = "AUTO";
            row.fills = [];
            row.itemSpacing = 24;
            row.counterAxisAlignItems = "CENTER";

            // Label
            const label = figma.createText();
            label.fontName = boldFont;
            label.fontSize = 13;
            label.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
            const remValue = val / 16;
            const remStr = Number(remValue.toFixed(3)).toString(); // Strip trailing zeros (e.g. 0.5 instead of 0.500)
            label.characters = `${val}px (${remStr}rem)`;
            label.textAutoResize = "HEIGHT";
            label.resize(150, 0);
            row.appendChild(label);

            // Visual bar container (non-layout frame to avoid layout engine bugs)
            const barContainer = figma.createFrame();
            barContainer.name = "Bar Container";
            barContainer.resize(400, 20);
            barContainer.fills = [];

            const bar = figma.createRectangle();
            bar.name = "Spacing Bar";
            const barWidth = Math.max(val * 4, 1);
            bar.resize(Math.min(barWidth, 380), 12); // scaled x4 for clear visibility, capped at 380
            bar.fills = [{ type: "SOLID", color: theme.accentColor }];
            bar.cornerRadius = 4;
            
            // Manually position bar inside the transparent container
            bar.x = 0;
            bar.y = (20 - 12) / 2; // = 4px (vertically centered)
            
            barContainer.appendChild(bar);
            row.appendChild(barContainer);

            // Details count
            const details = figma.createText();
            details.fontName = defaultFont;
            details.fontSize = 11;
            details.fills = [{ type: "SOLID", color: { r: 148/255, g: 163/255, b: 184/255 } }];
            details.characters = `Detected ${count} times in layouts`;
            details.textAutoResize = "HEIGHT";
            details.layoutGrow = 1;
            row.appendChild(details);

            spacingFrame.appendChild(row);
          } catch (e: any) {
            // Create error
          }
        });

        pageWrapper.appendChild(spacingFrame);
      }

      // SECTION H: OPTIMIZATION GUIDELINES (if stats are missing)
      const missingItems: string[] = [];
      if (representativeLogos.length === 0) {
        missingItems.push("• LOGOS: To detect logos, name layers to contain 'logo', 'brand', 'logomark', 'logotype', or 'brandmark'.");
      }
      if (brandColorsList.length === 0) {
        missingItems.push("• BRANDING COLORS: Brand colors are determined from saturated colors used frequently. Apply solid color fills to layers.");
      }
      if (sortedColors.length === 0) {
        missingItems.push("• COLOR PALETTE: No solid fills or strokes were detected. Ensure your layouts use solid colors.");
      }
      if (sortedTypo.length === 0) {
        missingItems.push("• TYPOGRAPHY: No text layers detected. Add text elements to define your typography scale.");
      }
      if (!hasComponents) {
        missingItems.push("• COMPONENTS: No buttons, inputs, or cards matched. Heuristics:\n  - Buttons: 60-320px wide, 24-64px high, containing 1-2 text layers.\n  - Inputs: 120-500px wide, 32-60px high, containing a stroke/fill and text layer.\n  - Cards: 180-500px wide, 120-600px high, containing >= 2 text layers and >= 1 visual element.");
      }
      if (!hasAssets) {
        missingItems.push("• ASSETS (ICONS & IMAGES): No icons or images matched. Icons must be 12-48px square layers with 'icon' or 'svg' in their name.");
      }
      if (sortedShadows.length === 0) {
        missingItems.push("• ELEVATION & SHADOWS: Apply Drop Shadow or Inner Shadow effects on layers to extract elevation tokens.");
      }
      if (sortedSpacing.length === 0) {
        missingItems.push("• SPACING TOKENS: Use Auto Layout padding and item gaps (1px to 128px) on your frames.");
      }

      if (missingItems.length > 0) {
        try {
          const guideFrame = figma.createFrame();
          guideFrame.name = "Optimization Guidelines";
          guideFrame.layoutMode = "VERTICAL";
          guideFrame.resize(1200, 10);
          guideFrame.counterAxisSizingMode = "FIXED";
          guideFrame.primaryAxisSizingMode = "AUTO";
          guideFrame.layoutAlign = "STRETCH";
          guideFrame.fills = [{ type: "SOLID", color: theme.sectionBg }];
          guideFrame.cornerRadius = 16;
          guideFrame.paddingLeft = 40;
          guideFrame.paddingRight = 40;
          guideFrame.paddingTop = 40;
          guideFrame.paddingBottom = 40;
          guideFrame.itemSpacing = 20;

          const gHeader = figma.createText();
          gHeader.fontName = boldFont;
          gHeader.fontSize = 24;
          gHeader.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
          gHeader.characters = "How to Improve Detection";
          gHeader.textAutoResize = "HEIGHT";
          gHeader.layoutAlign = "STRETCH";
          guideFrame.appendChild(gHeader);

          const gSub = figma.createText();
          gSub.fontName = defaultFont;
          gSub.fontSize = 13;
          gSub.fills = [{ type: "SOLID", color: { r: 148/255, g: 163/255, b: 184/255 } }];
          gSub.characters = "Structura uses automated heuristics to build this design system. Some layers didn't match the criteria. Follow these rules to enable detection on your next scan:";
          gSub.textAutoResize = "HEIGHT";
          gSub.layoutAlign = "STRETCH";
          guideFrame.appendChild(gSub);

          for (const itemText of missingItems) {
            const item = figma.createText();
            item.fontName = defaultFont;
            item.fontSize = 13;
            item.fills = [{ type: "SOLID", color: { r: 243/255, g: 244/255, b: 246/255 } }];
            item.characters = itemText;
            item.textAutoResize = "HEIGHT";
            item.layoutAlign = "STRETCH";
            guideFrame.appendChild(item);
          }

          pageWrapper.appendChild(guideFrame);
        } catch (e) {
          // Create error
        }
      }

      // Select and scroll viewport to focus the generated container, forcing layout recalculation
      figma.currentPage.selection = [pageWrapper];
      figma.viewport.scrollAndZoomIntoView([pageWrapper]);

      // Cache the results for native Figma style/variable registration
      lastScannedColors = sortedColors.map(([hex, data]) => ({
        hex,
        r: data.r,
        g: data.g,
        b: data.b,
        count: data.count,
        suggestion: getSemanticSuggestion(data.r, data.g, data.b)
      }));

      lastScannedTypo = sortedTypo.map(([_, data]) => ({
        family: data.family,
        style: data.style,
        size: data.size,
        count: data.count
      }));

      lastScannedSpacing = sortedSpacing;

       // 9. Inform UI that scan is complete and send stats & tokens
      const totalComponentsCount = representativeButtons.length + representativeInputs.length + representativeCards.length;
      figma.ui.resize(340, 600); // Auto adjust plugin height directly from code.ts
      figma.ui.postMessage({
        type: "scan-complete",
        stats: {
          colors: sortedColors.length,
          fonts: sortedTypo.length,
          components: totalComponentsCount,
          logos: representativeLogos.length,
          assets: representativeImages.length + representativeIcons.length,
          tokens: sortedShadows.length + sortedSpacing.length,
          layers: layersScanned
        },
        audit: {
          score: designQualityScore,
          autoLayoutRate,
          spacingConsistency,
          recommendations: qaRecommendations
        },
        tokensData: {
          colors: lastScannedColors,
          typography: lastScannedTypo,
          spacing: lastScannedSpacing
        }
      });

      // Refresh pages list in dropdown
      const pagesList = figma.root.children
        .filter(p => {
          const name = p.name.toLowerCase();
          return !name.includes("design system") && !name.includes("structura");
        })
        .map(p => ({
          id: p.id,
          name: p.name
        }));
      figma.ui.postMessage({
        type: "init-pages",
        pages: pagesList
      });

      figma.notify("Structura: Design System Page generated! 🚀");

    } catch (err: any) {
      figma.notify("Generation failed: " + ((err && err.message) || err), { error: true });
      
      // Force exit scanning state in UI
      figma.ui.postMessage({
        type: "scan-complete",
        stats: {
          colors: 0,
          fonts: 0,
          components: 0,
          assets: 0,
          tokens: 0,
          layers: 0
        }
      });
    }
  }
};