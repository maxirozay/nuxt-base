<template>
  <div class="page flex-column">
    <TheHeader />
    <div class="portrait px2">
      <slot />
    </div>
    <TheFooter />
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
}
</style>
