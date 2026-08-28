import confetti from 'canvas-confetti'

export function celebrateWin() {
  confetti({
    particleCount: 60,
    spread: 60,
    startVelocity: 35,
    origin: { y: 0.6 },
    colors: ['#a78bfa', '#22d3ee', '#34d399', '#fbbf24'],
  })
}

export function celebrateBig() {
  const end = Date.now() + 600
  const colors = ['#fbbf24', '#a78bfa', '#f472b6', '#34d399']
  ;(function frame() {
    confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0 }, colors })
    confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1 }, colors })
    if (Date.now() < end) requestAnimationFrame(frame)
  })()
  confetti({
    particleCount: 120,
    spread: 100,
    startVelocity: 45,
    origin: { y: 0.5 },
    colors,
  })
}
