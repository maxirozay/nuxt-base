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
const config = useRuntimeConfig()
const route = useRoute()
</script>

<template>
  <AuthCheck @authenticated="navigateTo((route.query.goto as string) || '/', { replace: true })">
    <template #header>
      <h1 class="text-center">{{ $t('authCheck.signin') }}</h1>
    </template>
    <template #footer>
      <div
        v-if="config.public.oauth.microsoft"
        class="flex-column mt1"
      >
        <a
          href="/auth/microsoft"
          class="flex-center g2 p-input text-center bg"
        >
          <Icon name="uil:microsoft" />
          <b>Continue with Microsoft</b>
        </a>
      </div>
    </template>
  </AuthCheck>
  <LocaleSwitcher
    class="absolute top right m1 bg bg-border"
    style="z-index: 99999"
  />
</template>
