"use client"

import * as React from "react"
import { useServerInsertedHTML } from "next/navigation"

import { getThemeBootstrapScript } from "@/lib/theme/shared"

const themeBootstrapScript = getThemeBootstrapScript()

function ThemeBootstrap() {
  const hasInsertedScript = React.useRef(false)

  useServerInsertedHTML(() => {
    if (hasInsertedScript.current) {
      return null
    }

    hasInsertedScript.current = true

    return (
      <script
        id="theme-bootstrap"
        dangerouslySetInnerHTML={{ __html: themeBootstrapScript }}
      />
    )
  })

  return null
}

export { ThemeBootstrap }
