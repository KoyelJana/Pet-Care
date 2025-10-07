const jwt=require('jsonwebtoken')


const adminAuth = (req, res, next) => {
  if (req.cookies && req.cookies.adminToken) {
    jwt.verify(req.cookies.adminToken,
      "adminlogineuieioewhre",
      (err, data) => {
        if (!err) {
          req.user = data;
          next();
           console.log('user data',req.user);
        } else {
          req.flash("error_msg", "You need to login first!!");
          res.redirect("/admin/login");
        }
      }
     
      
    );
  } else {
    console.log("admin cookie data not found");
    req.flash("error_msg", "You need to login first!!");
    res.redirect("/admin/login");
  }
};


module.exports=adminAuth