import { useState } from 'react'
import { checkLlmConfig, describeConfig } from '@/features/compose/llm/config'
import { listModels } from '@/features/compose/llm/models'
import { getProvider, PROVIDERS, type ProviderPreset } from '@/features/compose/llm/providers'
import { useLlmStore } from '@/features/compose/llmStore'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

function hostOf(url: string): string | null {
  try {
    return new URL(url).host
  } catch {
    return null
  }
}

/**
 * Подключение своей LLM (BYOK): любой провайдер, свой ключ, своя модель. Ключ живёт только в памяти
 * вкладки и отправляется напрямую выбранному сервису, без нашего сервера.
 */
export function LlmSettings() {
  const providerId = useLlmStore((state) => state.providerId)
  const model = useLlmStore((state) => state.model)
  const baseUrl = useLlmStore((state) => state.baseUrl)
  const apiKey = useLlmStore((state) => state.apiKey)
  const models = useLlmStore((state) => state.models)
  const setProvider = useLlmStore((state) => state.setProvider)
  const setModel = useLlmStore((state) => state.setModel)
  const setBaseUrl = useLlmStore((state) => state.setBaseUrl)
  const setApiKey = useLlmStore((state) => state.setApiKey)
  const setModels = useLlmStore((state) => state.setModels)

  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)

  const provider: ProviderPreset = getProvider(providerId) ?? PROVIDERS[0]
  const draft = { providerId, model, baseUrl, apiKey }
  const check = checkLlmConfig(draft)
  const connection = checkLlmConfig(draft, { needModel: false })
  const host = hostOf(provider.editableUrl ? baseUrl : provider.baseUrl)

  const loadModels = async () => {
    if (connection.status !== 'ready') return
    const requestedFor = useLlmStore.getState().providerId
    setLoading(true)
    setListError(null)
    try {
      const list = await listModels(connection.config)
      // Пока шёл запрос, провайдера могли сменить: чужой список подставлять нельзя.
      if (useLlmStore.getState().providerId === requestedFor) setModels(list)
    } catch (error) {
      setListError(error instanceof Error ? error.message : 'Не удалось загрузить список моделей')
    } finally {
      setLoading(false)
    }
  }

  const status =
    check.status === 'ready'
      ? `Подбор пойдёт через ${describeConfig(check.config)}.`
      : check.status === 'incomplete'
        ? `${check.reason}.`
        : 'LLM не подключена: работает локальный подбор.'

  return (
    <div className="mt-3 grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="llm-provider">Провайдер</Label>
        <Select
          value={provider.id}
          onValueChange={(value) => {
            setProvider(value)
            setListError(null)
          }}
        >
          <SelectTrigger id="llm-provider" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROVIDERS.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {provider.editableUrl && (
        <div className="grid gap-1.5">
          <Label htmlFor="llm-base-url">Адрес API</Label>
          <Input
            id="llm-base-url"
            type="url"
            spellCheck={false}
            autoComplete="off"
            placeholder="https://api.example.com/v1"
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
          />
        </div>
      )}

      {provider.note && <p className="text-xs text-muted-foreground">{provider.note}</p>}

      <div className="grid gap-1.5">
        <Label htmlFor="llm-key">Ключ API{provider.needsKey ? '' : ' (необязательно)'}</Label>
        <Input
          id="llm-key"
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder={provider.keyHint}
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="llm-model">Модель</Label>
        <div className="flex gap-2">
          <Input
            id="llm-model"
            list="llm-models"
            spellCheck={false}
            autoComplete="off"
            placeholder={`например, ${provider.modelHint}`}
            value={model}
            onChange={(event) => setModel(event.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            disabled={connection.status !== 'ready' || loading}
            onClick={() => void loadModels()}
          >
            {loading ? 'Загрузка…' : 'Список'}
          </Button>
        </div>
        <datalist id="llm-models">
          {models.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        {listError && (
          <p role="alert" className="text-xs text-destructive">
            {listError}
          </p>
        )}
        {models.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Загружено моделей: {models.length}. Начните вводить название или выберите из подсказок.
          </p>
        )}
      </div>

      <p role="status" className="text-xs font-medium">
        {status}
      </p>
      <p className="text-xs text-muted-foreground">
        Ключ хранится только в памяти этой вкладки (не сохраняется и не попадает в логи) и отправляется напрямую
        {host ? ` на ${host}` : ' выбранному сервису'}, без нашего сервера. Провайдер, модель и адрес запоминаются в
        браузере. Если запрос к LLM не удался, подбор будет локальным.
      </p>
    </div>
  )
}
