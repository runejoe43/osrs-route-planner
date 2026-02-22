import { Box, Group, Paper, Text } from "@mantine/core";
// import { IconGripVertical } from "@tabler/icons-react";
import useDraggable from "../../hooks/useDraggable";

interface DraggableBoxProps {
  title?: string;
  children: React.ReactNode;
  initialPosition?: { x: number; y: number };
  width?: number;
}

export default function DraggableBox({
  title,
  children,
  initialPosition = { x: 100, y: 100 },
  width = 320,
}: DraggableBoxProps) {
  const { position, onMouseDown } = useDraggable(initialPosition);

  return (
    <Paper
      shadow="md"
      withBorder
      style={{
        position: "fixed",
        top: position.y,
        left: position.x,
        width,
        zIndex: 999,
        userSelect: "none",
        backgroundColor: "red",
      }}
    >
      {/* Drag handle */}
      <Group
        onMouseDown={onMouseDown}
        px="sm"
        py={6}
        gap="xs"
        style={{
          cursor: "grab",
          borderBottom: "1px solid var(--mantine-color-default-border)",
          background: "var(--mantine-color-default-hover)",
          borderRadius:
            "var(--mantine-radius-default) var(--mantine-radius-default) 0 0",
        }}
      >
        {/* <IconGripVertical size={14} color="var(--mantine-color-dimmed)" /> */}
        {title && (
          <Text size="sm" fw={500}>
            {title}
          </Text>
        )}
      </Group>

      {/* Content */}
      <Box p="sm">{children}</Box>
    </Paper>
  );
}