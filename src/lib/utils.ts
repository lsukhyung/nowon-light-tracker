import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sanitizeFilenamePart(value: string): string {
  return value.trim().replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_') || '도반'
}
