import { afterEach, describe, expect, it } from "vitest";
import { immersiveSessionOptions, queryImmersiveVrSupport } from "../../src/xr/session";

const originalXr = Object.getOwnPropertyDescriptor(navigator, "xr");

function setXr(value: unknown) {
  Object.defineProperty(navigator, "xr", {
    configurable: true,
    value,
  });
}

afterEach(() => {
  if (originalXr) Object.defineProperty(navigator, "xr", originalXr);
  else Reflect.deleteProperty(navigator, "xr");
});

describe("WebXR session boundary", () => {
  it("reports unsupported when no immersive system exists", async () => {
    setXr(undefined);
    await expect(queryImmersiveVrSupport()).resolves.toBe("unsupported");
  });

  it("reports the immersive-vr capability returned by the browser", async () => {
    setXr({
      isSessionSupported: async (mode: string) => mode === "immersive-vr",
    });
    await expect(queryImmersiveVrSupport()).resolves.toBe("supported");
  });

  it("fails closed when capability detection throws", async () => {
    setXr({
      isSessionSupported: async () => {
        throw new Error("permission denied");
      },
    });
    await expect(queryImmersiveVrSupport()).resolves.toBe("unsupported");
  });

  it("requests local-floor with bounded-floor, hand tracking, and DOM overlay as optional", () => {
    const root = document.createElement("main");
    expect(immersiveSessionOptions(root)).toEqual({
      requiredFeatures: ["local-floor"],
      optionalFeatures: ["bounded-floor", "hand-tracking", "dom-overlay"],
      domOverlay: { root },
    });
  });
});
