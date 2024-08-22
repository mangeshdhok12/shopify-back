import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema({
    title: String,
    price: Number,
    created_at: Date,
});

const ProductModel= mongoose.model('shopifyProducts', ProductSchema, 'shopifyProducts');

export default ProductModel
