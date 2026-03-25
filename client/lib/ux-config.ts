export const UX_CONFIG_STORAGE_KEY = "sesame-ui-config";
export const THEME_STORAGE_KEY = "sesame-theme";
export const UI_CONFIG_EVENT = "sesame-ui-config-change";

export type ThemeName = "light" | "dark";
export type FontPresetKey = "editorial" | "rounded" | "grotesk" | "system";
export type ColorPresetKey = "blue" | "teal" | "amber" | "coral" | "slate";
export type WidthPresetKey = "1120" | "1280" | "1440";
export type FontScalePresetKey = "minus-1" | "base" | "plus-1";
export type DensityPresetKey = "compact" | "balanced" | "relaxed";
export type CornerPresetKey = "crisp" | "balanced" | "soft";
export type SurfacePresetKey = "subtle" | "balanced" | "defined";

export type ThemeConfig = {
  font: FontPresetKey;
  color: ColorPresetKey;
};

export type UiConfig = {
  light: ThemeConfig;
  dark: ThemeConfig;
  width: WidthPresetKey;
  fontScale: FontScalePresetKey;
  density: DensityPresetKey;
  corners: CornerPresetKey;
  surface: SurfacePresetKey;
};

export const FONT_PRESETS = {
  editorial: {
    label: "Editorial Contrast",
    description: "Soft UI sans with serif display headings.",
    ui: '"Avenir Next", "Segoe UI", "Helvetica Neue", sans-serif',
    display: '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
  },
  rounded: {
    label: "Rounded Sans",
    description: "Friendlier product typography with softer headings.",
    ui: '"Avenir Next", "Trebuchet MS", "Segoe UI", sans-serif',
    display: '"Avenir Next", "Trebuchet MS", "Segoe UI", sans-serif',
  },
  grotesk: {
    label: "Grotesk UI",
    description: "Neutral product styling with sans headings throughout.",
    ui: '"Helvetica Neue", "Segoe UI", Arial, sans-serif',
    display: '"Helvetica Neue", "Segoe UI", Arial, sans-serif',
  },
  system: {
    label: "System Clean",
    description: "Native platform feel using system font stacks.",
    ui: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    display: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
} as const;

export const COLOR_PRESETS = {
  light: {
    blue: {
      label: "Blue",
      accent: "#1f6fa5",
      strong: "#15557e",
      soft: "rgba(31, 111, 165, 0.14)",
    },
    teal: {
      label: "Teal",
      accent: "#1c7a68",
      strong: "#145a4d",
      soft: "rgba(28, 122, 104, 0.14)",
    },
    amber: {
      label: "Amber",
      accent: "#b8741a",
      strong: "#8e5610",
      soft: "rgba(184, 116, 26, 0.15)",
    },
    coral: {
      label: "Coral",
      accent: "#b85a48",
      strong: "#8d4033",
      soft: "rgba(184, 90, 72, 0.15)",
    },
    slate: {
      label: "Slate",
      accent: "#4b6a87",
      strong: "#34495f",
      soft: "rgba(75, 106, 135, 0.15)",
    },
  },
  dark: {
    blue: {
      label: "Blue",
      accent: "#2670a9",
      strong: "#4690ca",
      soft: "rgba(38, 112, 169, 0.24)",
    },
    teal: {
      label: "Teal",
      accent: "#2f8d7c",
      strong: "#58b9a8",
      soft: "rgba(47, 141, 124, 0.24)",
    },
    amber: {
      label: "Amber",
      accent: "#d08a2d",
      strong: "#f0b25d",
      soft: "rgba(208, 138, 45, 0.26)",
    },
    coral: {
      label: "Coral",
      accent: "#c56a5a",
      strong: "#e69383",
      soft: "rgba(197, 106, 90, 0.26)",
    },
    slate: {
      label: "Slate",
      accent: "#6e86a3",
      strong: "#94a9c4",
      soft: "rgba(110, 134, 163, 0.26)",
    },
  },
} as const;

export const WIDTH_PRESETS = {
  "1120": {
    label: "1120 px",
    value: "1120px",
    description: "Tighter app frame for focused reading.",
  },
  "1280": {
    label: "1280 px",
    value: "1280px",
    description: "Balanced default for desktop monitoring work.",
  },
  "1440": {
    label: "1440 px",
    value: "1440px",
    description: "Wider frame for denser operational layouts.",
  },
} as const;

export const FONT_SCALE_PRESETS = {
  "minus-1": {
    label: "Smaller",
    value: "13px",
    description: "Reduce shared type further across the app.",
  },
  base: {
    label: "Default",
    value: "14px",
    description: "Use the standard application type scale.",
  },
  "plus-1": {
    label: "Larger",
    value: "16px",
    description: "Increase shared type noticeably across the app.",
  },
} as const;

export const DENSITY_PRESETS = {
  compact: {
    label: "Compact",
    shellPadX: "20px",
    shellPadTop: "28px",
    shellPadBottom: "56px",
  },
  balanced: {
    label: "Balanced",
    shellPadX: "28px",
    shellPadTop: "36px",
    shellPadBottom: "72px",
  },
  relaxed: {
    label: "Relaxed",
    shellPadX: "36px",
    shellPadTop: "44px",
    shellPadBottom: "84px",
  },
} as const;

export const CORNER_PRESETS = {
  crisp: {
    label: "Crisp",
    panel: "20px",
    card: "16px",
  },
  balanced: {
    label: "Balanced",
    panel: "28px",
    card: "22px",
  },
  soft: {
    label: "Soft",
    panel: "34px",
    card: "26px",
  },
} as const;

export const SURFACE_PRESETS = {
  light: {
    subtle: {
      label: "Subtle",
      panel: "rgba(255, 255, 255, 0.72)",
      panelStrong: "rgba(255, 255, 255, 0.88)",
      line: "rgba(24, 49, 82, 0.10)",
      lineStrong: "rgba(24, 49, 82, 0.16)",
    },
    balanced: {
      label: "Balanced",
      panel: "rgba(255, 255, 255, 0.76)",
      panelStrong: "rgba(255, 255, 255, 0.92)",
      line: "rgba(24, 49, 82, 0.12)",
      lineStrong: "rgba(24, 49, 82, 0.20)",
    },
    defined: {
      label: "Defined",
      panel: "rgba(255, 255, 255, 0.92)",
      panelStrong: "rgba(255, 255, 255, 0.98)",
      line: "rgba(24, 49, 82, 0.18)",
      lineStrong: "rgba(24, 49, 82, 0.28)",
    },
  },
  dark: {
    subtle: {
      label: "Subtle",
      panel: "rgba(14, 29, 44, 0.86)",
      panelStrong: "rgba(18, 36, 54, 0.94)",
      line: "rgba(150, 184, 218, 0.18)",
      lineStrong: "rgba(176, 206, 236, 0.30)",
    },
    balanced: {
      label: "Balanced",
      panel: "rgba(16, 33, 50, 0.92)",
      panelStrong: "rgba(19, 39, 58, 0.98)",
      line: "rgba(157, 189, 220, 0.22)",
      lineStrong: "rgba(180, 210, 238, 0.38)",
    },
    defined: {
      label: "Defined",
      panel: "rgba(20, 40, 60, 0.98)",
      panelStrong: "rgba(24, 47, 69, 1)",
      line: "rgba(184, 214, 242, 0.30)",
      lineStrong: "rgba(208, 232, 250, 0.46)",
    },
  },
} as const;

export const DEFAULT_UI_CONFIG: UiConfig = {
  light: {
    font: "rounded",
    color: "blue",
  },
  dark: {
    font: "rounded",
    color: "blue",
  },
  width: "1280",
  fontScale: "base",
  density: "balanced",
  corners: "balanced",
  surface: "balanced",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseUiConfig(value: string | null): UiConfig {
  if (!value) {
    return DEFAULT_UI_CONFIG;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return sanitizeUiConfig(parsed);
  } catch {
    return DEFAULT_UI_CONFIG;
  }
}

export function sanitizeUiConfig(value: unknown): UiConfig {
  if (!isRecord(value)) {
    return DEFAULT_UI_CONFIG;
  }

  const light = isRecord(value.light) ? value.light : {};
  const dark = isRecord(value.dark) ? value.dark : {};

  return {
    light: {
      font:
        typeof light.font === "string" && light.font in FONT_PRESETS
          ? (light.font as FontPresetKey)
          : DEFAULT_UI_CONFIG.light.font,
      color:
        typeof light.color === "string" && light.color in COLOR_PRESETS.light
          ? (light.color as ColorPresetKey)
          : DEFAULT_UI_CONFIG.light.color,
    },
    dark: {
      font:
        typeof dark.font === "string" && dark.font in FONT_PRESETS
          ? (dark.font as FontPresetKey)
          : DEFAULT_UI_CONFIG.dark.font,
      color:
        typeof dark.color === "string" && dark.color in COLOR_PRESETS.dark
          ? (dark.color as ColorPresetKey)
          : DEFAULT_UI_CONFIG.dark.color,
    },
    width:
      typeof value.width === "string" && value.width in WIDTH_PRESETS
        ? (value.width as WidthPresetKey)
        : DEFAULT_UI_CONFIG.width,
    fontScale:
      typeof value.fontScale === "string" && value.fontScale in FONT_SCALE_PRESETS
        ? (value.fontScale as FontScalePresetKey)
        : DEFAULT_UI_CONFIG.fontScale,
    density:
      typeof value.density === "string" && value.density in DENSITY_PRESETS
        ? (value.density as DensityPresetKey)
        : DEFAULT_UI_CONFIG.density,
    corners:
      typeof value.corners === "string" && value.corners in CORNER_PRESETS
        ? (value.corners as CornerPresetKey)
        : DEFAULT_UI_CONFIG.corners,
    surface:
      typeof value.surface === "string" && value.surface in SURFACE_PRESETS.light
        ? (value.surface as SurfacePresetKey)
        : DEFAULT_UI_CONFIG.surface,
  };
}

export function applyUiConfig(
  root: HTMLElement,
  theme: ThemeName,
  config: UiConfig,
) {
  const themeConfig = config[theme];
  const fontPreset = FONT_PRESETS[themeConfig.font];
  const colorPreset = COLOR_PRESETS[theme][themeConfig.color];
  const widthPreset = WIDTH_PRESETS[config.width];
  const fontScalePreset = FONT_SCALE_PRESETS[config.fontScale];
  const densityPreset = DENSITY_PRESETS[config.density];
  const cornerPreset = CORNER_PRESETS[config.corners];
  const surfacePreset = SURFACE_PRESETS[theme][config.surface];

  root.setAttribute("data-theme", theme);
  root.style.setProperty("--font-ui", fontPreset.ui);
  root.style.setProperty("--font-display", fontPreset.display);
  root.style.setProperty("--accent", colorPreset.accent);
  root.style.setProperty("--accent-strong", colorPreset.strong);
  root.style.setProperty("--accent-soft", colorPreset.soft);
  root.style.setProperty("--app-max-width", widthPreset.value);
  root.style.setProperty("--font-scale-base", fontScalePreset.value);
  root.style.setProperty("--shell-pad-x", densityPreset.shellPadX);
  root.style.setProperty("--shell-pad-top", densityPreset.shellPadTop);
  root.style.setProperty("--shell-pad-bottom", densityPreset.shellPadBottom);
  root.style.setProperty("--radius-panel", cornerPreset.panel);
  root.style.setProperty("--radius-card", cornerPreset.card);
  root.style.setProperty("--panel", surfacePreset.panel);
  root.style.setProperty("--panel-strong", surfacePreset.panelStrong);
  root.style.setProperty("--line", surfacePreset.line);
  root.style.setProperty("--line-strong", surfacePreset.lineStrong);
}

export function parseThemeName(value: string | null): ThemeName {
  return value === "dark" ? "dark" : "light";
}

export function getUiConfigBootstrapScript() {
  return `(() => {
    const defaults = ${JSON.stringify(DEFAULT_UI_CONFIG)};
    const fonts = ${JSON.stringify(FONT_PRESETS)};
    const colors = ${JSON.stringify(COLOR_PRESETS)};
    const widths = ${JSON.stringify(WIDTH_PRESETS)};
    const fontScales = ${JSON.stringify(FONT_SCALE_PRESETS)};
    const densities = ${JSON.stringify(DENSITY_PRESETS)};
    const corners = ${JSON.stringify(CORNER_PRESETS)};
    const surfaces = ${JSON.stringify(SURFACE_PRESETS)};
    const configKey = ${JSON.stringify(UX_CONFIG_STORAGE_KEY)};
    const themeKey = ${JSON.stringify(THEME_STORAGE_KEY)};
    const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
    const sanitize = (value) => {
      if (!isRecord(value)) {
        return defaults;
      }
      const light = isRecord(value.light) ? value.light : {};
      const dark = isRecord(value.dark) ? value.dark : {};
      return {
        light: {
          font: typeof light.font === "string" && light.font in fonts ? light.font : defaults.light.font,
          color: typeof light.color === "string" && light.color in colors.light ? light.color : defaults.light.color
        },
        dark: {
          font: typeof dark.font === "string" && dark.font in fonts ? dark.font : defaults.dark.font,
          color: typeof dark.color === "string" && dark.color in colors.dark ? dark.color : defaults.dark.color
        },
        width: typeof value.width === "string" && value.width in widths ? value.width : defaults.width,
        fontScale: typeof value.fontScale === "string" && value.fontScale in fontScales ? value.fontScale : defaults.fontScale,
        density: typeof value.density === "string" && value.density in densities ? value.density : defaults.density,
        corners: typeof value.corners === "string" && value.corners in corners ? value.corners : defaults.corners,
        surface: typeof value.surface === "string" && value.surface in surfaces.light ? value.surface : defaults.surface
      };
    };
    const parseConfig = (value) => {
      if (!value) {
        return defaults;
      }
      try {
        return sanitize(JSON.parse(value));
      } catch {
        return defaults;
      }
    };
    const apply = (root, theme, config) => {
      const themeConfig = config[theme];
      const font = fonts[themeConfig.font];
      const color = colors[theme][themeConfig.color];
      const width = widths[config.width];
      const fontScale = fontScales[config.fontScale];
      const density = densities[config.density];
      const corner = corners[config.corners];
      const surface = surfaces[theme][config.surface];
      root.setAttribute("data-theme", theme);
      root.style.setProperty("--font-ui", font.ui);
      root.style.setProperty("--font-display", font.display);
      root.style.setProperty("--accent", color.accent);
      root.style.setProperty("--accent-strong", color.strong);
      root.style.setProperty("--accent-soft", color.soft);
      root.style.setProperty("--app-max-width", width.value);
      root.style.setProperty("--font-scale-base", fontScale.value);
      root.style.setProperty("--shell-pad-x", density.shellPadX);
      root.style.setProperty("--shell-pad-top", density.shellPadTop);
      root.style.setProperty("--shell-pad-bottom", density.shellPadBottom);
      root.style.setProperty("--radius-panel", corner.panel);
      root.style.setProperty("--radius-card", corner.card);
      root.style.setProperty("--panel", surface.panel);
      root.style.setProperty("--panel-strong", surface.panelStrong);
      root.style.setProperty("--line", surface.line);
      root.style.setProperty("--line-strong", surface.lineStrong);
    };
    try {
      const root = document.documentElement;
      const storedTheme = window.localStorage.getItem(themeKey);
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      const theme = storedTheme === "light" || storedTheme === "dark" ? storedTheme : systemTheme;
      const config = parseConfig(window.localStorage.getItem(configKey));
      apply(root, theme, config);
    } catch {
      document.documentElement.setAttribute("data-theme", "light");
    }
  })();`;
}
