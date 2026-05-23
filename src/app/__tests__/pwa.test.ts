import { describe, it, expect } from "vitest";
import manifest from "../manifest";
import { viewport, metadata } from "../layout";

describe("manifest()", () => {
  const m = manifest();

  it("has the correct name and short_name", () => {
    expect(m.name).toBe("Watchlist");
    expect(m.short_name).toBe("Watchlist");
  });

  it("has display set to standalone", () => {
    expect(m.display).toBe("standalone");
  });

  it("has start_url set to /", () => {
    expect(m.start_url).toBe("/");
  });

  it("has background_color and theme_color set to the dark zinc value", () => {
    expect(m.background_color).toBe("#09090b");
    expect(m.theme_color).toBe("#09090b");
  });

  it("includes the apple-touch-icon at 180x180", () => {
    expect(m.icons).toHaveLength(1);
    const icon = m.icons![0];
    expect(icon.src).toBe("/apple-touch-icon.png");
    expect(icon.sizes).toBe("180x180");
    expect(icon.type).toBe("image/png");
  });
});

describe("viewport export", () => {
  it("sets width to device-width", () => {
    expect(viewport.width).toBe("device-width");
  });

  it("sets initialScale to 1", () => {
    expect(viewport.initialScale).toBe(1);
  });

  it("sets viewportFit to cover for iOS safe-area support", () => {
    expect(viewport.viewportFit).toBe("cover");
  });
});

describe("metadata export", () => {
  it("points manifest to /manifest.webmanifest", () => {
    expect(metadata.manifest).toBe("/manifest.webmanifest");
  });

  it("sets themeColor to the dark zinc value", () => {
    expect(metadata.themeColor).toBe("#09090b");
  });

  it("marks the app as apple-web-app capable", () => {
    expect(metadata.appleWebApp).toBeDefined();
    expect((metadata.appleWebApp as { capable: boolean }).capable).toBe(true);
  });

  it("sets apple statusBarStyle to black-translucent", () => {
    expect(
      (metadata.appleWebApp as { statusBarStyle: string }).statusBarStyle
    ).toBe("black-translucent");
  });
});
