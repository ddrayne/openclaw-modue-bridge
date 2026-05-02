# OpenClaw ↔ Modue bridge (community)

A community [OpenClaw](https://openclaw.ai) plugin by @ddrayne that bridges
OpenClaw and the Modue hardware control surface — both as gateway RPC
relays and as agent-callable LLM tools.

## How the pieces fit

```
        ┌─────────────────────┐         ┌─────────────────────┐
        │    Modue device     │         │    OpenClaw agent   │
        │ (display, LEDs,     │         │ (LLM, channels,     │
        │  slider, keys)      │         │  approvals, etc.)   │
        └──────────┬──────────┘         └──────────┬──────────┘
                   │ WebSocket                     │ WebSocket
                   ▼                               ▼
         ┌────────────────────────────────────────────────────┐
         │           OpenClaw gateway (this host)             │
         │  ┌──────────────────────────────────────────────┐  │
         │  │   ddrayne-modue-bridge  (this plugin)        │  │
         │  │   • 13 modue.* RPC relays (broadcast)        │  │
         │  │   • modue.bridge.ping (primes broadcast)     │  │
         │  │   • 4 LLM tools (modue_leds/display/...)     │  │
         │  └──────────────────────────────────────────────┘  │
         └────────────────────────────────────────────────────┘
                   ▲
                   │ WebSocket (paired device)
                   │
        ┌──────────┴──────────┐
        │ @modue/openclaw     │  ← runs INSIDE the Modue app
        │ (Modue-platform     │    https://github.com/ddrayne/openclaw-modue
        │  plugin)            │
        └─────────────────────┘
```

You need **both** plugins to get a working setup — this one on the OpenClaw
side, and [`@modue/openclaw`](https://github.com/ddrayne/openclaw-modue) on
the Modue device side.

## What this plugin registers

### `modue.*` gateway methods (broadcast relays)

Stateless relays — receive a call from one connected client, broadcast the
same event name and params to every other client. Same handler shape in
both directions.

- **Agent → device**: `modue.display.set`, `modue.display.raw`,
  `modue.display.release`, `modue.slider.set`, `modue.leds.set`,
  `modue.leds.pattern`, `modue.leds.release`, `modue.key.labels`
- **Device → agents**: `modue.slider.changed`, `modue.knob.changed`,
  `modue.key.pressed`, `modue.display.touched`, `modue.capabilities`

### `modue.bridge.ping`

Compatibility shim for `@modue/openclaw`, which calls it on every
(re)connect to "prime" the broadcast capture used by the agent tools.
Scope: `operator.read`.

### Agent tools (LLM-callable)

- `modue_leds` — set LED patterns (`pulse`, `chase`, `breathe`, `flash`,
  `solid`) or individual LED colors
- `modue_display` — push title / body / image content to the device
- `modue_slider` — set motorized fader position 0-100
- `modue_keys` — set labels for the three physical keys

## Setup

### Prerequisites

- An [OpenClaw](https://openclaw.ai) install with the gateway running
  (`openclaw gateway status` should report `Runtime: running`).
- A [Modue](https://www.modue.com/) device + app (macOS).
- The Modue-platform plugin
  [`@modue/openclaw`](https://github.com/ddrayne/openclaw-modue) installed
  inside the Modue app.

### Install this plugin (OpenClaw side)

```sh
openclaw plugins install @ddrayne/openclaw-modue-bridge
```

Or for local development:

```sh
openclaw plugins install /path/to/openclaw-modue-bridge
```

Restart the gateway so it picks up the new plugin:

```sh
openclaw gateway stop && openclaw gateway start
```

### Configure the Modue side

1. Pull your gateway auth token:

   ```sh
   python3 -c "import json; print(json.load(open(f'{__import__(\"os\").path.expanduser(\"~\")}/.openclaw/openclaw.json'))['gateway']['auth']['token'])"
   ```

2. Open Modue → OpenClaw plugin settings.
3. Paste the token into **Gateway Token**. Leave **Gateway URL** as the
   default (`ws://127.0.0.1:18789`) unless you've moved the gateway.
4. Click **Connect**, or `Cmd+Shift+R` in the Modue app to reload.

### Verify it works

Tail the Modue plugin log:

```sh
tail -f "$HOME/Library/Application Support/modue/pluginLogs/openclaw.log"
```

You should see, in order:

```
Connecting to OpenClaw at ws://127.0.0.1:18789
Challenge received, building device identity
Device identity loaded: …
Device token saved (pairing approved)        ← first time only
Connected to OpenClaw gateway                 ← auth ok
```

Then on the OpenClaw side:

```sh
openclaw plugins doctor 2>&1 | grep ddrayne-modue-bridge
# expect: registered: 13 modue.* relays + 1 bridge.ping + 4 tools
```

Touch a Modue widget (slider, key, or display). The corresponding
`modue.slider.changed` / `modue.key.pressed` / `modue.display.touched`
event should land in the gateway log:

```sh
tail -f /tmp/openclaw/openclaw-$(date +%Y-%m-%d).log | grep modue
```

## Troubleshooting

**`gateway token mismatch` in the Modue plugin log**

Modue's stored `Gateway Token` doesn't match
`gateway.auth.token` in `~/.openclaw/openclaw.json`. The token rotates if
you reinstall or upgrade OpenClaw. Re-run the prerequisite token-extract
command and paste the new value into Modue's plugin settings.

**`unknown method: modue.bridge.ping` from the gateway**

Either this plugin isn't installed, or the gateway hasn't been restarted
since install. Check `openclaw plugins list` for `ddrayne-modue-bridge`
and run `openclaw gateway stop && openclaw gateway start`.

**`bridge ping failed: missing scope: operator.admin`**

That diagnostic comes from an older standalone `@openclaw/modue` install
that's still around. Run `openclaw plugins uninstall modue --force` and
remove `~/.openclaw/extensions/modue/` if it lingers — this plugin
provides the same surface under the proper name.

**Modue plugin RSS climbing during agent activity**

Update [`@modue/openclaw`](https://github.com/ddrayne/openclaw-modue) to
the latest commit — older versions had a per-notify `channels.status` RPC
fan-out that OOM'd the Modue platform under sustained streaming.
`Cmd+Shift+R` after pulling.

## License

ISC.
