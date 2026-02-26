<script setup lang="ts">
import QRCode from 'qrcode'

const appStore = useAppStore()
const { user } = useUserSession()
const auth = ref()
const TOTPSecret = ref('')
const TOTPCode = ref('')
const password = ref('')

async function getAuth() {
  auth.value = await $fetch('/api/auth')
}

const { register } = useWebAuthn({
  registerEndpoint: '/api/auth/webauthn/register',
})

async function registerPasskey() {
  try {
    await register({ userName: user.value!.email })
    getAuth()
    appStore.notify('saved', 'success')
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
    appStore.notify('saved', 'success')
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
    appStore.notify('deleted', 'success')
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
    appStore.notify('saved', 'success')
  } catch (e: any) {
    appStore.notify(e.data?.message, 'error')
  }
}

async function showTOTPSecret() {
  try {
    const response = await $fetch<{ secret: string }>('/api/auth/totp/generate')
    TOTPSecret.value = response.secret
    await nextTick()
    const canvas = document.getElementById('totp-qrcode') as HTMLCanvasElement

    const config = useRuntimeConfig()
    const issuer = config.public.name
    const uri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(user.value!.email)}?secret=${TOTPSecret.value}&issuer=${encodeURIComponent(issuer)}`
    QRCode.toCanvas(canvas, uri)
  } catch (e: any) {
    appStore.notify(e.data?.message, 'error')
  }
}

async function confirmTOTP() {
  if (TOTPCode.value.length !== 6) return
  try {
    await $fetch('/api/auth/totp/confirm', {
      method: 'POST',
      body: { secret: TOTPSecret.value, token: TOTPCode.value },
    })
    TOTPSecret.value = ''
    TOTPCode.value = ''
    auth.value.totp = true
  } catch (e: any) {
    appStore.notify(e.data?.message, 'error')
  }
}

async function disableTOTP() {
  if (TOTPCode.value.length !== 6) return appStore.notify('codeInvalid', 'error')
  try {
    await $fetch('/api/auth/totp/disable', {
      method: 'POST',
      body: { token: TOTPCode.value },
    })
    TOTPCode.value = ''
    auth.value.totp = null
  } catch (e: any) {
    appStore.notify(e.data?.message, 'error')
  }
}

onMounted(getAuth)
</script>

<template>
  <h1>{{ $t('settings') }}</h1>
  <form @submit.prevent="setPassword">
    <label for="password">
      <h2>{{ $t('password') }}</h2>
    </label>
    <div class="flex-row group">
      <input
        type="text"
        id="password"
        v-model.trim="password"
        required
      />
      <button type="submit">{{ $t('save') }}</button>
    </div>
  </form>

  <h2>Passkeys</h2>
  <button @click="registerPasskey">{{ $t('add') }}</button>
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
      {{ $t('delete') }}
    </button>
    <button>{{ $t('rename') }}</button>
  </form>

  <h2>{{ $t('totp') }}</h2>
  <div
    v-if="auth?.totp"
    class="flex-row group"
  >
    <input
      id="totp"
      type="text"
      v-model.trim="TOTPCode"
    />
    <button
      class="bg"
      @click="disableTOTP"
    >
      {{ $t('disable') }}
    </button>
  </div>
  <div v-else-if="TOTPSecret">
    <p>{{ $t('totpSecret') }}</p>
    <div class="text-center">
      <canvas id="totp-qrcode"></canvas>
      <p>{{ TOTPSecret }}</p>
    </div>
    <label for="totp">{{ $t('code') }}</label>
    <div class="flex-row group">
      <input
        id="totp"
        type="text"
        v-model.trim="TOTPCode"
        autocomplete="one-time-code"
        @keyup="confirmTOTP"
      />
    </div>
  </div>
  <button
    v-else
    @click="showTOTPSecret"
  >
    {{ $t('enable') }}
  </button>
</template>
