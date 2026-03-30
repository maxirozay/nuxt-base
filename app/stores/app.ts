export const useAppStore = defineStore('app', () => {
  const isLoading = ref(false)
  const notifications = ref(
    [] as { id: number; message: string; type: 'error' | 'success'; isSticky: boolean }[],
  )
  const confirmation = ref<{
    message: string
    action: () => void
  } | null>(null)

  const authVerifiedAt = ref(0)
  const authPromise = ref()

  function checkAuth(reverifyAfter = 5 * 60 * 1000) {
    if (Date.now() - authVerifiedAt.value < reverifyAfter) {
      return true
    }
    return new Promise((resolve, reject) => {
      authPromise.value = {
        resolve,
        reject,
      }
    })
      .then(() => {
        authVerifiedAt.value = Date.now()
        return true
      })
      .finally(() => {
        authPromise.value = null
      })
  }

  function setLoading(state: boolean) {
    isLoading.value = state
  }

  function notify(message: string, type: 'success' | 'error' = 'success', isSticky = false) {
    if (!message) return
    const id = Date.now()
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
    setLoading,
    notify,
    removeNotification,
    authPromise,
    checkAuth,
  }
})
