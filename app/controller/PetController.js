const Pet = require("../model/Pet");
const { Validator } = require("node-input-validator");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const Shelter = require("../model/Shelter");

class PetController {
    // Create Pet (Shelter or Admin)
    async createPet(req, res) {
        try {
            const v = new Validator(req.body, {
                name: "required|string",
                species: "required|string",
                breed: "required|string",
                age: "required|integer",
                gender: "required|string|in:Male,Female",
                description: "string",
                status: "string|in:available,adopted"
            });
            const matched = await v.check();
            if (!matched) {
                return res.status(422).json({ status: false, errors: v.errors });
            }

            const { name, species, breed, age, gender, description, status, shelterId } = req.body;
            const image = req.file ? `/uploads/${req.file.filename}` : '';

            let finalShelterId;

            if (req.user.role === "admin") {
                // Admin chooses which shelter this pet belongs to
                finalShelterId = new mongoose.Types.ObjectId(shelterId);
            } else {
                // Find shelter by userId
                const shelter = await Shelter.findOne({ userId: req.user.id });
                if (!shelter) {
                    return res.status(400).json({ status: false, message: "No shelter found for this user" });
                }
                finalShelterId = shelter._id;
            }

            const pet = new Pet({
                shelterId: finalShelterId,
                name,
                species,
                breed,
                age,
                gender,
                image,
                description,
                status: status || "available"
            });

            await pet.save();
            return res.status(201).json({ status: true, message: "Pet added successfully", data: pet });
        } catch (err) {
            // cleanup uploaded file if DB save fails
            if (req.file) {
                fs.unlink(path.join(__dirname, "..", "uploads", req.file.filename), () => { });
            }
            return res.status(500).json({ status: false, message: err.message });
        }
    }

    // Update Pet (Shelter or Admin)
    async updatePet(req, res) {
        try {
            const v = new Validator(req.body, {
                name: "string",
                species: "string",
                breed: "string",
                age: "integer",
                gender: "string|in:Male,Female",
                description: "string",
                status: "string|in:available,adopted"
            });
            const matched = await v.check();
            if (!matched) return res.status(422).json({ status: false, errors: v.errors });

            const condition =
                req.user.role === "admin"
                    ? { _id: req.params.id }
                    : { _id: req.params.id, shelterId: req.user.id };

            // Find existing pet
            const item = await Pet.findOne(condition);
            if (!item) {
                return res.status(404).json({ status: false, message: "Pet not found or not yours" });
            }

            // If old image exists, delete it
            if (req.file && item.image) {
                const imageFileName = path.basename(item.image);
                const imagePath = path.join(__dirname, '..', '..', 'uploads', imageFileName);
                fs.unlink(imagePath, (error) => {
                    if (error) {
                        console.log("Failed to delete old image");
                    } else {
                        console.log("Old image deleted successfully");
                    }
                });
            }

            // Update image only if a new one was uploaded
            // if (req.file) {
            //     item.image = `/uploads/${req.file.filename}`;
            // }

            await item.save();
            // Update pet info (keep old image if no new one uploaded)
            const pet = await Pet.findOneAndUpdate(
                condition,
                { ...req.body, image: req.file ? `/uploads/${req.file.filename}` : item.image },
                { new: true }
            );

            return res.status(200).json({ status: true, message: "Pet updated successfully", data: pet });
        } catch (err) {
            return res.status(500).json({ status: false, message: err.message });
        }
    }

    // Delete Pet (Shelter or Admin)
    async deletePet(req, res) {
        try {
            const condition =
                req.user.role === "admin"
                    ? { _id: req.params.id }
                    : { _id: req.params.id, shelterId: req.user.id };

            // First find the pet
            const item = await Pet.findOne(condition);
            if (!item) {
                return res.status(404).json({ status: false, message: "Pet not found or not yours" });
            }

            // If old image exists, delete it
            if (item.image) {
                const imageFileName = path.basename(item.image);
                const imagePath = path.join(__dirname, '..', '..', 'uploads', imageFileName);
                fs.unlink(imagePath, (error) => {
                    if (error) {
                        console.log("Failed to delete image");
                    } else {
                        console.log("Old image deleted successfully");
                    }
                });
            }

            // Delete pet record from DB
            await Pet.deleteOne({ _id: item._id });

            return res.status(200).json({ status: true, message: "Pet and image deleted successfully" });
        } catch (err) {
            return res.status(500).json({ status: false, message: err.message });
        }
    }

    // Admin: Change Pet Status (adopted/available)
    async changePetStatus(req, res) {
        try {
            const v = new Validator(req.body, {
                status: "required|string|in:available,adopted"
            });
            const matched = await v.check();
            if (!matched) return res.status(422).json({ status: false, errors: v.errors });

            const pet = await Pet.findByIdAndUpdate(
                req.params.id,
                { status: req.body.status },
                { new: true }
            );

            if (!pet) return res.status(404).json({ status: false, message: "Pet not found" });

            return res.status(200).json({
                status: true,
                message: `Pet status updated to ${req.body.status}`,
                data: pet
            });
        } catch (err) {
            return res.status(500).json({ status: false, message: err.message });
        }
    }

    // List Pets (Public: available only, Admin: all)
    async listPets(req, res) {
        try {
            const matchStage = req.user?.role === "admin" ? {} : { status: "available" };

            console.log("matchStage:", matchStage);
            const pets = await Pet.aggregate([
                { $match: matchStage },
                {
                    $lookup: {
                        from: "shelters",
                        localField: "shelterId",
                        foreignField: "_id",
                        as: "shelter"
                    }
                },
                { $unwind: "$shelter" },
                {
                    $project: {
                        _id: 1,
                        name: 1,
                        species: 1,
                        breed: 1,
                        age: 1,
                        gender: 1,
                        image: 1,
                        description: 1,
                        status: 1,
                        createdAt: 1,
                        "shelter.name": 1,
                        "shelter.address": 1,
                        "shelter.contact": 1
                    }
                }
            ]);
            console.log("Pets found:", pets);


            return res.status(200).json({ status: true, data: pets });
        } catch (err) {
            return res.status(500).json({ status: false, message: err.message });
        }
    }

    // Pet Details (Public/Admin)
    async petDetails(req, res) {
        try {
            const petId = new mongoose.Types.ObjectId(req.params.id);
            const data = await Pet.aggregate([
                { $match: { _id: petId } },
                {
                    $lookup: {
                        from: "shelters",
                        localField: "shelterId",
                        foreignField: "_id",
                        as: "shelter"
                    }
                },
                { $unwind: "$shelter" },
                {
                    $project: {
                        "shelter.userId": 0
                    }
                }
            ]);

            if (!data.length) return res.status(404).json({ status: false, message: "Pet not found" });

            return res.status(200).json({ status: true, data: data[0] });
        } catch (err) {
            return res.status(500).json({ status: false, message: err.message });
        }
    }
}

module.exports = new PetController();
