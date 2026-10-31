import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VOICE_PAUSE_STORAGE_KEY } from '@opencode-manager/shared/opencode'
import { STTSettings } from './STTSettings'
import { normalizeBuiltinLanguage } from '@/lib/sttLanguages'
import { useSettings } from '@/hooks/useSettings'
import { useSTT } from '@/hooks/useSTT'
import { isWebRecognitionSupported, getAvailableLanguages } from '@/lib/webSpeechRecognizer'
import { createUseSettingsMock } from '@/test/test-utils'
import { DEFAULT_STT_CONFIG, DEFAULT_USER_PREFERENCES, type STTConfig, type UserPreferences } from '@/api/types/settings'

vi.mock('@/hooks/useSettings')
vi.mock('@/hooks/useSTT')
vi.mock('@/lib/webSpeechRecognizer')
vi.mock('@/api/stt', () => ({
  sttApi: {
    getModels: vi.fn().mockResolvedValue({ models: [] }),
    transcribe: vi.fn(),
  },
}))

function buildPreferences(stt: Partial<STTConfig> = {}): UserPreferences {
  return {
    ...DEFAULT_USER_PREFERENCES,
    stt: { ...DEFAULT_STT_CONFIG, ...stt },
  }
}

function mockHooks(preferences: UserPreferences = buildPreferences({ enabled: true, provider: 'builtin' })) {
  const settings = createUseSettingsMock({ preferences })
  vi.mocked(useSettings).mockReturnValue(settings)
  vi.mocked(useSTT).mockReturnValue({
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
    abortRecording: vi.fn(),
    isRecording: false,
    isProcessing: false,
    transcript: '',
    interimTranscript: '',
    error: null,
    isExternalProvider: preferences.stt?.provider === 'external',
  } as ReturnType<typeof useSTT>)
  vi.mocked(isWebRecognitionSupported).mockReturnValue(true)
  vi.mocked(getAvailableLanguages).mockReturnValue(['en-US', 'pl-PL'])
  return settings
}

function getPauseSelect() {
  return screen.queryByRole('combobox', { name: 'Pause before sending' })
}

async function renderSettings(preferences?: UserPreferences) {
  if (preferences) {
    mockHooks(preferences)
  }
  const rendered = render(<STTSettings />)
  await act(async () => {})
  return rendered
}

describe('STTSettings pause before sending', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    mockHooks()
  })

  it('shows the pause select for the enabled built-in provider', async () => {
    await renderSettings()

    expect(getPauseSelect()).toHaveValue('1.2 s')
  })

  it('hides the pause select for the external provider', async () => {
    await renderSettings(buildPreferences({ enabled: true, provider: 'external' }))

    expect(getPauseSelect()).not.toBeInTheDocument()
  })

  it('hides the pause select when STT is disabled', async () => {
    await renderSettings(buildPreferences({ enabled: false, provider: 'builtin' }))

    expect(getPauseSelect()).not.toBeInTheDocument()
  })

  it('writes the selected pause to device-local storage', async () => {
    const user = userEvent.setup()
    await renderSettings()

    const select = getPauseSelect()
    expect(select).toHaveValue('1.2 s')

    await user.click(select as HTMLElement)
    await user.click(screen.getByRole('option', { name: '3.0 s' }))

    expect(window.localStorage.getItem(VOICE_PAUSE_STORAGE_KEY)).toBe('3000')
    expect(getPauseSelect()).toHaveValue('3.0 s')
  })
})

describe('STTSettings external language', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    mockHooks(buildPreferences({ enabled: true, provider: 'external', language: 'en-US' }))
  })

  it('shows the stored language as a label and lists the available languages', async () => {
    const user = userEvent.setup()
    await renderSettings()

    const languageInput = await screen.findByDisplayValue('English')
    expect(languageInput).toBeInTheDocument()

    await user.click(languageInput)

    expect(await screen.findByText('Auto-detect')).toBeInTheDocument()
    expect(screen.getByText('Polish')).toBeInTheDocument()
  })

  it('persists the selected language as an ISO-639-1 code', async () => {
    const user = userEvent.setup()
    const settings = mockHooks(buildPreferences({ enabled: true, provider: 'external', language: 'en-US' }))
    await renderSettings()

    const languageInput = await screen.findByDisplayValue('English')
    await user.click(languageInput)
    await user.click(await screen.findByText('Polish'))

    await waitFor(() => expect(screen.getByDisplayValue('Polish')).toBeInTheDocument())

    await waitFor(
      () =>
        expect(settings.updateSettings).toHaveBeenCalledWith(
          expect.objectContaining({ stt: expect.objectContaining({ language: 'pl' }) }),
        ),
      { timeout: 3000 },
    )
  })
})

describe('STTSettings auto send', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
  })

  function buildPreferencesWithoutAutoSend(): UserPreferences {
    return {
      ...DEFAULT_USER_PREFERENCES,
      stt: {
        enabled: true,
        provider: 'builtin',
        endpoint: DEFAULT_STT_CONFIG.endpoint,
        apiKey: DEFAULT_STT_CONFIG.apiKey,
        model: DEFAULT_STT_CONFIG.model,
        language: DEFAULT_STT_CONFIG.language,
        availableModels: [],
        lastModelsFetch: 0,
      } as STTConfig,
    }
  }

  it('renders the send automatically switch turned on when the payload has no autoSend', async () => {
    mockHooks(buildPreferencesWithoutAutoSend())
    await renderSettings()

    expect(screen.getByRole('switch', { name: 'Send automatically' })).toBeChecked()
  })

  it('renders the send automatically switch turned off when the payload has autoSend false', async () => {
    mockHooks(buildPreferences({ enabled: true, provider: 'builtin', autoSend: false }))
    await renderSettings()

    expect(screen.getByRole('switch', { name: 'Send automatically' })).not.toBeChecked()
  })

  it('persists autoSend off through the autosave updateSettings call', async () => {
    const user = userEvent.setup()
    const settings = mockHooks(buildPreferences({ enabled: true, provider: 'builtin' }))
    await renderSettings()

    await user.click(screen.getByRole('switch', { name: 'Send automatically' }))

    await waitFor(
      () =>
        expect(settings.updateSettings).toHaveBeenCalledWith(
          expect.objectContaining({ stt: expect.objectContaining({ autoSend: false }) }),
        ),
      { timeout: 3000 },
    )
  })
})

describe('normalizeBuiltinLanguage', () => {
  it('maps the stored auto value to the browser default', () => {
    expect(normalizeBuiltinLanguage('auto', ['en-US', 'pl-PL'])).toBe('en-US')
    expect(normalizeBuiltinLanguage(undefined, ['en-US'])).toBe('en-US')
  })

  it('maps an ISO-639-1 value to the available BCP-47 option', () => {
    expect(normalizeBuiltinLanguage('pl', ['en-US', 'pl-PL'])).toBe('pl-PL')
  })

  it('keeps an explicit BCP-47 value and an unmatched ISO code', () => {
    expect(normalizeBuiltinLanguage('pl-PL', ['en-US'])).toBe('pl-PL')
    expect(normalizeBuiltinLanguage('pl', ['en-US'])).toBe('pl')
  })
})
