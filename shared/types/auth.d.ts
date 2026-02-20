declare module "#auth-utils" {
  interface User {
    id: string
    email: string
    password?: string | null
  }
}

export {}
