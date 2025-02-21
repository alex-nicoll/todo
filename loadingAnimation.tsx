import { Box, CircularProgress } from "@mui/material";
import { memo } from "react";

export const LoadingAnimation = memo(function LoadingAnimation() {
  return (
    <Box sx={{ padding: "24px 0", display: "flex", justifyContent: "center" }}>
      <CircularProgress />
    </Box>
  );
});