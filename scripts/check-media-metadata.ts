/* ══════════════════════════════════════════════════════════════════════════════
   MEDIA METADATA CHECK — WP-01 STUB, real implementation with the pipeline in
   WP-03.

   Checks what media files *carry*: no EXIF/XMP/IPTC on the generated images, no
   container keys on the re-encoded video (the landing encode carries no audio
   track). WP-03 wires the pipeline and this check to it; the stub keeps the gate
   in the chain at its fixed position so the order never moves.
   ══════════════════════════════════════════════════════════════════════════════ */

console.log(
  'media:meta:check: OK (WP-01 stub — no media is declared yet; the pipeline and this check land in WP-03)',
)
