<script setup lang="ts">
const { user, fetch: refreshSession } = useUserSession()
const email = ref('')
const password = ref('')
const loading = ref(false)
const otpRequested = ref(false)
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
      body: { email: email.value }
    })
    otpRequested.value = true
  } catch (e: any) {
    alert(e.data?.statusMessage || 'Failed to request OTP')
  } finally {
    loading.value = false
  }
}

async function verifyOtp() {
  loading.value = true
  try {
    await $fetch('/api/auth/otp/verify', {
      method: 'POST',
      body: { email: email.value, otp: password.value }
    })
    await refreshSession()
    navigateTo('/', { replace: true })
  } catch (e: any) {
    alert(e.data?.statusMessage || 'Invalid OTP')
  } finally {
    loading.value = false
  }
}

async function signInWithPassword() {
  if (!email.value || !password.value) return
  loading.value = true
  try {
    await $fetch('/api/auth/signin', {
      method: 'POST',
      body: { email: email.value, password: password.value }
    })
    await refreshSession()
    navigateTo('/', { replace: true })
  } catch (e: any) {
    alert('Bad credentials')
  } finally {
    loading.value = false
  }
}

function signin() {
  if (!email.value) return
  setTimeout(() => {
    if (!password.value) requestOtp()
    else if (password.value.length === 6) verifyOtp()
    else signInWithPassword()
  }, 100) // wait for paste event to complete
}

onMounted(() => {
  if (route.query.email && route.query.token) {
    email.value = route.query.email as string
    password.value = route.query.token as string
    verifyOtp()
  }
})
</script>

<template>
  <div>
    <h1>Sign In</h1>
    <form @submit.prevent="signin">
      <label for="email">Email</label>
      <input
        id="email"
        v-model="email"
        type="email"
        required
        :disabled="loading"
        autocomplete="username"
      >
      <br>
      <label for="password">Password or code</label>
      <input
        id="password"
        v-model="password"
        type="password"
        :disabled="loading"
        autocomplete="current-password"
        pattern=".{12,}|[0-9]{6}"
        @paste="signin"
      >
      <p v-if="password && !isPasswordValid"">
        The password must be at least 12 characters long or be the code that you received.
      </p>
      <br>
      <button
        type="submit"
        :disabled="loading"
      >
        {{ loading ? 'Signing in...' : password ? 'Sign In' : 'Request Code' }}
      </button>
      <p v-if="otpRequested">Code sent to {{ email }}</p>
    </form>
  </div>
</template>
