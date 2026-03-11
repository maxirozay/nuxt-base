<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

if (import.meta.client) {
  $fetch('/api/log', {
    method: 'POST',
    body: {
      summary: props.error.message,
      data: props.error,
      origin: useRoute().fullPath,
      type: 'error',
    },
  })
}
</script>

<template>
  <div class="text-center">
    <h1>Error {{ error.status }}</h1>
    <p>{{ error.message }}</p>
    <NuxtLink to="/">Go back home</NuxtLink>
  </div>
</template>
