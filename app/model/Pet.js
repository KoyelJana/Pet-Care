const mongoose = require("mongoose");

const PetSchema = new mongoose.Schema(
    {
        shelterId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "shelter",
            required: true
        },
        name: { type: String, required: true },
        species: { type: String, required: true },
        breed: { type: String, required: true },
        age: { type: Number, required: true },
        gender: { type: String, enum: ["Male", "Female"], required: true },
        image: { type: String },
        description: { type: String },
        status: { type: String, enum: ["available", "adopted"], default: "available" },
        createdAt: { type: Date, default: Date.now }
    },
    { timestamps: true }
);

const PetModel = mongoose.model("pet", PetSchema);
module.exports = PetModel;
