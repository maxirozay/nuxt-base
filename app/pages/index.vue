<script setup lang="ts">
import { set } from 'zod'

definePageMeta({
  middleware: ['authenticated'],
})

const { user, clear: clearSession } = useUserSession()
const TOTPSecret = ref('')
const TOTPCode = ref('')
const password = ref('')

async function signout () {
  await clearSession()
  await navigateTo('/signin')
}

const { register } = useWebAuthn({
  registerEndpoint: '/api/auth/webauthn/register'
})

async function registerPasskey() {
  try {
    await register({ userName: user.value?.email! })
    alert('Passkey registered successfully')
  } catch (e: any) {
    alert(e.data?.message || 'Failed to register passkey')
  }
}

async function setPassword() {
  try {
    await $fetch('/api/auth', {
      method: 'POST',
      body: { password: password.value }
    })
    alert('Password set successfully')
  } catch (e: any) {
    alert(e.data?.message || 'Failed to set password')
  }
}
</script>

<template>
  <h1>Welcome {{ user?.email }}</h1>
  <button @click="signout">Sign Out</button>
  <button @click="getTOTPSecret().then((secret) => TOTPSecret = secret)">
    Get TOTP Secret
  </button>
  {{ TOTPSecret }}
  <input
    type="text"
    v-model.trim="TOTPCode"
    placeholder="TOTP code"
  />
  <button @click="confirmTOTP(TOTPSecret, TOTPCode)">Confirm TOTP Secret</button>
  <button @click="disableTOTP(TOTPCode)">Disable TOTP</button>
  <form @submit.prevent="registerPasskey">
    <button type="submit">Register a Passkey</button>
  </form>
  <form @submit.prevent="setPassword">
    <input
      type="password"
      v-model.trim="password"
      placeholder="Password"
      required
    />
    <button type="submit">Set Password</button>
  </form>
</template>
