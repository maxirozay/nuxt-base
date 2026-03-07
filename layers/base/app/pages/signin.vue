<script setup lang="ts">
const { $t } = useI18n()
useSeoMeta({
  title: $t('authCheck.signin') as string,
  ogTitle: $t('authCheck.signin') as string,
  description: $t('authCheck.signin') as string,
  ogDescription: $t('authCheck.signin') as string,
})

definePageMeta({
  layout: 'simple',
})
</script>

<template>
  <AuthCheck @authenticated="navigateTo('/', { replace: true })">
    <h1 class="text-center">{{ $t('authCheck.signin') }}</h1>
  </AuthCheck>
  <LocaleSwitcher
    class="absolute top right m1"
    style="z-index: 99999"
  />
</template>
