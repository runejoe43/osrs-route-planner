import { useState } from "react";
import { ActionIcon, Box, Collapse, Group, Paper, Text } from "@mantine/core";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
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
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Paper
      shadow="md"
      withBorder
      className="draggable-box"
      style={{
        position: "fixed",
        top: position.y,
        left: position.x,
        width,
        zIndex: 999,
        userSelect: "none",
      }}
    >
      {/* Drag handle */}
      <Group
        onMouseDown={onMouseDown}
        px="sm"
        py={6}
        gap="xs"
        justify="space-between"
        style={{
          cursor: "grab",
          borderBottom: collapsed ? "none" : "1px solid var(--mantine-color-default-border)",
          background: "var(--mantine-color-default-hover)",
          borderRadius: collapsed
            ? "var(--mantine-radius-default)"
            : "var(--mantine-radius-default) var(--mantine-radius-default) 0 0",
        }}
      >
        {/* <IconGripVertical size={14} color="var(--mantine-color-dimmed)" /> */}
        {title && (
          <Text size="sm" fw={500}>
            {title}
          </Text>
        )}
        <ActionIcon
          variant="subtle"
          size="xs"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <IconChevronDown size={14} /> : <IconChevronUp size={14} />}
        </ActionIcon>
      </Group>

      {/* Content */}
      <Collapse in={!collapsed}>
        <Box p="sm">{children}</Box>
      </Collapse>
    </Paper>
  );
}