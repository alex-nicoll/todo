import Add from "@mui/icons-material/Add";
import Clear from "@mui/icons-material/Clear";
import { IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText, TextField } from "@mui/material";
import { memo, useEffect, useState } from "react";
import { TodoSynchronizer } from "./todoSynchronizer";

export type TodoEditorProps = {
  ts: TodoSynchronizer;
};

/**
 * TodoEditor renders an editable todo list. Text fields are used to edit todo
 * values. TodoEditor minimizes rendering when the user types into a text field
 * by having the text field subscribe to the todo value, rather than having the
 * whole list re-render every time the user types.
 */
export const TodoEditor = memo(function TodoEditor({ ts }: TodoEditorProps) {
  console.log("rendering TodoEditor");

  useEffect(
    () => {
      function handleVisibilityChange() {
        if (document.visibilityState === "visible") {
          ts.refresh();
        }
      }
      document.addEventListener("visibilitychange", handleVisibilityChange);
      return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    },
    []
  );

  const [, setState] = useState({});
  useEffect(
    () => ts.subscribeToKeys(() => setState({})),
    []
  );

  const todoListItems: JSX.Element[] = [];
  for (const id of ts.ids()) {
    todoListItems.push(
      <ListItem key={id}>
        <TodoTextField
          id={id}
          ts={ts}
        />
        <IconButton onClick={() => ts.remove(id)}>
          <Clear />
        </IconButton>
      </ListItem>
    );
  }

  return (
    <List>
      {todoListItems}
      <ListItemButton onClick={ts.appendNew}>
        <ListItemIcon>
          <Add />
        </ListItemIcon>
        <ListItemText primary="New item" />
      </ListItemButton>
    </List>
  );
});

type TodoTextFieldProps = {
  id: string;
  ts: Pick<TodoSynchronizer, "subscribeToValue" | "get" | "update">;
};

const TodoTextField = memo(function TodoTextField({ id, ts }: TodoTextFieldProps) {
  console.log("rendering TodoTextField");

  const [, setState] = useState({});
  useEffect(
    () => ts.subscribeToValue(id, () => setState({})),
    []
  );

  return (
    <TextField
      multiline
      fullWidth
      size="small"
      placeholder="Item"
      spellCheck="false"
      value={ts.get(id)}
      onChange={(e) => ts.update(id, e.target.value)}
    />
  );
});