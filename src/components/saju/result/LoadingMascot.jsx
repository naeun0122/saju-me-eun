import { useEffect, useState } from 'react'
import { MASCOT_LOADING } from '../../../constants/mascot'

export function LoadingMascot() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((current) => (current + 1) % MASCOT_LOADING.length)
    }, 1400)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="mascot-loading" aria-hidden="true">
      {MASCOT_LOADING.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          className={`mascot-img mascot-img--loading${i === index ? ' is-active' : ''}`}
        />
      ))}
    </div>
  )
}
