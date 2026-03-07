<template>
  <div class="page flex-column">
    <TheHeader />
    <div>
      <div class="portrait px2 mt3">
        <slot />
      </div>
    </div>
    <TheFooter />
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
}
</style>
