export type OpenRouterModel = {
  id: string;
  name: string;
  contextLength: number | null;
  free: boolean;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
};

export const OPENROUTER_FREE_ROUTER: OpenRouterModel = {
  id: "openrouter/free",
  name: "OpenRouter Free Router",
  contextLength: null,
  free: true,
  inputPricePerMillion: 0,
  outputPricePerMillion: 0,
};

const price = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function normalizeOpenRouterModels(models: Array<Record<string, any>>) {
  const discovered = models
    .filter((model) => model?.id)
    .map((model): OpenRouterModel => {
      const promptPrice = price(model?.pricing?.prompt);
      const completionPrice = price(model?.pricing?.completion);
      return {
        id: String(model.id),
        name: String(model.name || model.id),
        contextLength: Number.isFinite(Number(model.context_length))
          ? Number(model.context_length)
          : null,
        free: promptPrice === 0 && completionPrice === 0,
        inputPricePerMillion: promptPrice * 1_000_000,
        outputPricePerMillion: completionPrice * 1_000_000,
      };
    });
  const unique = [
    OPENROUTER_FREE_ROUTER,
    ...discovered.filter((model) => model.id !== OPENROUTER_FREE_ROUTER.id),
  ];
  return unique.sort((a, b) => {
    if (a.free !== b.free) return a.free ? -1 : 1;
    if (a.id === OPENROUTER_FREE_ROUTER.id) return -1;
    if (b.id === OPENROUTER_FREE_ROUTER.id) return 1;
    return (b.contextLength || 0) - (a.contextLength || 0) || a.name.localeCompare(b.name);
  });
}

export function openRouterModelLabel(model: OpenRouterModel) {
  if (model.id === OPENROUTER_FREE_ROUTER.id) return model.name;
  if (model.free) return `${model.name} · Free`;
  return `${model.name} · $${model.inputPricePerMillion.toFixed(2)}/M in · $${model.outputPricePerMillion.toFixed(2)}/M out`;
}
