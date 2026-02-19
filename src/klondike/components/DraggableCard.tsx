import { useDraggable } from "@dnd-kit/core";
import { CardView } from "../../core/components/CardView";
import type { Card } from "../../core/logic/Card";

// Dados que cada carta arrastável carrega consigo.
// Quando solta, o DndContext entrega isso no onDragEnd → active.data.current
export interface DragData {
    source: 'column' | 'waste' | 'foundation';
    colIndex?: number;
    cardIndex?: number;
    foundationIndex?: number;
    cards: Card[]; // as cartas sendo arrastadas (1 ou mais se stack)
}

interface DraggableCardProps {
    id: string;          // ID único para o dnd-kit identificar este draggable
    card: Card;
    dragData: DragData;
    onDoubleClick?: () => void;
}

export function DraggableCard({ id, card, dragData, onDoubleClick }: DraggableCardProps) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id,
        data: dragData,
        disabled: !card.faceUp, // cartas viradas para baixo não arrastam
    });

    // Quando arrastando, escondemos o original — o DragOverlay mostra a cópia visual.
    const style: React.CSSProperties = {
        opacity: isDragging ? 0.3 : undefined,
        cursor: card.faceUp ? 'grab' : 'default',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            onDoubleClick={card.faceUp ? onDoubleClick : undefined}
        >
            <CardView card={card} />
        </div>
    );
}
