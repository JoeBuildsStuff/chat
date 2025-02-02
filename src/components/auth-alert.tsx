"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface AuthAlertProps {
  isOpen: boolean
}

export function AuthAlert({ isOpen }: AuthAlertProps) {
  const [showDialog, setShowDialog] = useState(false)

  // Only show the dialog when user is not authenticated and hasn't dismissed it
  useEffect(() => {
    if (isOpen) {
      setShowDialog(true)
    }
  }, [isOpen])

  const handleStayLoggedOut = () => {
    setShowDialog(false)
  }

  return (
    <AlertDialog open={showDialog}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader className="">
          <AlertDialogTitle className="text-center">Welcome back</AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            Log in or sign up to get smarter responses, upload files and images, and more.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="items-center justify-center mx-auto">
          <div className="flex flex-col gap-4 ">
            <AlertDialogAction asChild className="">
              <Link href="/login">Log in</Link>
            </AlertDialogAction>
            <AlertDialogAction asChild className="">
              <Link href="/signup">Sign up</Link>
            </AlertDialogAction>
            <AlertDialogCancel asChild className="border-none underline" onClick={handleStayLoggedOut}>
              <button>Stay logged out</button>
            </AlertDialogCancel>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
} 