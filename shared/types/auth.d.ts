declare module '#auth-utils' {
  interface User {
    id: string
    email: string
    role: 'admin' | 'user'
  }
}

export {}
