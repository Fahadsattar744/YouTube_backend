import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/apiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
 

const registerUser = asyncHandler(async(req,res)=>{

     //get user details from front-end
     //validation

const {fullName,email,userName,password} = req.body
if(fullName==''){
   throw new ApiError(400,"full name is required")
}

if(
   [ fullName,email,userName,password].some((field)=>field?.trim()===""
)
){
   throw new ApiError(400,"All fields are required")
}
const existedUser = await User.findOne({
   $or:[
      {userName},
      {email}
   ]
})
if(existedUser){
   throw new ApiError(409,"User with email or userNmae is already exist ")
}
let coverImageLocalPath;
if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
   coverImageLocalPath= req.files?.coverImage[0].path

}
let avatarLocalPath;
if(req.files && Array.isArray(req.files.avatar) && req.files.avatar.length>0){
   avatarLocalPath= req.files?.coverImage[0].path

}

// const avatarLocalPath = await req.files?.avatar[0]?.path;


if(!avatarLocalPath){
   throw new ApiError(400,"Avatar file is required")
}
if(!coverImageLocalPath){
   throw new ApiError(400,"Avatar file is required")
}




const avatar = await uploadOnCloudinary(avatarLocalPath);
const coverImage = await uploadOnCloudinary(coverImageLocalPath);

if(!avatar){
   throw new ApiError(400,"Avatar Image required")
}
  const user = await User.create({
   fullName,
   avatar:avatar.url,
   coverImage:coverImage?.url || '',
   email,
   password,
   userName:userName.toLowerCase(),
 })

 const createdUser = await User.findById(user._id).select(
   "-password -refreshToken"
 );
 if(!createdUser){
   throw new ApiError(500,"Something went wrong while registering the user")
 }

return res.status(201).json(
   new ApiResponse(
      200,createdUser,"User Registered Successfully"
   )
)

})

export { registerUser }