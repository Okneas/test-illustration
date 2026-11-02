import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useLlmStore } from '@/features/compose/llmStore'
import { LlmSettings } from './LlmSettings'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

describe('LlmSettings', () => {
  beforeEach(() => {
    localStorage.clear()
    useLlmStore.setState(useLlmStore.getInitialState(), true)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('без ключа сообщает, что работает локальный подбор', () => {
    render(<LlmSettings />)
    expect(screen.getByRole('status')).toHaveTextContent('LLM не подключена: работает локальный подбор.')
  })

  it('по умолчанию предлагает Claude и подставляет его модель', () => {
    render(<LlmSettings />)
    expect(screen.getByLabelText('Модель')).toHaveValue('claude-opus-5-5')
    expect(screen.queryByLabelText('Адрес API')).toBeNull() // у Claude адрес не меняется
  })

  it('поле ключа скрывает вводимое и не даёт браузеру его запоминать', () => {
    render(<LlmSettings />)
    const key = screen.getByLabelText(/Ключ API/)
    expect(key).toHaveAttribute('type', 'password')
    expect(key).toHaveAttribute('autocomplete', 'off')
  })

  it('после ввода ключа показывает, через что пойдёт подбор', async () => {
    render(<LlmSettings />)
    await userEvent.type(screen.getByLabelText(/Ключ API/), 'sk-ant-1234')
    expect(screen.getByRole('status')).toHaveTextContent('Подбор пойдёт через Anthropic (Claude) · claude-opus-5-5.')
  })

  it('для OpenAI-совместимых сервисов показывает адрес API и проверяет его', async () => {
    useLlmStore.getState().setProvider('custom')
    render(<LlmSettings />)

    await userEvent.type(screen.getByLabelText(/Ключ API/), 'key-123456')
    await userEvent.type(screen.getByLabelText('Модель'), 'my-model')
    expect(screen.getByRole('status')).toHaveTextContent('Укажите адрес API.')

    await userEvent.type(screen.getByLabelText('Адрес API'), 'http://api.example.com/v1')
    expect(screen.getByRole('status')).toHaveTextContent('Адрес должен начинаться с https://')

    await userEvent.clear(screen.getByLabelText('Адрес API'))
    await userEvent.type(screen.getByLabelText('Адрес API'), 'https://api.example.com/v1')
    expect(screen.getByRole('status')).toHaveTextContent('Подбор пойдёт через Другой (OpenAI-совместимый) · my-model.')
  })

  it('кнопка «Список» недоступна без ключа', () => {
    render(<LlmSettings />)
    expect(screen.getByRole('button', { name: 'Список' })).toBeDisabled()
  })

  it('загружает список моделей провайдера и предлагает его в поле модели', async () => {
    const fetchMock = vi.fn(async () => json({ data: [{ id: 'gpt-b' }, { id: 'gpt-a' }] }))
    vi.stubGlobal('fetch', fetchMock)
    useLlmStore.getState().setProvider('openai')
    render(<LlmSettings />)

    await userEvent.type(screen.getByLabelText(/Ключ API/), 'sk-live-0000')
    await userEvent.click(screen.getByRole('button', { name: 'Список' }))

    await waitFor(() => expect(screen.getByText(/Загружено моделей: 2/)).toBeInTheDocument())
    const options = [...document.querySelectorAll('#llm-models option')].map((option) => option.getAttribute('value'))
    expect(options).toEqual(['gpt-a', 'gpt-b'])
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe('https://api.openai.com/v1/models')
  })

  it('показывает ошибку загрузки списка и не раскрывает ключ', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ error: { message: 'bad key sk-live-0000' } }, 401)))
    useLlmStore.getState().setProvider('openai')
    render(<LlmSettings />)

    await userEvent.type(screen.getByLabelText(/Ключ API/), 'sk-live-0000')
    await userEvent.click(screen.getByRole('button', { name: 'Список' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('неверный ключ API (401)')
    expect(alert).not.toHaveTextContent('sk-live-0000')
  })

  it('объясняет, куда уйдёт ключ', () => {
    render(<LlmSettings />)
    expect(screen.getByText(/отправляется напрямую на api\.anthropic\.com/)).toBeInTheDocument()
  })

  it('у Ollama ключ необязателен, и это сказано в подписи', () => {
    useLlmStore.getState().setProvider('ollama')
    render(<LlmSettings />)
    expect(screen.getByLabelText('Ключ API (необязательно)')).toBeInTheDocument()
    expect(screen.getByText(/OLLAMA_ORIGINS/)).toBeInTheDocument()
  })
})
