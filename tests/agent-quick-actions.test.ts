import assert from "node:assert/strict";
import test from "node:test";
import { TALA_QUICK_ACTIONS, TALA_INTENTS } from "../src/lib/agent-quick-actions.ts";

test("keeps the owner TALA shortcuts available", () => {
  assert.deepEqual(
    TALA_QUICK_ACTIONS.map((action) => action.id),
    ["leads", "email", "accounts", "owed", "documents", "pricing"],
  );
  assert.equal(new Set(TALA_QUICK_ACTIONS.map((action) => action.id)).size, 6);
});

test("every TALA shortcut has a valid intent and operational prompt", () => {
  for (const action of TALA_QUICK_ACTIONS) {
    assert.ok(TALA_INTENTS.includes(action.intent));
    assert.ok(action.label.length > 0);
    assert.ok(action.description.length > 0);
    assert.ok(action.prompt.length > 40);
  }
});

test("email shortcut drafts but never claims to send", () => {
  const email = TALA_QUICK_ACTIONS.find((action) => action.id === "email");
  assert.match(email?.prompt || "", /draft/i);
  assert.match(email?.prompt || "", /Do not claim anything was sent/i);
});
