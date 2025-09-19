const User = require('../model/User');
const bcrypt = require('bcryptjs');
const sendEmailVerificationOTP = require('../helper/SendMail');
const EmailVerificationModel = require('../model/otpModel');
const jwt = require('jsonwebtoken');
const { Validator } = require('node-input-validator');

class UserWithAuthController {

    //Register User
    async UserRegister(req, res) {
        try {
            const v = new Validator(req.body, {
                name: "required|string",
                email: "required|email",
                password: "required|string|minLength:6",
                role: "required|string|in:adopter,shelter,admin",
                contact: "string|minLength:10|maxLength:10"
            });

            const matched = await v.check();
            if (!matched) {
                return res.status(422).json({ status: false, errors: v.errors });
            }

            const { name, email, password, role, contact } = req.body;

            const existUser = await User.findOne({ email });
            if (existUser) {
                return res.status(400).json({ status: false, message: "Email already registered" });
            }

            const salt = await bcrypt.genSalt(10);
            const hashPassword = await bcrypt.hash(password, salt);

            const user = new User({
                name,
                email,
                password: hashPassword,
                role,
                contact,
                isVerified: role === "admin" ? true : false
            });

            await user.save();

            if (role === "adopter" || role === "shelter") {
                await sendEmailVerificationOTP(req, user);
            }

            return res.status(201).json({
                status: true,
                message: role === "admin"
                    ? "Admin registered successfully"
                    : "User registered successfully, OTP sent to email",
                data: user
            });
        } catch (err) {
            return res.status(500).json({ status: false, message: err.message });
        }
    }

    // Verify OTP
    async verifiotp(req, res) {
        try {
            const v = new Validator(req.body, {
                email: "required|email",
                otp: "required|string|minLength:4|maxLength:4"
            });

            const matched = await v.check();
            if (!matched) {
                return res.status(422).json({ status: false, errors: v.errors });
            }

            const { email, otp } = req.body;
            const existingUser = await User.findOne({ email });
            if (!existingUser) return res.status(404).json({ status: false, message: "Email doesn't exist" });

            if (existingUser.isVerified) {
                return res.status(400).json({ status: false, message: "Email already verified" });
            }

            const emailVerification = await EmailVerificationModel.findOne({ userId: existingUser._id, otp });
            if (!emailVerification) {
                await sendEmailVerificationOTP(req, existingUser);
                return res.status(400).json({ status: false, message: "Invalid OTP, new OTP sent" });
            }

            const expirationTime = new Date(emailVerification.createdAt.getTime() + 15 * 60 * 1000);
            if (new Date() > expirationTime) {
                await sendEmailVerificationOTP(req, existingUser);
                return res.status(400).json({ status: false, message: "OTP expired, new OTP sent" });
            }

            existingUser.isVerified = true;
            await existingUser.save();
            await EmailVerificationModel.deleteMany({ userId: existingUser._id });

            return res.status(200).json({ status: true, message: "Email verified successfully" });

        } catch (error) {
            return res.status(500).json({ status: false, message: "Unable to verify email, try again later" });
        }
    }

    //Login
    // Login
    async UserLogin(req, res) {
        try {
            const v = new Validator(req.body, {
                email: "required|email",
                password: "required|string|minLength:6"
            });

            const matched = await v.check();
            if (!matched) {
                return res.status(422).json({ status: false, errors: v.errors });
            }

            const { email, password } = req.body;
            const user = await User.findOne({ email });
            if (!user) return res.status(404).json({ status: false, message: "User not found" });

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return res.status(400).json({ status: false, message: "Invalid password" });

            if ((user.role === "adopter" || user.role === "shelter") && !user.isVerified) {
                return res.status(400).json({ status: false, message: "Email not verified" });
            }

            // Standardized payload
            const payload = {
                id: user._id.toString(),
                role: user.role,
                email: user.email,
                name: user.name
            };

            const token = jwt.sign(payload, process.env.JWT_TOKEN_SECRET_KEY, { expiresIn: "1d" });

            return res.status(200).json({
                status: true,
                message: "Login successful",
                token,
                user: payload   // return same structure
            });

        } catch (error) {
            return res.status(500).json({ status: false, message: error.message });
        }
    }


    //Get Profile
    async getProfile(req, res) {
        try {
            const user = await User.findById(req.user.id).select("-password");
            if (!user) return res.status(404).json({ status: false, message: "User not found" });

            return res.status(200).json({
                status: true,
                message: "User data fetched successfully",
                data: user
            });
        } catch (error) {
            return res.status(500).json({ status: false, message: error.message });
        }
    }


    //Update Profile
    async updateProfile(req, res) {
        try {
            const v = new Validator(req.body, {
                name: "string",
                email: "email",
                password: "string|minLength:6",
                contact: "string|minLength:10|maxLength:10"
            });

            const matched = await v.check();
            if (!matched) {
                return res.status(422).json({ status: false, errors: v.errors });
            }

            const updates = { ...req.body };
            if (updates.password) {
                const salt = await bcrypt.genSalt(10);
                updates.password = await bcrypt.hash(updates.password, salt);
            }

            const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select("-password");
            if (!user) return res.status(404).json({ status: false, message: "User not found" });

            return res.status(200).json({ status: true, message: "User Profile updated successfully", data: user });
        } catch (err) {
            return res.status(500).json({ status: false, message: err.message });
        }
    }
}

module.exports = new UserWithAuthController();
