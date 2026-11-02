import { Sparkles } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { assembleByMetaphor } from '@/features/compose/actions'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { LlmSettings } from './LlmSettings'

/** Сценарий 1: метафора или заголовок → подбор объектов → автоматическая раскладка. */
export function MetaphorDialog() {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!text.trim()) return
    setBusy(true)
    setError(null)
    try {
      await assembleByMetaphor(text)
      setText('')
      setOpen(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось собрать композицию')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" className="w-full">
          <Sparkles aria-hidden="true" /> Собрать по метафоре
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={(event) => void handleSubmit(event)} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Сборка по метафоре</DialogTitle>
            <DialogDescription>
              Введите метафору или заголовок. Сервис подберёт объекты из библиотеки и сам расставит их на холсте.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-1.5">
            <Label htmlFor="metaphor-input">Метафора или заголовок</Label>
            <Input
              id="metaphor-input"
              autoFocus
              placeholder="Успешный стартап"
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </div>

          <details className="rounded-lg border p-3 text-sm">
            <summary className="cursor-pointer font-medium">Подбор через свою LLM (необязательно)</summary>
            <LlmSettings />
          </details>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={busy || !text.trim()}>
              {busy ? 'Подбираем…' : 'Собрать'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
