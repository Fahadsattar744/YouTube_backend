 import { Router } from "express";
import { loginUser, logoutUser, refreshAccessToken, registerUser } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"
import { verfiyJTW } from "../middlewares/auth.middleware.js";

 const router = Router();

 router.route("/register").post(
    upload.fields([
        {
            name:"avatar",
        maxCount:1
    },
        
        {
            name:"coverImage",
            maxCount:1,

        }
    ]),
    registerUser
) 

router.route('/login').post(loginUser
)

//secured Routes
router.route("/logout").post(
    verfiyJTW,
    logoutUser
)
router.route('/refreshToken').post(
    refreshAccessToken
)

 export default router