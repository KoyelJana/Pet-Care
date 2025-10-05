const mongoose = require("mongoose");

const ApplicationSchema = new mongoose.Schema({
  petId: { type: mongoose.Schema.Types.ObjectId, ref: "pet", required: true },
  adopterId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  shelterId: { type: mongoose.Schema.Types.ObjectId, ref: "shelter", required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  submittedOn: { type: Date, default: Date.now }
});

const ApplicationModel = mongoose.model("application", ApplicationSchema);

module.exports = ApplicationModel;
