export const useAppStore = defineStore('app', () => {
  const isLoading = ref(false)
  const notifications = ref(
    [] as { id: number; message: string; type: 'error' | 'success'; isSticky: boolean }[],
  )
  const confirmation = ref<{
    message: string
    action: () => void
  } | null>(null)

  function setLoading(state: boolean) {
    isLoading.value = state
  }

  function notify(message: string, type: 'success' | 'error' = 'success', isSticky = false) {
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
  }
})
