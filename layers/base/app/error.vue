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
  <NuxtLayout>
    <div class="text-center flex-center flex-column h">
      <h1 class="mt0">{{ error.message }}</h1>
      <NuxtLink to="/">Go back home</NuxtLink>
    </div>
  </NuxtLayout>
</template>
