<script setup lang="ts">
import { useAppStore } from '@/stores/app'
import { ref } from 'vue'

const app = useAppStore()
const isWorking = ref()

async function confirm() {
  if (isWorking.value) return
  isWorking.value = true
  app.confirmation!.resolve()
  isWorking.value = false
}

function cancel() {
  app.confirmation!.reject()
}
</script>

<template>
  <Transition name="fade">
    <div
      v-if="app.confirmation"
      class="modal"
    >
      <div
        class="p2"
        style="max-width: 600px"
      >
        {{ app.confirmation.message || $t('areYouSure') }}
        <div class="flex-row g2 mt1">
          <button
            :class="['flex-1', isWorking ? 'spin' : '']"
            @click="confirm"
          >
            {{ $t('confirm') }}
          </button>
          <button
            class="flex-1"
            :disabled="isWorking"
            @click="cancel"
          >
            {{ $t('cancel') }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
