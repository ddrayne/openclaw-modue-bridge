# OpenClaw ↔ Modue bridge (community)

A small community [OpenClaw](https://openclaw.ai) plugin by @ddrayne that
bridges OpenClaw and the Modue hardware control surface — both as gateway
RPC relays and as agent tools.

Pairs with [`@modue/openclaw`](https://github.com/ddrayne/openclaw-modue)
(the Modue-platform side) which renders agent state on the device and
forwards device events back to the gateway.

## What it registers

### `modue.*` gateway methods (broadcast relays)

Stateless relays — receive the call from one connected client, broadcast
the same event name and params to every other client. Same handler shape
in both directions.

- **Agent → device**: `modue.display.set`, `modue.display.raw`,
  `modue.display.release`, `modue.slider.set`, `modue.leds.set`,
  `modue.leds.pattern`, `modue.leds.release`, `modue.key.labels`
- **Device → agents**: `modue.slider.changed`, `modue.knob.changed`,
  `modue.key.pressed`, `modue.display.touched`, `modue.capabilities`

### `modue.bridge.ping` gateway method

Compatibility shim for `@modue/openclaw`, which calls it on every
(re)connect to "prime" the broadcast capture used by the agent tools.
Scope: `operator.read`.

### Agent tools (LLM-callable)

- `modue_leds` — set LED patterns (`pulse`, `chase`, `breathe`, `flash`,
  `solid`) or individual LED colors
- `modue_display` — push title / body / image content to the device
- `modue_slider` — set motorized fader position 0-100
- `modue_keys` — set labels for the three physical keys

## Install

```sh
openclaw plugins install @ddrayne/openclaw-modue-bridge
```

## License

ISC.
