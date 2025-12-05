// src/lib/api-error.ts
import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function handleApiError(error: any): NextResponse {
  console.error('API Error:', error)
  
  if (error.message === 'Unauthorized') {
    return NextResponse.json(
      { error: 'Authentication required. Please log in.' },
      { status: 401 }
    )
  }
  
  if (error.message === 'Admin access required') {
    return NextResponse.json(
      { error: 'You do not have permission to perform this action.' },
      { status: 403 }
    )
  }
  
  // Zod validation errors
  if (error instanceof ZodError) {
    const errors = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message
    }))
    
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: errors
      },
      { status: 400 }
    )
  }
  
  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      const field = (error.meta?.target as string[])?.[0] || 'field'
      return NextResponse.json(
        { error: `A record with this ${field} already exists.` },
        { status: 409 }
      )
    }
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Record not found.' },
        { status: 404 }
      )
    }
    
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Invalid reference to related record.' },
        { status: 400 }
      )
    }
  }
  
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: error.message,
        details: error.details
      },
      { status: error.statusCode }
    )
  }
  
  return NextResponse.json(
    {
      error: 'An unexpected error occurred. Please try again later.',
      ...(process.env.NODE_ENV === 'development' && {
        details: error.message,
        stack: error.stack
      })
    },
    { status: 500 }
  )
}

export function throwApiError(statusCode: number, message: string, details?: any): never {
  throw new ApiError(statusCode, message, details)
}