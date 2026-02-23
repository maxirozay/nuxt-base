<script setup lang="ts">
definePageMeta({
  middleware: ['authenticated'],
})

const { user, clear: clearSession } = useUserSession()
const TOTPSecret = ref('')
const TOTPCode = ref('')
const password = ref('')

async function signout() {
  await clearSession()
  await navigateTo('/signin')
}

const { register } = useWebAuthn({
  registerEndpoint: '/api/auth/webauthn/register',
})

async function registerPasskey() {
  try {
    if (!user.value?.email) {
      alert('User email is required to register a passkey')
      return
    }
    await register({ userName: user.value.email })
    alert('Passkey registered successfully')
  } catch (e: any) {
    alert(e.data?.message || 'Failed to register passkey')
  }
}

async function setPassword() {
  try {
    await $fetch('/api/auth', {
      method: 'POST',
      body: { password: password.value },
    })
    alert('Password set successfully')
  } catch (e: any) {
    alert(e.data?.message || 'Failed to set password')
  }
}

async function uploadFile(event: Event, path: string) {
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0) return

  const file = input.files[0] as any
  const formData = new FormData()
  formData.append('file', file)
  formData.append('path', path)

  try {
    const response = await $fetch('/api/files', {
      method: 'POST',
      body: formData,
    })
    console.log(response)
  } catch (e: any) {
    alert(e.data?.message || 'Upload failed')
  }
  input.value = ''
}

async function deleteFile(path: string) {
  if (!confirm('Are you sure you want to delete this file?')) return

  try {
    await $fetch('/api/files', {
      method: 'DELETE',
      body: { path },
    })
  } catch (e: any) {
    alert(e.data?.message || 'Delete failed')
  }
}

async function listFolder(path: string) {
  try {
    const response = await $fetch(`/api/files?path=${encodeURIComponent(path)}`)
    console.log(response)
  } catch (e: any) {
    alert(e || 'List folder failed')
  }
}
</script>

<template>
  <h1>Welcome {{ user?.email }}</h1>
  <button @click="signout">Sign Out</button>
  <button @click="getTOTPSecret().then((secret) => (TOTPSecret = secret))">Get TOTP Secret</button>
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
  <input
    type="file"
    @change="(e) => uploadFile(e, 'test')"
  />
  <button @click="deleteFile('test/file.png')">Delete</button>
  <button @click="listFolder('test')">List Folder</button>
</template>
