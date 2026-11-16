/* `subset-font` ships no type declarations, and it is used by exactly one authoring script
   (`scripts/subset-fonts.ts`). Declaring the surface actually used is preferable to an `any`:
   the subsetting call is the one place where getting an option name wrong fails *silently*
   by shipping the wrong cut, so the compiler should be able to check it. */
declare module 'subset-font' {
  interface SubsetOptions {
    targetFormat?: 'sfnt' | 'woff' | 'woff2' | 'truetype'
    /** Retained name table IDs. Omitted keeps the subsetter's defaults. */
    preserveNameIds?: number[]
    /** Pinned or restricted variation axes, as `{ wght: 400 }` or `{ wght: [400, 700] }`. */
    variationAxes?: Record<string, number | [number, number]>
  }

  export default function subsetFont(
    font: Buffer,
    text: string,
    options?: SubsetOptions,
  ): Promise<Buffer>
}
