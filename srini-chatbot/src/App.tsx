import { useCallback, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import type { Components } from 'react-markdown'
import './chat-ui.css'

const DEFAULT_API = 'https://srinilm.onrender.com'

const WELCOME_SUGGESTIONS = [
  'What does Srini do and where does he work?',
  'What projects is Srini most proud of?',
  "What's Srini's design philosophy?",
]

type Msg = { role: 'user' | 'bot'; text: string; suggestions?: string[] }

function getApiBase(): string {
  const q = new URLSearchParams(window.location.search).get('api')
  if (q) return q.replace(/\/$/, '')
  const w = window as unknown as { SRINI_CHAT_API?: string }
  if (w.SRINI_CHAT_API) return w.SRINI_CHAT_API.replace(/\/$/, '')
  return DEFAULT_API
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

async function postChat(message: string): Promise<{ answer: string; suggestions: string[] }> {
  const base = getApiBase()
  const backoff = [2000, 4000, 8000, 16000, 32000]
  let lastErr: Error | null = null
  for (let i = 0; i < 5; i++) {
    const timeoutMs = i === 0 ? 90000 : 60000
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(`${base}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
        mode: 'cors',
        keepalive: true,
        cache: 'no-store',
        signal: controller.signal,
      })
      clearTimeout(timer)
      let data: { answer?: string; reply?: string; suggestions?: unknown; detail?: string }
      try {
        data = await res.json()
      } catch {
        throw new Error('Received an invalid response from the server.')
      }
      if (!res.ok) {
        throw new Error(data.detail || `Server error (${res.status}).`)
      }
      const answer = (data.answer ?? data.reply ?? '').trim()
      if (!answer) throw new Error('Empty response.')
      const raw = data.suggestions
      const suggestions = Array.isArray(raw)
        ? raw.slice(0, 3).map((s) => String(s))
        : []
      return { answer, suggestions }
    } catch (e) {
      clearTimeout(timer)
      lastErr = e instanceof Error ? e : new Error(String(e))
      const msg = lastErr.message
      if (lastErr.name === 'AbortError' || msg.includes('aborted') || msg.includes('timed out')) {
        if (i < 4) await sleep(backoff[i])
        continue
      }
      if (lastErr.name === 'TypeError' && i < 4) {
        await sleep(backoff[i])
        continue
      }
      if (msg.includes('Server error') && i < 4) {
        const m = msg.match(/\((\d+)\)/)
        const code = m ? parseInt(m[1], 10) : 0
        if (code >= 500 || code === 429 || code === 503) {
          await sleep(backoff[i])
          continue
        }
      }
      throw lastErr
    }
  }
  throw lastErr ?? new Error('Could not reach the server. Please try again.')
}

function playSound(kind: string) {
  try {
    const w = window.parent as unknown as { SRINI_CHAT_SOUND?: (k: string) => void }
    w.SRINI_CHAT_SOUND?.(kind)
  } catch {
    /* cross-origin */
  }
}

const mdComponents: Components = {
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
}

const remarkPlugins = [remarkGfm, remarkBreaks]

function SuggestionArrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="18" x2="18" y2="6" />
      <polyline points="10 6 18 6 18 14" />
    </svg>
  )
}

function ChatHeader({ onReset }: { onReset: () => void }) {
  const [infoOpen, setInfoOpen] = useState(false)

  useEffect(() => {
    const close = () => setInfoOpen(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  return (
    <header className="chat-header">
      <div className="header-left">
        <span className="header-title">Proxy</span>
        <button
          type="button"
          className="icon-btn"
          aria-label="Info"
          onClick={(ev) => {
            ev.stopPropagation()
            setInfoOpen((v) => !v)
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </button>
      </div>
      <div className="header-right">
        <button type="button" className="icon-btn" aria-label="Reset conversation" onClick={onReset}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M3 21v-5h5" />
          </svg>
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-label="Close"
          onClick={() => window.parent.postMessage('srini-chat-close', '*')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div
        className={`info-tooltip ${infoOpen ? 'visible' : ''}`}
        onClick={(ev) => ev.stopPropagation()}
        role="note"
      >
        Hi, I&apos;m Proxy
        <br />
        thanks for bearing with me.
      </div>
    </header>
  )
}

function Welcome({ onSuggestionClick }: { onSuggestionClick: (q: string) => void }) {
  const greeting = (() => {
    const h = new Date().getHours()
    const part = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
    return `${part}, what would you like to know about Srini?`
  })()

  return (
    <div className="welcome">
      <div className="welcome-avatar" />
      <h1 className="welcome-heading">{greeting}</h1>
      <div className="welcome-suggestions">
        {WELCOME_SUGGESTIONS.map((s) => (
          <button key={s} type="button" className="suggestion-row" onClick={() => onSuggestionClick(s)} onMouseEnter={() => playSound('hover')}>
            <SuggestionArrow />
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

function MessageRow({
  role,
  text,
  suggestions,
  onSuggestionClick,
}: {
  role: 'user' | 'bot'
  text: string
  suggestions?: string[]
  onSuggestionClick: (q: string) => void
}) {
  const isUser = role === 'user'
  return (
    <div className={`msg-row ${role}`}>
      {!isUser && <div className="msg-avatar" />}
      <div className="msg-content">
        <div className="msg-bubble">
          {isUser ? (
            text
          ) : (
            <div className="msg-md">
              <ReactMarkdown remarkPlugins={remarkPlugins} components={mdComponents}>
                {text}
              </ReactMarkdown>
            </div>
          )}
        </div>
        {!isUser && suggestions && suggestions.length > 0 && (
          <div className="msg-suggestions">
            {suggestions.map((s) => (
              <button key={s} type="button" className="msg-suggestion-btn" onClick={() => onSuggestionClick(s)} onMouseEnter={() => playSound('hover')}>
                <SuggestionArrow />
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TypingRow() {
  return (
    <div className="typing-row">
      <div className="msg-avatar" />
      <div className="typing-dot-grid" role="status" aria-live="polite" aria-label="Thinking">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    </div>
  )
}

function ChatFlow({
  messages,
  loading,
  onSuggestionClick,
}: {
  messages: Msg[]
  loading: boolean
  onSuggestionClick: (q: string) => void
}) {
  return (
    <div className="chat-flow">
      {messages.map((m, i) => (
        <MessageRow key={i} role={m.role} text={m.text} suggestions={m.suggestions} onSuggestionClick={onSuggestionClick} />
      ))}
      {loading && <TypingRow />}
    </div>
  )
}

function ChatForm({
  onSend,
  disabled,
  error,
  clearError,
}: {
  onSend: (text: string) => void
  disabled: boolean
  error: string | null
  clearError: () => void
}) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!disabled) inputRef.current?.focus()
  }, [disabled])

  return (
    <div className="form-wrap">
      <form
        className={`chat-form ${value.trim() ? 'has-text' : ''}`}
        onSubmit={(ev) => {
          ev.preventDefault()
          const t = value.trim()
          if (!t || disabled) return
          onSend(t)
          setValue('')
          clearError()
        }}
      >
        <input
          ref={inputRef}
          type="text"
          className="chat-form__input"
          placeholder="Ask about Srini"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled}
          autoComplete="off"
        />
        <button type="submit" className="chat-form__send" disabled={disabled || !value.trim()} aria-label="Send">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
          </svg>
        </button>
      </form>
      {error && (
        <p className="error-msg" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export default function App() {
  const [threadStarted, setThreadStarted] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = scrollRef.current
      if (el) el.scrollTop = el.scrollHeight
    })
  }, [])

  const reset = useCallback(() => {
    setThreadStarted(false)
    setMessages([])
    setError(null)
    setLoading(false)
  }, [])

  const sendMessage = useCallback(
    async (raw: string) => {
      const text = raw?.trim()
      if (!text || loading) return
      setError(null)
      setThreadStarted(true)
      setMessages((prev) => [...prev, { role: 'user', text }])
      setLoading(true)
      setTimeout(scrollToBottom, 50)
      try {
        window.parent.postMessage('srini-chat-sound-send', '*')
        const { answer, suggestions } = await postChat(text)
        playSound('answer')
        setMessages((prev) => [...prev, { role: 'bot', text: answer, suggestions }])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not reach the server. Please try again.')
      } finally {
        setLoading(false)
        setTimeout(scrollToBottom, 50)
      }
    },
    [loading, scrollToBottom],
  )

  return (
    <>
      <ChatHeader onReset={reset} />
      <div id="messages" ref={scrollRef}>
        {threadStarted ? (
          <ChatFlow messages={messages} loading={loading} onSuggestionClick={sendMessage} />
        ) : (
          <Welcome onSuggestionClick={sendMessage} />
        )}
      </div>
      <ChatForm onSend={sendMessage} disabled={loading} error={error} clearError={() => setError(null)} />
    </>
  )
}
