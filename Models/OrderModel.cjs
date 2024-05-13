const mongoose=require('mongoose');

const OrderSchema=mongoose.Schema({
    customer:{
        email:String,
    },
    items:[
        {
            id:String,
            name:String,
            quantity:Number,
            price:Number
        }
   ]

});



const OrderModel=mongoose.model("Order",OrderSchema);
module.exports = OrderModel;