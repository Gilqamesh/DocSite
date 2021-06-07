const catchAsync = require("../utils/catchAsync");
const Workspace = require("../models/workspace");
const Document = require("../models/document");
const Directory = require("../models/directory");
const Subdirectory = require("../models/subdirectory");
const ExpressError = require("../utils/ExpressError");
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
        const input = req.body;
        const workspace = await Workspace.findById(req.params.id);
        if (input.hasOwnProperty("docName")) {
            const docName = input["docName"];
            if (!docName) {
                // doesn't work without refresh, why?..
                req.flash("error", "Document needs to have a name");
                return next()
            }
            const tmpobj = tmp.fileSync();
            await fs.appendFile(tmpobj.name, " ", () => { });
            const url = (await cloudinary.cloudinary.uploader.upload(tmpobj.name, {
                resource_type: "auto",
                public_id: `docsite/${req.user.username}/${workspace.name}/${docName}`
            })).url;
            const newDoc = new Document({
                filename: docName,
                url,
            });
            const parentId = input["id"];
            switch (input["type"]) {
                case "workspace":
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
                return next();
            }
            const tmpobj = tmp.fileSync();
            await fs.appendFile(tmpobj.name, input["contentUpdate"], () => { });
            const url = (await cloudinary.cloudinary.uploader.upload(tmpobj.name, {
                resource_type: "auto",
                public_id: `docsite/${req.user.username}/${workspace.name}/${req.session.currFn}`
            })).url;
            req.session.currUrl = url;
            req.session.currContent = input["contentUpdate"];
            await Document.findOneAndUpdate({ filename: req.session.currFn }, { url });
            req.flash("success", "Successfully saved file.");
        } else if (input.hasOwnProperty("getDoc")) {
            const doc = await Document.findById(Object.keys(input["getDoc"])[0]);
            if (!doc) {
                req.flash("error", "Document does not exist.");
                return (next);
            }
            const docUrl = doc.url;
            const content = await axios.get(docUrl);
            req.session.currContent = content.data;
            req.session.currUrl = docUrl;
            req.session.currFn = (await Document.findOne({ url: docUrl })).filename;
        } else if (input.hasOwnProperty("dirName")) {
            const dirName = input["dirName"];
            if (!dirName) {
                req.flash("error", "Directory needs to have a name");
                return next();
            }
            const parentId = input["id"];
            let newDir;
            switch (input["type"]) {
                case "workspace":
                    newDir = new Directory({
                        name: dirName
                    });
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
        } else if (input.hasOwnProperty("dirDel")) {
            let dir;
            switch (input["type"]) {
                case "workspace":
                    dir = await Directory.findById(Object.keys(input["dirDel"])[0]);
                    if (!dir) break;
                    await deleteResources(dir, 1, `docsite/${req.user.username}/${workspace.name}/`);
                    await Workspace.findOneAndUpdate({ _id: workspace._id }, { $pull: { directories: dir._id } });
                    await Directory.deleteOne({ _id: dir._id });
                    break;
                case "dir":
                    dir = await Directory.findById(Object.keys(input["dirDel"])[0]);
                    if (!dir) break;
                    await deleteResources(dir, 1, `docsite/${req.user.username}/${workspace.name}/`);
                    await Subdirectory.findOneAndUpdate({ subdirectories: { $in: dir._id } }, { $pull: { subdirectories: dir._id } });
                    await Directory.deleteOne({ _id: dir._id });
                    break;
                case "subdir":
                    dir = await Subdirectory.findById(Object.keys(input["dirDel"])[0]);
                    if (!dir) break;
                    await deleteResources(dir, 0, `docsite/${req.user.username}/${workspace.name}/`);
                    await Directory.findOneAndUpdate({ subdirectories: { $in: dir._id } }, { $pull: { subdirectories: dir._id } });
                    await Subdirectory.deleteOne({ _id: dir._id });
                    break;
            }
            if (!dir) {
                req.flash("error", "Directory does not exist.");
                return (next);
            }
        } else if (input.hasOwnProperty("docDel")) {
            const doc = await Document.findById(Object.keys(input["docDel"])[0]);
            if (!doc) {
                req.flash("error", "Document does not exist.");
                return (next);
            }
            await cloudinary.cloudinary.uploader.destroy(`docsite/${req.user.username}/${workspace.name}/${doc.filename}`, {
                resource_type: "raw"
            });
            // - NEED TO PULL FROM WORKSPACE/DIR/SUBDIR BEFORE DELETING
            // - NEED TO ADD THE FORM TO ALL BUTTONS
            await Document.deleteOne({ _id: doc._id });
            req.flash("success", "Successfully deleted document");
        }
        next();
    }),
    newWorkspace: catchAsync(async (req, res, next) => {
        const { name } = req.body;
        const workspace = new Workspace({
            name,
            author: req.user._id
        });
        await workspace.save();
        res.redirect(`/${req.user._id}`);
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

const deleteResources = async function (dir, isItDir, pathPrefix) {
    if (dir.documents.length) {
        for (let docId of dir.documents) {
            const doc = await Document.findById(docId);
            if (isItDir) {
                await Directory.findOneAndUpdate({ _id: dir._id }, { $pull: { documents: docId } });
            } else {
                await Subdirectory.findOneAndUpdate({ _id: dir._id }, { $pull: { documents: docId } });
            }
            await cloudinary.cloudinary.uploader.destroy(pathPrefix + `${doc.filename}`, {
                resource_type: "raw"
            });
            await Document.deleteOne({ _id: docId })
        }
    }
    if (dir.subdirectories.length) {
        for (let subdirId of dir.subdirectories) {
            let subdir;
            if (isItDir) {
                subdir = await Subdirectory.findById(subdirId);
            } else {
                subdir = await Directory.findById(subdirId);
            }
            deleteResources(subdir, isItDir ? 0 : 1, pathPrefix);
            if (isItDir) {
                await Directory.findOneAndUpdate({ _id: dir._id }, { $pull: { subdirectories: subdir._id } });
                await Subdirectory.deleteOne({ _id: subdir._id });
            } else {
                await Subdirectory.findOneAndUpdate({ _id: dir._id }, { $pull: { subdirectories: subdir._id } });
                await Directory.deleteOne({ _id: subdir._id });
            }
        }
    }
}