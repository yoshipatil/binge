"use client"

import posthog from "posthog-js"
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react"
import { useSession } from "next-auth/react"
import { useEffect } from "react"

// Identify the user in PostHog when they sign in
function PostHogIdentify() {
  const { data: session } = useSession()
  const ph = usePostHog()

  useEffect(() => {
    if (session?.user?.id) {
      ph.identify(session.user.id, {
        name: session.user.name,
        email: session.user.email,
      })
    } else {
      ph.reset()
    }
  }, [session, ph])

  return null
}

if (
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_POSTHOG_KEY &&
  process.env.NODE_ENV === "production"
) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: true,
    capture_pageleave: true,
  })
}

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return <>{children}</>

  return (
    <PHProvider client={posthog}>
      <PostHogIdentify />
      {children}
    </PHProvider>
  )
}
