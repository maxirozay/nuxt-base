<script setup lang="ts">
import { useAppStore } from '~/stores/app'

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
    console.log(e.data)

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
  <button
    v-if="auth?.totp"
    class="bg"
    @click="disableTOTP(TOTPCode)"
  >
    {{ $t('disable') }}
  </button>
  <div v-else-if="TOTPSecret">
    <p>{{ TOTPSecret }}</p>
    <label for="totp">{{ $t('code') }}</label>
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
        {{ $t('confirm') }}
      </button>
    </div>
  </div>
  <button
    v-else
    @click="getTOTPSecret().then((secret) => (TOTPSecret = secret))"
  >
    {{ $t('enable') }}
  </button>
</template>
