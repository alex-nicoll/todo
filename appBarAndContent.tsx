import {
  AppBar,
  Box,
  Container,
  CssBaseline,
  Typography
} from "@mui/material";
import { cyan, indigo } from '@mui/material/colors';
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { memo } from "react";
import { AppStateConsumer } from "./appStateConsumer";

export const AppBarAndContent = memo(function AppBarAndContent() {
  const theme = createTheme({
    palette: {
      primary: indigo,
      secondary: cyan,
      contrastThreshold: 4.5,
    }
  });
  const appBarHeight = "60px";
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar
        sx={{
          height: appBarHeight,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          padding: "0 5%"
        }}
      >
        <Box sx={{ flex: "1", display: "flex", justifyContent: "left" }}>
          <Typography variant="h4" component="h1">
            To-Do
          </Typography>
        </Box>
        <Box sx={{ flex: "1", display: "flex", justifyContent: "center" }}>
          <AppStateConsumer getNodeFromState={(state) => state.appBarCenter} />
        </Box>
        <Box sx={{ flex: "1", display: "flex", justifyContent: "right", overflow: "hidden" }}>
          <AppStateConsumer getNodeFromState={(state) => state.appBarRight} />
        </Box>
      </AppBar>
      <Container maxWidth="sm" sx={{ marginTop: appBarHeight }}>
        <AppStateConsumer getNodeFromState={(state) => state.content} />
      </Container>
    </ThemeProvider>
  );
});