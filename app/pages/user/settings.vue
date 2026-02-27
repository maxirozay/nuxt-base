<script setup lang="ts">
import QRCode from 'qrcode'

const appStore = useAppStore()
const { user } = useUserSession()
const auth = ref()
const TOTPSecret = ref('')
const TOTPCode = ref('')
const password1 = ref('')
const password2 = ref('')
const showPasswordChange = ref(false)
const showPassword1 = ref(false)
const showPassword2 = ref(false)
const showTOTP = ref(false)

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
      body: { password: password1.value },
    })
    password1.value = ''
    password2.value = ''
    showPasswordChange.value = false
    appStore.notify('saved', 'success')
  } catch (e: any) {
    appStore.notify(e.data?.message, 'error')
  }
}

function toggleTOTP() {
  showTOTP.value = !showTOTP.value
  if (showTOTP.value) showTOTPSecret()
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
    showTOTP.value = false
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
    showTOTP.value = false
  } catch (e: any) {
    appStore.notify(e.data?.message, 'error')
  }
}

onMounted(getAuth)
</script>

<template>
  <h1>{{ $t('settings') }}</h1>
  <div class="flex-row flex-center g2">
    <h3 class="m0">Password</h3>
    <button
      class="flex mr"
      @click="showPasswordChange = true"
    >
      <Icon name="uil:edit" />
    </button>
  </div>
  <div
    v-if="showPasswordChange"
    class="modal"
    @click.self="showPasswordChange = false"
  >
    <div class="p3">
      <form
        v-if="showPasswordChange"
        @submit.prevent="setPassword"
      >
        <input
          v-show="false"
          type="email"
          :value="user?.email"
          autocomplete="username email"
        />
        <label for="password1">{{ $t('password') }} ({{ $t('passwordPolicy') }})</label>
        <div class="flex-row group mb1">
          <input
            :type="showPassword1 ? 'text' : 'password'"
            id="password1"
            v-model.trim="password1"
            autocomplete="new-password"
            minlength="12"
            required
          />
          <button
            class="flex fg"
            type="button"
            @click="showPassword1 = !showPassword1"
          >
            <Icon :name="'uil:' + (showPassword1 ? 'eye-slash' : 'eye')" />
          </button>
        </div>
        <label for="password2">{{ $t('confirm') }} {{ $t('password') }}</label>
        <div class="flex-row group mb1">
          <input
            :type="showPassword2 ? 'text' : 'password'"
            id="password2"
            v-model.trim="password2"
            autocomplete="new-password"
            minlength="12"
            required
          />
          <button
            class="flex fg"
            type="button"
            @click="showPassword2 = !showPassword2"
          >
            <Icon :name="'uil:' + (showPassword2 ? 'eye-slash' : 'eye')" />
          </button>
        </div>
        <div class="text-right">
          <button
            type="submit"
            :disabled="password1 !== password2 || !password1 || password1.length < 12"
          >
            {{ $t('save') }}
          </button>
        </div>
      </form>
    </div>
  </div>

  <h2>{{ $t('2fa') }}</h2>
  <div class="flex-row flex-center g2">
    <h3 class="m0">Passkeys</h3>
    <button
      v-if="auth?.credentials.length < 4"
      class="flex mr"
      @click="registerPasskey"
    >
      <Icon name="uil:plus" />
    </button>
  </div>
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
      class="bg flex"
      @click="deletePasskey(credential.id)"
    >
      <Icon name="uil:trash" />
    </button>
    <button class="flex fg"><Icon name="uil:save" /></button>
  </form>

  <h3>
    <label
      for="totp"
      class="mt2"
      >{{ $t('authenticatorApp') }}</label
    >
    <input
      type="checkbox"
      id="totp"
      class="ml2"
      :checked="!!auth?.totp"
      @click.prevent="toggleTOTP"
    />
  </h3>
  <div
    v-if="showTOTP"
    class="modal"
    @click.self="showTOTP = false"
  >
    <div
      v-if="auth?.totp"
      class="p3"
    >
      <label for="totp">
        {{ $t('code') }}
      </label>
      <div class="flex-row group">
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
    </div>
    <div
      v-else-if="TOTPSecret"
      class="p3"
    >
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
  </div>
</template>
