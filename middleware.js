const ObjectID = require('mongodb').ObjectID;
const ExpressError = require("./utils/ExpressError");
const User = require("./models/user");
const Workspace = require("./models/workspace");
const catchAsync = require("./utils/catchAsync");

module.exports = {
    isLoggedIn: (req, res, next) => {
        if (!req.isAuthenticated()) {
            req.session.returnTo = req.originalUrl;
            req.flash("error", "You must be signed in first!");
            return res.redirect("/login");
        }
        next();
    },
    paginatedResults: function (model) {
        return catchAsync(async (req, res, next) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 5;
            const startIndex = (page - 1) * limit;
            const endIndex = page * limit;
            const results = {};
            results.curPage = page;
            if (endIndex < await model.countDocuments().exec()) {
                results.next = {
                    page: page + 1,
                    limit
                }
            }
            if (startIndex > 0) {
                results.previous = {
                    page: page - 1,
                    limit
                }
            }
            results.pagResults = await model.find().limit(limit).skip(startIndex).exec();
            results.allResults = await model.find();
            res.paginatedResults = results;
            next();
        })
    },
    isWorkspacePublic: catchAsync(async (req, res, next) => {
        const { id } = req.params;
        const user = await User.findOne({ username: id });
        const session = req.session.passport;
        if ((user && user.isPublic) || (session && session.user === id)) {
            next();
        } else {
            throw new ExpressError("Profile is not public", 403);
        }
    })
}
