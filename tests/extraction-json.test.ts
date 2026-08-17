import assert from "node:assert/strict";
import test from "node:test";
import { extractionNeedsReview, parseExtractionText } from "../src/lib/extraction-json.ts";

test("recovers extraction JSON after a safety prefix", () => {
  const learned = parseExtractionText(
    'User Safety: safe\n{"docType":"invoice","lines":[{"lineNo":1,"quantity":2,"unit":"SET","rawDescription":"900 Series door"}]}',
  );
  assert.equal(learned.docType, "invoice");
  assert.equal(learned.lines[0].rawDescription, "900 Series door");
  assert.equal(learned.lines[0].quantity, 2);
});

test("recovers fenced extraction JSON with braces inside descriptions", () => {
  const learned = parseExtractionText(
    '```json\n{"docType":"invoice","lines":[{"quantity":1,"rawDescription":"Door {left panel}"}]}\n```',
  );
  assert.equal(learned.lines[0].rawDescription, "Door {left panel}");
});

test("invalid model output becomes an editable review record", () => {
  const fallback = extractionNeedsReview("invoice", "User Safety: safe");
  assert.equal(fallback.docType, "unknown");
  assert.deepEqual(fallback.lines, []);
  assert.match(fallback.missingInformation[0], /valid structured extraction/);
  assert.match(fallback.conflicts[0], /document type remains unconfirmed/);
  assert.match(fallback.conflicts[0], /User Safety: safe/);
});

test("rejects an empty JSON skeleton so another vision model can be tried", () => {
  assert.throws(() => parseExtractionText('{"docType":"invoice","lines":[]}'), /empty extraction/);
});
