<template>
  <div class="page flex-column">
    <TheHeader />
    <div class="flex-auto portrait px2 w">
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
