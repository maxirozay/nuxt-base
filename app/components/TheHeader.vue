<script setup lang="ts">
const { loggedIn, clear: clearSession } = useUserSession()

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
    <I18nLink :to="{ name: 'index' }">{{ config.public.name }}</I18nLink>
    <input
      id="nav-toggle"
      type="checkbox"
    />
    <div class="content ml">
      <template v-if="loggedIn">
        <I18nLink :to="{ name: 'user-settings' }">{{ $t('settings') }}</I18nLink>
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
