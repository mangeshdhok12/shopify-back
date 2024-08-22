import mongoose from "mongoose";


const addressSchema = new mongoose.Schema({
    city: String,
    country: String,
})

const CustomerSchema = new mongoose.Schema({
    first_name: String,
    last_name: String,
    email: String,
    created_at: Date,
    default_address: addressSchema,
});

  const CustomerModel= mongoose.model('shopifyCustomers', CustomerSchema, 'shopifyCustomers');

  export default CustomerModel