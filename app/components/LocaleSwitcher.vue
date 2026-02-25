<script setup>
import { useI18n } from '#imports'

const { $getLocales, $switchLocale, getLocale } = useI18n()
</script>

<template>
  <select
    v-if="$getLocales().length > 1"
    class="locales bg bg-border"
    @change="$switchLocale($event.target.value)"
  >
    <option
      v-for="locale in $getLocales()"
      :key="locale.code"
      :value="locale.code"
      :selected="locale.code === getLocale()"
    >
      {{ locale.code.toUpperCase() }}
    </option>
  </select>
</template>

<style scoped>
.locales {
  width: 4em;
}
</style>
