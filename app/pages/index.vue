<script setup lang="ts">
definePageMeta({
  middleware: ['authenticated'],
})

const { user, clear: clearSession } = useUserSession()

async function signout () {
  await clearSession()
  await navigateTo('/signin')
}
</script>

<template>
  <h1>Welcome {{ user?.email }}</h1>
  <button @click="signout">Sign Out</button>
</template>
