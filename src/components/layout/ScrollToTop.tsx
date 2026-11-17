'use client'

import { useLayoutEffect } from 'react'

// Mobile browsers carry the scroll position of the tapped footer link into the legal page,
// leaving its heading under the fixed header bar; a layout effect wins that race.
export function ScrollToTop() {
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return null
}
