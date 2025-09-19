const mongoose = require("mongoose");

const ShelterSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
        name: { type: String, required: true },
        address: { type: String, required: true },
        contact: { type: String, required: true },
        verified: { type: Boolean, default: false }
    },
    { timestamps: true }
);

const ShelterModel = mongoose.model("shelter", ShelterSchema);
module.exports = ShelterModel;
