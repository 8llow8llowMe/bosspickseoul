export const formatDateTime = (dateTime: string) => {
  const date = new Date(dateTime)

  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export const formatLargeWon = (amount: number) => {
  if (amount >= 10000) {
    const billions = Math.floor(amount / 10000)
    const millions = amount % 10000
    return `${billions}억 ${millions.toLocaleString()}만원`
  }

  return `${amount.toLocaleString()}만원`
}
