import { ranks, suits } from "./Card.js";
class Deck {
    cards;
    constructor() {
        this.cards = this.buildCards();
    }
    buildCards() {
        const deck = [];
        for (const suit of suits) {
            for (const rank of ranks) {
                deck.push({ suit, rank, faceUp: false });
            }
        }
        return deck;
    }
    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }
    draw() {
        return this.cards.pop();
    }
    get size() {
        return this.cards.length;
    }
}
//# sourceMappingURL=Deck.js.map