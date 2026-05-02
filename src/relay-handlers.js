const relay =
  (event, defaultParams) =>
  async ({ params, respond, context }) => {
    context.broadcast(event, params ?? defaultParams ?? {}, { dropIfSlow: true });
    respond(true, { relayed: true }, undefined);
  };

export const modueRelayHandlers = {
  // Agent -> Modue device
  "modue.display.set": relay("modue.display.set"),
  "modue.display.raw": relay("modue.display.raw"),
  "modue.display.release": relay("modue.display.release", {}),
  "modue.slider.set": relay("modue.slider.set"),
  "modue.leds.set": relay("modue.leds.set"),
  "modue.leds.pattern": relay("modue.leds.pattern"),
  "modue.leds.release": relay("modue.leds.release", {}),
  "modue.key.labels": relay("modue.key.labels"),

  // Modue device -> agents (inbound hardware events)
  "modue.slider.changed": relay("modue.slider.changed"),
  "modue.knob.changed": relay("modue.knob.changed"),
  "modue.key.pressed": relay("modue.key.pressed"),
  "modue.display.touched": relay("modue.display.touched"),
  "modue.capabilities": relay("modue.capabilities"),
};
