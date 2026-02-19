import { getCardColor, getCardValue } from "../core/cardUtils.js";
class Column {
    cards;
    constructor(initialCards) {
        this.cards = initialCards;
    }
    canReceive(card) {
        // Coluna vazia: só aceita Rei
        if (this.cards.length === 0) {
            return card.rank === 'K';
        }
        const topCard = this.cards[this.cards.length - 1];
        const colorsDiffer = getCardColor(card) !== getCardColor(topCard);
        const rankIsOneLess = getCardValue(card, 'klondike') === getCardValue(topCard, 'klondike') - 1;
        return colorsDiffer && rankIsOneLess;
    }
    push(stack) {
        this.cards.push(...stack);
    }
    popStack(fromIndex) {
        return this.cards.splice(fromIndex);
    }
    flip() {
        const topCard = this.cards[this.cards.length - 1];
        if (topCard) {
            topCard.faceUp = true;
        }
    }
    get topCard() {
        return this.cards[this.cards.length - 1];
    }
}
//# sourceMappingURL=Column.js.map