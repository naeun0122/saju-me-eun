import { useCallback, useEffect, useRef, useState } from 'react'

export function useToast(duration = 2800) {
  const [toast, setToast] = useState('')
  const timerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const showToast = useCallback(
    (message) => {
      setToast(message)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setToast(''), duration)
    },
    [duration],
  )

  return { toast, showToast }
}
