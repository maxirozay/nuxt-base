/**
 * Thrown by withAuth() when the user backs out of the identity prompt. Carries an empty
 * message on purpose: cancelling is not an error to report, and notify() ignores it.
 */
export class AuthCancelled extends Error {
  constructor() {
    super('')
    this.name = 'AuthCancelled'
  }
}

export const useAppStore = defineStore('app', () => {
  const isLoading = ref(false)
  const notifications = ref(
    [] as {
      id: number
      message: string
      type: 'error' | 'danger' | 'success'
      isSticky: boolean
    }[],
  )
  const confirmation = ref<{
    message?: string
    resolve: (value?: any) => any
    reject: (value?: any) => any
  } | null>(null)

  const authVerifiedAt = ref(0)
  const authPromise = ref<{ resolve: (verified: boolean) => void } | null>(null)

  function confirm(message?: string) {
    return new Promise((resolve, reject) => {
      confirmation.value = {
        message,
        resolve,
        reject,
      }
    }).finally(() => {
      confirmation.value = null
    })
  }

  /** resolves true once the identity is proven, false if the user cancels the prompt */
  function checkAuth(reverifyAfter = 5 * 60 * 1000): Promise<boolean> {
    if (Date.now() - authVerifiedAt.value < reverifyAfter) {
      return Promise.resolve(true)
    }
    return new Promise<boolean>((resolve) => {
      authPromise.value = { resolve }
    })
      .then((verified) => {
        if (verified) authVerifiedAt.value = Date.now()
        return verified
      })
      .finally(() => {
        authPromise.value = null
      })
  }

  /**
   * Wraps a call the server gates with requireRecentAuth(). Prompts up front so a stale
   * session never spends a request — the rate limiter counts those before the handler
   * ever runs. The retry covers callers that skip the prompt (forced MFA setup) and any
   * drift between our window and the server's.
   */
  async function withAuth<T>(request: () => Promise<T>, prompt = true): Promise<T> {
    if (prompt && !(await checkAuth())) throw new AuthCancelled()
    try {
      return await request()
    } catch (e: any) {
      if (e?.data?.statusMessage !== 'reauth_required') throw e
      authVerifiedAt.value = 0
      // cancelled at the second chance: surface the server's message instead
      if (!(await checkAuth())) throw e
      return request()
    }
  }

  function setLoading(state: boolean) {
    isLoading.value = state
  }

  let lastNotificationId = 0

  function notify(message: string, type: 'success' | 'error' = 'success', isSticky = false) {
    if (!message) return
    const id = ++lastNotificationId
    notifications.value.push({ id, message: handleZodError(message), type, isSticky })

    if (!isSticky) {
      setTimeout(() => removeNotification(id), 5000)
    }
  }

  function handleZodError(message: string) {
    try {
      if (message[0] === '[') {
        const parsed = JSON.parse(message)
        if (Array.isArray(parsed)) {
          return parsed[0].message
        }
      }
    } catch {
      return message
    }
    return message
  }

  function removeNotification(id: number) {
    notifications.value = notifications.value.filter((n) => n.id !== id)
  }

  return {
    isLoading,
    notifications,
    confirmation,
    confirm,
    setLoading,
    notify,
    removeNotification,
    authPromise,
    checkAuth,
    withAuth,
  }
})
