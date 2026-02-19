import type { Card } from "./Card";
import { ranks, suits } from "./Card";

export class Deck {
    private cards: Card[];

    constructor() {
        this.cards = this.buildCards();
    }

    private buildCards(): Card[] {
        const deck: Card[] = [];
        for (const suit of suits) {
            for (const rank of ranks) {
                deck.push({ suit, rank, faceUp: false });
            }
        }
        return deck;
    }

    shuffle(): void {
        for (let i = this.cards.length - 1; i > 0; i--) {
            let j: number = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j]!, this.cards[i]!];
        }
    }

    draw(): Card | undefined {
        return this.cards.pop();
    }

    get size(): number {
        return this.cards.length;
    }
}