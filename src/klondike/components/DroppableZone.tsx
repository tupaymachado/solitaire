import { useDroppable } from "@dnd-kit/core";
import styles from "./KlondikeBoard.module.css";

// Dados que cada zona de drop carrega.
// Entregues no onDragEnd → over.data.current
export interface DropData {
    target: 'column' | 'foundation';
    colIndex?: number;
    foundationIndex?: number;
}

interface DroppableZoneProps {
    id: string;
    dropData: DropData;
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}

export function DroppableZone({ id, dropData, children, className, style }: DroppableZoneProps) {
    const { setNodeRef, isOver } = useDroppable({
        id,
        data: dropData,
    });

    return (
        <div
            ref={setNodeRef}
            data-zone-id={id}
            className={`${className ?? ''} ${isOver ? styles.dropHighlight : ''}`}
            style={style}
        >
            {children}
        </div>
    );
}
