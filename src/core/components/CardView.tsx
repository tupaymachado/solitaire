import type { Card, Suits } from "../logic/Card";
import { getCardColor } from "../logic/cardUtils";
import styles from "./CardView.module.css";

const suitSymbols: Record<Suits, string> = {
    hearts: '♥',
    diamonds: '♦',
    spades: '♠',
    clubs: '♣',
};

export function CardView({ card }: { card: Card }) {
    if (!card.faceUp) {
        return <div className={`${styles.card} ${styles.faceDown}`} />;
    }

    const color = getCardColor(card);
    const symbol = suitSymbols[card.suit] ?? '?';

    return (
        <div className={`${styles.card} ${styles[color]}`}>
            <span className={styles.cornerTopLeft}>
                <span className={styles.rank}>{card.rank}</span>
                <span className={styles.suit}>{symbol}</span>
            </span>
            <span className={styles.centerSuit}>{symbol}</span>
            <span className={styles.cornerBottomRight}>
                <span className={styles.rank}>{card.rank}</span>
                <span className={styles.suit}>{symbol}</span>
            </span>
        </div>
    );
}

export default CardView;