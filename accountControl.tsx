import Logout from "@mui/icons-material/Logout";
import { Box, IconButton, Typography } from "@mui/material";
import { memo } from "react";

export type AccountControlProps = {
  username: string;
  onLogoutClicked: () => void;
}

export const AccountControl = memo(function AccountControl({ username, onLogoutClicked }: AccountControlProps) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", overflow: "hidden" }}>
      <Typography sx={{ overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
        {username}
      </Typography>
      <IconButton sx={{ color: "#ffffff" }} onClick={onLogoutClicked}>
        <Logout />
      </IconButton>
    </Box>
  );
});