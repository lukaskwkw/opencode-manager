/** Timestamp under a message: the clock time for today, the date too for older messages. */
export function formatMessageTimestamp(created: number, now: number = Date.now()): string {
  const date = new Date(created)
  const time = date.toLocaleTimeString()
  const isToday = new Date(now).toDateString() === date.toDateString()
  return isToday ? time : `${date.toLocaleDateString()} ${time}`
}
