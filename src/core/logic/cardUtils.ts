import type { Card } from "./Card";
import { ranks } from "./Card";

type Color = 'red' | 'black';

export function getCardValue(card: Card, game: 'klondike' | 'blackjack'): number {
    if (game === 'blackjack') {
        if (card.rank === 'A') return 11; // simplificado
        if (['J', 'Q', 'K'].includes(String(card.rank))) return 10;
        return Number(card.rank);
    }
    // No klondike, o valor é a posição no array
    return ranks.indexOf(card.rank) + 1;
}

export function getCardColor(card: Card): Color {
    return (card.suit === 'hearts' || card.suit === 'diamonds') ? 'red' : 'black';
}