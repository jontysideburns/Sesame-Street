"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  applyUiConfig,
  COLOR_PRESETS,
  CORNER_PRESETS,
  DEFAULT_UI_CONFIG,
  DENSITY_PRESETS,
  FONT_SCALE_PRESETS,
  FONT_PRESETS,
  parseThemeName,
  parseUiConfig,
  SurfacePresetKey,
  SURFACE_PRESETS,
  THEME_STORAGE_KEY,
  ThemeName,
  UI_CONFIG_EVENT,
  UiConfig,
  UX_CONFIG_STORAGE_KEY,
  WIDTH_PRESETS
} from "../lib/ux-config";

type ThemeField = "font" | "color";
type GlobalField = "width" | "fontScale" | "density" | "corners" | "surface";

function useConfiguratorState() {
  const [config, setConfig] = useState<UiConfig>(DEFAULT_UI_CONFIG);
  const [theme, setTheme] = useState<ThemeName>("light");

  useEffect(() => {
    function syncFromStorage() {
      const nextConfig = parseUiConfig(
        window.localStorage.getItem(UX_CONFIG_STORAGE_KEY)
      );
      const nextTheme = parseThemeName(
        window.localStorage.getItem(THEME_STORAGE_KEY) ??
          document.documentElement.getAttribute("data-theme")
      );

      setConfig(nextConfig);
      setTheme(nextTheme);
    }

    syncFromStorage();
    window.addEventListener(UI_CONFIG_EVENT, syncFromStorage as EventListener);
    window.addEventListener("storage", syncFromStorage);

    return () => {
      window.removeEventListener(
        UI_CONFIG_EVENT,
        syncFromStorage as EventListener
      );
      window.removeEventListener("storage", syncFromStorage);
    };
  }, []);

  function persist(nextConfig: UiConfig, nextTheme: ThemeName) {
    applyUiConfig(document.documentElement, nextTheme, nextConfig);
    window.localStorage.setItem(UX_CONFIG_STORAGE_KEY, JSON.stringify(nextConfig));
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    window.dispatchEvent(new CustomEvent(UI_CONFIG_EVENT));
    setConfig(nextConfig);
    setTheme(nextTheme);
  }

  function updateThemeSetting(
    targetTheme: ThemeName,
    field: ThemeField,
    value: UiConfig[ThemeName][ThemeField]
  ) {
    const nextConfig: UiConfig = {
      ...config,
      [targetTheme]: {
        ...config[targetTheme],
        [field]: value
      }
    };

    persist(nextConfig, theme);
  }

  function updateGlobalSetting(field: GlobalField, value: UiConfig[GlobalField]) {
    const nextConfig: UiConfig = {
      ...config,
      [field]: value
    };

    persist(nextConfig, theme);
  }

  function previewTheme(nextTheme: ThemeName) {
    persist(config, nextTheme);
  }

  function resetDefaults() {
    persist(DEFAULT_UI_CONFIG, theme);
  }

  return {
    config,
    theme,
    previewTheme,
    resetDefaults,
    updateThemeSetting,
    updateGlobalSetting
  };
}

export function UxConfigurator() {
  return renderConfigurator(false, useConfiguratorState());
}

export function EmbeddedUxConfigurator() {
  return renderConfigurator(true, useConfiguratorState());
}

function renderConfigurator(
  embedded: boolean,
  {
    config,
    theme,
    previewTheme,
    resetDefaults,
    updateThemeSetting,
    updateGlobalSetting
  }: {
    config: UiConfig;
    theme: ThemeName;
    previewTheme: (nextTheme: ThemeName) => void;
    resetDefaults: () => void;
    updateThemeSetting: (
      targetTheme: ThemeName,
      field: ThemeField,
      value: UiConfig[ThemeName][ThemeField]
    ) => void;
    updateGlobalSetting: (field: GlobalField, value: UiConfig[GlobalField]) => void;
  }
) {
  const content = (
    <>
      <section className="hero compact">
        <div>
          <p className="eyebrow">UX configuration</p>
          <h1>Configure the platform look and feel.</h1>
          <p className="hero-copy">
            Set typography and primary color independently for light and dark
            themes, then tune the app frame, density, surface definition, and
            corner style for the overall interface language.
          </p>
        </div>
      </section>

      <section className="panel config-toolbar">
        <div className="config-toolbar-copy">
          <p className="eyebrow">Theme preview</p>
          <h2>Apply changes live across the app shell.</h2>
          <p>
            The preview switch changes the active theme immediately. Theme-specific
            typography and accent selections remain independent.
          </p>
        </div>
        <div className="config-toolbar-actions">
          <div className="segmented-control" aria-label="Theme preview">
            <button
              type="button"
              className={`segmented-button ${theme === "light" ? "active" : ""}`}
              onClick={() => previewTheme("light")}
              aria-pressed={theme === "light"}
            >
              Light preview
            </button>
            <button
              type="button"
              className={`segmented-button ${theme === "dark" ? "active" : ""}`}
              onClick={() => previewTheme("dark")}
              aria-pressed={theme === "dark"}
            >
              Dark preview
            </button>
          </div>
          <button type="button" className="button secondary" onClick={resetDefaults}>
            Reset defaults
          </button>
        </div>
      </section>

      <section className="config-grid">
        <ThemeConfigCard
          themeName="light"
          activeTheme={theme}
          config={config}
          onUpdate={updateThemeSetting}
        />
        <ThemeConfigCard
          themeName="dark"
          activeTheme={theme}
          config={config}
          onUpdate={updateThemeSetting}
        />
        <section className="panel config-card config-card-wide">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Global layout</p>
              <h2>Frame and surface controls</h2>
            </div>
            <span className="badge neutral">Whole app</span>
          </div>

          <OptionSection
            title="Application width"
            description="Constrain the entire app shell, including the left navigation."
          >
            <div className="config-option-grid compact">
              {Object.entries(WIDTH_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  type="button"
                  className={`option-button ${config.width === key ? "active" : ""}`}
                  onClick={() => updateGlobalSetting("width", key as UiConfig["width"])}
                >
                  <strong>{preset.label}</strong>
                  <span>{preset.description}</span>
                </button>
              ))}
            </div>
          </OptionSection>

          <OptionSection
            title="Relative font size"
            description="Increase or reduce the shared type scale by one step across the interface."
          >
            <div className="config-option-grid compact">
              {Object.entries(FONT_SCALE_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  type="button"
                  className={`option-button ${config.fontScale === key ? "active" : ""}`}
                  onClick={() =>
                    updateGlobalSetting("fontScale", key as UiConfig["fontScale"])
                  }
                >
                  <strong>{preset.label}</strong>
                  <span>{preset.description}</span>
                </button>
              ))}
            </div>
          </OptionSection>

          <div className="config-split-grid">
            <OptionSection
              title="Density"
              description="Controls shell spacing and breathing room."
            >
              <div className="config-option-grid compact">
                {Object.entries(DENSITY_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    type="button"
                    className={`option-button ${config.density === key ? "active" : ""}`}
                    onClick={() =>
                      updateGlobalSetting("density", key as UiConfig["density"])
                    }
                  >
                    <strong>{preset.label}</strong>
                    <span>
                      {preset.shellPadTop} top, {preset.shellPadX} side padding
                    </span>
                  </button>
                ))}
              </div>
            </OptionSection>

            <OptionSection
              title="Corner style"
              description="Adjusts panel and card softness."
            >
              <div className="config-option-grid compact">
                {Object.entries(CORNER_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    type="button"
                    className={`option-button ${config.corners === key ? "active" : ""}`}
                    onClick={() =>
                      updateGlobalSetting("corners", key as UiConfig["corners"])
                    }
                  >
                    <strong>{preset.label}</strong>
                    <span>
                      Panels {preset.panel}, cards {preset.card}
                    </span>
                  </button>
                ))}
              </div>
            </OptionSection>
          </div>

          <OptionSection
            title="Surface definition"
            description="Controls panel contrast and line definition in both themes."
          >
            <div className="config-option-grid compact">
              {Object.entries(SURFACE_PRESETS.light).map(([key, preset]) => (
                <button
                  key={key}
                  type="button"
                  className={`option-button ${config.surface === key ? "active" : ""}`}
                  onClick={() =>
                    updateGlobalSetting("surface", key as SurfacePresetKey)
                  }
                >
                  <strong>{preset.label}</strong>
                  <span>
                    {key === "subtle" && "Softer panels and lighter dividers."}
                    {key === "balanced" &&
                      "Balanced separation between cards and content."}
                    {key === "defined" &&
                      "Sharper surfaces and stronger line contrast."}
                  </span>
                </button>
              ))}
            </div>
          </OptionSection>
        </section>
      </section>

    </>
  );

  if (embedded) {
    return <section className="setup-config-stack">{content}</section>;
  }

  return <main className="shell">{content}</main>;
}

function ThemeConfigCard({
  themeName,
  activeTheme,
  config,
  onUpdate
}: {
  themeName: ThemeName;
  activeTheme: ThemeName;
  config: UiConfig;
  onUpdate: (
    targetTheme: ThemeName,
    field: ThemeField,
    value: UiConfig[ThemeName][ThemeField]
  ) => void;
}) {
  const themeConfig = config[themeName];
  const fontPreset = FONT_PRESETS[themeConfig.font];
  const colorPreset = COLOR_PRESETS[themeName][themeConfig.color];

  return (
    <section className="panel config-card">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">{themeName} theme</p>
          <h2>{themeName === "light" ? "Light mode styling" : "Dark mode styling"}</h2>
        </div>
        <span className={`badge ${activeTheme === themeName ? "good" : "neutral"}`}>
          {activeTheme === themeName ? "Previewing now" : "Stored preset"}
        </span>
      </div>

      <div
        className={`theme-sample theme-sample-${themeName}`}
        style={
          {
            "--sample-ui-font": fontPreset.ui,
            "--sample-display-font": fontPreset.display,
            "--sample-accent": colorPreset.accent,
            "--sample-accent-soft": colorPreset.soft
          } as CSSProperties
        }
      >
        <p>Deal monitoring workspace</p>
        <h3>Quarter-end package received and assessment refreshed.</h3>
        <span>Font and accent preview for the {themeName} experience.</span>
      </div>

      <OptionSection
        title="Typography"
        description="Choose the font family pairing; the app applies it across body and display roles."
      >
        <div className="config-option-grid">
          {Object.entries(FONT_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              type="button"
              className={`option-button ${themeConfig.font === key ? "active" : ""}`}
              onClick={() => onUpdate(themeName, "font", key as UiConfig[ThemeName]["font"])}
            >
              <strong>{preset.label}</strong>
              <span>{preset.description}</span>
            </button>
          ))}
        </div>
      </OptionSection>

      <OptionSection
        title="Primary color"
        description="Sets the core accent for active states, CTAs, chips, and highlights."
      >
        <div className="config-option-grid compact">
          {Object.entries(COLOR_PRESETS[themeName]).map(([key, preset]) => (
            <button
              key={key}
              type="button"
              className={`option-button color-option ${
                themeConfig.color === key ? "active" : ""
              }`}
              onClick={() => onUpdate(themeName, "color", key as UiConfig[ThemeName]["color"])}
            >
              <span
                className="color-swatch"
                style={{ background: `linear-gradient(135deg, ${preset.accent} 0%, ${preset.strong} 100%)` }}
                aria-hidden="true"
              />
              <strong>{preset.label}</strong>
              <span>{preset.accent}</span>
            </button>
          ))}
        </div>
      </OptionSection>
    </section>
  );
}

function OptionSection({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="config-section">
      <div className="config-section-copy">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {children}
    </section>
  );
}
