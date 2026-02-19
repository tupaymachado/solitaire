import type { Card } from "../../core/logic/Card";
import { getCardColor, getCardValue } from "../../core/logic/cardUtils";

export class Column {
    private cards: Card[];

    constructor(initialCards: Card[]) {
        this.cards = initialCards;
    }

    canReceive(card: Card): boolean {
        if (this.cards.length === 0) {
            return card.rank === 'K';
        }
        const topCard = this.cards[this.cards.length - 1]!;
        const colorsDiffer = getCardColor(card) !== getCardColor(topCard);
        const rankIsOneLess = getCardValue(card, 'klondike') === getCardValue(topCard, 'klondike') - 1;
        return colorsDiffer && rankIsOneLess;
    }

    push(stack: Card[]): void {
        this.cards.push(...stack);
    }

    popStack(fromIndex: number): Card[] {
        return this.cards.splice(fromIndex);
    }

    peekStack(fromIndex: number): Card[] {
        return this.cards.slice(fromIndex);
    }

    flip(): boolean {
        const topCard = this.cards[this.cards.length - 1];
        if (topCard && !topCard.faceUp) {
            topCard.faceUp = true;
            return true;
        }
        return false;
    }

    unflip(): void {
        const topCard = this.cards[this.cards.length - 1];
        if (topCard) {
            topCard.faceUp = false;
        }
    }

    get topCard(): Card | undefined {
        return this.cards[this.cards.length - 1];
    }

    get columnCards(): ReadonlyArray<Card> {
        return this.cards;
    }
}