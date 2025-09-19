const Shelter = require("../model/Shelter");
const { Validator } = require("node-input-validator");
const mongoose = require("mongoose");

class ShelterController {
    // Create Shelter (default unverified)
    async createShelter(req, res) {
        try {
            const v = new Validator(req.body, {
                name: "required|string",
                address: "required|string",
                contact: "required|string|minLength:10|maxLength:10"
            });
            const matched = await v.check();
            if (!matched) return res.status(422).json({ status: false, errors: v.errors });

            const { name, address, contact } = req.body;

            const shelter = new Shelter({
                userId: req.user.id, // from token
                name,
                address,
                contact,
                verified: false // stays false until admin verifies
            });

            await shelter.save();
            return res.status(201).json({
                status: true,
                message: "Shelter created successfully, pending admin verification",
                data: shelter
            });
        } catch (err) {
            return res.status(500).json({ status: false, message: err.message });
        }
    }

    // Admin verifies a shelter
    async verifyShelter(req, res) {
        try {
            const shelter = await Shelter.findByIdAndUpdate(
                req.params.id,
                { verified: true },
                { new: true }
            );

            if (!shelter) return res.status(404).json({ status: false, message: "Shelter not found" });

            return res.status(200).json({ status: true, message: "Shelter verified successfully", data: shelter });
        } catch (err) {
            return res.status(500).json({ status: false, message: err.message });
        }
    }

    // Update Shelter (shelter owner can edit their info)
    async updateShelter(req, res) {
        try {
            const v = new Validator(req.body, {
                name: "string",
                address: "string",
                contact: "string|minLength:10|maxLength:10"
            });
            const matched = await v.check();
            if (!matched) return res.status(422).json({ status: false, errors: v.errors });

            const shelter = await Shelter.findOneAndUpdate(
                { _id: req.params.id, userId: req.user.id },
                req.body,
                { new: true }
            );

            if (!shelter) return res.status(404).json({ status: false, message: "Shelter not found or not yours" });

            return res.status(200).json({ status: true, message: "Shelter updated", data: shelter });
        } catch (err) {
            return res.status(500).json({ status: false, message: err.message });
        }
    }


    // List all shelters (Admin only)
    async ShelterList(req, res) {
        try {
            const shelters = await Shelter.aggregate([
                {
                    $lookup: {
                        from: "users",
                        localField: "userId",
                        foreignField: "_id",
                        as: "userInfo"
                    }
                },
                { $unwind: "$userInfo" },
                {
                    $project: {
                        _id: 1,
                        name: 1,
                        address: 1,
                        contact: 1,
                        verified: 1,
                        "userInfo.name": 1,
                        "userInfo.email": 1
                    }
                }
            ]);
            return res.status(200).json({ status: true, data: shelters });
        } catch (err) {
            return res.status(500).json({ status: false, message: err.message });
        }
    }

    // View Shelter with its pets (Aggregation)
    async ShelterDetails(req, res) {
        try {
            const shelterId = new mongoose.Types.ObjectId(req.params.id);

            const data = await Shelter.aggregate([
                { $match: { _id: shelterId } },
                {
                    $lookup: {
                        from: "pets",
                        localField: "_id",
                        foreignField: "shelterId",
                        as: "pets"
                    }
                },
                {
                    $project: {
                        userId: 0 // hide userId field
                    }
                }
            ]);

            if (!data.length) {
                return res.status(404).json({ status: false, message: "Shelter not found" });
            }

            return res.status(200).json({ status: true, data: data[0] });
        } catch (err) {
            return res.status(500).json({ status: false, message: err.message });
        }
    }


    // View applications for shelter's pets (Aggregation)
    async applications(req, res) {
        try {
            const shelterId = new mongoose.Types.ObjectId(req.user.id);

            const apps = await Shelter.aggregate([
                { $match: { userId: shelterId } },
                {
                    $lookup: {
                        from: "applications",
                        localField: "_id",
                        foreignField: "shelterId",
                        as: "applications"
                    }
                },
                {
                    $project: {
                        name: 1,
                        applications: 1
                    }
                }
            ]);

            return res.status(200).json({ status: true, data: apps });
        } catch (err) {
            return res.status(500).json({ status: false, message: err.message });
        }
    }
}

module.exports = new ShelterController();
