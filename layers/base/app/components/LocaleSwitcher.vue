<script setup>
const { $getLocales, $switchLocale, getLocale } = useI18n()
</script>

<template>
  <select
    v-if="$getLocales().length > 1"
    class="locales"
    :aria-label="$tc('language', 2)"
    :id="$tc('language', 2)"
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
