import {
  AppBar,
  Box,
  Container,
  CssBaseline,
  Typography
} from "@mui/material";
import { cyan, indigo } from '@mui/material/colors';
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { AppBarCenter } from "./appBarCenter";
import { AppBarCenterFsm } from "./appBarCenterFsm";
import { AppBarRight } from "./appBarRight";
import { AppBarRightFsm } from "./appBarRightFsm";
import { Content } from "./content";
import { ContentFsm } from "./contentFsm";
import { Dispatcher } from "./dispatcher";

type AppBarAndContentProps = {
  apiUrl: string;
  dispatcher: Dispatcher;
  appBarCenterFsm: AppBarCenterFsm;
  appBarRightFsm: AppBarRightFsm;
  contentFsm: ContentFsm;
};

export function AppBarAndContent({
  apiUrl,
  dispatcher, 
  appBarCenterFsm,
  appBarRightFsm,
  contentFsm,
}: AppBarAndContentProps) {
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
          <AppBarCenter fsm={appBarCenterFsm} />
        </Box>
        <Box sx={{ flex: "1", display: "flex", justifyContent: "right", overflow: "hidden" }}>
          <AppBarRight
            fsm={appBarRightFsm}
            apiUrl={apiUrl}
            dispatcher={dispatcher}
          />
        </Box>
      </AppBar>
      <Container maxWidth="sm" sx={{ marginTop: appBarHeight }}>
        <Content fsm={contentFsm} apiUrl={apiUrl} dispatcher={dispatcher} />
      </Container>
    </ThemeProvider>
  );
}