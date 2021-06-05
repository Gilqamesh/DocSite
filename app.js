if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}

// package and file requires
const express = require("express");
const mongoose = require("mongoose");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError");
const methodOverride = require("method-override");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const mongoSanitize = require("express-mongo-sanitize");
const path = require("path");
const session = require("express-session");
const flash = require("connect-flash");
const User = require("./models/user");

// constant definitions
const port = process.env.PORT || 3000;
// CHANGE THIS BACK LATER IF USING AN ONLINE DB (CLOUDINARY)
// const dbUrl = process.env.DB_URL || "mongodb://localhost:27017/doc-site";
const dbUrl = "mongodb://localhost:27017/doc-site";
const secret = process.env.SECRET || "thisshouldbeabettersecret";
const sessionConfig = {
    name: "session",   // default is connect.sid which can be exploited if the attacker knows what to look for
    secret,
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        // secure: true, https secure (cookies can only be configured over secure connections)
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
};

// connecting to mongo
mongoose.connect(dbUrl, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    useFindAndModify: false
});
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
});

const userRoutes = require("./routes/users");
const publicRoutes = require("./routes/public");
const workspaceRoutes = require("./routes/workspace");
const app = express();

// setting path for ejs
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// tell express to parse incoming requests with urlencoded payloads
app.use(express.urlencoded({ extended: true }));

// setting path for public directory
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

// sanitize mongo to prevent db injections
// app.use(mongoSanitize()); // doesn't work for urls for now

// connect session
app.use(session(sessionConfig));

// connect flashability
app.use(flash());

// use passport for the user model
app.use(passport.initialize());
app.use(passport.session());

// passport for user encryption
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// locals middleware
app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    next();
})

// routes
app.get("/", (req, res) => {
    res.render("home");
});
app.use("/public", publicRoutes);
app.use("/workspace", workspaceRoutes);
app.use("/", userRoutes);

// any request that was not matched
app.all('*', (req, res, next) => {
    next(new ExpressError("Page Not Found", 404));
})

// error handler middleware, catches any errors that were thrown
app.use((err, req, res, next) => {
    const { statusCode = 500 } = err;
    if (!err.message) err.message = "Oh no, something went wrong!";
    res.status(statusCode).render("error", { err });
})

// connect to specified port
app.listen(port, () => {
    console.log(`Serving on port ${port}`);
})