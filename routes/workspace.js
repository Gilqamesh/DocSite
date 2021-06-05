const express = require("express");
const router = express.Router();
const workspaces = require("../controllers/workspaces");
const { isWorkspacePublic, isLoggedIn, doesUserIdMatch } = require("../middleware");

router.route("/new")
    .post(isLoggedIn, workspaces.newWorkspace)

router.route("/:id")
    .get(workspaces.isValidWorkspace, /*isWorkspacePublic, isLoggedIn, doesUserIdMatch, */workspaces.renderWorkspace)
    .post(workspaces.isValidWorkspace, /*isWorkspacePublic, isLoggedIn, doesUserIdMatch, */workspaces.addToWorkspace, workspaces.renderWorkspace)

module.exports = router;
