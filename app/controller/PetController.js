const Pet = require("../model/Pet");
const Shelter = require("../model/Shelter");
const { Validator } = require("node-input-validator");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

class PetController {

    // ✅ Helper to validate ObjectId
    static isValidObjectId(id) {
        return mongoose.Types.ObjectId.isValid(id);
    }

    // Create Pet
    async createPet(req, res) {
        try {
            const v = new Validator(req.body, {
                name: "required|string",
                species: "required|string",
                breed: "required|string",
                age: "required|integer",
                gender: "required|string|in:Male,Female",
                description: "string",
                status: "string|in:available,adopted",
                shelterId: "string"
            });
            const matched = await v.check();
            if (!matched) return res.status(422).json({ status: false, errors: v.errors });

            const { name, species, breed, age, gender, description, status, shelterId } = req.body;
            const image = req.file ? `/uploads/${req.file.filename}` : '';

            let finalShelterId;
            if (req.user.role === "admin") {
                if (!shelterId || !PetController.isValidObjectId(shelterId)) {
                    return res.status(400).json({ status: false, message: "Admin must provide a valid shelterId" });
                }
                finalShelterId = new mongoose.Types.ObjectId(shelterId);
            } else {
                const shelter = await Shelter.findOne({ userId: req.user.id }).lean();
                if (!shelter) return res.status(400).json({ status: false, message: "No shelter found for this user" });
                finalShelterId = shelter._id;
            }

            const pet = new Pet({
                shelterId: finalShelterId,
                name, species, breed, age, gender, image, description, status: status || "available"
            });

            await pet.save();
            return res.status(201).json({ status: true, message: "Pet added successfully", data: pet });

        } catch (err) {
            if (req.file) fs.unlinkSync(path.join(__dirname, "..", "uploads", req.file.filename));
            return res.status(500).json({ status: false, message: err.message });
        }
    }

    // Update Pet
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

            if (!PetController.isValidObjectId(req.params.id))
                return res.status(400).json({ status: false, message: "Invalid Pet ID" });

            // Find condition
            let condition;
            if (req.user.role === "admin") {
                condition = { _id: new mongoose.Types.ObjectId(req.params.id) };
            } else {
                const shelter = await Shelter.findOne({ userId: req.user.id }).lean();
                if (!shelter) return res.status(400).json({ status: false, message: "No shelter found for this user" });
                condition = { _id: new mongoose.Types.ObjectId(req.params.id), shelterId: shelter._id };
            }

            // Then find the pet
            const pet = await Pet.findOne(condition);
            if (!pet) return res.status(404).json({ status: false, message: "Pet not found or not yours" });


            // Delete old image if new one uploaded
            if (req.file && pet.image) {
                const oldImagePath = path.join(__dirname, "..", "..", "uploads", path.basename(pet.image));
                if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
            }

            // Update pet fields + new image
            Object.assign(pet, req.body);
            if (req.file) pet.image = `/uploads/${req.file.filename}`;

            const updatedPet = await pet.save(); // save updated document

            return res.status(200).json({ status: true, message: "Pet updated successfully", data: updatedPet });

        } catch (err) {
            return res.status(500).json({ status: false, message: err.message });
        }
    }


    // Delete Pet
    async deletePet(req, res) {
        try {
            if (!PetController.isValidObjectId(req.params.id))
                return res.status(400).json({ status: false, message: "Invalid Pet ID" });

            let condition;
            if (req.user.role === "admin") {
                condition = { _id: new mongoose.Types.ObjectId(req.params.id) };
            } else {
                // Find shelter linked to this user
                const shelter = await Shelter.findOne({ userId: req.user.id }).lean();
                if (!shelter)
                    return res.status(400).json({ status: false, message: "No shelter found for this user" });

                condition = { _id: new mongoose.Types.ObjectId(req.params.id), shelterId: shelter._id };
            }

            const pet = await Pet.findOne(condition);
            if (!pet) return res.status(404).json({ status: false, message: "Pet not found or not yours" });

            // Delete old image if exists
            if (pet.image) {
                const imagePath = path.join(__dirname, "..", "..", "uploads", path.basename(pet.image));
                if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
            }

            await Pet.deleteOne({ _id: pet._id });
            return res.status(200).json({ status: true, message: "Pet and image deleted successfully" });

        } catch (err) {
            return res.status(500).json({ status: false, message: err.message });
        }
    }

    // Change Pet Status
    async changePetStatus(req, res) {
        try {
            const v = new Validator(req.body, { status: "required|string|in:available,adopted" });
            const matched = await v.check();
            if (!matched) return res.status(422).json({ status: false, errors: v.errors });

            if (!PetController.isValidObjectId(req.params.id))
                return res.status(400).json({ status: false, message: "Invalid Pet ID" });

            const pet = await Pet.findByIdAndUpdate(
                new mongoose.Types.ObjectId(req.params.id),
                { status: req.body.status },
                { new: true }
            ).lean();

            if (!pet) return res.status(404).json({ status: false, message: "Pet not found" });

            return res.status(200).json({ status: true, message: `Pet status updated to ${req.body.status}`, data: pet });

        } catch (err) {
            return res.status(500).json({ status: false, message: err.message });
        }
    }

    // List Pets
    async listPets(req, res) {
        try {
            const matchStage = req.user?.role === "admin" ? {} : { status: "available" };
            const pets = await Pet.find(matchStage).lean();

            const validShelterIds = pets
                .filter(p => p.shelterId && PetController.isValidObjectId(p.shelterId))
                .map(p => new mongoose.Types.ObjectId(p.shelterId));

            const shelters = await Shelter.find({ _id: { $in: validShelterIds } })
                .select("name address contact").lean();

            const shelterMap = {};
            shelters.forEach(s => shelterMap[s._id.toString()] = s);

            const result = pets.map(p => ({ ...p, shelter: p.shelterId ? shelterMap[p.shelterId.toString()] || null : null }));
            return res.status(200).json({ status: true, data: result });

        } catch (err) {
            return res.status(500).json({ status: false, message: err.message });
        }
    }

    // Pet Details
    async petDetails(req, res) {
        try {
            if (!PetController.isValidObjectId(req.params.id))
                return res.status(400).json({ status: false, message: "Invalid Pet ID" });

            const pet = await Pet.findById(new mongoose.Types.ObjectId(req.params.id)).lean();
            if (!pet) return res.status(404).json({ status: false, message: "Pet not found" });

            let shelter = null;
            if (pet.shelterId && PetController.isValidObjectId(pet.shelterId)) {
                shelter = await Shelter.findById(new mongoose.Types.ObjectId(pet.shelterId))
                    .select("name address contact").lean();
            }

            return res.status(200).json({ status: true, data: { ...pet, shelter } });
        } catch (err) {
            return res.status(500).json({ status: false, message: err.message });
        }
    }

    // Browse Pets by species, breed, age
    async browsePets(req, res) {
        try {
            const { species, breed, age } = req.query;
            let filters = { status: "available" };
            if (species) filters.species = species;
            if (breed) filters.breed = breed;
            if (age) filters.age = parseInt(age);

            const pets = await Pet.find(filters).lean();

            const validShelterIds = pets
                .filter(p => p.shelterId && PetController.isValidObjectId(p.shelterId))
                .map(p => new mongoose.Types.ObjectId(p.shelterId));

            const shelters = await Shelter.find({ _id: { $in: validShelterIds } })
                .select("name address contact").lean();

            const shelterMap = {};
            shelters.forEach(s => shelterMap[s._id.toString()] = s);

            const result = pets.map(p => ({
                ...p,
                shelter: p.shelterId ? shelterMap[p.shelterId.toString()] || null : null
            }));

            return res.status(200).json({ status: true, data: result });

        } catch (err) {
            return res.status(500).json({ status: false, message: err.message });
        }
    }

}

module.exports = new PetController();
