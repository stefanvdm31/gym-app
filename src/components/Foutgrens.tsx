import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

/**
 * Vangnet tegen een wit scherm. Gaat er ergens iets mis, dan zie je wat er aan
 * de hand is en kun je terug naar het startscherm — je gegevens staan veilig
 * in de database en raken hier niet door kwijt.
 */
interface Props {
  children: ReactNode
}

interface State {
  fout: Error | null
}

export class Foutgrens extends Component<Props, State> {
  override state: State = { fout: null }

  static getDerivedStateFromError(fout: Error): State {
    return { fout }
  }

  override componentDidCatch(fout: Error, info: ErrorInfo): void {
    console.error('Onverwachte fout in de app:', fout, info.componentStack)
  }

  override render(): ReactNode {
    const { fout } = this.state
    if (fout === null) return this.props.children

    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
        <div className="t-h2 text-ink">Er ging iets mis</div>
        <p className="t-body-sm max-w-[40ch] text-ink-muted">
          De app liep vast op een onverwachte fout. Je trainingen en metingen staan gewoon nog in de
          database — er is niets weg.
        </p>
        <pre className="max-w-full overflow-x-auto rounded-[8px] border border-line-3 bg-surface px-3 py-2 text-left text-[12px] text-ink-muted">
          {fout.message}
        </pre>
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => this.setState({ fout: null })}
            className="min-h-[48px] rounded-full border border-line-4 bg-surface px-5 text-[16px] text-ink"
          >
            Opnieuw proberen
          </button>
          <button
            type="button"
            onClick={() => {
              window.location.hash = '#/'
              window.location.reload()
            }}
            className="min-h-[48px] rounded-full bg-accent px-5 text-[16px] font-semibold text-white"
          >
            Naar het startscherm
          </button>
        </div>
      </div>
    )
  }
}
