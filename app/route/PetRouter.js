const express = require("express");
const router = express.Router();
const PetController = require("../controller/PetController");
const userAuth = require("../middleware/UserAuth");
const MulterImage = require("../helper/MulterImage");

router.get("/pets/browse", PetController.browsePets);   // Public filters

// Shelter or Admin
router.post("/pets/create", MulterImage.single('image'), userAuth(["shelter", "admin"]), PetController.createPet);
router.put("/pets/update/:id", MulterImage.single('image'), userAuth(["shelter", "admin"]), PetController.updatePet);
router.delete("/pets/delete/:id", userAuth(["shelter", "admin"]), PetController.deletePet);

// Admin only - change status
router.put("/pets/status/:id", userAuth("admin"), PetController.changePetStatus);

// Public (Adopters see only available pets)
router.get("/pets", PetController.listPets);
router.get("/pets/:id", PetController.petDetails);




module.exports = router;
