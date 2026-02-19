import { getCardValue } from "../core/cardUtils.js";
class Foundation {
    suit;
    cards;
    constructor(suit) {
        this.suit = suit;
        this.cards = [];
    }
    canReceive(card) {
        if (this.cards.length === 0)
            return card.suit === this.suit && card.rank === 'A';
        const topCard = this.cards[this.cards.length - 1];
        const sameSuit = card.suit === this.suit;
        const rankIsOneMore = getCardValue(card, 'klondike') === getCardValue(topCard, 'klondike') + 1;
        return sameSuit && rankIsOneMore;
    }
    push(card) {
        this.cards.push(card);
    }
    pop() {
        return this.cards.pop();
    }
    get topCard() {
        return this.cards[this.cards.length - 1];
    }
    get isComplete() {
        return this.cards.length === 13;
    }
}
//# sourceMappingURL=Foundation.js.map