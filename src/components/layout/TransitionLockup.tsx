import { Logo } from '@/components/brand/Logo'
import { Name } from '@/components/brand/Name'

/* ══════════════════════════════════════════════════════════════════════════════
   THE TRANSITION LOCKUP (WP-06c)

   The mark stacked on the wordmark — the same pair the landing lockup
   renders — for the transition overlay. The overlay places this component
   at exactly the landing position (`--name-landing-*`, the shared pair the
   landing lockup reads, so the two lockups sit in the same spot and the
   name never moves between the page and the overlay); this component only
   stacks.

   Both images render through the shared wrappers (`Logo`, `Name`) and take
   their widths from the **shared** token families — `--logo-landing-width*`
   and `--name-width*`, the same tokens the landing lockup reads — so the
   overlay's lockup is byte-identical to the landing's. No new tokens: the
   overlay is a fifth reader of the same geometry, not a new geometry.
   ══════════════════════════════════════════════════════════════════════════════ */

export function TransitionLockup() {
  return (
    <div className="transition-lockup">
      <Logo className="transition-lockup__logo" />
      <Name className="transition-lockup__name" />
    </div>
  )
}
