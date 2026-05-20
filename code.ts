figma.showUI(__html__, { width: 340, height: 420 });

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
        const isLikelyLogo = lowerName.includes("logo") || lowerName.includes("brandmark") || lowerName.includes("logomark") || lowerName.includes("logotype") || lowerName.includes("branding");
        if (isLikelyLogo) {
          if (
            node.type === "FRAME" ||
            node.type === "GROUP" ||
            node.type === "COMPONENT" ||
            node.type === "INSTANCE" ||
            node.type === "VECTOR" ||
            node.type === "BOOLEAN_OPERATION"
          ) {
            if (representativeLogos.length < 6 && !representativeLogos.some(logo => logo.name === node.name)) {
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

          let isButton = false;
          let isInput = false;
          let isCard = false;

          // Button Heuristics
          if (w >= 60 && w <= 320 && h >= 24 && h <= 64) {
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
          if (!isButton && w >= 120 && w <= 500 && h >= 32 && h <= 60) {
            const aspect = w / h;
            if (aspect >= 3.0 && aspect <= 10.0) {
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

          // Card Heuristics
          if (!isButton && !isInput && w >= 180 && w <= 500 && h >= 120 && h <= 600) {
            const textChildren: TextNode[] = [];
            findTextNodes(node, textChildren);
            const visualChildren: SceneNode[] = [];
            findVisualNodes(node, visualChildren);
            if (textChildren.length >= 2 && visualChildren.length >= 1) {
              isCard = true;
            }
          }

          // Save matched nodes
          if (isButton) {
            detectedButtons.push(node);
          } else if (isInput) {
            detectedInputs.push(node);
          } else if (isCard) {
            detectedCards.push(node);
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

      const pageWrapper = figma.createFrame();
      pageWrapper.name = "Design System Container";
      pageWrapper.resize(1200, 100);
      pageWrapper.layoutMode = "VERTICAL";
      pageWrapper.counterAxisSizingMode = "AUTO";
      pageWrapper.primaryAxisSizingMode = "AUTO";
      pageWrapper.fills = []; // Transparent frame
      pageWrapper.itemSpacing = 40;

      // SECTION A: HEADER BANNER (Slate 900 / Themed)
      const headerFrame = figma.createFrame();
      headerFrame.name = "Header Banner";
      headerFrame.resize(1200, 240);
      headerFrame.fills = [{ type: "SOLID", color: theme.sectionBg }];
      headerFrame.cornerRadius = 16;
      headerFrame.layoutMode = "VERTICAL";
      headerFrame.primaryAxisSizingMode = "AUTO";
      headerFrame.counterAxisSizingMode = "AUTO";
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
      headerFrame.appendChild(brandLabel);

      const titleText = figma.createText();
      titleText.fontName = boldFont;
      titleText.fontSize = 36;
      titleText.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
      titleText.characters = "Design System Tokens & Components";
      headerFrame.appendChild(titleText);

      const descText = figma.createText();
      descText.fontName = defaultFont;
      descText.fontSize = 14;
      descText.fills = [{ type: "SOLID", color: { r: 148/255, g: 163/255, b: 184/255 } }]; // Slate 400
      const today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
      descText.characters = `Generated automatically on ${today}. Contains tokens and UI patterns scanned from this file.`;
      headerFrame.appendChild(descText);

      pageWrapper.appendChild(headerFrame);

      // SECTION A1: LOGOS & BRANDING
      if (representativeLogos.length > 0) {
        const logoFrame = figma.createFrame();
        logoFrame.name = "Logos & Branding";
        logoFrame.resize(1200, 100);
        logoFrame.layoutMode = "VERTICAL";
        logoFrame.counterAxisSizingMode = "AUTO";
        logoFrame.primaryAxisSizingMode = "AUTO";
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
        logoRow.primaryAxisSizingMode = "AUTO";
        logoRow.counterAxisSizingMode = "AUTO";
        logoRow.itemSpacing = 24;
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
            card.appendChild(label);

            // Clone and reset positions
            const clone = item.clone();
            clone.x = 0;
            clone.y = 0;
            card.appendChild(clone);

            logoRow.appendChild(card);
          } catch (e) {
            console.error("Error cloning logo:", e);
          }
        }
        logoFrame.appendChild(logoRow);
        pageWrapper.appendChild(logoFrame);
      }

      // SECTION B1: BRANDING COLORS (Themed)
      if (brandColorsList.length > 0) {
        const brandFrame = figma.createFrame();
        brandFrame.name = "Branding Colors";
        brandFrame.resize(1200, 100);
        brandFrame.layoutMode = "VERTICAL";
        brandFrame.counterAxisSizingMode = "AUTO";
        brandFrame.primaryAxisSizingMode = "AUTO";
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
        brandFrame.appendChild(bHeader);

        const brandRow = figma.createFrame();
        brandRow.name = "Brand Cards Row";
        brandRow.layoutMode = "HORIZONTAL";
        brandRow.primaryAxisSizingMode = "AUTO";
        brandRow.counterAxisSizingMode = "AUTO";
        brandRow.itemSpacing = 32;
        brandRow.fills = [];

        brandColorsList.forEach(([hex, data], index) => {
          try {
            const card = figma.createFrame();
            let roleName = "Primary Brand Color";
            if (index === 1) roleName = "Secondary Brand Color";
            if (index === 2) roleName = "Accent Color";

            card.name = `${roleName} - ${hex}`;
            card.resize(346, 220);
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
            card.appendChild(roleText);

            // Hex Code
            const codeRow = figma.createFrame();
            codeRow.name = "Codes";
            codeRow.layoutMode = "HORIZONTAL";
            codeRow.primaryAxisSizingMode = "AUTO";
            codeRow.counterAxisSizingMode = "AUTO";
            codeRow.itemSpacing = 16;
            codeRow.fills = [];

            const hexCode = figma.createText();
            hexCode.fontName = boldFont;
            hexCode.fontSize = 13;
            hexCode.fills = [{ type: "SOLID", color: theme.accentLight }];
            hexCode.characters = hex;
            codeRow.appendChild(hexCode);

            const rgbCode = figma.createText();
            rgbCode.fontName = defaultFont;
            rgbCode.fontSize = 11;
            rgbCode.fills = [{ type: "SOLID", color: { r: 148/255, g: 163/255, b: 184/255 } }];
            rgbCode.characters = rgbToString(data.r, data.g, data.b);
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
            card.appendChild(varTag);

            brandRow.appendChild(card);
          } catch (e) {
            console.error("Error drawing brand card:", e);
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
        colorsFrame.resize(1200, 100);
        colorsFrame.layoutMode = "VERTICAL";
        colorsFrame.counterAxisSizingMode = "AUTO";
        colorsFrame.primaryAxisSizingMode = "AUTO";
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
        colorsFrame.appendChild(cHeader);

        const colorsPerRow = 5;
        const chipW = 208;
        const chipH = 240;

        let currentRow: FrameNode | null = null;

        sortedColors.forEach(([hex, data], index) => {
          if (index % colorsPerRow === 0) {
            currentRow = figma.createFrame();
            currentRow.name = `Row ${Math.floor(index / colorsPerRow) + 1}`;
            currentRow.layoutMode = "HORIZONTAL";
            currentRow.primaryAxisSizingMode = "AUTO";
            currentRow.counterAxisSizingMode = "AUTO";
            currentRow.itemSpacing = 20;
            currentRow.fills = [];
            colorsFrame.appendChild(currentRow);
          }

          const chipFrame = figma.createFrame();
          chipFrame.name = `Color - ${hex}`;
          chipFrame.resize(chipW, chipH);
          chipFrame.fills = [{ type: "SOLID", color: theme.cardBg }];
          chipFrame.cornerRadius = 12;
          chipFrame.layoutMode = "VERTICAL";
          chipFrame.primaryAxisSizingMode = "FIXED";
          chipFrame.counterAxisSizingMode = "FIXED";
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
          chipFrame.appendChild(hexText);

          const rgbText = figma.createText();
          rgbText.fontName = defaultFont;
          rgbText.fontSize = 11;
          rgbText.fills = [{ type: "SOLID", color: { r: 100/255, g: 116/255, b: 139/255 } }];
          rgbText.characters = rgbToString(data.r, data.g, data.b);
          chipFrame.appendChild(rgbText);

          const countText = figma.createText();
          countText.fontName = mediumFont;
          countText.fontSize = 11;
          countText.fills = [{ type: "SOLID", color: { r: 148/255, g: 163/255, b: 184/255 } }];
          countText.characters = `Used ${data.count} times`;
          chipFrame.appendChild(countText);

          // Add suggested semantic variable name
          const suggestion = getSemanticSuggestion(data.r, data.g, data.b);
          const suggestText = figma.createText();
          suggestText.fontName = boldFont;
          suggestText.fontSize = 10;
          suggestText.fills = [{ type: "SOLID", color: theme.accentLight }];
          suggestText.characters = `$var: ${suggestion}`;
          chipFrame.appendChild(suggestText);

          if (currentRow) {
            currentRow.appendChild(chipFrame);
          }
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
        typoFrame.resize(1200, 100);
        typoFrame.layoutMode = "VERTICAL";
        typoFrame.counterAxisSizingMode = "AUTO";
        typoFrame.primaryAxisSizingMode = "AUTO";
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
        typoFrame.appendChild(tHeader);

        // Subtitle listing detected Families & Styles
        const detectedFamilies = Array.from(new Set(Object.values(typography).map(t => t.family))).sort();
        const detectedStyles = Array.from(new Set(Object.values(typography).map(t => t.style))).sort();

        const overviewText = figma.createText();
        overviewText.fontName = defaultFont;
        overviewText.fontSize = 12;
        overviewText.fills = [{ type: "SOLID", color: { r: 148/255, g: 163/255, b: 184/255 } }]; // Slate 400
        overviewText.characters = `Detected Families: ${detectedFamilies.join(", ")}\nDetected Styles: ${detectedStyles.join(", ")}`;
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
          typoFrame.appendChild(familyTitle);

          for (const [key, data] of groupEntries) {
            const row = figma.createFrame();
            row.name = `Typo - ${data.family} ${data.style} ${data.size}px`;
            row.resize(1120, 60);
            row.layoutMode = "HORIZONTAL";
            row.primaryAxisSizingMode = "AUTO";
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
            meta.resize(250, 40);
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
            preview.layoutGrow = 1;
            row.appendChild(preview);

            typoFrame.appendChild(row);
          }
        }

        pageWrapper.appendChild(typoFrame);
      }

      // SECTION D: COMPONENTS (Slate 900)
      figma.ui.postMessage({
        type: "scan-progress",
        status: "Constructing Component Library...",
        step: "Cloning representative buttons, inputs, and cards"
      });
      await new Promise(resolve => setTimeout(resolve, 5));

      const hasComponents = representativeButtons.length > 0 || representativeInputs.length > 0 || representativeCards.length > 0;
      if (hasComponents) {
        const compFrame = figma.createFrame();
        compFrame.name = "Components Library";
        compFrame.resize(1200, 100);
        compFrame.layoutMode = "VERTICAL";
        compFrame.counterAxisSizingMode = "AUTO";
        compFrame.primaryAxisSizingMode = "AUTO";
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
        compHeader.characters = "Detected Components";
        compFrame.appendChild(compHeader);

        // Sub-helper function to create visual section for each component type
        const renderComponentCategory = async (title: string, list: SceneNode[]) => {
          if (list.length === 0) return;

          const subTitle = figma.createText();
          subTitle.fontName = boldFont;
          subTitle.fontSize = 16;
          subTitle.fills = [{ type: "SOLID", color: theme.accentLight }];
          subTitle.characters = title;
          compFrame.appendChild(subTitle);

          const row = figma.createFrame();
          row.name = `${title} Row`;
          row.layoutMode = "HORIZONTAL";
          row.primaryAxisSizingMode = "AUTO";
          row.counterAxisSizingMode = "AUTO";
          row.itemSpacing = 24;
          row.fills = [];

          for (const item of list) {
            try {
              // Wrapper card for the cloned element
              const card = figma.createFrame();
              card.name = `Container - ${item.name}`;
              card.fills = [{ type: "SOLID", color: theme.cardBg }];
              card.cornerRadius = 12;
              card.strokes = [{ type: "SOLID", color: theme.cardBorder }];
              card.strokeWeight = 1;
              card.layoutMode = "VERTICAL";
              card.primaryAxisSizingMode = "AUTO";
              card.counterAxisSizingMode = "AUTO";
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
              label.characters = `${item.name} (${item.width.toFixed(0)}x${item.height.toFixed(0)})`;
              card.appendChild(label);

              // Clone and reset positions
              const clone = item.clone();
              clone.x = 0;
              clone.y = 0;
              card.appendChild(clone);

              row.appendChild(card);
            } catch (e) {
              console.error("Error cloning node for preview:", e);
            }
          }
          compFrame.appendChild(row);
        };

        await renderComponentCategory("Buttons", representativeButtons);
        await renderComponentCategory("Input Fields", representativeInputs);
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
        assetsFrame.resize(1200, 100);
        assetsFrame.layoutMode = "VERTICAL";
        assetsFrame.counterAxisSizingMode = "AUTO";
        assetsFrame.primaryAxisSizingMode = "AUTO";
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
        assetsFrame.appendChild(assetsHeader);

        // Render Icons
        if (representativeIcons.length > 0) {
          const iconSubTitle = figma.createText();
          iconSubTitle.fontName = boldFont;
          iconSubTitle.fontSize = 16;
          iconSubTitle.fills = [{ type: "SOLID", color: theme.accentLight }];
          iconSubTitle.characters = "Icons";
          assetsFrame.appendChild(iconSubTitle);

          const iconRow = figma.createFrame();
          iconRow.name = "Icons Row";
          iconRow.layoutMode = "HORIZONTAL";
          iconRow.primaryAxisSizingMode = "AUTO";
          iconRow.counterAxisSizingMode = "AUTO";
          iconRow.itemSpacing = 20;
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
              card.appendChild(label);

              // Clone
              const clone = item.clone();
              clone.x = 0;
              clone.y = 0;
              card.appendChild(clone);

              iconRow.appendChild(card);
            } catch (e) {
              console.error("Error cloning icon:", e);
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
          assetsFrame.appendChild(imgSubTitle);

          const imgRow = figma.createFrame();
          imgRow.name = "Images Row";
          imgRow.layoutMode = "HORIZONTAL";
          imgRow.primaryAxisSizingMode = "AUTO";
          imgRow.counterAxisSizingMode = "AUTO";
          imgRow.itemSpacing = 20;
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
              console.error("Error drawing image thumb:", e);
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
        shadowsFrame.resize(1200, 100);
        shadowsFrame.layoutMode = "VERTICAL";
        shadowsFrame.counterAxisSizingMode = "AUTO";
        shadowsFrame.primaryAxisSizingMode = "AUTO";
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
        shadowsFrame.appendChild(sHeader);

        const shadowRow = figma.createFrame();
        shadowRow.name = "Shadows Row";
        shadowRow.layoutMode = "HORIZONTAL";
        shadowRow.primaryAxisSizingMode = "AUTO";
        shadowRow.counterAxisSizingMode = "AUTO";
        shadowRow.itemSpacing = 32;
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
            card.appendChild(label);

            const detail = figma.createText();
            detail.fontName = defaultFont;
            detail.fontSize = 11;
            detail.fills = [{ type: "SOLID", color: { r: 148/255, g: 163/255, b: 184/255 } }];
            detail.characters = `X: ${data.effect.offset.x}  Y: ${data.effect.offset.y}\nBlur: ${data.effect.radius}px\nUsed ${data.count} times`;
            card.appendChild(detail);

            shadowRow.appendChild(card);
          } catch (e) {
            console.error("Error creating shadow card:", e);
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
        spacingFrame.resize(1200, 100);
        spacingFrame.layoutMode = "VERTICAL";
        spacingFrame.counterAxisSizingMode = "AUTO";
        spacingFrame.primaryAxisSizingMode = "AUTO";
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
        spacingFrame.appendChild(spHeader);

        sortedSpacing.forEach(({ val, count }) => {
          try {
            const row = figma.createFrame();
            row.name = `Spacing - ${val}px`;
            row.resize(1120, 40);
            row.layoutMode = "HORIZONTAL";
            row.primaryAxisSizingMode = "AUTO";
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
            label.resize(150, 20);
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
            row.appendChild(details);

            spacingFrame.appendChild(row);
          } catch (e: any) {
            console.error("Error creating spacing row:", e);
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
          guideFrame.resize(1200, 100);
          guideFrame.layoutMode = "VERTICAL";
          guideFrame.counterAxisSizingMode = "AUTO";
          guideFrame.primaryAxisSizingMode = "AUTO";
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
          guideFrame.appendChild(gHeader);

          const gSub = figma.createText();
          gSub.fontName = defaultFont;
          gSub.fontSize = 13;
          gSub.fills = [{ type: "SOLID", color: { r: 148/255, g: 163/255, b: 184/255 } }];
          gSub.characters = "Structura uses automated heuristics to build this design system. Some layers didn't match the criteria. Follow these rules to enable detection on your next scan:";
          guideFrame.appendChild(gSub);

          for (const itemText of missingItems) {
            const item = figma.createText();
            item.fontName = defaultFont;
            item.fontSize = 13;
            item.fills = [{ type: "SOLID", color: { r: 243/255, g: 244/255, b: 246/255 } }];
            item.characters = itemText;
            item.layoutGrow = 1;
            guideFrame.appendChild(item);
          }

          pageWrapper.appendChild(guideFrame);
        } catch (e) {
          console.error("Error creating guidelines frame:", e);
        }
      }

      // Append wrapper to Design System Page
      dsPage.appendChild(pageWrapper);

       // 9. Inform UI that scan is complete and send stats
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
      console.error("Structura Generation Error:", err);
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