import { defineStore } from 'pinia';
import type { Game } from '../models/uno'; // Adjust path as needed
import { createGame } from '../utils/test_adapter.ts'; // Adjust path as needed
import type { Hand } from '../models/hand'; // Adjust path as needed
import { reactive } from 'vue';

export const useGameStore = defineStore('game', {
    state: () => ({
        game: undefined as Game | undefined,
        currentHand: undefined as Hand | undefined,
    }),

    actions: {
        // Initialize a new game
        initializeGame(players: string[], targetScore: number, dealer: number) {
            console.log('Initializing game with:', { players, targetScore, dealer });
            this.game = createGame({players: players, targetScore: targetScore, cardsPerPlayer: 2, dealer: dealer});
            console.log('Game initialized:', this.game);
            this.currentHand = reactive((this.game.currentHand() as Hand));
            console.log('Current hand:', this.currentHand);
        },


        // Start a new hand
        startNewHand() {
            if (this.game) {
                this.game.startNewHand();
                this.currentHand = reactive(this.game.currentHand() as Hand);

                // Trigger bot play if the first turn belongs to a bot
                const currentTurn = this.getPlayerInTurn();
                if (currentTurn !== null && currentTurn !== 0) {
                    this.botPlay(currentTurn);
                }
            }
        },

        getPlayerScore(playerIndex: number): number {
            if (this.game) {
                return this.game.scores[playerIndex] || 0;
            }
            return 0;
        },

        // Update scores after a hand ends
        updateScores() {
            if (this.game) {
                this.game.updateScores();
            }
        },

        // Perform a player's action: Play a card
        playCard(playerIndex: number, cardIndex: number, color?: string) {
            if (this.currentHand && this.currentHand.playerInTurn() === playerIndex) {
                if (color) {
                    this.currentHand.play(cardIndex, color);
                } else {
                    this.currentHand.play(cardIndex);
                }

                console.log("THIS ROUND HAS ENDED:" + this.currentHand.hasEnded())

                // Trigger reactivity for discard pile and player hands
                this.$patch((state) => {
                    state.currentHand = { ...(state.currentHand as Hand) }; // Shallow clone to trigger reactivity
                });
            }
        },


        // Perform a player's action: Draw a card
        drawCard(playerIndex: number) {
            console.log("This is the currentHand:" + this.currentHand?.playerHand(playerIndex).length + "this is the drawpile: " + this.currentHand?.drawPile)
            if (this.currentHand && this.currentHand.playerInTurn() === playerIndex) {
                console.log("here we go, we are drawing")
                this.currentHand.draw();
                console.log("And now the player hand is: " + this.currentHand?.playerHand(playerIndex).length)
            }
        },

        checkRoundEnd() {
            if (this.currentHand?.hasEnded()) {
                const winnerIndex = this.currentHand.winner();
                const handScore = this.currentHand.score();

                // Update scores
                if (winnerIndex !== undefined && handScore !== undefined) {
                    this.game?.updateScores();
                    console.log("This is the updated scores:" + this.game?.scores)
                    return winnerIndex;
                }
            }
            return undefined;
        },


        // Check if the game has ended
        checkGameEnd() {
            if (this.game) {
                return this.game.winner();
            }
            return undefined;
        },

        // Allow a player to declare "UNO"
        declareUno(playerIndex: number) {
            if (this.currentHand) {
                console.log("UNO")
                this.currentHand.sayUno(playerIndex);
            }
        },

        // Handle catching a failure to declare "UNO"
        catchUnoFailure(accuser: number, accused: number) {
            if (this.currentHand) {
                return this.currentHand.catchUnoFailure({ accuser, accused });
            }
            return false;
        },

        // Get the current player's hand
        getPlayerHand(playerIndex: number) {
            if (this.currentHand) {
                return this.currentHand.playerHand(playerIndex);
            }
            return [];
        },

        // Get the last action of a player
        getLastAction(playerIndex: number) {
            if (this.currentHand) {
                return this.currentHand.lastAction(playerIndex);
            }
            return null;
        },

        // Retrieve the current player's turn
        getPlayerInTurn() {
            if (this.currentHand) {
                console.log('Current player in turn:', this.currentHand.playerInTurn());
                return this.currentHand.playerInTurn();
            }
            return null;
        },


        botPlay(botIndex: number) {
            if (!this.currentHand || this.currentHand.playerInTurn() !== botIndex) {
                return; // Not the bot's turn
            }

            const botHand = this.getPlayerHand(botIndex);

            // Check if the bot can play any card
            if (this.currentHand.canPlayAny()) {
                for (let i = 0; i < botHand.length; i++) {
                    if (this.currentHand.canPlay(i)) {
                        const card = botHand[i];

                        // Handle Wild or Wild Draw card
                        if (card.type === 'WILD' || card.type === 'WILD DRAW') {
                            const colors = ['RED', 'GREEN', 'BLUE', 'YELLOW'];
                            const randomColor = colors[Math.floor(Math.random() * colors.length)];
                            this.currentHand.play(i, randomColor); // Specify the selected color
                            console.log(`BOT ${botIndex} PLAYed: ${card.type} with color ${randomColor}`);
                        } else {
                            this.currentHand.play(i); // Regular card play
                            console.log(`BOT ${botIndex} PLAYed: ` + card.type + " " + card.color + " " + card.number);
                        }

                        // Trigger reactivity for discard pile and player hands
                        this.$patch((state) => {
                            state.currentHand = { ...(state.currentHand as Hand) }; // Shallow clone for reactivity
                        });

                        console.log("THIS ROUND HAS ENDED:" + this.currentHand.gameEnded);

                        // Check if the round has ended
                        const winnerIndex = this.checkRoundEnd();
                        if (winnerIndex !== undefined) {
                            return; // Stop processing further actions if the round has ended
                        }

                        return; // Exit after playing a card
                    }
                }
            } else {
                // Draw a card if no playable card is available
                this.currentHand.draw();
                console.log(`BOT ${botIndex} DREW a card`);
            }

            // Trigger reactivity for discard pile and player hands
            this.$patch((state) => {
                state.currentHand = { ...(state.currentHand as Hand) }; // Shallow clone for reactivity
            });

            // Check if the round has ended after drawing
            const winnerIndex = this.checkRoundEnd();
            if (winnerIndex !== undefined) {
                return; // Stop further actions if the round has ended
            }
        }

    },
});
