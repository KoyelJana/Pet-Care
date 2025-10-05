const express = require("express");
const router = express.Router();
const ApplicationController = require("../controller/ApplicationController");
const userAuth = require("../middleware/UserAuth");

// Adopter only
router.post("/applications/create", userAuth("adopter"), ApplicationController.createApplication);
router.get("/applications/my", userAuth("adopter"), ApplicationController.myApplications);

// Shelter/Admin
router.get("/applications", userAuth(["shelter", "admin"]), ApplicationController.listApplications);
router.put("/applications/status/:id", userAuth(["shelter", "admin"]), ApplicationController.updateApplicationStatus);

module.exports = router;
