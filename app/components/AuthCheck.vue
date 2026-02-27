<script setup lang="ts">
const emits = defineEmits(['authenticated', 'cancel'])
const appStore = useAppStore()
const session = useUserSession()
const email = ref('')
const password = ref('')
const loading = ref(false)
const otpRequested = ref(false)
const totp = ref('')
const route = useRoute()
const optionsFetched = ref(false)
const options = ref({
  hasOTP: false,
  hasPassword: false,
  hasTOTP: false,
  hasPasskey: false,
})

async function refreshSession() {
  await session.fetch()
  emits('authenticated')
}

async function requestOtp() {
  if (!email.value) return
  appStore.setLoading(true)
  try {
    await $fetch('/api/auth/otp/get', {
      method: 'POST',
      body: { email: email.value },
    })
    otpRequested.value = true
  } catch (e: any) {
    handleError(e)
  } finally {
    appStore.setLoading(false)
  }
}

async function signInWithOtp() {
  appStore.setLoading(true)
  try {
    await $fetch('/api/auth/otp/verify', {
      method: 'POST',
      body: { email: email.value, otp: password.value },
    })
    await refreshSession()
  } catch (e: any) {
    handleError(e)
  } finally {
    appStore.setLoading(false)
  }
}

async function signInWithTOTP() {
  if (!email.value || !totp.value || !password.value) return
  appStore.setLoading(true)
  try {
    const body: {
      email: string
      token: string
      otp?: string
      password?: string
    } = { email: email.value, token: totp.value }
    if (password.value.length === 6) body.otp = password.value
    else body.password = password.value
    await $fetch('/api/auth/totp/verify', {
      method: 'POST',
      body,
    })
    await refreshSession()
  } catch (e: any) {
    handleError(e)
  } finally {
    appStore.setLoading(false)
  }
}

async function signInWithPassword() {
  if (!email.value || !password.value) return
  appStore.setLoading(true)
  try {
    await $fetch('/api/auth/password', {
      method: 'POST',
      body: { email: email.value, password: password.value },
    })
    await refreshSession()
  } catch (e: any) {
    handleError(e)
  } finally {
    appStore.setLoading(false)
  }
}

function handleError(error: any) {
  appStore.notify(error.data?.message || 'Bad credentials', 'error')
}

function signIn() {
  if (!email.value) return
  setTimeout(() => {
    if (totp.value) signInWithTOTP()
    else if (!password.value) requestOtp()
    else if (password.value.length === 6) signInWithOtp()
    else signInWithPassword()
  }, 100) // wait for paste event to complete
}

const { authenticate } = useWebAuthn({
  registerEndpoint: '/api/auth/webauthn/register',
  authenticateEndpoint: '/api/auth/webauthn/authenticate',
})

async function signInWithPasskey() {
  try {
    await authenticate(email.value)
    await refreshSession()
  } catch (e: any) {
    handleError(e)
  }
}

async function getSignInOptions(email: string) {
  appStore.setLoading(true)
  try {
    options.value = await $fetch<typeof options.value>('/api/auth/options', {
      method: 'POST',
      body: { email },
    })
    optionsFetched.value = true
    if (!options.value.hasPassword && !options.value.hasPasskey) {
      requestOtp()
    }
  } catch (e: any) {
    handleError(e)
  } finally {
    appStore.setLoading(false)
  }
}

onMounted(() => {
  if (session.user.value) {
    email.value = session.user.value.email
    getSignInOptions(email.value)
  } else if (route.query.email && route.query.token) {
    email.value = route.query.email as string
    password.value = route.query.token as string
    signInWithOtp()
  }
})
</script>

<template>
  <div
    class="modal"
    @click.self="emits('cancel')"
  >
    <div class="signin p3 mx">
      <slot></slot>
      <form
        v-if="optionsFetched"
        @submit.prevent="signIn"
      >
        <input
          v-show="false"
          type="email"
          :value="email"
          autocomplete="username email"
        />
        <label for="password">{{
          options.hasPassword && !otpRequested ? $t('authCheck.password') : $t('authCheck.code')
        }}</label>
        <input
          id="password"
          v-model.trim="password"
          type="password"
          :disabled="loading"
          autocomplete="current-password"
          pattern=".{12,}|[0-9]{6}"
          @paste="signIn"
        />
        <div v-if="options.hasTOTP">
          <label for="totp">{{ $t('authCheck.authenticatorCode') }}</label>
          <input
            id="totp"
            v-model.trim="totp"
            type="text"
            :disabled="loading"
            autocomplete="one-time-code"
            @paste="signInWithTOTP"
            @change="signInWithTOTP"
          />
        </div>
        <div class="flex-row g2 mt1">
          <button
            type="submit"
            :disabled="loading"
            class="flex-1"
          >
            {{ password ? $t('authCheck.signin') : $t('authCheck.getCode') }}
          </button>
          <button
            v-if="options.hasPasskey"
            type="button"
            class="flex-1"
            :disabled="loading"
            @click="signInWithPasskey"
          >
            Passkey
          </button>
        </div>
        <p v-if="otpRequested">{{ $t('authCheck.otpSent', { email }) }}</p>
      </form>
      <form
        v-else
        @submit.prevent="getSignInOptions(email)"
      >
        <label for="email">{{ $t('email') }}</label>
        <input
          id="email"
          v-model.trim="email"
          type="email"
          required
          :disabled="loading"
          autocomplete="username"
        />
        <button class="w">{{ $t('next') }}</button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.signin {
  max-width: 400px;
}
</style>
