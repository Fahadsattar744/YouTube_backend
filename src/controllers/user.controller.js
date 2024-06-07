import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/apiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken";
 

 const generateAccessAndRefreshToken = async (userId)=>{
   try {
       const user = await  User.findById(userId) 
      const accessToken=user.generateAccessToken();
      const refreshToken=user.generateRefreshToken();
      user.refreshToken = refreshToken;
      user.save({validateBeforeSave:false});

      return {accessToken,refreshToken}




   } catch (error) {
      throw new ApiError(500,"Something went wrong while generating access and refresh token")
      
   }
 }

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



// const loginUser = asyncHandler(async (req, res) =>{
//    // req body -> data
//    // username or email
//    //find the user
//    //password check
//    //access and referesh token
//    //send cookie

//    const {email, username, password} = req.body
//    console.log(email);

const loginUser = asyncHandler( async (req,res)=>{


// const {userName,password,email} = req.body;
const {email,userName,password} = req.body


console.log("email");
console.log(email);
console.log(userName);
console.log("userName");

if(!userName && !email)
{
   throw new ApiError(400 ,"userName or email is required")
}

const user = await User.findOne({
   $or:[
      {userName},
      {email}
   ]
})
if(!user){
   throw new ApiError(404,"User does not exist")
}
const  isPasswordValid = await user.isPasswordCorrect(password);

if(!isPasswordValid){
   throw new ApiError(401,"Invalid credentials")
}

const {accessToken,refreshToken} =await generateAccessAndRefreshToken(user._id)

const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

const options ={
   httpOnly:true,
    secure:true,
}
return res.status(200)
.cookie("accessToken",accessToken,options)
.cookie("refreshToken",refreshToken,options)
.json(
   new ApiResponse(
      200,
      {
         user:loggedInUser,accessToken,refreshToken
      },
      "User logged In successfully"
   )
)


})

const logoutUser = asyncHandler(async (req,res)=>{
await User.findByIdAndUpdate(
   req.user._id,
   {
      $set:{
         refreshToken:undefined
      }
   },
   {
      new:true
   }
)

const options ={
   httpOnly:true,
    secure:true,
}

res.status(200).clearCookie("accessToken",options
).clearCookie("refreshToken",options).json(new ApiResponse(200,{},"User logged Out"))

})

const refreshAccessToken = asyncHandler(async(req,res)=>{
   const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

   if(!incomingRefreshToken){
      throw new ApiError(401,"Unauthorized request" )
   }
   
   try {
      const decodedToken = jwt.verify(
         incomingRefreshToken,
         process.env.REFRESH_TOKEN
      )
      const user=await User.findById(decodedToken?._id )
      if(!user){
         throw new ApiError(401,"Invalid refreshToken" )
      }
      if(incomingRefreshToken !==user?.refreshToken){
         throw new ApiError(401,"Refresh token is expired or used")
      }
     const options ={
      httpOnly:true,
      secure:true
     }
     const {accessToken,newRefreshToken}=await generateAccessAndRefreshToken(user._id)
   
     return res.status(200)
     .cookie("accessToken",accessToken,options)
     .cookie("refreshToken",newRefreshToken,options)
     .json(
      new ApiResponse(200,
         {accessToken,refreshToken:newRefreshToken },
         "access token refreshed"
   
      )
     )
   } catch (error) {
      throw new ApiError(401,error?.message || "Invalid Refresh Token ")
   }
   
})

export{
   registerUser,
   loginUser,
   logoutUser,
   refreshAccessToken

}