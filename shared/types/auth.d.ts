declare module '#auth-utils' {
  interface User {
    id: string
    email?: string
    role: 'admin' | 'user'
    isAnonymous?: boolean
    requiresMfaSetup?: boolean
  }

  interface UserSession {
    expiresAt: number
    /** last time a credential was proven on this session, for requireRecentAuth() */
    authenticatedAt: number
  }
}

export {}
