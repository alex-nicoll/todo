import Add from "@mui/icons-material/Add";
import Clear from "@mui/icons-material/Clear";
import { IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText, TextField } from "@mui/material";
import React from "react";
import { TodoStore } from "./todoStore";

type TodoListProps = {
  todoStore: TodoStore;
};

export function TodoList({ todoStore }: TodoListProps) {
  console.log("rendering TodoList");

  const [, setState] = React.useState({});
  React.useEffect(
    () => todoStore.subscribeToKeys(() => setState({})),
    []
  );

  const todoListItems: React.JSX.Element[] = [];
  todoStore.getTodos().forEach((value, id) => todoListItems.push(
    <ListItem key={id}>
      <TodoTextField
        todoId={id}
        todoStore={todoStore}
      />
      <IconButton onClick={() => todoStore.deleteTodo(id)}>
        <Clear />
      </IconButton>
    </ListItem>
  ));

  return (
    <List>
      {todoListItems}
      <ListItemButton onClick={todoStore.appendTodo}>
        <ListItemIcon>
          <Add />
        </ListItemIcon>
        <ListItemText primary="New item" />
      </ListItemButton>
    </List>
  );
}

type TodoTextFieldProps = {
  todoId: string;
  todoStore: TodoStore;
};

function TodoTextField({ todoId, todoStore }: TodoTextFieldProps) {
  console.log("rendering TodoTextField");

  const [, setState] = React.useState({});
  React.useEffect(
    () => todoStore.subscribeToValue(todoId, () => setState({})),
    []
  );

  return (
    <TextField
      multiline
      fullWidth
      size="small"
      placeholder="Item"
      spellCheck="false"
      value={todoStore.getTodos().get(todoId)}
      onChange={(e) => todoStore.updateTodo(todoId, e.target.value)}
    />
  );
}