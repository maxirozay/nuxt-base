declare module '#auth-utils' {
  interface User {
    id: string
    email?: string
    role: 'admin' | 'user'
    isAnonymous?: boolean
  }

  interface UserSession {
    expiresAt: number
  }
}

export {}
