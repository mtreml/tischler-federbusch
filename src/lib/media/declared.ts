import { join } from 'node:path'

import { posterPathFor } from '@mtreml/portfolio-core/media'

// The one list that knows where each original lives; the generation script and the render side both consume it.
// Logical path: the served path minus `media.basePath`, extension kept; originals live uniformly at `media-originals/<logical path>`.

type MediaRole = 'responsive' | 'single' | 'video'

export interface DeclaredMedia {
  logicalPath: string
  originalPath: string
  role: MediaRole
  targetWidth?: number
  /** For `video`: which profile in `media.videoEncode` applies. */
  videoProfile?: string
  derivedFrom?: string
  declaredBy: string
  active: boolean
}

export function declaredMedia(root: string): DeclaredMedia[] {
  const original = (logicalPath: string): string => join(root, 'media-originals', logicalPath)

  const master = 'landing/VID_20261114_082951.mp4'

  return [
    {  // landing master: 4K phone original re-encoded to one 1920-capped web master
      logicalPath: master,
      originalPath: original(master),
      role: 'video',
      videoProfile: 'landing',
      declaredBy: 'the landing master (rendered by the landing)',
      active: true,
    },
    {  // poster, derived from the master's opening frame; 1280 shares the critical path with the master
      logicalPath: posterPathFor(master),
      originalPath: original(master),
      role: 'single',
      targetWidth: 1280,
      derivedFrom: master,
      declaredBy: 'the landing master — poster, derived from its opening frame',
      active: true,
    },
    {  // the Works images, in display order: full ladder × every configured format
      logicalPath: 'arbeiten/signal-2026-07-20-20-14-59-447_003.jpg',
      originalPath: original('arbeiten/signal-2026-07-20-20-14-59-447_003.jpg'),
      role: 'responsive',
      declaredBy: 'a Works image (rendered by the Arbeiten section)',
      active: true,
    },
    {
      logicalPath: 'arbeiten/9ezd7rz08i9h1.jpg',
      originalPath: original('arbeiten/9ezd7rz08i9h1.jpg'),
      role: 'responsive',
      declaredBy: 'a Works image (rendered by the Arbeiten section)',
      active: true,
    },
    {
      logicalPath: 'arbeiten/yz50v4rlf8be1.jpg',
      originalPath: original('arbeiten/yz50v4rlf8be1.jpg'),
      role: 'responsive',
      declaredBy: 'a Works image (rendered by the Arbeiten section)',
      active: true,
    },
  ]
}
