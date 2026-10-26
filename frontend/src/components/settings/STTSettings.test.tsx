import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { STTSettings } from './STTSettings'

const mocks = vi.hoisted(() => {
  const mockPreferences = {
    stt: {
      enabled: true,
      provider: 'external',
      endpoint: 'https://api.openai.com',
      apiKey: 'sk-test',
      model: 'whisper-1',
      language: 'en-US',
    },
  }

  return {
    mockPreferences,
    mockUpdateSettings: vi.fn(),
    mockGetModels: vi.fn().mockResolvedValue({ models: ['whisper-1'], cached: true }),
  }
})

vi.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({
    preferences: mocks.mockPreferences,
    updateSettings: mocks.mockUpdateSettings,
  }),
}))

vi.mock('@/hooks/useSTT', () => ({
  useSTT: () => ({
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
    abortRecording: vi.fn(),
    isRecording: false,
    isProcessing: false,
    transcript: '',
    interimTranscript: '',
    error: null,
    isExternalProvider: true,
  }),
}))

vi.mock('@/api/stt', () => ({
  sttApi: {
    getModels: mocks.mockGetModels,
  },
}))

describe('STTSettings external language', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the stored language as a label and lists the available languages', async () => {
    const user = userEvent.setup()
    render(<STTSettings />)

    const languageInput = await screen.findByDisplayValue('English')
    expect(languageInput).toBeInTheDocument()

    await user.click(languageInput)

    expect(await screen.findByText('Auto-detect')).toBeInTheDocument()
    expect(screen.getByText('Polish')).toBeInTheDocument()
  })

  it('persists the selected language', async () => {
    const user = userEvent.setup()
    render(<STTSettings />)

    const languageInput = await screen.findByDisplayValue('English')
    await user.click(languageInput)
    await user.click(await screen.findByText('Polish'))

    await waitFor(() => expect(screen.getByDisplayValue('Polish')).toBeInTheDocument())

    await waitFor(
      () =>
        expect(mocks.mockUpdateSettings).toHaveBeenCalledWith(
          expect.objectContaining({ stt: expect.objectContaining({ language: 'pl' }) }),
        ),
      { timeout: 3000 },
    )
  })
})
