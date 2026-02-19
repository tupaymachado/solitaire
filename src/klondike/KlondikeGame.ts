import type { Card } from "../core/Card.js";
import { Column } from "./Column.js"
import { Foundation } from "./Foundation.js"
import { Deck } from "../core/Deck.js"
import { suits } from "../core/Card.js";

export type Source =
    | { kind: 'column'; index: number; stackFrom?: number }
    | { kind: 'waste' }
    | { kind: 'foundation'; index: number };

class KlondikeGame {
    private columns: Column[];
    private foundations: Foundation[];
    private stock: Card[];
    private waste: Card[];

    constructor() {
        const deck = new Deck();
        deck.shuffle();

        this.foundations = [];
        for (const suit of suits) {
            this.foundations.push(new Foundation(suit));
        }

        this.columns = [];
        for (let i = 1; i <= 7; i++) {
            let initialCards: Card[] = [];
            for (let j = 1; j < i; j++) {
                const card = deck.draw()!;
                card.faceUp = (j === i - 1);
                initialCards.push(card);
            }
            this.columns.push(new Column(initialCards))
        }

        this.stock = [];
        this.waste = [];
        let card = deck.draw();
        while (card) {
            this.stock.push(card);
            card = deck.draw();
        }
    }

    drawFromStock(): void {
        if (this.stock.length === 0) {
            this.stock = this.waste.reverse();
            this.waste = [];
            return
        }
        const card = this.stock.pop()!;
        card.faceUp = true;
        this.waste.push(card);
    }

    moveToColumn(from: Source, toIndex: number): boolean {
        const target = this.columns[toIndex]!;
        const previewstack = this.peekSource(from);
        if (previewstack.length === 0) return false;
        if (!target.canReceive(previewstack[0]!)) return false;
        const stack = this.extractFromSource(from);
        target.push(stack);
        this.flipSourceTop(from);

        return true;
    }

    moveToFoundation(from: Source): boolean {
        const preview = this.peekSource(from);
        if (preview.length === 0) return false;
        const card = preview[0]!;
        const target = this.foundations.find(f => f.canReceive(card));
        if (!target) return false;
        const extracted = this.extractFromSource(from);
        target.push(extracted[0]!);
        this.flipSourceTop(from);
        return true;
    }

    private peekSource(source: Source): Card[] {
        if (source.kind === 'waste') {
            const top = this.waste[this.waste.length - 1];
            return top ? [top] : [];
        }
        if (source.kind === 'column') {
            const col = this.columns[source.index]!;
            const from = source.stackFrom ?? 0;
            return col.peekStack(from); //add método na column
        }
        if (source.kind === 'foundation') {
            const top = this.foundations[source.index]!.topCard;
            return top ? [top] : [];
        }
        return [];
    }

    private extractFromSource(source: Source): Card[] {
        if (source.kind === 'waste') {
            return [this.waste.pop()!];
        }
        if (source.kind === 'column') {
            const col = this.columns[source.index]!;
            const from = source.stackFrom ?? 0;
            return col.popStack(from);
        }
        if (source.kind === 'foundation') {
            const card = this.foundations[source.index]!.pop();
            return card ? [card] : [];
        }
        return [];
    }

    private flipSourceTop(source: Source): void {
        if (source.kind === 'column') {
            this.columns[source.index]!.flip();
        }
    }

    get isWon(): boolean {
        return this.foundations.every(foundation => foundation.isComplete);
    }

    get tableau(): ReadonlyArray<Column> {
        return this.columns;
    }
    get wastePile(): ReadonlyArray<Card> {
        return this.waste;
    }
    get foundationPiles(): ReadonlyArray<Foundation> {
        return this.foundations;
    }
    get stockCount(): number {
        return this.stock.length;
    }
}