const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const SubdirectorySchema = new Schema({
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
                ref: "Directory"
            }
        ],
        required: true
    }
})

module.exports = mongoose.model("Subdirectory", SubdirectorySchema);
