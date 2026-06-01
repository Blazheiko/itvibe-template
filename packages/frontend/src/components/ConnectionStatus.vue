<script setup lang="ts">
const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['retry'])

const handleRetry = () => {
  emit('retry')
}
</script>

<template>
  <div class="connection-status" v-if="props.show">
    <span>No internet connection</span>
    <button class="retry-button" @click="handleRetry">Retry</button>
  </div>
</template>

<style scoped>
.connection-status {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  background-color: #ff3b30;
  color: white;
  padding: 10px 20px;
  z-index: 1001;
  display: flex;
  justify-content: space-between;
  align-items: center;
  animation: slideDown 0.3s ease;
}

.retry-button {
  background-color: white;
  color: #ff3b30;
  border: none;
  border-radius: 4px;
  padding: 5px 15px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s ease;
}

.retry-button:hover {
  background-color: #f0f0f0;
}

.retry-button:active {
  transform: scale(0.95);
}

@keyframes slideDown {
  from {
    transform: translateY(-100%);
  }
  to {
    transform: translateY(0);
  }
}
</style>
