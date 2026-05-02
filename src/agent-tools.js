// Agent tools that broadcast modue.* events on behalf of the LLM.
//
// Tools execute outside an active gateway request, so they don't get a
// per-call context.broadcast. The plugin entry calls captureBroadcast(...)
// from inside the modue.bridge.ping handler and the tools reuse that
// captured function. context.broadcast is server-level (not request-scoped)
// in the gateway implementation, so the capture doesn't pin per-request
// state.

let _broadcast = null;

function captureBroadcast(fn) {
  _broadcast = fn;
}

function broadcast(event, params) {
  if (!_broadcast) {
    throw new Error("modue tools not yet primed — call modue.bridge.ping first");
  }
  _broadcast(event, params, { dropIfSlow: true });
}

// iOS system color presets — accepts named colors or raw hex
const COLORS = {
  green: "#30d158",
  blue: "#0a84ff",
  purple: "#bf5af2",
  red: "#ff453a",
  yellow: "#ffd60a",
  orange: "#ff9f0a",
  white: "#ffffff",
  off: "#000000",
};

const resolveColor = (name) => (name ? COLORS[name] || name : COLORS.white);

const text = (t) => ({ content: [{ type: "text", text: t }] });

const tools = [
  {
    name: "modue_leds",
    description:
      "Control the Modue LED strip with animated patterns. ALWAYS use the pattern parameter for effects (pulse, chase, breathe, flash, solid) with a color name or hex. Only use the colors array for setting individual LEDs to specific static colors. Use release=true when done.",
    parameters: {
      type: "object",
      properties: {
        pattern: { type: "string", enum: ["pulse", "chase", "breathe", "flash", "solid"] },
        color: { type: "string", description: "Color name or hex code" },
        speed: { type: "number", minimum: 1, maximum: 10, description: "Animation speed" },
        colors: {
          type: "array",
          items: { type: ["string", "null"] },
          description: "Individual LED colors array",
        },
        release: { type: "boolean", description: "Release LED control back to plugin" },
      },
    },
    async execute(_id, params) {
      try {
        if (!_broadcast) return text("modue not connected — no broadcast available");
        if (params.release) {
          broadcast("modue.leds.release", {});
          return text("Released LED control");
        }
        if (params.colors) {
          const resolved = params.colors.map((c) => (c ? resolveColor(c) : null));
          broadcast("modue.leds.set", { colors: resolved });
          return text(`Set ${resolved.length} LEDs`);
        }
        if (params.pattern) {
          broadcast("modue.leds.pattern", {
            pattern: params.pattern,
            color: resolveColor(params.color),
            speed: params.speed || 5,
          });
          return text(`LEDs: ${params.pattern} in ${params.color || "white"}`);
        }
        return text("Specify pattern, colors, or release");
      } catch (e) {
        return text(`LED error: ${e.message}`);
      }
    },
  },
  {
    name: "modue_display",
    description:
      "Push content to the Modue display (overrides normal widget). Use sparingly for alerts/confirmations. Set release=true to return control to the normal plugin display.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Header text" },
        body: { type: "string", description: "Body text" },
        image: { type: "string", description: "Base64 encoded image data" },
        style: { type: "string", enum: ["normal", "alert", "success"] },
        ttl: { type: "number", minimum: 0, description: "Auto-release after N seconds" },
        release: { type: "boolean" },
      },
    },
    async execute(_id, params) {
      try {
        if (!_broadcast) return text("modue not connected");
        if (params.release) {
          broadcast("modue.display.release", {});
          return text("Released display");
        }
        broadcast("modue.display.set", {
          title: params.title,
          body: params.body,
          image: params.image,
          style: params.style || "normal",
          ttl: params.ttl,
        });
        return text(`Display updated${params.ttl ? ` (auto-release ${params.ttl}s)` : ""}`);
      } catch (e) {
        return text(`Display error: ${e.message}`);
      }
    },
  },
  {
    name: "modue_slider",
    description:
      "Set the Modue motorized fader position (0-100). Use for progress indication or visual feedback.",
    parameters: {
      type: "object",
      properties: {
        value: { type: "number", minimum: 0, maximum: 100, description: "Slider position 0-100" },
      },
      required: ["value"],
    },
    async execute(_id, params) {
      try {
        if (!_broadcast) return text("modue not connected");
        broadcast("modue.slider.set", { value: params.value });
        return text(`Slider → ${params.value}%`);
      } catch (e) {
        return text(`Slider error: ${e.message}`);
      }
    },
  },
  {
    name: "modue_keys",
    description: "Set labels for the 3 physical keys (left, center, right) on the Modue.",
    parameters: {
      type: "object",
      properties: {
        left: { type: "string" },
        center: { type: "string" },
        right: { type: "string" },
      },
    },
    async execute(_id, params) {
      try {
        if (!_broadcast) return text("modue not connected");
        broadcast("modue.key.labels", {
          left: params.left,
          center: params.center,
          right: params.right,
        });
        const labels = [params.left, params.center, params.right].filter(Boolean);
        return text(`Keys: ${labels.join(" | ") || "(cleared)"}`);
      } catch (e) {
        return text(`Keys error: ${e.message}`);
      }
    },
  },
];

export const modueAgentTools = { tools, captureBroadcast };
