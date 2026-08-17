import assert from "node:assert/strict";
import test from "node:test";
import { normalizeOpenRouterModels, openRouterModelLabel } from "../src/lib/openrouter-models.ts";

test("keeps OpenRouter free router, free models and paid models selectable", () => {
  const models = normalizeOpenRouterModels([
    {
      id: "free/example",
      name: "Free Example",
      context_length: 32_000,
      pricing: { prompt: "0", completion: "0" },
    },
    {
      id: "paid/example",
      name: "Paid Example",
      context_length: 128_000,
      pricing: { prompt: "0.000001", completion: "0.000002" },
    },
  ]);
  assert.equal(models[0]?.id, "openrouter/free");
  assert.ok(models.some((model) => model.id === "free/example" && model.free));
  assert.ok(models.some((model) => model.id === "paid/example" && !model.free));
  const paid = models.find((model) => model.id === "paid/example")!;
  assert.match(openRouterModelLabel(paid), /\$1\.00\/M in/);
  assert.match(openRouterModelLabel(paid), /\$2\.00\/M out/);
});
