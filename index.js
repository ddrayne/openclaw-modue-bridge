import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { modueRelayHandlers } from "./src/relay-handlers.js";
import { modueAgentTools } from "./src/agent-tools.js";

export default definePluginEntry({
  id: "ddrayne-modue-bridge",
  name: "Modue Bridge (community)",
  description:
    "Bridges OpenClaw and the Modue control surface: modue.* RPC relays, modue.bridge.ping for device priming, and 4 LLM tools (modue_leds, modue_display, modue_slider, modue_keys).",
  register(api) {
    api.logger?.info?.("[ddrayne-modue-bridge] registering...");

    // -----------------------------------------------------------------------
    // modue.* gateway methods — broadcast relays in both directions.
    // Anything sent to these is fanned out to every connected gateway client
    // so the Modue device, agents, and other observers all see the same
    // state. Stateless; safe under load (fix v0.1: no per-notify amplifier).
    // -----------------------------------------------------------------------
    for (const [method, handler] of Object.entries(modueRelayHandlers)) {
      api.registerGatewayMethod(method, handler);
    }

    // -----------------------------------------------------------------------
    // modue.bridge.ping — kept for compatibility with @modue/openclaw, which
    // calls it on every (re)connect to "prime" the broadcast capture below.
    // The other historical modue.bridge.{leds,display,slider,keys} wrappers
    // are not registered: nothing actually called them, and the same effect
    // is reachable through the modue.* relay methods plus the LLM tools.
    // -----------------------------------------------------------------------
    api.registerGatewayMethod(
      "modue.bridge.ping",
      async ({ respond, context }) => {
        modueAgentTools.captureBroadcast(context.broadcast);
        respond(true, { ok: true, hasBroadcast: true }, undefined);
      },
      { scope: "operator.read" },
    );

    // -----------------------------------------------------------------------
    // Agent tools (modue_leds / modue_display / modue_slider / modue_keys).
    // Tools execute outside an active gateway request, so they don't get a
    // per-call context.broadcast. We capture the gateway's broadcast on the
    // first modue.bridge.ping call (above) and reuse it. context.broadcast
    // is server-level (not request-scoped) in this gateway implementation,
    // so the capture doesn't retain per-request closures.
    // -----------------------------------------------------------------------
    for (const tool of modueAgentTools.tools) {
      api.registerTool(tool);
    }

    api.logger?.info?.(
      `[ddrayne-modue-bridge] registered: ${Object.keys(modueRelayHandlers).length} modue.* relays + 1 bridge.ping + ${modueAgentTools.tools.length} tools`,
    );
  },
});
