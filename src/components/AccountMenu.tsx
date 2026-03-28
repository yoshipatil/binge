"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { signOut, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { LogOut, Trash2, ShieldCheck, User } from "lucide-react"
import toast from "react-hot-toast"

interface AccountMenuProps {
  trigger: React.ReactNode
}

export default function AccountMenu({ trigger }: AccountMenuProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setDeleting(true)
    try {
      const res = await fetch("/api/account", { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Account deleted")
      setOpen(false)
      await signOut({ callbackUrl: "/" })
    } catch {
      toast.error("Failed to delete account — try again")
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  if (!session?.user) return null

  const user = session.user

  return (
    <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (!o) setConfirmDelete(false) }}>
      <SheetTrigger>{trigger}</SheetTrigger>
      <SheetContent
        side="bottom"
        className="border-t border-white/8 bg-zinc-950 text-white md:side-right rounded-t-2xl pb-safe"
      >
        <SheetHeader className="pb-4 border-b border-white/8">
          <div className="flex items-center gap-3">
            {user.image ? (
              <Image
                src={user.image}
                alt={user.name ?? ""}
                width={44}
                height={44}
                className="rounded-full ring-1 ring-white/10"
              />
            ) : (
              <div className="h-11 w-11 rounded-full bg-blue-500/30" />
            )}
            <div className="text-left">
              <SheetTitle className="text-base font-semibold text-white">{user.name}</SheetTitle>
              <p className="text-sm text-white/40">{user.email}</p>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-4 flex flex-col gap-1">
          <Link
            href="/profile/me"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white"
          >
            <User className="h-4 w-4" />
            My Profile
          </Link>

          <Link
            href="/privacy"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white"
          >
            <ShieldCheck className="h-4 w-4" />
            Privacy Policy
          </Link>

          <button
            onClick={() => { setOpen(false); signOut({ callbackUrl: "/" }) }}
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>

          <div className="mt-2 border-t border-white/5 pt-2">
            {!confirmDelete ? (
              <button
                onClick={handleDelete}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-rose-400/70 transition-colors hover:bg-rose-500/8 hover:text-rose-400"
              >
                <Trash2 className="h-4 w-4" />
                Delete account
              </button>
            ) : (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/8 px-4 py-3">
                <p className="mb-3 text-sm font-medium text-rose-300">
                  This will permanently delete all your rankings, watchlist, and account data. Are you sure?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 rounded-lg border border-white/10 py-2 text-sm text-white/50 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 rounded-lg bg-rose-600 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-rose-500"
                  >
                    {deleting ? "Deleting…" : "Yes, delete"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
