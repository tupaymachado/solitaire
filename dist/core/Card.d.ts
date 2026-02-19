export declare const ranks: readonly [2, 3, 4, 5, 6, 7, 8, 9, 10, "J", "Q", "K", "A"];
export declare const suits: readonly ["hearts", "spades", "diamonds", "clubs"];
export type Ranks = typeof ranks[number];
export type Suits = typeof suits[number];
export type Card = {
    suit: Suits;
    rank: Ranks;
    faceUp: boolean;
};
//# sourceMappingURL=Card.d.ts.map