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
  middleware: [
    (to) => {
      const { user } = useUserSession()

      if (user.value?.email) {
        return navigateTo(safePath(to.query.goto), { replace: true })
      }
    },
  ],
})
const config = useRuntimeConfig()
const route = useRoute()
</script>

<template>
  <div class="page" />
  <AuthCheck @authenticated="navigateTo(safePath(route.query.goto), { replace: true })">
    <template #header>
      <h1 class="text-center">{{ $t('authCheck.signin') }}</h1>
    </template>
    <template #footer>
      <div
        v-if="config.public.oauth.microsoft"
        class="flex-column mt2"
      >
        <a
          href="/auth/microsoft"
          class="flex-center p-input text-center bg"
        >
          <b>Continue with Microsoft</b>
        </a>
      </div>
    </template>
  </AuthCheck>
  <LocaleSwitcher
    class="absolute bottom left m1"
    style="z-index: 99999"
  />
</template>

<style scoped>
.page {
  box-shadow: inset 0 0 40vh var(--g-fg);
  height: 100dvh;
}
</style>
