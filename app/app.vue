<script script setup lang="ts">
const config = useRuntimeConfig()
const { $t } = useI18n()
useSeoMeta({
  title: config.public.name,
  ogTitle: config.public.name,
  description: $t('description') as string,
  ogDescription: $t('description') as string,
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <TheLoading />
  <TheNotifications />
</template>
