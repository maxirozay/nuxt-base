<script setup lang="ts">
definePageMeta({
  middleware: ['authenticated'],
})

const { user, clear: clearSession } = useUserSession()
const TOTPSecret = ref('')
const TOTPCode = ref('')

async function signout () {
  await clearSession()
  await navigateTo('/signin')
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
</template>
