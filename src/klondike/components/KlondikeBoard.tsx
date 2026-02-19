import { useState, useRef, useCallback } from "react";
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragStartEvent, type DragEndEvent } from "@dnd-kit/core";
import { KlondikeGame, type Source, type Hint } from "../logic/KlondikeGame";
import { DraggableCard, type DragData } from "./DraggableCard";
import { DroppableZone, type DropData } from "./DroppableZone";
import { CardView } from "../../core/components/CardView";
import type { Card } from "../../core/logic/Card";
import type { Suits } from "../../core/logic/Card";
import styles from "./KlondikeBoard.module.css";

// ─── Mapeamento de naipes ─────────────────────────────────

const suitSymbols: Record<Suits, string> = {
    hearts: '♥',
    diamonds: '♦',
    spades: '♠',
    clubs: '♣',
};

// ─── Componente principal ─────────────────────────────────

export default function KlondikeBoard() {
    const gameRef = useRef(new KlondikeGame());
    const [, forceUpdate] = useState(0);
    const game = gameRef.current;

    const [activeDrag, setActiveDrag] = useState<DragData | null>(null);
    const [activeHint, setActiveHint] = useState<Hint | null>(null);

    // ─── Ações do jogo ────────────────────────────────────

    function drawFromStock() {
        game.drawFromStock();
        forceUpdate(v => v + 1);
    }

    function moveToColumn(from: Source, toIndex: number) {
        game.moveToColumn(from, toIndex);
        clearHint();
        forceUpdate(v => v + 1);
    }

    function moveToFoundation(from: Source) {
        game.moveToFoundation(from);
        clearHint();
        forceUpdate(v => v + 1);
    }

    function newGame() {
        gameRef.current = new KlondikeGame();
        clearHint();
        forceUpdate(0);
    }

    function handleUndo() {
        game.undo();
        clearHint();
        forceUpdate(v => v + 1);
    }

    const [autoCompleting, setAutoCompleting] = useState(false);

    // Estado da carta voando: posição inicial e final
    interface FlyingCardState {
        card: Card;
        x: number; y: number;
        targetX: number; targetY: number;
        phase: 'start' | 'flying';
    }
    const [flyingCard, setFlyingCard] = useState<FlyingCardState | null>(null);

    // Quando flyingCard muda para phase 'start', agenda transição para 'flying'
    // O double rAF garante que o browser pinta a posição inicial antes de animar.
    const flyingCardRef = useRef(flyingCard);
    flyingCardRef.current = flyingCard;

    function startNextFlyingCard() {
        const g = gameRef.current;
        const moveInfo = g.findNextAutoCompleteMove();
        if (!moveInfo) {
            setAutoCompleting(false);
            setFlyingCard(null);
            return;
        }

        // Obter posições do DOM
        const cardEl = document.querySelector(`[data-zone-id="column-${moveInfo.colIndex}"]`);
        const foundationEl = document.querySelector(`[data-zone-id="foundation-${moveInfo.foundationIndex}"]`);
        if (!cardEl || !foundationEl) {
            // Fallback: move sem animação
            g.autoCompleteStep();
            forceUpdate(v => v + 1);
            setTimeout(startNextFlyingCard, 50);
            return;
        }

        const sourceRect = cardEl.getBoundingClientRect();
        const targetRect = foundationEl.getBoundingClientRect();

        // Calcula posição da última carta na coluna
        const col = g.tableau[moveInfo.colIndex]!;
        let cardTop = 0;
        for (let k = 0; k < moveInfo.cardIndex; k++) {
            cardTop += col.columnCards[k]!.faceUp ? 30 : 12;
        }

        // Phase 1: renderiza na posição de origem
        setFlyingCard({
            card: moveInfo.card,
            x: sourceRect.left,
            y: sourceRect.top + cardTop,
            targetX: targetRect.left,
            targetY: targetRect.top,
            phase: 'start',
        });

        // Phase 2: após o browser pintar, muda para 'flying' (ativa CSS transition)
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                setFlyingCard(prev => prev ? { ...prev, phase: 'flying' } : null);

                // Após a animação (300ms), faz o move real e agenda o próximo
                setTimeout(() => {
                    gameRef.current.autoCompleteStep();
                    setFlyingCard(null);
                    forceUpdate(v => v + 1);

                    if (gameRef.current.isWon) {
                        setAutoCompleting(false);
                    } else {
                        setTimeout(startNextFlyingCard, 50);
                    }
                }, 300);
            });
        });
    }

    function handleAutoComplete() {
        if (autoCompleting) return;
        setAutoCompleting(true);
        clearHint();
        startNextFlyingCard();
    }

    // ─── Hints ────────────────────────────────────────────

    const clearHint = useCallback(() => setActiveHint(null), []);

    function handleHint() {
        const hint = game.findHint();
        setActiveHint(hint);
        if (hint) {
            setTimeout(clearHint, 2000); // limpa o destaque após 2s
        }
    }

    // Verifica se uma carta/posição está sendo destacada pela dica
    function isHinted(source: Source): boolean {
        if (!activeHint) return false;
        const h = activeHint.from;
        if (h.kind !== source.kind) return false;
        if (h.kind === 'column' && source.kind === 'column') {
            return h.index === source.index;
        }
        if (h.kind === 'waste' && source.kind === 'waste') return true;
        return false;
    }

    // ─── Drag handlers ────────────────────────────────────

    function handleDragStart(event: DragStartEvent) {
        setActiveDrag(event.active.data.current as DragData);
    }

    function handleDragEnd(event: DragEndEvent) {
        setActiveDrag(null);
        const { active, over } = event;
        if (!over) return;

        const dragData = active.data.current as DragData;
        const dropData = over.data.current as DropData;

        let from: Source;
        if (dragData.source === 'column') {
            from = { kind: 'column', index: dragData.colIndex!, stackFrom: dragData.cardIndex };
        } else if (dragData.source === 'waste') {
            from = { kind: 'waste' };
        } else {
            from = { kind: 'foundation', index: dragData.foundationIndex! };
        }

        if (dropData.target === 'column') {
            moveToColumn(from, dropData.colIndex!);
        } else if (dropData.target === 'foundation') {
            moveToFoundation(from);
        }
    }

    // ─── Helpers ──────────────────────────────────────────

    function columnHeight(cards: ReadonlyArray<Card>): number {
        if (cards.length === 0) return 120;
        let height = 120;
        for (let i = 0; i < cards.length - 1; i++) {
            height += cards[i]!.faceUp ? 30 : 12;
        }
        return height;
    }

    // Sensor com distância mínima: drag só ativa após 5px de movimento.
    // Isso permite que onDoubleClick dispare (pois não há movimento).
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 5 },
        })
    );

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className={styles.board}>
                {/* ─── Toolbar ─── */}
                <div className={styles.toolbar}>
                    <button className={styles.toolbarButton} onClick={newGame}>
                        🔄 Novo Jogo
                    </button>
                    <button
                        className={styles.toolbarButton}
                        onClick={handleUndo}
                        disabled={!game.canUndo || autoCompleting}
                    >
                        ↩ Desfazer
                    </button>
                    <button
                        className={styles.toolbarButton}
                        onClick={handleHint}
                        disabled={autoCompleting}
                    >
                        💡 Dica
                    </button>
                    <button
                        className={`${styles.toolbarButton} ${game.canAutoComplete && !autoCompleting ? styles.autoCompleteReady : ''}`}
                        onClick={handleAutoComplete}
                        disabled={!game.canAutoComplete || autoCompleting}
                    >
                        ⚡ Auto-completar
                    </button>
                </div>



                {/* ─── Linha superior: Stock, Waste, Foundations ─── */}
                <div className={styles.topRow}>
                    <div className={styles.stockWaste}>
                        <div
                            className={`${styles.pile} ${styles.stock}`}
                            onClick={drawFromStock}
                        >
                            {game.stockCount > 0
                                ? <div className={styles.cardBack} />
                                : <span className={styles.emptyPile}>↻</span>
                            }
                        </div>

                        <div className={`${styles.pile} ${isHinted({ kind: 'waste' }) ? styles.hintHighlight : ''}`}>
                            {game.wastePile.length > 0 ? (
                                <DraggableCard
                                    id="waste-top"
                                    card={game.wastePile[game.wastePile.length - 1]!}
                                    dragData={{
                                        source: 'waste',
                                        cards: [game.wastePile[game.wastePile.length - 1]!],
                                    }}
                                    onDoubleClick={() => moveToFoundation({ kind: 'waste' })}
                                />
                            ) : (
                                <span className={styles.emptyPile} />
                            )}
                        </div>
                    </div>

                    <div className={styles.foundations}>
                        {game.foundationPiles.map((foundation, i) => (
                            <DroppableZone
                                key={`foundation-${i}`}
                                id={`foundation-${i}`}
                                dropData={{ target: 'foundation', foundationIndex: i }}
                                className={styles.pile}
                            >
                                {foundation.topCard ? (
                                    <DraggableCard
                                        id={`foundation-card-${i}`}
                                        card={foundation.topCard}
                                        dragData={{
                                            source: 'foundation',
                                            foundationIndex: i,
                                            cards: [foundation.topCard],
                                        }}
                                    />
                                ) : (
                                    <span className={`${styles.emptyPile} ${styles.foundationEmpty}`}>
                                        {suitSymbols[foundation.suitName]}
                                    </span>
                                )}
                            </DroppableZone>
                        ))}
                    </div>
                </div>

                {/* ─── Tableau: 7 colunas ─── */}
                <div className={styles.tableau}>
                    {game.tableau.map((column, colIndex) => (
                        <DroppableZone
                            key={`column-${colIndex}`}
                            id={`column-${colIndex}`}
                            dropData={{ target: 'column', colIndex }}
                            className={`${styles.column} ${isHinted({ kind: 'column', index: colIndex }) ? styles.hintHighlight : ''}`}
                            style={{ minHeight: `${columnHeight(column.columnCards)}px` }}
                        >
                            {column.columnCards.length === 0 ? (
                                <div className={`${styles.pile} ${styles.emptyColumn}`} />
                            ) : (
                                column.columnCards.map((card: Card, cardIndex: number) => {
                                    let top = 0;
                                    for (let k = 0; k < cardIndex; k++) {
                                        top += column.columnCards[k]!.faceUp ? 30 : 12;
                                    }
                                    return (
                                        <div
                                            key={cardIndex}
                                            className={styles.columnCard}
                                            style={{ top: `${top}px` }}
                                        >
                                            <DraggableCard
                                                id={`col-${colIndex}-card-${cardIndex}`}
                                                card={card}
                                                dragData={{
                                                    source: 'column',
                                                    colIndex,
                                                    cardIndex,
                                                    cards: column.columnCards.slice(cardIndex) as Card[],
                                                }}
                                                onDoubleClick={cardIndex === column.columnCards.length - 1
                                                    ? () => moveToFoundation({ kind: 'column', index: colIndex, stackFrom: cardIndex })
                                                    : undefined
                                                }
                                            />
                                        </div>
                                    );
                                })
                            )}
                        </DroppableZone>
                    ))}
                </div>

                {/* ─── Vitória ─── */}
                {game.isWon && (
                    <div className={styles.winMessage}>
                        🎉 Você ganhou!
                        <button onClick={newGame}>
                            Novo Jogo
                        </button>
                    </div>
                )}
            </div>

            {/* ─── Hint toast (posição fixa, não desloca o layout) ─── */}
            {activeHint && (
                <div className={styles.hintToast}>
                    💡 {activeHint.description}
                </div>
            )}

            {/* ─── Flying card (auto-complete animation) ─── */}
            {flyingCard && (
                <div
                    className={styles.flyingCard}
                    style={{
                        left: flyingCard.phase === 'flying' ? flyingCard.targetX : flyingCard.x,
                        top: flyingCard.phase === 'flying' ? flyingCard.targetY : flyingCard.y,
                    }}
                >
                    <CardView card={flyingCard.card} />
                </div>
            )}

            <DragOverlay dropAnimation={null}>
                {activeDrag && (
                    <div className={styles.dragStack}>
                        {activeDrag.cards.map((card, i) => (
                            <div key={i} style={{ marginTop: i === 0 ? 0 : -90 }}>
                                <CardView card={card} />
                            </div>
                        ))}
                    </div>
                )}
            </DragOverlay>
        </DndContext>
    );
}
