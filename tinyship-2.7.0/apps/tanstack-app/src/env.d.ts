/// <reference path="../worker-configuration.d.ts" />

// Preserve the DOM JSON contract used by the existing mixed browser/server app
// when Wrangler's runtime declarations are included for the DO binding.
interface Body {
  json(): Promise<any>
}

declare module '*.svg' {
  import React from 'react'
  const SVGComponent: React.FC<React.SVGProps<SVGSVGElement>>
  export default SVGComponent
}
