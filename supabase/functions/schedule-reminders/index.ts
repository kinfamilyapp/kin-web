// supabase/functions/schedule-reminders/index.ts
// Run this on a cron schedule: every 5 minutes
// Supabase cron: select cron.schedule('reminders', '*/5 * * * *',
//   $$select net.http_post(url:='https://YOUR_PROJECT.supabase.co/functions/v1/schedule-reminders',
//   headers:='{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb)$$);

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const REMINDER_WINDOWS = [60, 30, 15, 10] // minutes before event

serve(async () => {
  const now = new Date()
  const sent: string[] = []

  for (const minutesBefore of REMINDER_WINDOWS) {
    // Find events starting in exactly minutesBefore ± 2.5 min (so 5-min cron doesn't miss)
    const windowStart = new Date(now.getTime() + (minutesBefore - 2.5) * 60000)
    const windowEnd   = new Date(now.getTime() + (minutesBefore + 2.5) * 60000)

    // Build time range strings
    const dateStr  = windowStart.toISOString().slice(0, 10)
    const timeStart = windowStart.toTimeString().slice(0, 5)
    const timeEnd   = windowEnd.toTimeString().slice(0, 5)

    // Fetch events in window that haven't had this reminder sent
    const { data: events } = await supabase
      .from('events')
      .select(`
        id, title, time, date, location, family_id,
        member:member_id (name),
        reminders_sent:push_reminders_sent!inner(reminder_minutes)
      `)
      .eq('date', dateStr)
      .gte('time', timeStart)
      .lte('time', timeEnd)
      // Exclude already-sent reminders for this window
      .not('id', 'in',
        supabase.from('push_reminders_sent')
          .select('event_id')
          .eq('reminder_minutes', minutesBefore)
      )

    if (!events?.length) continue

    for (const event of events) {
      const label = minutesBefore === 60 ? '1 hour' : `${minutesBefore} minutes`
      const memberName = (event.member as any)?.name

      const payload = {
        family_id: event.family_id,
        title: `⏰ ${event.title}`,
        body: [
          `Starting in ${label}`,
          memberName ? `For: ${memberName}` : null,
          event.location ? `📍 ${event.location}` : null,
        ].filter(Boolean).join(' · '),
        tag: `event-${event.id}-${minutesBefore}`,
        data: { url: '/?page=calendar', event_id: event.id },
      }

      // Call send-push function
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify(payload),
      })

      // Mark as sent
      await supabase.from('push_reminders_sent').upsert({
        event_id: event.id,
        family_id: event.family_id,
        reminder_minutes: minutesBefore,
      })

      sent.push(`${event.title} (${label} reminder)`)
    }
  }

  return new Response(JSON.stringify({ processed: sent.length, reminders: sent }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
