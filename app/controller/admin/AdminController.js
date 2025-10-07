const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Validator } = require('node-input-validator');
const UserModel = require('../../model/User');
const sendEmailVerificationOTP = require('../../helper/SendMail');
const EmailVerificationModel = require('../../model/otpModel');
const transporter = require('../../config/emailConfig');
const fs = require("fs");
const path = require("path");
const Pet=require('../../model/Pet')
const Shelter = require("../../model/Shelter");
const mongoose = require("mongoose");

class AdminController {

    //Admin register form
    async AdminRegister(req, res) {
        try {
            res.render('admin/Admin_register', { 
                title: 'Admin Register Page',
                message: req.flash('message')
            });
        } catch (error) {
            console.error(error);
        }
    }

    //create Admin register
    async AdminRegisterCreate(req, res) {
        try {
            const v = new Validator(req.body, {
                name: "required|string",
                email: "required|email",
                phone: "required|string",
                password: "required|string|minLength:6"
            });

            const matched = await v.check();
            if (!matched) {
                return res.status(400).json({
                    success: false,
                    message: v.errors   // frontend will parse this
                });
            }

            const { name, email, phone, password } = req.body;

            const salt = await bcrypt.genSalt(10);
            const hashPassword = await bcrypt.hash(password, salt);

            const user = await UserModel.create({
                name,
                email,
                phone,
                password: hashPassword
            });

            sendEmailVerificationOTP(req, user);

            if (user) {
                return res.status(200).json({
                    success: true,
                    message: "User data created successfully",
                    redirectUrl: "/admin/login"
                });
            } else {
                return res.status(500).json({
                    success: false,
                    message: "Failed to register"
                });
            }

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                success: false,
                message: "Server error"
            });
        }
    }

    //Admin login form
    async AdminLogin(req, res) {
        try {
            res.render('admin/Admin_login', {
                title: 'Admin login Page',
                message: req.flash('message')
            });
        } catch (error) {
            console.error(error);
        }
    }

    //create admin login
    async AdminLoginCreate(req, res) {
        try {
            const { email, password } = req.body;

            // 1. Basic validation
            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: "All input fields are required"
                });
            }

            // 2. Find user
            const user = await UserModel.findOne({ email });
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "User not found"
                });
            }

            // 3. Check password
            const isMatchPassword = await bcrypt.compare(password, user.password);
            if (!isMatchPassword) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid password"
                });
            }

            // 4. Check email verification
            // if (!user.isVerified) {
            //     return res.status(403).json({
            //         success: false,
            //         message: "Email is not verified"
            //     });
            // }

            // 5. Check role
            if (user.role !== "admin") {
                return res.status(403).json({
                    success: false,
                    message: "You are not an admin"
                });
            }

            // 6. Generate JWT
            const token = jwt.sign(
                {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role
                },
                "adminlogineuieioewhre",
                { expiresIn: "30d" }
            );

            // 7. Set cookie + return success
            res.cookie("adminToken", token, { httpOnly: true });
            return res.status(200).json({
                success: true,
                message: "Login successful",
                redirectUrl: "/admin/dashboard"
            });

        } catch (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                message: "Server error"
            });
        }
    }


    //forgot password link form
    async forgotPasswordLinkForm(req, res) {
        try {
            res.render('admin/Admin_ForgotPassword_link', {
                title: 'Admin Forgot Password link',
                message: req.flash('message')
            });
        } catch (error) {
            console.error(error);
        }
    }

    //reset password link
    async forgotPasswordLink(req, res) {
        try {
            const { email } = req.body;
            if (!email) {
                req.flash('message', "Email field is required")
                return res.redirect('/admin/forgot_password_link')
            }
            const user = await UserModel.findOne({ email });
            if (!user) {
                req.flash('message', "Email doesn't exist")
                return res.redirect('/admin/forgot_password_link')
            }
            const secret = user._id + process.env.JWT_SECRET_KEY;
            const token = jwt.sign({ userID: user._id }, secret, { expiresIn: '20m' });
            const resetLink = `http://${req.headers.host}/admin/reset_password/${user.id}/${token}`;

            await transporter.sendMail({
                from: process.env.EMAIL_FROM,
                to: user.email,
                subject: "Password Reset Link",
                html: `<p>Hello ${user.name},</p><p>Please <a href="${resetLink}">Click here</a> to reset your password.</p>`
            });

            req.flash('message', "Password reset link send your email. Please check your email.")
            return res.redirect('/admin/login')

        } catch (error) {
            console.log(error);
        }
    }

    //reset password form
    async resetPasswordForm(req, res) {
        try {
            const { id, token } = req.params;
            const user = await UserModel.findById(id);

            if (!user) {
                console.log("Invalid or expired password reset link.");
            }

            const secret = process.env.JWT_SECRET + user.password;
            jwt.verify(token, secret, (err, decoded) => {
                if (err) {
                    console.log("Invalid or expired password reset link.");
                }

                res.render('admin/Admin_reset_password', {
                    userId: id,
                    token: token,
                    message: null,
                    title: 'Admin Reset Password'
                });
            });
        } catch (error) {
            console.error(error);
        }
    }

    //reset password
    async resetPassword(req, res) {
        try {
            const { id, token } = req.params;
            const { password, confirm_password } = req.body;

            const user = await UserModel.findById(id);
            if (!user) {
                return res.render('admin/Admin_reset_password', {
                    userId: id,
                    token: token,
                    message: "Invalid password reset link."
                });
            }

            const new_secret = user._id + process.env.JWT_SECRET_KEY;
            try {
                jwt.verify(token, new_secret);
            } catch (jwtError) {
                console.error('JWT Verification Error:', jwtError.message);
                return res.render('admin/Admin_reset_password', {
                    userId: id,
                    token: token,
                    message: "Password reset link is invalid or has expired."
                });
            }

            if (!password || !confirm_password) {
                return res.render('admin/Admin_reset_password', {
                    userId: id,
                    token: token,
                    message: "New Password and Confirm New Password are required."
                });
            }
            if (password !== confirm_password) {
                return res.render('admin/Admin_reset_password', {
                    userId: id,
                    token: token,
                    message: "Passwords do not match."
                });
            }

            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
            await user.save();

            req.flash('message', "Your password reset successfully")
            return res.redirect('/admin/login');

        } catch (error) {
            console.error('An unexpected error occurred:', error);
            return res.render('admin/Admin_reset_password', {
                userId: req.params.id,
                token: req.params.token,
                message: "Unable to reset password. Please try again later."
            });
        }
    }

    //Admin Dashboard
    async Admindashboard(req, res) {
        try {
            res.render('admin/Admin_dashboard', {
                title: "admin_dashboard",
                user: req.user
            })
        } catch (error) {
            console.log(error);
        }
    }

    //logout
    async AdminLogout(req, res) {
        res.clearCookie('adminToken')
        res.redirect('/admin/login')
    }


    //List all pets
    async listAllPets(req, res) {
        try {
            const pets = await Pet.aggregate([
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
                        status: 1,
                        image: 1,
                        description: 1,
                        createdAt: 1,
                        "shelter.name": 1
                    }
                }
            ]);

            res.render("admin/List_pets", {
                title: "Manage Pets",
                pets,
                message: req.flash("message"),
                user: req.user
            });
        } catch (err) {
            res.status(500).send("Server error: " + err.message);
        }
    }

    //Add Pet Form
    async addPetForm(req, res) {
        const shelters = await Shelter.find({}, "_id name");
        res.render("admin/Add_pet", {
            title: "Add Pet",
            shelters,
            message: req.flash("message"),
            user: req.user
        });
    }

    //Add Pet
    async addPet(req, res) {
        try {
            const { name, species, breed, age, gender, description, status, shelterId } = req.body;
            const image = req.file ? `/uploads/${req.file.filename}` : '';

            const pet = await Pet.create({
                shelterId: new mongoose.Types.ObjectId(shelterId),
                name,
                species,
                breed,
                age,
                gender,
                image,
                description,
                status: status || "available"
            });

            req.flash("message", "Pet added successfully");
            res.redirect("/admin/pets");
        } catch (err) {
            console.error(err);
            req.flash("message", "Error adding pet: " + err.message);
            res.redirect("/admin/pets");
        }
    }

    //Edit Pet Form
    async editPetForm(req, res) {
        const pet = await Pet.findById(req.params.id);
        const shelters = await Shelter.find({}, "_id name");
        if (!pet) {
            req.flash("message", "Pet not found");
            return res.redirect("/admin/pets");
        }

        res.render("admin/Edit_pet", {
            title: "Edit Pet",
            pet,
            shelters,
            message: req.flash("message"),
            user: req.user
        });
    }

    //Update Pet
    async updatePet(req, res) {
        try {
            const pet = await Pet.findById(req.params.id);
            if (!pet) {
                req.flash("message", "Pet not found");
                return res.redirect("/admin/pets");
            }

            // Delete old image if a new one is uploaded
            if (req.file && pet.image) {
                const oldPath = path.join(__dirname, "..", "..", pet.image);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }

            pet.name = req.body.name;
            pet.species = req.body.species;
            pet.breed = req.body.breed;
            pet.age = req.body.age;
            pet.gender = req.body.gender;
            pet.description = req.body.description;
            pet.status = req.body.status;
            pet.shelterId = new mongoose.Types.ObjectId(req.body.shelterId);
            if (req.file) pet.image = `/uploads/${req.file.filename}`;
            await pet.save();

            req.flash("message", "Pet updated successfully");
            res.redirect("/admin/pets");
        } catch (err) {
            console.error(err);
            req.flash("message", "Error updating pet");
            res.redirect("/admin/pets");
        }
    }

    // Delete Pet
    async deletePet(req, res) {
        try {
            const pet = await Pet.findById(req.params.id);
            if (!pet) {
                req.flash("message", "Pet not found");
                return res.redirect("/admin/pets");
            }

            // Delete image file
            if (pet.image) {
                const imgPath = path.join(__dirname, "..", "..", pet.image);
                if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
            }

            await Pet.deleteOne({ _id: req.params.id });
            req.flash("message", "Pet deleted successfully");
            res.redirect("/admin/pets");
        } catch (err) {
            console.error(err);
            req.flash("message", "Error deleting pet");
            res.redirect("/admin/pets");
        }
    }


}

module.exports = new AdminController()
