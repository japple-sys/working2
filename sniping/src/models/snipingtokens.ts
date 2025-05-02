var mongoose   = require("mongoose"),
    Schema     = mongoose.Schema;
var SnipingtokensSchema = new Schema(
    {
        mintAddr: { type: String, required: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model(
    "Snipingtokens",
    SnipingtokensSchema,
    "snipingtokens"
);