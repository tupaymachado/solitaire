import type { Card } from "../../core/logic/Card";
import { Column } from "./Column"
import { Foundation } from "./Foundation"
import { Deck } from "../../core/logic/Deck"
import { suits } from "../../core/logic/Card";

export type Source =
    | { kind: 'column'; index: number; stackFrom?: number }
    | { kind: 'waste' }
    | { kind: 'foundation'; index: number };

// Registro de cada ação para poder desfazer
interface UndoEntry {
    type: 'draw' | 'recycle' | 'moveToColumn' | 'moveToFoundation';
    cards: Card[];
    from: Source;
    toColumnIndex?: number;
    toFoundationIndex?: number;
    flippedCard: boolean; // se flipou uma carta na coluna de origem
}

// Resultado de findHint() — descreve um movimento sugerido
export interface Hint {
    from: Source;
    description: string; // ex: "Mover 5♥ para coluna 3"
}

export class KlondikeGame {
    private columns: Column[];
    private foundations: Foundation[];
    private stock: Card[];
    private waste: Card[];
    private history: UndoEntry[];

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
            for (let j = 0; j < i; j++) {
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

        this.history = [];
    }

    // ─── Ações do jogo ────────────────────────────────────

    drawFromStock(): void {
        if (this.stock.length === 0) {
            // Recicla: vira todas as cartas de volta para baixo
            const recycledCards = [...this.waste]; // cópia para o undo
            for (const card of this.waste) {
                card.faceUp = false;
            }
            this.stock = this.waste.reverse();
            this.waste = [];
            this.history.push({
                type: 'recycle',
                cards: recycledCards,
                from: { kind: 'waste' },
                flippedCard: false,
            });
            return
        }
        const card = this.stock.pop()!;
        card.faceUp = true;
        this.waste.push(card);
        this.history.push({
            type: 'draw',
            cards: [card],
            from: { kind: 'waste' },
            flippedCard: false,
        });
    }

    moveToColumn(from: Source, toIndex: number): boolean {
        const target = this.columns[toIndex]!;
        const previewstack = this.peekSource(from);
        if (previewstack.length === 0) return false;
        if (!target.canReceive(previewstack[0]!)) return false;

        const stack = this.extractFromSource(from);
        target.push(stack);

        // Verifica se flipou carta na coluna de origem
        const flipped = this.flipSourceTop(from);

        this.history.push({
            type: 'moveToColumn',
            cards: stack,
            from,
            toColumnIndex: toIndex,
            flippedCard: flipped,
        });

        return true;
    }

    moveToFoundation(from: Source): boolean {
        const preview = this.peekSource(from);
        if (preview.length === 0) return false;
        const card = preview[0]!;
        const foundationIndex = this.foundations.findIndex(f => f.canReceive(card));
        if (foundationIndex === -1) return false;

        const extracted = this.extractFromSource(from);
        this.foundations[foundationIndex]!.push(extracted[0]!);

        const flipped = this.flipSourceTop(from);

        this.history.push({
            type: 'moveToFoundation',
            cards: extracted,
            from,
            toFoundationIndex: foundationIndex,
            flippedCard: flipped,
        });

        return true;
    }

    // ─── Undo ─────────────────────────────────────────────

    undo(): boolean {
        const entry = this.history.pop();
        if (!entry) return false;

        switch (entry.type) {
            case 'draw': {
                // Devolve a carta do waste para o stock
                const card = this.waste.pop()!;
                card.faceUp = false;
                this.stock.push(card);
                break;
            }
            case 'recycle': {
                // Devolve as cartas do stock para o waste na ordem original
                for (const card of this.stock) {
                    card.faceUp = true;
                }
                this.waste = this.stock.reverse();
                this.stock = [];
                break;
            }
            case 'moveToColumn': {
                const targetCol = this.columns[entry.toColumnIndex!]!;

                // Se flipou carta na origem, desvira
                if (entry.flippedCard && entry.from.kind === 'column') {
                    this.columns[entry.from.index]!.unflip();
                }

                // Remove as cartas do destino
                const removed = targetCol.popStack(targetCol.columnCards.length - entry.cards.length);

                // Devolve à origem
                this.returnToSource(entry.from, removed);
                break;
            }
            case 'moveToFoundation': {
                const foundation = this.foundations[entry.toFoundationIndex!]!;

                // Se flipou carta na origem, desvira
                if (entry.flippedCard && entry.from.kind === 'column') {
                    this.columns[entry.from.index]!.unflip();
                }

                // Remove da foundation
                const card = foundation.pop()!;

                // Devolve à origem
                this.returnToSource(entry.from, [card]);
                break;
            }
        }

        return true;
    }

    private returnToSource(source: Source, cards: Card[]): void {
        if (source.kind === 'waste') {
            this.waste.push(...cards);
        } else if (source.kind === 'column') {
            this.columns[source.index]!.push(cards);
        } else if (source.kind === 'foundation') {
            this.foundations[source.index]!.push(cards[0]!);
        }
    }

    // ─── Auto-complete ────────────────────────────────────

    get canAutoComplete(): boolean {
        if (this.stock.length > 0) return false;
        if (this.waste.length > 0) return false;
        // Todas as cartas nas colunas devem estar face-up
        return this.columns.every(col =>
            col.columnCards.every(card => card.faceUp)
        );
    }

    autoCompleteStep(): boolean {
        if (!this.canAutoComplete && !this.isWon) return false;
        if (this.isWon) return false;

        // Move UMA carta para a foundation (a primeira válida que encontrar)
        for (let i = 0; i < this.columns.length; i++) {
            const col = this.columns[i]!;
            if (col.columnCards.length === 0) continue;
            const topCard = col.topCard!;
            const foundationIndex = this.foundations.findIndex(f => f.canReceive(topCard));
            if (foundationIndex !== -1) {
                col.popStack(col.columnCards.length - 1);
                this.foundations[foundationIndex]!.push(topCard);
                return true; // moveu uma carta
            }
        }

        return false; // nenhuma carta movida
    }

    // Retorna info sobre a próxima carta que autoCompleteStep moveria,
    // SEM realmente mover. Usado pela UI para animação.
    findNextAutoCompleteMove(): { colIndex: number; cardIndex: number; foundationIndex: number; card: Card } | null {
        if (!this.canAutoComplete || this.isWon) return null;
        for (let i = 0; i < this.columns.length; i++) {
            const col = this.columns[i]!;
            if (col.columnCards.length === 0) continue;
            const topCard = col.topCard!;
            const foundationIndex = this.foundations.findIndex(f => f.canReceive(topCard));
            if (foundationIndex !== -1) {
                return { colIndex: i, cardIndex: col.columnCards.length - 1, foundationIndex, card: topCard };
            }
        }
        return null;
    }

    // ─── Hints ────────────────────────────────────────────

    findHint(): Hint | null {
        // Prioridade 1: mover para foundation (waste ou coluna)
        if (this.waste.length > 0) {
            const wasteTop = this.waste[this.waste.length - 1]!;
            if (this.foundations.some(f => f.canReceive(wasteTop))) {
                return { from: { kind: 'waste' }, description: `Mover ${this.cardLabel(wasteTop)} para foundation` };
            }
        }
        for (let i = 0; i < this.columns.length; i++) {
            const col = this.columns[i]!;
            if (col.columnCards.length === 0) continue;
            const topCard = col.topCard!;
            if (this.foundations.some(f => f.canReceive(topCard))) {
                return {
                    from: { kind: 'column', index: i, stackFrom: col.columnCards.length - 1 },
                    description: `Mover ${this.cardLabel(topCard)} para foundation`,
                };
            }
        }

        // Prioridade 2: mover entre colunas
        for (let i = 0; i < this.columns.length; i++) {
            const col = this.columns[i]!;
            // Encontra a primeira carta face-up na coluna
            const faceUpStart = col.columnCards.findIndex(c => c.faceUp);
            if (faceUpStart === -1) continue;
            const bottomFaceUp = col.columnCards[faceUpStart]!;

            for (let j = 0; j < this.columns.length; j++) {
                if (i === j) continue;
                const targetCol = this.columns[j]!;
                if (targetCol.canReceive(bottomFaceUp)) {
                    // Evitar mover Rei para coluna vazia se já está na base de coluna vazia
                    if (bottomFaceUp.rank === 'K' && faceUpStart === 0 && targetCol.columnCards.length === 0) continue;
                    return {
                        from: { kind: 'column', index: i, stackFrom: faceUpStart },
                        description: `Mover ${this.cardLabel(bottomFaceUp)} para coluna ${j + 1}`,
                    };
                }
            }
        }

        // Prioridade 3: mover waste para coluna
        if (this.waste.length > 0) {
            const wasteTop = this.waste[this.waste.length - 1]!;
            for (let j = 0; j < this.columns.length; j++) {
                if (this.columns[j]!.canReceive(wasteTop)) {
                    return {
                        from: { kind: 'waste' },
                        description: `Mover ${this.cardLabel(wasteTop)} para coluna ${j + 1}`,
                    };
                }
            }
        }

        // Prioridade 4: virar do stock
        if (this.stock.length > 0) {
            return { from: { kind: 'waste' }, description: 'Virar carta do stock' };
        }

        return null; // sem movimentos disponíveis
    }

    private cardLabel(card: Card): string {
        const suitSymbol: Record<string, string> = {
            hearts: '♥', diamonds: '♦', spades: '♠', clubs: '♣',
        };
        return `${card.rank}${suitSymbol[card.suit]}`;
    }

    // ─── Métodos internos ─────────────────────────────────

    private peekSource(source: Source): Card[] {
        if (source.kind === 'waste') {
            const top = this.waste[this.waste.length - 1];
            return top ? [top] : [];
        }
        if (source.kind === 'column') {
            const col = this.columns[source.index]!;
            const from = source.stackFrom ?? 0;
            return col.peekStack(from);
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

    private flipSourceTop(source: Source): boolean {
        if (source.kind === 'column') {
            return this.columns[source.index]!.flip();
        }
        return false;
    }

    // ─── Getters ──────────────────────────────────────────

    get isWon(): boolean {
        return this.foundations.every(foundation => foundation.isComplete);
    }

    get canUndo(): boolean {
        return this.history.length > 0;
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