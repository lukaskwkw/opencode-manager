import { useCallback, useMemo } from 'react'

const STORAGE_KEY_PREFIX = 'oc:composer-draft:'
const DATA_URL_SIZE_LIMIT = 3_000_000

export interface ComposerDraftAttachment {
  id: string
  filename: string
  mime: string
  dataUrl: string
}

export interface ComposerDraftFile {
  path: string
  name: string
}

export interface ComposerDraft {
  text: string
  attachments: ComposerDraftAttachment[]
  files: ComposerDraftFile[]
  updatedAt: number
}

const isQuotaExceededError = (error: unknown): boolean => {
  const name = (error as { name?: unknown } | null)?.name
  return name === 'QuotaExceededError'
}

export function useComposerDraft(sessionId: string | undefined) {
  // Bez sessionId szkicu nie zapisujemy - klucz nie mialby sensu.
  const storageKey = sessionId ? `${STORAGE_KEY_PREFIX}${sessionId}` : null

  // Odczyt szkicu z localStorage. Bledy JSON / uszkodzone dane zwracaja null.
  const load = useCallback((): ComposerDraft | null => {
    if (!storageKey || typeof window === 'undefined') {
      return null
    }
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw === null) {
        return null
      }
      const parsed = JSON.parse(raw) as Partial<ComposerDraft>
      if (!parsed || typeof parsed !== 'object') {
        return null
      }
      return {
        text: typeof parsed.text === 'string' ? parsed.text : '',
        attachments: Array.isArray(parsed.attachments) ? parsed.attachments : [],
        files: Array.isArray(parsed.files) ? parsed.files : [],
        updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
      }
    } catch {
      return null
    }
  }, [storageKey])

  const save = useCallback((draft: ComposerDraft) => {
    if (!storageKey || typeof window === 'undefined') {
      return
    }

    // dataUrl (base64 obrazka) potrafi byc bardzo duzy. Ponad limit zapisujemy
    // sam tekst + metadane plikow, bez binarnej czesci (dataUrl ustawiamy na '').
    const totalDataUrlLength = draft.attachments.reduce((sum, attachment) => sum + attachment.dataUrl.length, 0)
    const payload: ComposerDraft = { ...draft }
    if (totalDataUrlLength > DATA_URL_SIZE_LIMIT) {
      payload.attachments = draft.attachments.map((attachment) => ({ ...attachment, dataUrl: '' }))
      console.warn(`[useComposerDraft] Pomijam dataUrl w szkicu (za duzo: ${totalDataUrlLength} znakow)`)
    }

    try {
      localStorage.setItem(storageKey, JSON.stringify(payload))
    } catch (error) {
      if (!isQuotaExceededError(error)) {
        console.warn('[useComposerDraft] Nie udalo sie zapisac szkicu:', error)
        return
      }
      // Przekroczony limit localStorage (QuotaExceededError) - zapisujemy wersje
      // bez attachmentow, zeby nie stracic tekstu wiadomosci.
      try {
        const textOnly: ComposerDraft = { ...payload, attachments: [] }
        localStorage.setItem(storageKey, JSON.stringify(textOnly))
        console.warn('[useComposerDraft] Limit localStorage przekroczony - zapisano szkic bez zalacznikow')
      } catch (quotaError) {
        console.warn('[useComposerDraft] Nie udalo sie zapisac szkicu nawet bez zalacznikow:', quotaError)
      }
    }
  }, [storageKey])

  const clear = useCallback(() => {
    if (!storageKey || typeof window === 'undefined') {
      return
    }
    try {
      localStorage.removeItem(storageKey)
    } catch (error) {
      console.warn('[useComposerDraft] Nie udalo sie wyczyscic szkicu:', error)
    }
  }, [storageKey])

  return useMemo(() => ({ load, save, clear }), [clear, load, save])
}