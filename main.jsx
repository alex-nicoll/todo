import * as React from "react";
import * as ReactDOM from "react-dom";
import {TextField} from "@mui/material"

const root = ReactDOM.createRoot(document.getElementById("root"));
const el = <TextField multiline placeholder="test" />
root.render(el);
