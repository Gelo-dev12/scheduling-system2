"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface AddBranchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: { name: string; location: string }) => void
}

export function AddBranchModal({ open, onOpenChange, onSubmit }: AddBranchModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    location: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.name && formData.location) {
      onSubmit(formData)
      setFormData({ name: "", location: "" })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md mx-4 w-[calc(100vw-2rem)] sm:w-full rounded-lg">
        <DialogHeader className="text-center">
          <DialogTitle className="text-lg lg:text-xl font-semibold">Add Branch</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-6">
          <div className="space-y-2">
            <Label htmlFor="branch-name" className="text-sm font-medium">
              Branch Name
            </Label>
            <Input
              id="branch-name"
              placeholder="Enter branch name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="h-12 text-base"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="branch-location" className="text-sm font-medium">
              Branch Location
            </Label>
            <Input
              id="branch-location"
              placeholder="Enter branch location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="h-12 text-base"
              required
            />
          </div>
          <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 h-12 text-base">
            Create Branch
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
