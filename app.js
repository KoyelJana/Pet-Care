const express = require('express')
const dotenv = require('dotenv').config()
const dbCon = require('./app/config/dbcon')
const path = require('path')
const cookieParser=require('cookie-parser')


const app = express()
dbCon()


app.use(cookieParser())

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads',express.static(path.join(__dirname,'/uploads')))

//User Route
const UserRoute=require('./app/route/UserWithAuthRouter');
app.use(UserRoute);

//Shelter Route
const ShelterRoute=require('./app/route/ShelterRouter');
app.use(ShelterRoute);

//Pet Route
const PetRoute=require('./app/route/PetRouter');
app.use(PetRoute);


const port = 3070

app.listen(port,()=>{
    console.log(`Server running port ${port}`)
})