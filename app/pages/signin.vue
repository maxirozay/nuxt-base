<script setup lang="ts">
const { $t } = useI18n()
useSeoMeta({
  title: $t('signin') as string,
  ogTitle: $t('signin') as string,
  description: $t('signin') as string,
  ogDescription: $t('signin') as string,
})
</script>

<template>
  <AuthCheck @authenticated="navigateTo('/', { replace: true })">
    <h1 class="text-center">{{ $t('signin') }}</h1>
  </AuthCheck>
</template>
