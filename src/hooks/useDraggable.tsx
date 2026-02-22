import { useRef, useState, useCallback } from "react";

interface Position { x: number; y: number; }

export default function useDraggable(initial: Position = { x: 100, y: 100 }) {
  const [position, setPosition] = useState<Position>(initial);
  const dragStart = useRef<Position | null>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!dragStart.current) return;
      setPosition({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y,
      });
    };

    const onMouseUp = () => {
      dragStart.current = null;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, [position]);

  return { position, onMouseDown };
}