<script setup lang="ts">
import QRCode from 'qrcode'

definePageMeta({
  middleware: ['authenticated'],
})

const appStore = useAppStore()
const { user, fetch: fetchUserSession } = useUserSession()
const auth = ref()
const TOTPSecret = ref('')
const TOTPCode = ref('')
const password1 = ref('')
const password2 = ref('')
const showPasswordChange = ref(false)
const showPassword1 = ref(false)
const showPassword2 = ref(false)
const showTOTP = ref(false)
const { clear: clearSession } = useUserSession()

const isMfaSetup = user.value?.requiresMfaSetup === true

async function checkAuth() {
  return isMfaSetup || (await appStore.checkAuth())
}

const canRemovePasskey = computed(
  () => !auth.value?.forceMfa || auth.value.hasTOTP || auth.value.credentials.length > 1,
)
const canDisableTOTP = computed(() => !auth.value?.forceMfa || auth.value.credentials.length > 0)

async function getAuth() {
  auth.value = await $fetch('/api/auth')
}

const { register } = useWebAuthn({
  registerEndpoint: '/api/auth/webauthn/register',
})

async function registerPasskey() {
  try {
    if (!(await checkAuth())) return
    await register({ userName: user.value!.email! })
    await getAuth()
    appStore.notify('saved', 'success')
    if (isMfaSetup) {
      await fetchUserSession()
      if (!user.value?.requiresMfaSetup) await navigateTo('/', { replace: true })
    }
  } catch (e: any) {
    appStore.notify(e.message, 'error')
  }
}

async function setPasskeyName(name: string, credentialId: string) {
  try {
    if (!(await checkAuth())) return
    await $fetch('/api/auth/webauthn', {
      method: 'POST',
      body: { name, credentialId },
    })
    appStore.notify('saved', 'success')
  } catch (e: any) {
    appStore.notify(e.message, 'error')
  }
}

async function deletePasskey(credentialId: string) {
  try {
    if (!(await checkAuth())) return
    await $fetch('/api/auth/webauthn', {
      method: 'DELETE',
      body: { credentialId },
    })
    auth.value.credentials = auth.value.credentials.filter((c: any) => c.id !== credentialId)
    appStore.notify('deleted', 'success')
  } catch (e: any) {
    appStore.notify(e.message, 'error')
  }
}

async function setPassword() {
  try {
    if (!(await checkAuth())) return
    await $fetch('/api/auth', {
      method: 'POST',
      body: { password: password1.value },
    })
    password1.value = ''
    password2.value = ''
    showPasswordChange.value = false
    appStore.notify('saved', 'success')
  } catch (e: any) {
    appStore.notify(e.message, 'error')
  }
}

function toggleTOTP() {
  showTOTP.value = !showTOTP.value
  if (showTOTP.value && !auth.value?.hasTOTP) showTOTPSecret()
}

async function showTOTPSecret() {
  try {
    if (!(await checkAuth())) return
    const response = await $fetch<{ secret: string }>('/api/auth/totp/generate')
    TOTPSecret.value = response.secret
    await nextTick()
    const canvas = document.getElementById('totp-qrcode') as HTMLCanvasElement

    const config = useRuntimeConfig()
    const issuer = config.public.name
    const uri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(user.value!.email!)}?secret=${TOTPSecret.value}&issuer=${encodeURIComponent(issuer)}`
    QRCode.toCanvas(canvas, uri)
  } catch (e: any) {
    showTOTP.value = false
    appStore.notify(e.message, 'error')
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
    auth.value.hasTOTP = true
    showTOTP.value = false
    if (isMfaSetup) {
      await fetchUserSession()
      if (!user.value?.requiresMfaSetup) await navigateTo('/', { replace: true })
    }
  } catch (e: any) {
    appStore.notify(e.message, 'error')
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
    auth.value.hasTOTP = false
    showTOTP.value = false
  } catch (e: any) {
    appStore.notify(e.message, 'error')
  }
}

async function deleteRefreshTokens() {
  appStore.setLoading(true)
  try {
    await $fetch('/api/auth/refresh', {
      method: 'DELETE',
    })
    await clearSession()
    navigateTo('/')
  } catch (e: any) {
    appStore.notify(e.message, 'error')
  } finally {
    appStore.setLoading(false)
  }
}

onMounted(getAuth)
</script>

<template>
  <template v-if="isMfaSetup">
    <div class="p2 my2 text-center">
      <b>{{ $t('mfaRequired') }}</b>
      <p class="m0">{{ $t('mfaRequiredDescription') }}</p>
    </div>

    <button
      class="w mb2"
      @click="registerPasskey"
    >
      {{ $t('registerPasskey') }}
    </button>
    <button
      class="w fg fg-border"
      @click="toggleTOTP"
    >
      {{ $t('setupTotp') }}
    </button>
  </template>

  <template v-else>
    <h1>{{ $t('authentication') }}</h1>
    <section>
      <div class="flex-row flex-center g2">
        <h3 class="m0">{{ $t('password') }}</h3>
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
        <div
          class="p3"
          style="max-width: min(400px, 90vw)"
        >
          <form @submit.prevent="setPassword">
            <input
              v-show="false"
              type="email"
              :value="user?.email"
              autocomplete="username email"
            />
            <label for="password1">{{ $t('password') }} ({{ $t('passwordPolicy') }})</label>
            <div class="flex-row group">
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
            <div class="flex-row group">
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
    </section>

    <section>
      <h2>{{ $t('2fa') }}</h2>
      <div class="flex-row flex-center g2">
        <h3 class="m0">Passkeys</h3>
        <button
          class="flex mr"
          :disabled="auth?.credentials.length >= 4"
          :title="auth?.credentials.length >= 4 ? $t('passkeyLimit') : $t('registerPasskey')"
          @click="registerPasskey"
        >
          <Icon name="uil:plus" />
        </button>
      </div>
      <form
        v-for="credential in auth?.credentials || []"
        :key="credential.id"
        @submit.prevent="setPasskeyName(credential.name, credential.id)"
      >
        <div class="flex-row group mt1">
          <input
            type="text"
            v-model="credential.name"
            maxlength="32"
          />
          <button
            type="button"
            class="bg danger-text flex"
            :disabled="!canRemovePasskey"
            :title="canRemovePasskey ? '' : $t('lastFactor')"
            @click="deletePasskey(credential.id)"
          >
            <Icon name="uil:trash" />
          </button>
          <button class="flex fg"><Icon name="uil:save" /></button>
        </div>
      </form>

      <div class="flex-row flex-center g2 mt2">
        <h3 class="m0">
          <label for="totp">{{ $t('authenticatorApp') }}</label>
        </h3>
        <input
          type="checkbox"
          id="totp"
          class="mr"
          :checked="!!auth?.hasTOTP"
          @click.prevent="toggleTOTP"
        />
      </div>
    </section>
    <div class="flex-row my3">
      <button
        class="ml bg danger-text danger-border"
        @click="deleteRefreshTokens"
      >
        {{ $t('deleteRefreshTokens') }}
      </button>
    </div>
  </template>

  <div
    v-if="showTOTP"
    class="modal"
    @click.self="showTOTP = false"
  >
    <div
      v-if="auth?.hasTOTP"
      class="p3"
      style="max-width: min(400px, 90vw)"
    >
      <label for="totp-code">
        {{ $t('code') }}
      </label>
      <div class="flex-row group">
        <input
          id="totp-code"
          type="text"
          v-model.trim="TOTPCode"
        />
        <button
          class="bg danger-text"
          :disabled="!canDisableTOTP"
          :title="canDisableTOTP ? '' : $t('lastFactor')"
          @click="disableTOTP"
        >
          {{ $t('disable') }}
        </button>
      </div>
    </div>
    <div
      v-else-if="TOTPSecret"
      class="p3"
      style="max-width: min(400px, 90vw)"
    >
      <p class="mt0">{{ $t('totpSecret') }}</p>
      <div class="text-center">
        <canvas
          id="totp-qrcode"
          class="border-radius"
        ></canvas>
        <p
          class="muted-text"
          style="word-break: break-all"
        >
          {{ TOTPSecret }}
        </p>
      </div>
      <label for="totp-code">{{ $t('code') }}</label>
      <div class="flex-row group">
        <input
          id="totp-code"
          type="text"
          v-model.trim="TOTPCode"
          autocomplete="one-time-code"
          @keyup="confirmTOTP"
        />
      </div>
    </div>
  </div>
</template>
