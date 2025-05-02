var mongoose   = require("mongoose"),
    Schema     = mongoose.Schema;
var UserSchema = new Schema(
    {
        userId: { type: Number, required: true },
        username: { type: String, required: true },
        firstname: { type: String, default: "" },
        lastname: { type: String, default: "" },
        specsnipes: { type: [String], default: [] },
        autosnipes: { type: [String], default: [] }
    },
    { timestamps: true }
);

module.exports = mongoose.model(
    "Users",
    UserSchema,
    "users"
);