# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Test suite (`test/relay-handlers.test.js`, `test/agent-tools.test.js`) using
  the built-in `node:test` runner, no npm dependencies.
- LICENSE file (ISC).
- `.editorconfig` for cross-editor consistency.

### Documentation
- README expanded with architecture diagram, prerequisites, end-to-end
  verification recipe, and a troubleshooting section covering token
  mismatch, gateway not restarted, the `@openclaw/modue` impostor
  leftover, and the `@modue/openclaw` memory leak.

## [0.1.0] - 2026-05-02

### Added
- Initial release.
- 13 `modue.*` gateway methods: stateless broadcast relays for both
  agent → device (display, slider, LEDs, key labels) and device → agents
  (slider/knob/key/display events, capabilities) traffic.
- `modue.bridge.ping` gateway method: priming endpoint used by
  `@modue/openclaw` to capture the broadcast function for the agent
  tools registered below.
- 4 LLM-callable agent tools (`modue_leds`, `modue_display`,
  `modue_slider`, `modue_keys`) so agents can drive the Modue control
  surface from a tool call.
- `contracts.tools` declared in the manifest so the loader actually
  materializes the agent tool registrations.

### Notes
- Replaces the misnamed `@openclaw/modue` install that impersonated the
  official `@openclaw` npm scope.
- Designed to pair with `@modue/openclaw`
  (https://github.com/ddrayne/openclaw-modue) on the Modue device side.
