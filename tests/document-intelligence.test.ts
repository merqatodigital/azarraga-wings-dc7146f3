import assert from "node:assert/strict";
import test from "node:test";
import {
  learnedProductFamily,
  statedDocumentTotalCentavos,
} from "../src/lib/document-intelligence.ts";

test("uses the printed total without adding VAT twice", () => {
  const whiteportPo = {
    totalCentavos: 5_950_000,
    financialSummary: {
      amountWithoutTaxCentavos: 5_312_500,
      vatCentavos: 637_500,
      totalCentavos: 5_950_000,
    },
  };
  assert.equal(statedDocumentTotalCentavos(whiteportPo), 5_950_000);
});

test("keeps unclassified raw document lines learnable", () => {
  assert.equal(learnedProductFamily({ productFamily: null }), "UNCLASSIFIED");
  assert.equal(learnedProductFamily({ productFamily: " Jalousie " }), "Jalousie");
});
