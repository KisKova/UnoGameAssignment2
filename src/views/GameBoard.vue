<template>
  <div class="game-board">
    <h1>UNO Game</h1>
    <div class="game-status">
      <p>Current Turn: {{ currentTurnPlayer }}</p>
    </div>

    <div v-if="unoMessage" class="uno-message">
      {{ unoMessage }}
    </div>

    <div v-if="roundWinnerMessage" class="round-winner-message">
      {{ roundWinnerMessage }}
    </div>

    <!-- Scoreboard -->
    <div class="scoreboard">
      <h2>Scoreboard</h2>
      <table>
        <thead>
        <tr>
          <th>Player</th>
          <th>Score</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="(player, index) in gameStore.game?.players" :key="index">
          <td>{{ player }}</td>
          <td>{{ playerScores[index] || 0 }}</td>
        </tr>
        </tbody>
      </table>
    </div>

    <!-- Board: Discard and Draw Piles -->
    <div class="board">
      <div class="pile discard">
        <h2>Discard Pile</h2>
        <div class="card">{{ discardPileTop }}</div>
      </div>
      <div class="pile draw">
        <h2>Draw Pile</h2>
        <div class="card">🂠</div>
      </div>
    </div>

    <!-- Player Hands -->
    <div class="player-hands">
      <div
          v-for="(hand, index) in playerHands"
          :key="index"
          :class="{ 'my-hand': index === myIndex, 'bot-hand': index !== myIndex }"
          class="hand"
      >
        <h3>{{ playerName(index as number) }}</h3>
        <div class="cards">
          <!-- Show cards for the current player; hide for bots -->
          <div
              v-for="(card, cardIndex) in hand"
              :key="cardIndex"
              class="card"
              :class="{ 'disabled-card': !canPlayCard(index, cardIndex) }"
              @click="playCard(index, cardIndex)"
              v-if="index === myIndex"
              :disabled="!canPlayCard(index, cardIndex)"
          >
            {{ card }}
          </div>
          <div
              v-else
              class="hidden-card"
              v-for="(_, cardIndex) in hand.length"
              :key="`hidden-${cardIndex}`"
          >
            🂠 Uno Card
          </div>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="actions">
      <button @click="drawCard" :disabled="!isMyTurn">Draw Card</button>
      <button @click="declareUno" :disabled="!isMyTurn">Call UNO</button>
      <button @click="openAccuseModal">Accuse a Player</button>
    </div>

    <div v-if="showAccuseModal" class="modal-overlay">
      <div class="modal">
        <h2>Accuse a Player of Failing to Declare UNO</h2>
        <div class="player-options">
          <button
              v-for="(player, index) in gameStore.game?.players"
              :key="index"
              :disabled="index === myIndex"
              @click="accusePlayer(index)"
          >
            {{ player }}
          </button>
        </div>
        <button class="cancel-button" @click="cancelAccusation">Cancel</button>
      </div>
    </div>


    <!-- Color Selection Modal -->
    <div v-if="showColorModal" class="modal-overlay">
      <div class="modal">
        <h2>Select a Color</h2>
        <div class="color-options">
          <button
              v-for="color in ['RED', 'GREEN', 'BLUE', 'YELLOW']"
              :key="color"
              @click="selectColor(color)"
          >
            {{ color }}
          </button>
        </div>
        <button class="cancel-button" @click="cancelColorSelection">Cancel</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useGameStore } from '../store/gameStore';
import type { Game } from "../models/uno.ts";

// Store Reference
const gameStore = useGameStore();

const unoMessage = ref<string | null>(null);
const roundWinnerMessage = ref<string | null>(null);

const showAccuseModal = ref(false);
//const selectedAccusedIndex = ref<number | null>(null);

// Reactive state for color selection
const showColorModal = ref(false);
const selectedCardIndex = ref<number | null>(null);
const selectedPlayerIndex = ref<number | null>(null);

// Computed Properties
const currentTurnPlayer = computed(() => {
  const turn = gameStore.getPlayerInTurn();
  return turn !== null ? gameStore.game?.players[turn] : 'Unknown';
});

const playerHands = computed(() => {
  return gameStore.currentHand
      ? gameStore.game?.players.map((_, index) => gameStore.getPlayerHand(index)) || []
      : [];
});

const discardPileTop = computed(() => {
  return gameStore.currentHand?.discardPile.cards[gameStore.currentHand?.discardPile.cards.length - 1] || 'Empty';
});

const myIndex = 0; // Assume the first player is the user
const isMyTurn = computed(() => gameStore.getPlayerInTurn() === myIndex);

const playerName = (index: number) => gameStore.game?.player(index) || 'Unknown';

const canPlayCard = (playerIndex: number, cardIndex: number): boolean => {
  const hand = gameStore.getPlayerHand(playerIndex);
  const card = hand[cardIndex];

  if (!card || card.type == undefined) {
    console.warn(`No card found at index ${cardIndex} for player ${playerIndex}`);
    return false;
  }

  return gameStore.currentHand?.canPlay(cardIndex) ?? false;
};


// Actions
const playCard = (playerIndex: number, cardIndex: number) => {
  const selectedCard = gameStore.getPlayerHand(playerIndex)[cardIndex];

  if (playerIndex === myIndex && isMyTurn.value) {
    // Handle Wild and Wild Draw cards
    if (selectedCard.type === 'WILD' || selectedCard.type === 'WILD DRAW') {
      selectedCardIndex.value = cardIndex;
      selectedPlayerIndex.value = playerIndex;
      showColorModal.value = true;
      return;
    }

    // Regular card play
    gameStore.playCard(playerIndex, cardIndex);

    // Check if the round has ended
    const winnerIndex = gameStore.checkRoundEnd();
    if (winnerIndex !== undefined) {
      const winnerName = gameStore.game?.players[winnerIndex];
      roundWinnerMessage.value = `${winnerName} wins this round!`;

      setTimeout(() => {
        roundWinnerMessage.value = null; // Clear the message
        gameStore.startNewHand(); // Start a new round
      }, 3000);

      return; // Stop further turn processing
    }

    // Trigger reactivity
    gameStore.$patch((state) => {
      state.game = { ...(state.game as Game) }; // Shallow clone for reactivity
    });

    nextTurn();
  }
};


const drawCard = () => {
  if (isMyTurn.value) {
    console.log("Drawing a card for player index:", myIndex);
    gameStore.drawCard(myIndex);

    // Check if the round has ended
    const winnerIndex = gameStore.checkRoundEnd();
    if (winnerIndex !== undefined) {
      const winnerName = gameStore.game?.players[winnerIndex];
      roundWinnerMessage.value = `${winnerName} wins this round!`;

      setTimeout(() => {
        roundWinnerMessage.value = null; // Clear the message
        gameStore.startNewHand(); // Start a new round
      }, 3000);

      return; // Stop further turn processing
    }

    // Trigger reactivity
    gameStore.$patch((state) => {
      state.game = { ...(state.game as Game) }; // Shallow clone for reactivity
    });

    nextTurn();
  }
};


const declareUno = () => {
  if (isMyTurn.value) {
    gameStore.declareUno(myIndex);

    // Show UNO message
    unoMessage.value = "You declared UNO!";
    setTimeout(() => {
      unoMessage.value = null; // Clear the message after 2 seconds
    }, 2000);
  }
};


const selectColor = (color: string) => {
  if (selectedCardIndex.value !== null && selectedPlayerIndex.value !== null) {
    console.log(`Playing Wild card with color ${color}`);
    gameStore.playCard(selectedPlayerIndex.value, selectedCardIndex.value, color);

    // Reset modal state
    selectedCardIndex.value = null;
    selectedPlayerIndex.value = null;
    showColorModal.value = false;

    // Trigger reactivity
    gameStore.$patch((state) => {
      state.game = { ...(state.game as Game) }; // Shallow clone for reactivity
    });

    nextTurn();
  }
};

const cancelColorSelection = () => {
  // Reset modal state
  selectedCardIndex.value = null;
  selectedPlayerIndex.value = null;
  showColorModal.value = false;
  console.log('Color selection canceled');
};

const openAccuseModal = () => {
  showAccuseModal.value = true;
};

const accusePlayer = (accusedIndex: number) => {
  const accusationResult = gameStore.catchUnoFailure(myIndex, accusedIndex);

  if (accusationResult) {
    unoMessage.value = `You successfully accused ${gameStore.game?.players[accusedIndex]}!`;
  } else {
    unoMessage.value = `Your accusation against ${gameStore.game?.players[accusedIndex]} failed.`;
  }

  // Close the modal and show message
  showAccuseModal.value = false;
  setTimeout(() => {
    unoMessage.value = null; // Clear the message after 2 seconds
  }, 2000);
};

const cancelAccusation = () => {
  showAccuseModal.value = false;
  console.log('Accusation canceled');
};

const playerScores = computed(() => {
  return gameStore.game?.players.map((_, index) => gameStore.getPlayerScore(index)) || [];
});

const nextTurn = () => {
  const currentPlayer = gameStore.getPlayerInTurn();

  // Check if the round has ended
  const winnerIndex = gameStore.checkRoundEnd();
  if (winnerIndex !== undefined) {
    const winnerName = gameStore.game?.players[winnerIndex];
    roundWinnerMessage.value = `${winnerName} wins this round!`;

    setTimeout(() => {
      roundWinnerMessage.value = null; // Clear the message
      gameStore.startNewHand(); // Start a new round
    }, 3000);

    return; // Stop further turn processing
  }

  if (currentPlayer === myIndex) {
    console.log("It's the player's turn");
  } else {
    console.log("It's a bot's turn");
    playBots();
  }
};



const playBots = () => {
  const processBotTurn = () => {
    const currentPlayerIndex = gameStore.getPlayerInTurn();
    if (currentPlayerIndex === null) throw new Error("currentPlayerIndex is null!");

    // Stop if it's the player's turn
    if (currentPlayerIndex === myIndex) {
      console.log("Back to player's turn");
      return;
    }

    console.log(`Processing Bot ${currentPlayerIndex}'s turn`);

    setTimeout(() => {
      gameStore.botPlay(currentPlayerIndex);

      // Check if the round has ended after the bot's action
      const winnerIndex = gameStore.checkRoundEnd();
      if (winnerIndex !== undefined) {
        const winnerName = gameStore.game?.players[winnerIndex];
        roundWinnerMessage.value = `${winnerName} wins this round!`;

        setTimeout(() => {
          roundWinnerMessage.value = null; // Clear the message
          gameStore.startNewHand(); // Start a new round

          // Trigger playBots if the new hand starts with a bot
          if (!isMyTurn.value) {
            playBots();
          }
        }, 3000);

        return; // Stop further bot processing
      }

      processBotTurn(); // Continue with the next bot's turn
    }, 2000);
  };

  if (gameStore.getPlayerInTurn() !== myIndex) {
    processBotTurn();
  }
};



onMounted(() => {
  console.log('GameBoard mounted');

  // Trigger playBots if it's a bot's turn
  if (!isMyTurn.value) {
    playBots();
  }

  // Ensure the round starts correctly if a new hand begins with a bot
  const winnerIndex = gameStore.checkRoundEnd();
  if (winnerIndex !== undefined) {
    const winnerName = gameStore.game?.players[winnerIndex];
    roundWinnerMessage.value = `${winnerName} wins this round!`;

    setTimeout(() => {
      roundWinnerMessage.value = null; // Clear the message
      gameStore.startNewHand(); // Start a new round

      // Trigger playBots if the new hand starts with a bot
      if (!isMyTurn.value) {
        playBots();
      }
    }, 3000);
  }
});

</script>

<style scoped>
.round-winner-message {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: lightblue;
  color: black;
  padding: 20px;
  border: 2px solid darkblue;
  border-radius: 10px;
  font-weight: bold;
  font-size: 20px;
  text-align: center;
  z-index: 1000;
}

.disabled-card {
  opacity: 0.5;
  pointer-events: none;
  cursor: not-allowed;
}

.uno-message {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: yellow;
  color: black;
  padding: 10px 20px;
  border: 2px solid black;
  border-radius: 5px;
  font-weight: bold;
  font-size: 18px;
  text-align: center;
  z-index: 1000;
}

.game-board {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal {
  background-color: white;
  padding: 20px;
  border-radius: 10px;
  text-align: center;
}

.color-options {
  display: flex;
  gap: 10px;
  justify-content: center;
}

button {
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  cursor: pointer;
}

button:hover {
  background-color: #ddd;
}

.cancel-button {
  margin-top: 20px;
  background-color: red;
  color: white;
}

.cancel-button:hover {
  background-color: darkred;
}

.player-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.player-options button {
  padding: 10px 15px;
  font-size: 16px;
  cursor: pointer;
}

.player-options button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.scoreboard {
  margin-top: 20px;
  text-align: center;
}

.scoreboard table {
  margin: 0 auto;
  border-collapse: collapse;
  width: 50%;
}

.scoreboard th,
.scoreboard td {
  border: 1px solid #ccc;
  padding: 10px;
  text-align: center;
}

.scoreboard th {
  background-color: #f4f4f4;
  font-weight: bold;
}

.board {
  display: flex;
  gap: 2rem;
}

.pile {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.card {
  width: 50px;
  height: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #000;
  border-radius: 5px;
  background-color: #fff;
  font-weight: bold;
}

.hidden-card {
  width: 50px;
  height: 70px;
  background-color: #000;
  border-radius: 5px;
}

.player-hands {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 2rem;
}

.hand {
  border: 1px solid #ccc;
  padding: 1rem;
  border-radius: 5px;
  text-align: center;
}

.my-hand {
  background-color: #f0f8ff;
}

.bot-hand {
  background-color: #f8f8f8;
}

.actions {
  display: flex;
  gap: 1rem;
}

button {
  padding: 0.5rem 1rem;
  font-size: 1rem;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
</style>
