<script setup lang="ts">
const { user, clear: clearSession } = useUserSession()

const config = useRuntimeConfig()

async function signout() {
  await clearSession()
  await navigateTo('/signin')
}

watch(
  () => useRoute().path,
  () => {
    const navToggle = document.getElementById('nav-toggle') as HTMLInputElement
    if (navToggle) {
      navToggle.checked = false
    }
  },
)
</script>

<template>
  <nav class="p2 g2 fg">
    <i18n-link :to="{ name: 'index' }">{{ config.public.name }}</i18n-link>
    <input
      id="nav-toggle"
      type="checkbox"
    />
    <div class="content ml">
      <template v-if="user">
        <i18n-link :to="{ name: 'user-settings' }">{{ $t('settings') }}</i18n-link>
        <button @click="signout">
          {{ $t('signout') }}
        </button>
      </template>
    </div>
    <label
      class="toggle ml"
      for="nav-toggle"
    >
      <div></div>
      <div></div>
      <div></div>
    </label>
  </nav>
</template>
