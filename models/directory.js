const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const DirectorySchema = new Schema({
    name: {
        type: String,
        required: true
    },
    documents: {
        type: [
            {
                type: Schema.Types.ObjectId,
                ref: "Document"
            }
        ],
        required: true
    },
    subdirectories: {
        type: [
            {
                type: Schema.Types.ObjectId,
                ref: "Subdirectory"
            }
        ],
        required: true
    }
});

module.exports = mongoose.model("Directory", DirectorySchema);
