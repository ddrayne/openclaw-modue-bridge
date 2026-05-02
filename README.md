# OpenClaw ↔ Modue bridge (community)

A small community [OpenClaw](https://openclaw.ai) plugin by @ddrayne that registers the `modue.*`
gateway RPC namespace as broadcast relays, so the Modue platform plugin
[`@modue/openclaw`](https://github.com/ddrayne/openclaw-modue) can talk to
OpenClaw agents over the gateway WebSocket without patching OpenClaw core.

## What it does

Registers 13 `modue.*` gateway methods:

- Agent → device: `modue.display.set`, `modue.display.raw`,
  `modue.display.release`, `modue.slider.set`, `modue.leds.set`,
  `modue.leds.pattern`, `modue.leds.release`, `modue.key.labels`
- Device → agents: `modue.slider.changed`, `modue.knob.changed`,
  `modue.key.pressed`, `modue.display.touched`, `modue.capabilities`

Each handler is a simple broadcast: receive the call from one connected
client, forward the same event name and params to every other client.

## Install

```sh
openclaw plugin install @ddrayne/openclaw-modue-bridge
```

Then make sure the Modue control surface side is set up via the
`@modue/openclaw` Modue-platform plugin.

## License

ISC.
