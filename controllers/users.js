const catchAsync = require("../utils/catchAsync");
const User = require("../models/user");
const ExpressError = require("../utils/ExpressError");
const ejs = require('ejs');
const Workspace = require("../models/workspace");

module.exports = {
    renderLogin: (req, res) => {
        res.render("users/login");
    },
    login: (req, res) => {
        req.flash("success", "Welcome back!");
        const redirectUrl = req.session.returnTo || "/";
        // deletes the returnTo property from the session
        delete req.session.returnTo;
        res.redirect(redirectUrl);
    },
    renderRegister: (req, res) => {
        res.render("users/register");
    },
    register: catchAsync(async (req, res, next) => {
        try {
            const { email, username, password, adminCode } = req.body;
            const user = new User({ email, username });
            if (JSON.stringify(adminCode) === JSON.stringify(process.env.ADMIN_CODE)) user.isAdmin = true;
            const registeredUser = await User.register(user, password);
            req.login(registeredUser, err => {
                if (err) return next(err);
                req.flash("success", "Welcome to Gilq docs!");
                res.redirect("/");
            });
        } catch (e) {
            req.flash("error", e.message);
            res.redirect("register");
        }
    }),
    logout: (req, res) => {
        req.logout();
        req.flash("success", "Goodbye!");
        res.redirect("/");
    },
    showWorkspaces: catchAsync(async (req, res) => {
        const { id } = req.params;
        const workspaces = await Workspace.find().populate("author");
        res.render("users/show", { id, workspaces });
    })
}
