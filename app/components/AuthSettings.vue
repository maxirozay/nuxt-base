<script setup lang="ts">
import { useAppStore } from '~/stores/app'

const appStore = useAppStore()
const { user } = useUserSession()
const auth = ref()
const TOTPSecret = ref('')
const TOTPCode = ref('')
const password = ref('')

async function getAuth() {
  if (!user.value) return
  auth.value = await $fetch('/api/auth')
}
getAuth()

const { register } = useWebAuthn({
  registerEndpoint: '/api/auth/webauthn/register',
})

async function registerPasskey() {
  try {
    await register({ userName: user.value!.email })
    getAuth()
    appStore.notify('Passkey registered successfully', 'success')
  } catch (e: any) {
    appStore.notify(e.data?.message, 'error')
  }
}

async function setPasskeyName(name: string, credentialId: string) {
  try {
    await $fetch('/api/auth/webauthn', {
      method: 'POST',
      body: { name, credentialId },
    })
    appStore.notify('Passkey name set successfully', 'success')
  } catch (e: any) {
    appStore.notify(e.data?.message, 'error')
  }
}

async function deletePasskey(credentialId: string) {
  try {
    await $fetch('/api/auth/webauthn', {
      method: 'DELETE',
      body: { credentialId },
    })
    auth.value.credentials = auth.value.credentials.filter((c: any) => c.id !== credentialId)
    appStore.notify('Passkey deleted successfully', 'success')
  } catch (e: any) {
    appStore.notify(e.data?.message, 'error')
  }
}

async function setPassword() {
  try {
    await $fetch('/api/auth', {
      method: 'POST',
      body: { password: password.value },
    })
    appStore.notify('Password set successfully', 'success')
  } catch (e: any) {
    appStore.notify(e.data?.message, 'error')
  }
}
</script>

<template>
  <h1>Auth settings for {{ user!.email }}</h1>
  <form @submit.prevent="setPassword">
    <label for="password"><h2>Password</h2></label>
    <div class="flex-row group">
      <input
        type="text"
        id="password"
        v-model.trim="password"
        required
      />
      <button type="submit">Save</button>
    </div>
  </form>

  <h2>Passkeys</h2>
  <button @click="registerPasskey">Add a passkey</button>
  <form
    v-for="credential in auth?.credentials || []"
    :key="credential.id"
    class="flex-row group mt1"
    @submit.prevent="setPasskeyName(credential.name, credential.id)"
  >
    <input
      type="text"
      v-model="credential.name"
      maxlength="32"
    />
    <button
      type="button"
      class="bg"
      @click="deletePasskey(credential.id)"
    >
      Delete
    </button>
    <button>Rename</button>
  </form>

  <h2>TOTP second factor</h2>
  <button
    v-if="auth?.totp"
    class="bg"
    @click="disableTOTP(TOTPCode)"
  >
    Disable TOTP
  </button>
  <div v-else-if="TOTPSecret">
    <p>{{ TOTPSecret }}</p>
    <label for="totp">Code</label>
    <div class="flex-row group">
      <input
        id="totp"
        type="text"
        v-model.trim="TOTPCode"
        autocomplete="one-time-code"
      />
      <button
        @click="
          confirmTOTP(TOTPSecret, TOTPCode).then(() => {
            TOTPSecret = ''
          })
        "
      >
        Confirm
      </button>
    </div>
  </div>
  <button
    v-else
    @click="getTOTPSecret().then((secret) => (TOTPSecret = secret))"
  >
    Enable TOTP
  </button>
</template>
