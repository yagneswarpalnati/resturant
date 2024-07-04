const express = require('express');
const app = express();
const fs = require('fs');
const bodyParser = require('body-parser');
const mongoose=require('mongoose');
const bcrypt=require('bcryptjs');
const cors=require("cors");
const passport=require('passport');
const LocalStrategy=require('passport-local').Strategy;
const session=require('express-session');
const mongodbSession=require('connect-mongodb-session')(session);
require('dotenv').config()

const customerModel=require('./Models/Customer.cjs');
const OrderModel=require('./Models/OrderModel.cjs');
const { error } = require('console');

const sessionMDBurl=process.env.MONGO_URL
const PORT=process.env.PORT


mongoose.connect(sessionMDBurl).then(()=>{console.log("connected to mongodb")}).catch(err=>console.log(err))


app.use(bodyParser.json());
app.use(express.static('public'));
app.use(cors());


app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});



const store=new  mongodbSession({
  uri:sessionMDBurl ,
  collections:"mySessions",
});


app.use(
  session({
    secret:'secret',
    resave:false,
    saveUninitialized:true,
    store:store,
    cookie:{
      secure:true,
      httpOnly:true,
      maxAge:60*60*30
    }
  })
)

passport.use(new LocalStrategy({
  usernameField:'email',
  passwordField:'password'
},async (email,password,done)=>{
  try{
    const user=await customerModel.findOne({email});
    if(!user){
      return done(null,false,{message:'no user found'})
    }
    const isValid=await bcrypt.compare(password,user.password);
    if(!isValid){
      return done(null,false,{message:'invalid password'})
    }
    return done(null,user);
    }catch(err){
      return done(err);
  }
}));

passport.serializeUser((user,done)=>{
  done(null,user.id);
});

passport.deserializeUser((id,done)=>{
  customerModel.findById(id,(err,user)=>{
    done(err,user);
    });
});

app.post('/login', passport.authenticate('local', {
  failureRedirect: '/login',
  failureFlash: true
}), (req, res) => {
  res.json({ message: 'Logged in successfully' });
});

app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  const hashPwd = await bcrypt.hash(password, 12);
  const user = new customerModel({
    name,
    email,
    password: hashPwd
  });
  try {
    await user.save();
    res.json({ message: 'User created successfully' });
  } catch (err) {
    res.json({ message: 'Error creating user' });
  }
});

  app.get('/meals',(req, res) => {
    fs.readFile('./data/available-meals.json', 'utf8', (err, data) => {
      if (err) {
        res.status(500).json({ message: 'Error reading meals file.' });
      } else {
        res.json(JSON.parse(data));
      }
    });
  });

app.post('/orders', (req, res) => {
  const orderData = req.body.order;

  if (orderData === null || orderData.items === null) {
    res.status(400).json({ message: 'Missing data.' });
    return;
  }

  if (
    orderData.customer.email === null ||
    orderData.customer.email.indexOf('@') === -1 ||
    orderData.customer.name === null ||
    orderData.customer.name.trim() === '' ||
    orderData.customer.street === null ||
    orderData.customer.street.trim() === '' ||
    orderData.customer['postal-code'] === null ||
    orderData.customer['postal-code'].trim() === '' ||
    orderData.customer.city === null ||
    orderData.customer.city.trim() === ''
  ) {
    res.status(400).json({
      message: 'Missing data: Email, name, street, postal code or city is missing.',
    });
    return;
  }
    const customer = {
        email: orderData.customer.email,

    };
    
    OrderModel.findOneAndUpdate(
        { 'customer.email': customer.email },
        { $push: { items: orderData.items }, $set: { customer: customer } },
        { upsert: true, new: true }
    ).then((data) => {
        console.log(data);
        res.json(data);
    }).catch((err) => res.json(err));
});

app.get('/customerOrder/:email',(req,res)=>{
  const {email}=req.params;
  console.log(email)
  OrderModel.find(
    {'customer.email':email},
  ).then((data)=>{
    if (data && data.length>0){
      res.json(data[0].items)
    }else{
      res.json({data:'No'});
    }
    }).catch((e)=>console.error(e));
})






app.use((req, res) => {
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    res.status(404).json({ message: 'Not found' });
  }
});

app.get('/',(req,res)=>{
  res.send('hello')
})

app.listen(PORT);