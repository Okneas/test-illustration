import { Component, type ReactNode } from 'react'

type ErrorBoundaryProps = {
  /** Что показать вместо упавшего поддерева; `reset` сбрасывает ошибку и пробует снова. */
  fallback: (error: Error, reset: () => void) => ReactNode
  children: ReactNode
}

type ErrorBoundaryState = { error: Error | null }

/**
 * Ловит ошибки отрисовки (в том числе отклонённые промисы из `use()`). Ошибки в обработчиках
 * событий и асинхронном коде boundary не ловит: их обрабатывают на месте.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  private reset = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    return error ? this.props.fallback(error, this.reset) : this.props.children
  }
}
