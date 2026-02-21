export async function getTOTPSecret() {
  try {
    const response = await $fetch<{ secret: string }>('/api/auth/totp/generate')
    return response.secret
  } catch (e: any) {
    alert(e.data?.message || 'Failed to get secret')
  }
  return ''
}

export async function confirmTOTP (secret: string, token: string) {
  try {
    await $fetch('/api/auth/totp/confirm', {
      method: 'POST',
      body: { secret, token }
    })
    alert('TOTP enabled successfully!')
  } catch (e: any) {
    alert(e.data?.message || 'Failed to confirm TOTP')
  }
}

export async function disableTOTP (token: string) {
  try {
    await $fetch('/api/auth/totp/disable', {
      method: 'POST',
      body: { token }
    })
    alert('TOTP disabled successfully!')
  } catch (e: any) {
    alert(e.data?.message || 'Failed to disable TOTP')
  }
}
