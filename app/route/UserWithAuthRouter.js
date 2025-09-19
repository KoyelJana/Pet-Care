const express = require('express');
const userAuth = require('../middleware/UserAuth');
const UserwithAuthController = require('../controller/UserwithAuthController');
const router = express.Router();

router.post('/register', UserwithAuthController.UserRegister);
router.post('/verify-otp', UserwithAuthController.verifiotp);
router.post('/login', UserwithAuthController.UserLogin);
router.get('/profile', userAuth(["admin", "shelter", "user"]), UserwithAuthController.getProfile);
router.post('/profile/update', userAuth(["admin", "shelter", "user"]), UserwithAuthController.updateProfile);


module.exports = router