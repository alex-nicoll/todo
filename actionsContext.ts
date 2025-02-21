import { createContext } from "react";
import { createActions } from "./actions";

// Perform a type assertion here to make TypeScript happy. It is correct to pass
// undefined as we want an error to be thrown if the Context is accessed before
// it is initialized.
export const ActionsContext = createContext(undefined as unknown as ReturnType<typeof createActions>);