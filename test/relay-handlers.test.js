// Tests for src/relay-handlers.js — pure broadcast/respond behavior.
// Uses node:test + node:assert (zero npm deps).

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { modueRelayHandlers } from "../src/relay-handlers.js";

const ALL_EVENT_NAMES = [
  "modue.display.set",
  "modue.display.raw",
  "modue.display.release",
  "modue.slider.set",
  "modue.leds.set",
  "modue.leds.pattern",
  "modue.leds.release",
  "modue.key.labels",
  "modue.slider.changed",
  "modue.knob.changed",
  "modue.key.pressed",
  "modue.display.touched",
  "modue.capabilities",
];

function makeContext() {
  const broadcasts = [];
  return {
    broadcasts,
    context: {
      broadcast: (event, params, opts) => {
        broadcasts.push({ event, params, opts });
      },
    },
  };
}

function makeRespond() {
  const responses = [];
  return {
    responses,
    respond: (ok, payload, error) => {
      responses.push({ ok, payload, error });
    },
  };
}

describe("modueRelayHandlers", () => {
  it("registers a handler for every documented event name", () => {
    for (const name of ALL_EVENT_NAMES) {
      assert.equal(
        typeof modueRelayHandlers[name],
        "function",
        `missing handler for ${name}`,
      );
    }
    assert.equal(
      Object.keys(modueRelayHandlers).length,
      ALL_EVENT_NAMES.length,
      "extra or missing handlers vs documented set",
    );
  });

  it("each handler broadcasts the matching event name with passed params", async () => {
    for (const name of ALL_EVENT_NAMES) {
      const { broadcasts, context } = makeContext();
      const { responses, respond } = makeRespond();
      const params = { sentinel: name };

      await modueRelayHandlers[name]({ params, respond, context });

      assert.equal(broadcasts.length, 1, `${name}: should broadcast once`);
      assert.equal(broadcasts[0].event, name, `${name}: event mismatch`);
      assert.deepEqual(
        broadcasts[0].params,
        params,
        `${name}: params should pass through unchanged`,
      );
      assert.deepEqual(
        broadcasts[0].opts,
        { dropIfSlow: true },
        `${name}: should set dropIfSlow so backpressure cannot stall the gateway`,
      );

      assert.equal(responses.length, 1, `${name}: should respond once`);
      assert.equal(responses[0].ok, true, `${name}: should respond ok`);
      assert.deepEqual(
        responses[0].payload,
        { relayed: true },
        `${name}: response payload should be { relayed: true }`,
      );
      assert.equal(responses[0].error, undefined, `${name}: should have no error`);
    }
  });

  it("substitutes default params when called with null/undefined", async () => {
    // Only release-style methods declare defaults; others pass through as-is.
    const { broadcasts, context } = makeContext();
    const { respond } = makeRespond();

    await modueRelayHandlers["modue.display.release"]({
      params: undefined,
      respond,
      context,
    });

    assert.deepEqual(
      broadcasts[0].params,
      {},
      "release with undefined params should default to {}",
    );
  });

  it("never references module-level state — separate calls do not leak", async () => {
    const calls = [];
    for (let i = 0; i < 5; i += 1) {
      const { broadcasts, context } = makeContext();
      const { respond } = makeRespond();
      await modueRelayHandlers["modue.slider.set"]({
        params: { value: i },
        respond,
        context,
      });
      calls.push(broadcasts);
    }
    // Each call gets its own broadcast log; no cross-talk.
    for (let i = 0; i < calls.length; i += 1) {
      assert.equal(calls[i].length, 1);
      assert.equal(calls[i][0].params.value, i);
    }
  });
});
