const catchAsync = require("../utils/catchAsync");
const Workspace = require("../models/workspace");
const Document = require("../models/document");
const Directory = require("../models/directory");
const Subdirectory = require("../models/subdirectory");
const User = require("../models/user")
const ExpressError = require("../utils/ExpressError");
const ejs = require('ejs');
const ObjectID = require('mongodb').ObjectID;
const cloudinary = require("../cloudinary");
const tmp = require("tmp");
const fs = require("fs");
const axios = require("axios");

module.exports = {
    isValidWorkspace: (req, res, next) => {
        const { id } = req.params;
        if (!ObjectID.isValid(id)) {
            return next(new ExpressError("Invalid Id", 400));
        }
        next();
    },
    renderWorkspace: catchAsync(async (req, res, next) => {
        const { id } = req.params;
        const workspace = await Workspace.findById(id);
        await populateWorkspace(workspace, id);
        const currContent = req.session.currContent || "";
        const currUrl = req.session.currUrl;
        const currFn = req.session.currFn || "No file opened";
        res.render("workspaces/show", { workspace, currContent, currUrl, currFn });
    }),
    addToWorkspace: catchAsync(async (req, res, next) => {
        const { id } = req.params;
        const input = req.body;
        console.log(input);
        if (input.hasOwnProperty("docName")) {
            const docName = input["docName"];
            const tmpobj = tmp.fileSync();
            await fs.appendFile(tmpobj.name, " ", () => { });
            let url = "";
            await cloudinary.cloudinary.uploader.upload(tmpobj.name, {
                resource_type: "auto",
                public_id: `docsite/${docName}`
            }, (e, r) => {
                url += r.url;
            });
            const newDoc = new Document({
                filename: docName,
                url,
            });
            const parentId = input["id"];
            switch (input["type"]) {
                case "workspace":
                    let workspace = await Workspace.findById(parentId);
                    workspace.documents.push(newDoc);
                    await workspace.save();
                    break;
                case "subdir":
                    let subdir = await Subdirectory.findById(parentId);
                    subdir.documents.push(newDoc);
                    await subdir.save();
                    break;
                case "dir":
                    let dir = await Directory.findById(parentId);
                    dir.documents.push(newDoc);
                    await dir.save();
                    break;
            }
            await newDoc.save();
        } else if (input.hasOwnProperty("contentUpdate")) {
            if (!req.session.currUrl) {
                req.flash("error", "No file opened");
                return next()
            }
            const tmpobj = tmp.fileSync();
            await fs.appendFile(tmpobj.name, input["contentUpdate"], () => { });
            let url = "";
            await cloudinary.cloudinary.uploader.upload(tmpobj.name, {
                resource_type: "auto",
                public_id: `docsite/${req.session.currFn}`
            }, (e, r) => {
                url += r.url;
            });
            req.session.currUrl = url;
            req.session.currContent = input["contentUpdate"];
            await Document.findOneAndUpdate({ filename: req.session.currFn }, { url });
            req.flash("success", "Successfully saved file.");
        } else if (input.hasOwnProperty("docUrl")) {
            const docUrl = Object.keys(input["docUrl"])[0];
            const content = await axios.get(docUrl);
            req.session.currContent = content.data;
            req.session.currUrl = docUrl;
            req.session.currFn = (await Document.findOne({ url: docUrl })).filename;
        } else if (input.hasOwnProperty("dirName")) {
            const dirName = input["dirName"];
            const parentId = input["id"];
            let newDir;
            switch (input["type"]) {
                case "workspace":
                    newDir = new Directory({
                        name: dirName
                    });
                    let workspace = await Workspace.findById(parentId);
                    workspace.directories.push(newDir);
                    await workspace.save();
                    break;
                case "dir":
                    newDir = new Directory({
                        name: dirName
                    });
                    let subdir = await Subdirectory.findById(parentId);
                    subdir.subdirectories.push(newDir);
                    await subdir.save();
                    break;
                case "subdir":
                    newDir = new Subdirectory({
                        name: dirName
                    });
                    let dir = await Directory.findById(parentId);
                    dir.subdirectories.push(newDir);
                    await dir.save();
                    break;
            }
            await newDir.save();
        }
        next();
    })
}

const populateWorkspace = async function (workspace, id) {
    const queryWorkSpace = Workspace.findById(id);
    Object.assign(workspace, await queryWorkSpace.populate("author"));
    Object.assign(workspace, await queryWorkSpace.populate("documents"));
    Object.assign(workspace, await queryWorkSpace.populate("directories"));
    const populateDirectory = async function (query, parent) {
        const queryParent = await query;
        if (queryParent.documents.length) {
            Object.assign(parent, await query.populate("documents"));
        }
        if (queryParent.subdirectories.length) {
            Object.assign(parent, await query.populate("subdirectories"));
            for (let subdir of parent.subdirectories) {
                Object.assign(subdir, await Subdirectory.findById(subdir._id).populate("documents").populate("subdirectories"));
                if (subdir.subdirectories.length) {
                    for (let dir of subdir.subdirectories) {
                        let queryDir = Directory.findById(dir._id);
                        await populateDirectory(queryDir, dir);
                    }
                }
            }
        }
    }
    for (let directory of workspace.directories) {
        let queryDir = Directory.findById(directory._id);
        await populateDirectory(queryDir, directory);
    }
}
