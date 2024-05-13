const express = require('express');
const app = express();
const fs = require('fs');
const bodyParser = require('body-parser');
const mongoose=require('mongoose');
const session=require('express-session');
const bcrypt=require('bcryptjs');
const cors=require("cors");
const mongodbSession=require('connect-mongodb-session')(session);
const customerModel=require('./Models/Customer.cjs');
const OrderModel=require('./Models/OrderModel.cjs');

const sessionMDBurl='mongodb+srv://tinku:palnati@cluster0.n9tkzb0.mongodb.net/customer'


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

// const isAuth = (req,res,next)=>{
//   if(req.session.isAuth){
//     next()
//   }else{
    
//   }
// }

const store=new  mongodbSession({
  uri:sessionMDBurl ,
  collections:"mySessions",
});


app.use(
  session({
    secret:'secret_key',
    resave:false,
    saveUninitialized:false,
    store:store,
    cookie:{
      userId:String,
      maxAge:60*60*30,
    }
  })
)


app.post('/login', (req,res)=>{
  const {email,password}=req.body;
  console.log(email+" "+ password);
  console.log("Entered in Login");
  customerModel.findOne({email:email})
  .then(user=>{
    if(user){
      if(bcrypt.compareSync(password,user.password)){
        req.session.userId= user._id;
        req.session.email=user.email;
        console.log(req.session);
        res.json('Success');
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
  console.log("Entered Order");
  console.log(req.session);
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


  OrderModel.findOneAndUpdate(
    
    {'customer.email':orderData.email},
    {$push:{items:orderData.items}},
    {upsert:true, new: true}
  ).then((data)=>{
    console.log(data)
    res.json(data);
  }).catch((err)=>res.json(err))
});

app.get('/customerOrder/',(req,res)=>{
  OrderModel.find(
    {'customer.Id':req.session.userId},
  ).then((data)=>{
    res.json(data)}).catch((e)=>console.error(e));
  
})


app.use((req, res) => {
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    res.status(404).json({ message: 'Not found' });
  }
});

app.listen(3000);