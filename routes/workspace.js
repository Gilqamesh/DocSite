const express = require("express");
const router = express.Router();
const workspaces = require("../controllers/workspaces");
const { isWorkspacePublic, isLoggedIn, doesUserIdMatch } = require("../middleware");

router.route("/:id")
    .get(/*isWorkspacePublic, */workspaces.renderWorkspace)
    .post(workspaces.addToWorkspace)

module.exports = router;
