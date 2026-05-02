// Tests for src/agent-tools.js — verifies the LLM tools resolve colors,
// route to the right modue.* events, and degrade gracefully when no
// broadcast has been captured yet.

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { modueAgentTools } from "../src/agent-tools.js";

let broadcasts;

function makeBroadcast() {
  broadcasts = [];
  return (event, params, opts) => {
    broadcasts.push({ event, params, opts });
  };
}

function tool(name) {
  const t = modueAgentTools.tools.find((x) => x.name === name);
  if (!t) throw new Error(`tool not found: ${name}`);
  return t;
}

beforeEach(() => {
  // Reset module-level broadcast capture between tests by re-priming each one.
  modueAgentTools.captureBroadcast(null);
});

describe("modueAgentTools", () => {
  it("exposes 4 tools with stable names", () => {
    const names = modueAgentTools.tools.map((t) => t.name).sort();
    assert.deepEqual(names, [
      "modue_display",
      "modue_keys",
      "modue_leds",
      "modue_slider",
    ]);
  });

  it("captureBroadcast stores the function for tool use", async () => {
    modueAgentTools.captureBroadcast(makeBroadcast());
    await tool("modue_slider").execute("call-1", { value: 42 });
    assert.equal(broadcasts.length, 1);
    assert.equal(broadcasts[0].event, "modue.slider.set");
    assert.deepEqual(broadcasts[0].params, { value: 42 });
  });

  it("each tool returns a graceful 'not connected' message when broadcast is unprimed", async () => {
    for (const t of modueAgentTools.tools) {
      const result = await t.execute("call-1", { value: 50 });
      assert.equal(result.content[0].type, "text");
      assert.match(
        result.content[0].text,
        /modue not connected/i,
        `tool ${t.name} should report not connected`,
      );
    }
  });
});

describe("modue_leds", () => {
  beforeEach(() => modueAgentTools.captureBroadcast(makeBroadcast()));

  it("pattern + named color resolves to hex", async () => {
    await tool("modue_leds").execute("c", { pattern: "pulse", color: "green", speed: 7 });
    assert.equal(broadcasts.length, 1);
    assert.equal(broadcasts[0].event, "modue.leds.pattern");
    assert.equal(broadcasts[0].params.pattern, "pulse");
    assert.equal(broadcasts[0].params.color, "#30d158", "green should resolve to iOS green");
    assert.equal(broadcasts[0].params.speed, 7);
  });

  it("pattern with raw hex passes through unchanged", async () => {
    await tool("modue_leds").execute("c", { pattern: "solid", color: "#abcdef" });
    assert.equal(broadcasts[0].params.color, "#abcdef");
  });

  it("colors array resolves named entries and preserves nulls", async () => {
    await tool("modue_leds").execute("c", { colors: ["red", null, "blue", "#123456"] });
    assert.equal(broadcasts[0].event, "modue.leds.set");
    assert.deepEqual(broadcasts[0].params.colors, [
      "#ff453a",
      null,
      "#0a84ff",
      "#123456",
    ]);
  });

  it("release sends modue.leds.release with empty params", async () => {
    await tool("modue_leds").execute("c", { release: true });
    assert.equal(broadcasts[0].event, "modue.leds.release");
    assert.deepEqual(broadcasts[0].params, {});
  });

  it("no pattern/colors/release returns guidance text without broadcasting", async () => {
    const result = await tool("modue_leds").execute("c", {});
    assert.equal(broadcasts.length, 0);
    assert.match(result.content[0].text, /pattern.*colors.*release/i);
  });
});

describe("modue_display", () => {
  beforeEach(() => modueAgentTools.captureBroadcast(makeBroadcast()));

  it("sends modue.display.set with all fields and a default style", async () => {
    await tool("modue_display").execute("c", {
      title: "Hello",
      body: "World",
      ttl: 5,
    });
    assert.equal(broadcasts[0].event, "modue.display.set");
    assert.equal(broadcasts[0].params.title, "Hello");
    assert.equal(broadcasts[0].params.body, "World");
    assert.equal(broadcasts[0].params.style, "normal");
    assert.equal(broadcasts[0].params.ttl, 5);
  });

  it("release sends modue.display.release", async () => {
    await tool("modue_display").execute("c", { release: true });
    assert.equal(broadcasts[0].event, "modue.display.release");
  });
});

describe("modue_slider", () => {
  beforeEach(() => modueAgentTools.captureBroadcast(makeBroadcast()));

  it("sends modue.slider.set with the requested value", async () => {
    await tool("modue_slider").execute("c", { value: 73 });
    assert.equal(broadcasts[0].event, "modue.slider.set");
    assert.deepEqual(broadcasts[0].params, { value: 73 });
  });
});

describe("modue_keys", () => {
  beforeEach(() => modueAgentTools.captureBroadcast(makeBroadcast()));

  it("sends modue.key.labels with the three label slots", async () => {
    await tool("modue_keys").execute("c", { left: "Yes", center: "Skip", right: "No" });
    assert.equal(broadcasts[0].event, "modue.key.labels");
    assert.deepEqual(broadcasts[0].params, { left: "Yes", center: "Skip", right: "No" });
  });

  it("partial labels still broadcast (undefined on missing slots)", async () => {
    await tool("modue_keys").execute("c", { center: "Menu" });
    assert.equal(broadcasts[0].params.center, "Menu");
    assert.equal(broadcasts[0].params.left, undefined);
    assert.equal(broadcasts[0].params.right, undefined);
  });
});
