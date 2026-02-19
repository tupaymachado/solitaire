export const ranks = ['A', 2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K'] as const;
export const suits = ['hearts', 'spades', 'diamonds', 'clubs'] as const;

export type Ranks = typeof ranks[number];
export type Suits = typeof suits[number];
export type Card = {
    suit: Suits,
    rank: Ranks,
    faceUp: boolean;
}
