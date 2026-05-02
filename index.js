import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { modueRelayHandlers } from "./src/relay-handlers.js";

export default definePluginEntry({
  id: "ddrayne-modue-bridge",
  name: "Modue Bridge (community)",
  description:
    "Registers modue.* gateway RPC relays so the Modue control surface can talk to OpenClaw agents.",
  register(api) {
    for (const [method, handler] of Object.entries(modueRelayHandlers)) {
      api.registerGatewayMethod(method, handler);
    }
  },
});
