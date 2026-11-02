// src/utils/index.ts
import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 30)
  const random = Math.random().toString(36).substring(2, 8)
  return `${base}-${random}`
}

export function formatDate(dateString: string): string {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatDateShort(dateString: string): string {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function isDeadlinePassed(deadline?: string): boolean {
  if (!deadline) return false
  return new Date(deadline) < new Date()
}

export function getOrCreateReviewerToken(): string {
  const key = 'fr_reviewer_token'
  let token = localStorage.getItem(key)
  if (!token) {
    token = Math.random().toString(36).substring(2) + Date.now().toString(36)
    localStorage.setItem(key, token)
  }
  return token
}

export function getReviewedDishes(): string[] {
  const key = 'fr_reviewed_dishes'
  try {
    return JSON.parse(localStorage.getItem(key) || '[]') as string[]
  } catch {
    return []
  }
}

export function markDishReviewed(foodItemId: string): void {
  const key = 'fr_reviewed_dishes'
  const reviewed = getReviewedDishes()
  if (!reviewed.includes(foodItemId)) {
    reviewed.push(foodItemId)
    localStorage.setItem(key, JSON.stringify(reviewed))
  }
}

export function hasDishBeenReviewed(foodItemId: string): boolean {
  return getReviewedDishes().includes(foodItemId)
}
