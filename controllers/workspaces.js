const catchAsync = require("../utils/catchAsync");
const Workspace = require("../models/workspace");
const Document = require("../models/document");
const Directory = require("../models/directory");
const Subdirectory = require("../models/subdirectory");
const User = require("../models/user")
const ExpressError = require("../utils/ExpressError");
const ejs = require('ejs');
const ObjectID = require('mongodb').ObjectID;

module.exports = {
    renderWorkspace: catchAsync(async (req, res, next) => {
        const { id } = req.params;
        if (!ObjectID.isValid(id)) {
            return next(new ExpressError("Invalid Id", 400));
        }
        const workspace = await Workspace.findById(id);
        await populateWorkspace(workspace, id);
        res.render("workspaces/show", { workspace });
    }),
    addToWorkspace: catchAsync(async (req, res, next) => {
        const { id } = req.params;
        if (!ObjectID.isValid(id)) {
            return next(new ExpressError("Invalid Id", 400));
        }
        const input = req.body;
        let workspace = await Workspace.findById(id);
        if (input.hasOwnProperty("workspace-doc")) {
            const docName = input["workspace-doc"];
            const docContent = input["content"];
            const newDoc = new Document({
                name: docName,
                content: docContent
            });
            workspace.documents.push(newDoc);
            await newDoc.save();
            await workspace.save();
        } else if (input.hasOwnProperty("workspace-dir")) {
            const dirName = input["workspace-dir"];
            const newDir = new Directory({
                name: dirName
            });
            workspace.directories.push(newDir);
            await newDir.save();
            await workspace.save();
        } else if (input.hasOwnProperty("dir-of-dir")) {
            const subDirName = Object.values(input["dir-of-dir"])[0];
            const subDir = new Subdirectory({
                name: subDirName
            });
            const parentDir = await Directory.findById(Object.keys(input["dir-of-dir"])[0]);
            parentDir.subdirectories.push(subDir);
            await subDir.save();
            await parentDir.save();
        } else if (input.hasOwnProperty("doc-of-dir")) {
            const docName = Object.values(input["doc-of-dir"])[0];
            const docContent = input["content"];
            const newDoc = new Document({
                name: docName,
                content: docContent
            });
            const parentDir = await Directory.findById(Object.keys(input["doc-of-dir"])[0]);
            parentDir.documents.push(newDoc);
            await newDoc.save();
            await parentDir.save();
        } else if (input.hasOwnProperty("dir-of-subdir")) {
            const dirName = Object.values(input["dir-of-subdir"])[0];
            const dir = new Directory({
                name: dirName
            });
            console.log(Object.keys(input["dir-of-subdir"])[0]);
            const parentDir = await Subdirectory.findById(Object.keys(input["dir-of-subdir"])[0]);
            console.log(parentDir);
            parentDir.subdirectories.push(dir);
            await dir.save();
            await parentDir.save();
        } else if (input.hasOwnProperty("doc-of-subdir")) {
            const docName = Object.values(input["doc-of-subdir"])[0];
            const docContent = input["content"];
            const newDoc = new Document({
                name: docName,
                content: docContent
            });
            const parentDir = await Subdirectory.findById(Object.keys(input["doc-of-subdir"])[0]);
            parentDir.documents.push(newDoc);
            await newDoc.save();
            await parentDir.save();
        }
        workspace = await Workspace.findById(id);
        await populateWorkspace(workspace, id);
        res.render("workspaces/show", { workspace });
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
