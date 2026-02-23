<script setup lang="ts">
const { user, fetch: refreshSession } = useUserSession()
const email = ref('')
const password = ref('')
const loading = ref(false)
const otpRequested = ref(false)
const showTOTP = ref(false)
const totp = ref('')
const route = useRoute()

const isPasswordValid = computed(() => {
  return /.{12,}|[0-9]{6}/.test(password.value)
})

async function requestOtp() {
  if (!email.value) return
  loading.value = true
  try {
    await $fetch('/api/auth/otp/get', {
      method: 'POST',
      body: { email: email.value },
    })
    otpRequested.value = true
  } catch (e: any) {
    alert(e.data?.statusMessage || 'Failed to request OTP')
  } finally {
    loading.value = false
  }
}

async function signInWithOtp() {
  loading.value = true
  try {
    await $fetch('/api/auth/otp/verify', {
      method: 'POST',
      body: { email: email.value, otp: password.value },
    })
    await refreshSession()
    navigateTo('/', { replace: true })
  } catch (e: any) {
    handleError(e)
  } finally {
    loading.value = false
  }
}

async function signInWithTOTP() {
  loading.value = true
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
    navigateTo('/', { replace: true })
  } catch (e: any) {
    alert(e.data?.message || 'Invalid code')
  } finally {
    loading.value = false
  }
}

async function signInWithPassword() {
  if (!email.value || !password.value) return
  loading.value = true
  try {
    await $fetch('/api/auth/password', {
      method: 'POST',
      body: { email: email.value, password: password.value },
    })
    await refreshSession()
    navigateTo('/', { replace: true })
  } catch (e: any) {
    handleError(e)
  } finally {
    loading.value = false
  }
}

function handleError(error: any) {
  if (error.data?.message === 'TOTP required') {
    showTOTP.value = true
  } else alert(error.data?.message || 'Bad credentials')
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
    navigateTo('/', { replace: true })
  } catch (e: any) {
    handleError(e)
  }
}

onMounted(() => {
  if (route.query.email && route.query.token) {
    email.value = route.query.email as string
    password.value = route.query.token as string
    signInWithOtp()
  }
})
</script>

<template>
  <div>
    <h1>Sign In</h1>
    <form @submit.prevent="signIn">
      <label for="email">Email</label>
      <input
        id="email"
        v-model.trim="email"
        type="email"
        required
        :disabled="loading"
        autocomplete="username"
      />
      <br />
      <label for="password">Password or code</label>
      <input
        id="password"
        v-model.trim="password"
        type="password"
        :disabled="loading"
        autocomplete="current-password"
        pattern=".{12,}|[0-9]{6}"
        @paste="signIn"
      />
      <div v-if="showTOTP">
        <label for="totp">TOTP</label>
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
      <p v-if="password && !isPasswordValid">
        The password must be at least 12 characters long or be the code that you received.
      </p>
      <br />
      <button
        type="submit"
        :disabled="loading"
      >
        {{ loading ? 'Signing in...' : password ? 'Sign In' : 'Request Code' }}
      </button>
      <p v-if="otpRequested">Code sent to {{ email }}</p>
    </form>
  </div>
  <form @submit.prevent="signInWithPasskey">
    <button type="submit">Sign in with Passkey</button>
  </form>
</template>
