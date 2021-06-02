const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const WorkspaceSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    isPublic: {
        type: Boolean,
        default: false
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    directories: {
        type: [
            {
                type: Schema.Types.ObjectId,
                ref: "Directory",
            }
        ],
        required: true
    }
});

WorkspaceSchema.add({
    documents: [
        {
            type: Schema.Types.ObjectId,
            ref: "Document",
        }
    ]
})

module.exports = mongoose.model("Workspace", WorkspaceSchema);
