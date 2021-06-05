const express = require("express");
const router = express.Router();
const passport = require("passport");
const users = require("../controllers/users");
const { isUserPublic, isLoggedIn, doesUserIdMatch } = require("../middleware");

router.route("/register")
    .get(users.renderRegister)
    .post(users.register)

router.route("/login")
    .get(users.renderLogin)
    .post(passport.authenticate("local", { failureFlash: true, failureRedirect: "/login" }), users.login)

router.get("/logout", isLoggedIn, users.logout);

router.route("/:id")
    .get(isLoggedIn, users.showWorkspaces)

module.exports = router;