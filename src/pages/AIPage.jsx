import { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { useApp } from '../context/AppContext'

function SendIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M14 8L2 2l3 6-3 6 12-6z" fill="currentColor"/></svg>
}
function BotIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3" y="5" width="10" height="8" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M6 5V4a2 2 0 014 0v1" stroke="currentColor" strokeWidth="1.3"/><circle cx="6" cy="9" r="1" fill="currentColor"/><circle cx="10" cy="9" r="1" fill="currentColor"/></svg>
}

const SUGGESTIONS = [
  "Add soccer practice Saturday at 10am for Lily",
  "What's on the schedule this week?",
  "Create a healthy dinner plan for the week",
  "Remind me about Jake's dentist appointment",
  "What chores are still pending today?",
]

function buildSystemPrompt(members, events, chores, meals) {
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const recentEvents = events.slice(-20).map(e => `- ${e.title} on ${e.date} at ${e.time}${e.memberId ? ` (${members.find(m => m.id === e.memberId)?.name})` : ''}`).join('\n')
  const pendingChores = chores.filter(c => !c.done).map(c => `- ${c.title}${c.memberId ? ` (${members.find(m => m.id === c.memberId)?.name})` : ''}`).join('\n')
  const memberNames = members.map(m => m.name).join(', ')

  return `You are Kin AI, a friendly and helpful family calendar assistant. You help the family stay organized, manage their schedule, and plan ahead.

Today's date: ${todayStr}
Family members: ${memberNames}

Upcoming events:
${recentEvents || 'No events scheduled yet'}

Pending chores:
${pendingChores || 'All chores done!'}

Be warm, concise, and practical. When the user wants to add an event, extract the details and respond with a JSON block formatted like:
{"action":"add_event","title":"...","date":"YYYY-MM-DD","time":"HH:MM","memberId":"member_id_or_null","location":"...","notes":"..."}

Member IDs: ${members.map(m => `${m.name}="${m.id}"`).join(', ')}

For questions about the schedule or chores, answer naturally based on the data above. Keep responses short and helpful.`
}

export default function AIPage() {
  const { members, events, chores, meals, addEvent, getMemberById } = useApp()
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hey! I'm Kin AI 👋 I can help you add events, check your schedule, plan meals, and keep the family organized. What do you need?" }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const parseAndHandleAction = (text) => {
    const jsonMatch = text.match(/\{[^}]*"action"\s*:\s*"add_event"[^}]*\}/s)
    if (jsonMatch) {
      try {
        const action = JSON.parse(jsonMatch[0])
        if (action.action === 'add_event') {
          addEvent({
            title: action.title,
            date: action.date,
            time: action.time || '09:00',
            duration: 60,
            memberId: action.memberId && action.memberId !== 'null' ? action.memberId : null,
            location: action.location || '',
            notes: action.notes || '',
          })
          return true
        }
      } catch (e) {}
    }
    return false
  }

  const sendMessage = async (text) => {
    const userText = text || input.trim()
    if (!userText || loading) return
    setInput('')

    const newMessages = [...messages, { role: 'user', content: userText }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }))

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY || '',
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: buildSystemPrompt(members, events, chores, meals),
          messages: apiMessages,
        }),
      })

      const data = await res.json()
      const reply = data.content?.[0]?.text || "Sorry, I couldn't process that. Try again!"

      const didAction = parseAndHandleAction(reply)

      // Clean up JSON from display
      const displayReply = reply.replace(/\{[^}]*"action"\s*:\s*"add_event"[^}]*\}/s, '').trim()

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: displayReply || (didAction ? "Done! I've added that to your calendar ✅" : reply),
        didAction,
      }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I ran into an issue connecting. Make sure the Anthropic API is set up. In the meantime, you can add events manually from the Calendar page!",
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--green-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--green)' }}>
          <BotIcon />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>Kin AI</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Your family assistant</div>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 11, background: 'var(--green-light)', color: 'var(--green-dark)', padding: '3px 10px', borderRadius: 99, fontWeight: 500 }}>
          Powered by Claude
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {msg.role === 'assistant' && (
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--green-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--green)', marginRight: 8, flexShrink: 0, marginTop: 2 }}>
                <BotIcon />
              </div>
            )}
            <div style={{
              maxWidth: '75%', padding: '10px 14px', borderRadius: 14,
              background: msg.role === 'user' ? 'var(--green)' : 'var(--surface)',
              color: msg.role === 'user' ? '#fff' : 'var(--text)',
              border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
              fontSize: 14, lineHeight: 1.55,
              borderTopRightRadius: msg.role === 'user' ? 4 : 14,
              borderTopLeftRadius: msg.role === 'assistant' ? 4 : 14,
            }}>
              {msg.content}
              {msg.didAction && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--green)', fontWeight: 500 }}>
                  ✅ Added to your calendar
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--green-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--green)', flexShrink: 0 }}>
              <BotIcon />
            </div>
            <div style={{ padding: '10px 14px', borderRadius: 14, borderTopLeftRadius: 4, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', gap: 4, alignItems: 'center' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', opacity: 0.5, animation: `pulse 1s ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div style={{ padding: '0 1.5rem 1rem', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {SUGGESTIONS.map((s, i) => (
            <button key={i} onClick={() => sendMessage(s)} style={{
              padding: '6px 12px', borderRadius: 999, fontSize: 12,
              background: 'var(--surface)', border: '1px solid var(--border)',
              color: 'var(--text-2)', cursor: 'pointer', transition: 'all 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--green)'; e.currentTarget.style.color = 'var(--green)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)' }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
          placeholder="Ask me anything about your family's schedule..."
          style={{ flex: 1, borderRadius: 999, padding: '10px 16px' }}
        />
        <button className="btn btn-primary" onClick={() => sendMessage()} disabled={loading || !input.trim()} style={{ borderRadius: '50%', width: 42, height: 42, padding: 0 }}>
          <SendIcon />
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
