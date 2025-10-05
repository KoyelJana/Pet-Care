const Application = require("../model/Application");
const Pet = require("../model/Pet");
const Shelter = require("../model/Shelter");
const { Validator } = require("node-input-validator");
const mongoose = require("mongoose");

class ApplicationController {
  // Adopter applies for a pet
  async createApplication(req, res) {
    try {
      const v = new Validator(req.body, {
        petId: "required|string",
        message: "required|string"
      });
      const matched = await v.check();
      if (!matched) return res.status(422).json({ status: false, errors: v.errors });

      const pet = await Pet.findById(req.body.petId);
      if (!pet) return res.status(404).json({ status: false, message: "Pet not found" });

      // Get shelter from pet
      const shelterId = pet.shelterId;

      const application = new Application({
        petId: pet._id,
        adopterId: req.user.id, // from token
        shelterId,
        message: req.body.message,
        status: "pending"
      });

      await application.save();
      return res.status(201).json({ status: true, message: "Application submitted", data: application });
    } catch (err) {
      return res.status(500).json({ status: false, message: err.message });
    }
  }

  // Shelter or Admin views applications for their pets
  async listApplications(req, res) {
    try {
      const matchStage =
        req.user.role === "admin"
          ? {}
          : { shelterId: new mongoose.Types.ObjectId(req.user.shelterId) };

      const applications = await Application.aggregate([
        { $match: matchStage },
        {
          $lookup: {
            from: "pets",
            localField: "petId",
            foreignField: "_id",
            as: "pet"
          }
        },
        { $unwind: "$pet" },
        {
          $lookup: {
            from: "users",
            localField: "adopterId",
            foreignField: "_id",
            as: "adopter"
          }
        },
        { $unwind: "$adopter" },
        {
          $project: {
            _id: 1,
            message: 1,
            status: 1,
            submittedOn: 1,
            "pet.name": 1,
            "pet.species": 1,
            "pet.breed": 1,
            "adopter.name": 1,
            "adopter.email": 1
          }
        }
      ]);

      return res.status(200).json({ status: true, data: applications });
    } catch (err) {
      return res.status(500).json({ status: false, message: err.message });
    }
  }

  // Shelter or Admin updates application status
  async updateApplicationStatus(req, res) {
    try {
      const v = new Validator(req.body, {
        status: "required|string|in:pending,approved,rejected"
      });
      const matched = await v.check();
      if (!matched) return res.status(422).json({ status: false, errors: v.errors });

      const condition =
        req.user.role === "admin"
          ? { _id: req.params.id }
          : { _id: req.params.id, shelterId: req.user.shelterId };

      const application = await Application.findOneAndUpdate(
        condition,
        { status: req.body.status },
        { new: true }
      );

      if (!application) {
        return res.status(404).json({ status: false, message: "Application not found or not yours" });
      }

      return res.status(200).json({ status: true, message: "Application updated", data: application });
    } catch (err) {
      return res.status(500).json({ status: false, message: err.message });
    }
  }


  //Track application status
  async myApplications(req, res) {
    try {
      const adopterId = new mongoose.Types.ObjectId(req.user.id);

      const applications = await Application.aggregate([
        { $match: { adopterId } },
        {
          $lookup: {
            from: "pets",
            localField: "petId",
            foreignField: "_id",
            as: "pet"
          }
        },
        { $unwind: "$pet" },
        {
          $project: {
            _id: 1,
            message: 1,
            status: 1,
            submittedOn: 1,
            "pet.name": 1,
            "pet.species": 1,
            "pet.breed": 1,
            "pet.age": 1,
            "pet.image": 1
          }
        }
      ]);

      return res.status(200).json({ status: true, data: applications });
    } catch (err) {
      return res.status(500).json({ status: false, message: err.message });
    }
  }
}

module.exports = new ApplicationController();
