import type { Suits, Card } from "../../core/logic/Card";
import { getCardValue } from "../../core/logic/cardUtils";

export class Foundation {
    private suit: Suits;
    private cards: Card[];

    constructor(suit: Suits) {
        this.suit = suit;
        this.cards = [];
    }

    canReceive(card: Card): boolean {
        if (this.cards.length === 0) return card.suit === this.suit && card.rank === 'A';
        const topCard = this.cards[this.cards.length - 1]!;
        const sameSuit = card.suit === this.suit;
        const rankIsOneMore = getCardValue(card, 'klondike') === getCardValue(topCard, 'klondike') + 1;
        return sameSuit && rankIsOneMore;
    }

    push(card: Card): void { // adiciona a carta (sempre uma, nunca stack)
        this.cards.push(card);
    }

    pop(): Card | undefined { // remove do topo (para mover de volta ao tableau)
        return this.cards.pop();
    }

    get topCard(): Card | undefined { // expõe a carta do topo
        return this.cards[this.cards.length - 1];
    }
    get isComplete(): boolean { // true se tiver 13 cartas
        return this.cards.length === 13;
    }
    get suitName(): Suits {
        return this.suit;
    }
}