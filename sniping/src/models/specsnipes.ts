var mongoose   = require("mongoose"),
    Schema     = mongoose.Schema;
var SpecsnipesSchema = new Schema(
    {
        userId: { type: Number, required: true },
        mintAddr: { type: String, required: true },
        takeProfit: { type: Number, required: true },
        stopLoss: { type: Number, required: true },
        slippage: { type: Number, required: true },
        snipeAmount: { type: Number, required: true },
        tokenAmount: { type: Number, required: true },
        buyTx: { type: String, default: null },
        sellTx: { type: String, default: null },
        status: { type: String, default: null },
    },
    { timestamps: true }
);

module.exports = mongoose.model(
    "Specsnipes",
    SpecsnipesSchema,
    "specsnipes"
);