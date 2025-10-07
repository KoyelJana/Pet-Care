const express = require('express');
const adminAuth = require('../../middleware/adminAuth');
const AdminController = require('../../controller/admin/AdminController');
const MulterImage = require('../../helper/MulterImage');
const router = express.Router();

router.get('/register', AdminController.AdminRegister)
router.post('/register/create', AdminController.AdminRegisterCreate)

router.get('/login', AdminController.AdminLogin)
router.post('/login/create', AdminController.AdminLoginCreate)

router.get('/forgot_password_link', AdminController.forgotPasswordLinkForm);
router.post('/forgot_password_link/create', AdminController.forgotPasswordLink);

router.get('/reset_password/:id/:token', AdminController.resetPasswordForm);
router.post('/reset_password/:id/:token', AdminController.resetPassword);

router.get('/dashboard', adminAuth, AdminController.Admindashboard);


//pets
router.get("/pets", adminAuth, AdminController.listAllPets);
router.get("/pets/add", adminAuth, AdminController.addPetForm);
router.post("/pets/add", adminAuth, MulterImage.single('image'),  AdminController.addPet);
router.get("/pets/edit/:id", adminAuth, AdminController.editPetForm);
router.post("/pets/edit/:id", adminAuth, MulterImage.single('image'),  AdminController.updatePet);
router.get("/pets/delete/:id", adminAuth, AdminController.deletePet);

//logout
router.get('/logout', adminAuth, AdminController.AdminLogout)

module.exports = router