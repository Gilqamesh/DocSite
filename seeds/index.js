const mongoose = require("mongoose");
const Workspace = require("../models/workspace");
const Directory = require("../models/directory");
const Subdirectory = require("../models/subdirectory");
const Document = require("../models/document");
const User = require("../models/user");

mongoose.connect("mongodb://localhost:27017/doc-site", {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true
});
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
});

const seedDB = async () => {
    await Document.deleteMany({});
    await Directory.deleteMany({});
    await Workspace.deleteMany({});
    await User.deleteMany({});
    await Subdirectory.deleteMany({});
    const author = new User({
        email: "celicaw8@gmail.com",
        username: "Gilqamesh",
        password: "random"
    });
    const documents = [
        new Document({
            filename: "First doc",
            content: "I'm a document in the first directory"
        }),
        new Document({
            filename: "Second doc",
            content: "I'm a document in the first subdirectory"
        }),
        new Document({
            filename: "Third doc",
            content: "random text in workspace"
        }),
        new Document({
            filename: "Forth doc",
            content: "another random text in workspace"
        }),
        new Document({
            filename: "Fifth doc",
            content: "Top dir / Second doc"
        }),
        new Document({
            filename: "Sixth doc",
            content: "I'm first doc in top dir / first subdir / first dir"
        })
    ];

    const subdirectories = [
        new Subdirectory({
            name: "First subdirectory",
            documents: [documents[1]]
        })
    ];

    const directories = [
        new Directory({
            name: "First directory",
            documents: [documents[1]]
        }),
        new Directory({
            name: "Second directory",
            documents: [documents[0], documents[4]],
            subdirectories: [subdirectories[0]]
        }),
        new Directory({
            name: "Third directory",
            documents: [documents[5]]
        })
    ]

    subdirectories[0].subdirectories = [directories[2]];

    const workspace = new Workspace({
        name: "First workspace",
        author,
        directories: [directories[1]],
        documents: [documents[2], documents[3]]
    })
    await workspace.save();
    for (let doc of documents) {
        await doc.save();
    }
    for (let dir of directories) {
        await dir.save();
    }
    for (let subdir of subdirectories) {
        await subdir.save();
    }
    await author.save();
}

const deleteDB = async () => {
    await Document.deleteMany({});
    await Directory.deleteMany({});
    await Workspace.deleteMany({});
    await User.deleteMany({});
    await Subdirectory.deleteMany({});
    await new Workspace({
        name: "First workspace"
    }).save();
}

// seedDB().then(() => {
//     console.log("Successfully seeded DB");
//     mongoose.connection.close();
// })

deleteDB().then(() => {
    console.log("Successfully deleted DB");
    mongoose.connection.close();
})