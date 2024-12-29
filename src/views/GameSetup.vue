<template>
  <div>
    <h1>UNO Game Setup</h1>
    <form @submit.prevent="startGame">
      <input v-model="playerName" placeholder="Your Name" />
      <select v-model="botCount">
        <option value="1">1 Bot</option>
        <option value="2">2 Bots</option>
        <option value="3">3 Bots</option>
      </select>
      <button :disabled="!playerName">Start Game</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useGameStore } from '../store/gameStore';
import { useRouter } from 'vue-router';
const router = useRouter();

console.log('GameSetup component initialized'); // Add this line

const gameStore = useGameStore();
const playerName = ref('');
const botCount = ref(1);

const startGame = () => {
  const botNames = Array.from({ length: botCount.value }, (_, i) => `Bot ${i + 1}`);
  const players = [playerName.value, ...botNames];
  const dealer = Math.floor(Math.random() * players.length);
  const targetScore = 500;

  gameStore.initializeGame(players, targetScore, dealer);
  //window.location.href = '/game';
  router.push('/game'); // Use router.push
};
</script>
