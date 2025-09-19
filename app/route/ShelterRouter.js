const express = require("express");
const router = express.Router();
const ShelterController = require("../controller/ShelterController");
const userAuth = require("../middleware/UserAuth");

// Shelter-only
router.post("/shelter/create", userAuth(["admin", "shelter"]), ShelterController.createShelter);
router.put("/shelter/update/:id", userAuth(["admin", "shelter"]), ShelterController.updateShelter);
router.get("/shelter/my-applications", userAuth(["admin", "shelter"]), ShelterController.applications);

// Public
router.get("/shelter/details/:id", ShelterController.ShelterDetails);

// Admin-only
router.put("/shelter/verify/:id", userAuth("admin"), ShelterController.verifyShelter);
router.get("/shelter", userAuth("admin"), ShelterController.ShelterList);

module.exports = router;
