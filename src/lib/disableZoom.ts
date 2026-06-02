// iOS Safari ignores the viewport meta's `user-scalable=no` / `maximum-scale`,
// so pinch-to-zoom and double-tap zoom stay enabled unless we block the gestures
// in JS. Combined with `touch-action: manipulation` in CSS (kills double-tap),
// these listeners disable page zoom while leaving scrolling intact.
export function disableZoom() {
  // Safari pinch-zoom fires gesture* events on the document.
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(type, (e) => e.preventDefault(), { passive: false })
  }

  // Fallback for engines without gesture events: block multi-finger pinch.
  document.addEventListener(
    'touchmove',
    (e) => {
      if (e.touches.length > 1) e.preventDefault()
    },
    { passive: false },
  )
}
