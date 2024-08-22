// import mongoose from 'mongoose';

// // Define the schema for the order
// const OrderSchema = new mongoose.Schema({
//     total_price_set: {
//         shop_money: {
//             amount: { type: Number, required: true },
//             currency_code: { type: String, required: true }
//         },
//     },
//     created_at: { type: Date, required: true },
//     id: { type: Number, required: true },
// }, {
//     timestamps: true, // Optional: automatically adds `createdAt` and `updatedAt` fields
// });

// // Create a model based on the schema
// const OrderModel = mongoose.model('shopifyOrders', OrderSchema);

// export default OrderModel;

import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
    id: Number,
    email: String,
    created_at: Date,
    total_price: String // add other fields as necessary
});

const OrderModel = mongoose.model('shopifyOrders', OrderSchema, 'shopifyOrders');


export default OrderModel;
