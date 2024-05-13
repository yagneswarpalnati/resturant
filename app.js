const express = require('express');
const app = express();
const fs = require('fs');
const bodyParser = require('body-parser');
const mongoose=require('mongoose');
const session=require('express-session');
const bcrypt=require('bcryptjs');
const cors=require("cors");
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


app.post('/login', (req,res)=>{
  const {email,password}=req.body;
  customerModel.findOne({email:email})
  .then(user=>{
    if(user){
      if(bcrypt.compareSync(password,user.password)){
        req.session.user={id:user._id,email:user.email};
        res.json({data:'Success','userEmail':email});
      }else{
        res.json(`Wrong password`);
      }
    }else{
      res.json('User not found.');
    }
  }).catch(err=>res.json(err))
})

app.post('/register',async (req,res)=>{
  const {name,email,password}=req.body;
  const hashPwd= await bcrypt.hash(password,12);
  await customerModel.findOne({email:email})
  .then(user=>{
    if(user){
      console.log("User exists");
      res.json('User email already exists');
    }else{
      customerModel.create({
        name,
        email,
        password:hashPwd
      })
      .then(customer=>res.json(customer))
      .catch(err=>res.json(err));
    }
  });
  
})

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


app.get('/dashboard',(req,res)=>{
  res.send(req.session)
  
})



app.use((req, res) => {
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    res.status(404).json({ message: 'Not found' });
  }
});

app.listen(PORT);