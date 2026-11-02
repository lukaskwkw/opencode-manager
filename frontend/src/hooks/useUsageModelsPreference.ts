import { useEffect, useState } from 'react'

export const USAGE_MODELS_STORAGE_KEY = 'ocm.usage-models.v1'

/** Parses a persisted model list, dropping duplicates and values that are not model references. */
export function parseUsageModels(raw: string | null): string[] {
  if (raw === null) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const models = parsed.filter((value): value is string => typeof value === 'string' && value !== '')
    return [...new Set(models)]
  } catch {
    return []
  }
}

function readModels(storageKey: string): string[] {
  if (typeof window === 'undefined') return []
  try {
    return parseUsageModels(window.localStorage.getItem(storageKey))
  } catch {
    return []
  }
}

function writeModels(storageKey: string, models: readonly string[]): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(models))
  } catch {
    return
  }
}

/** Model filter selection persisted under its storage key, so a reload keeps the chosen models. */
export function useUsageModelsPreference(
  storageKey: string = USAGE_MODELS_STORAGE_KEY,
) {
  const [models, setModels] = useState<string[]>(() => readModels(storageKey))

  useEffect(() => {
    writeModels(storageKey, models)
  }, [storageKey, models])

  return [models, setModels] as const
}
