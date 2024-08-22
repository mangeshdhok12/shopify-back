import express from "express"
import dotenv from 'dotenv'
import cors from 'cors'
import mongoose from "mongoose"
import OrderModel from "../models/Order.js";
import CustomerModel from "../models/Customer.js";




const app= express()
dotenv.config()

app.use(cors({
    origin: ["https://shopify-front-one.vercel.app"],
    methods: ["GET"],
    credentials:true
}));
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));


// Total sales over time daily monthly yearly
app.get('/getTotalSales', async (req, res) => {
    const { interval } = req.query;

    try {
        let groupStage;
        switch (interval) {
            case 'daily':
                groupStage = {
                    _id: {
                        day: { $dayOfMonth: { $toDate: "$created_at" } },
                        month: { $month: { $toDate: "$created_at" } },
                        year: { $year: { $toDate: "$created_at" } }
                    },
                    totalSales: { $sum: { $toDouble: "$total_price" } }
                };
                break;
            case 'monthly':
                groupStage = {
                    _id: {
                        month: { $month: { $toDate: "$created_at" } },
                        year: { $year: { $toDate: "$created_at" } }
                    },
                    totalSales: { $sum: { $toDouble: "$total_price" } }
                };
                break;
            case 'quarterly':
                groupStage = {
                    _id: {
                        quarter: { $concat: [
                            { $toString: { $ceil: { $divide: [ { $month: { $toDate: "$created_at" } }, 3 ] } } },
                            "Q"
                        ] },
                        year: { $year: { $toDate: "$created_at" } }
                    },
                    totalSales: { $sum: { $toDouble: "$total_price" } }
                };
                break;
            case 'yearly':
                groupStage = {
                    _id: {
                        year: { $year: { $toDate: "$created_at" } }
                    },
                    totalSales: { $sum: { $toDouble: "$total_price" } }
                };
                break;
            default:
                return res.status(400).json({ message: 'Invalid interval' });
        }

        const sales = await OrderModel.aggregate([
            { $group: groupStage },
            { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
        ]);

       
        res.json(sales);
    } catch (err) {
        console.error('Error fetching sales data:', err);
        res.status(500).json({ message: err.message });
    }
});

// Sales Growth Rate Over Time

app.get('/getOverallSalesGrowthRate', async (req, res) => {
    try {
 
        const salesData = await OrderModel.aggregate([
            {
                $group: {
                    _id: { $year: { $toDate: "$created_at" } },
                    totalSales: { $sum: { $toDouble: "$total_price" } }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        // Calculate growth rates
        const growthRates = salesData.map((item, index, array) => {
            if (index === 0) return { year: item._id, growthRate: 0 };
            const previousSales = array[index - 1].totalSales;
            const growthRate = ((item.totalSales - previousSales) / previousSales) * 100;
            return { year: item._id, growthRate: growthRate.toFixed(2) };
        });

        res.json(growthRates);
    } catch (err) {
        console.error('Error fetching overall sales growth rate data:', err);
        res.status(500).json({ message: err.message });
    }
});

// New Customers Added Over Time
app.get('/getNewCustomers', async (req, res) => {
    try {
        
        const customers = await CustomerModel.aggregate([
            {
                $group: {
                    _id: {
                        day: { $dayOfMonth: { $toDate: "$created_at" } },
                        month: { $month: { $toDate: "$created_at" } },
                        year: { $year: { $toDate: "$created_at" } }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
        ]);

       
        res.json(customers);
    } catch (err) {
        console.error('Error fetching new customers data:', err);
        res.status(500).json({ message: err.message });
    }
});


// Reapeated Customers
app.get('/getRepeatCustomers', async (req, res) => {
    try {
        const { interval } = req.query;
        if (!interval || !['daily', 'monthly', 'quarterly', 'yearly'].includes(interval)) {
            return res.status(400).json({ message: 'Invalid interval' });
        }

        let groupBy;
        if (interval === 'daily') {
            groupBy = {
                day: { $dayOfMonth: { $toDate: "$created_at" } },
                month: { $month: { $toDate: "$created_at" } },
                year: { $year: { $toDate: "$created_at" } },
            };
        } else if (interval === 'monthly') {
            groupBy = {
                month: { $month: { $toDate: "$created_at" } },
                year: { $year: { $toDate: "$created_at" } },
            };
        } else if (interval === 'quarterly') {
            groupBy = {
                quarter: {
                    $ceil: { $divide: [{ $month: { $toDate: "$created_at" } }, 3] }
                },
                year: { $year: { $toDate: "$created_at" } },
            };
        } else if (interval === 'yearly') {
            groupBy = {
                year: { $year: { $toDate: "$created_at" } },
            };
        }

        const repeatCustomers = await OrderModel.aggregate([
            {
                $group: {
                    _id: {
                        customerEmail: "$email",
                        ...groupBy
                    },
                    purchaseCount: { $sum: 1 }
                }
            },
            {
                $match: {
                    purchaseCount: { $gt: 1 }
                }
            },
            {
                $group: {
                    _id: {
                        ...groupBy
                    },
                    repeatCustomers: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.quarter": 1 } }
        ]);

        res.json(repeatCustomers);
    } catch (err) {
        console.error('Error fetching repeat customers data:', err);
        res.status(500).json({ message: err.message });
    }
});

// Geographical Distribution of Customers:

app.get('/getCustomerDistribution', async (req, res) => {
    try {
        const distribution = await CustomerModel.aggregate([
            {
                $group: {
                    _id: "$default_address.city",
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } } // Sort by count descending
        ]);

        res.json(distribution);
    } catch (err) {
        console.error('Error fetching customer distribution data:', err);
        res.status(500).json({ message: err.message });
    }
});

//Customer Lifetime Value by Cohorts:
app.get('/getCustomerLifetimeValueByCohort', async (req, res) => {
    try {
        const customerLifetimeValue = await CustomerModel.aggregate([
            {
                $lookup: {
                    from: "shopifyOrders", // Assuming your orders collection is named "shopifyOrders"
                    localField: "email", // Field in customers collection
                    foreignField: "email", // Matching field in orders collection
                    as: "orders"
                }
            },
            {
                $unwind: "$orders"
            },
            {
                $group: {
                    _id: {
                        cohort: { $month: { $toDate: "$orders.created_at" } },
                        year: { $year: { $toDate: "$orders.created_at" } }
                    },
                    lifetimeValue: { $sum: { $toDouble: "$orders.total_price" } },
                    customerCount: { $addToSet: "$_id" } // Ensure unique customers
                }
            },
            {
                $project: {
                    _id: 1,
                    lifetimeValue: 1,
                    customerCount: { $size: "$customerCount" }
                }
            },
            { $sort: { "_id.year": 1, "_id.cohort": 1 } }
        ]);

        res.json(customerLifetimeValue);
    } catch (err) {
        console.error('Error fetching customer lifetime value data:', err);
        res.status(500).json({ message: err.message });
    }
});




const PORT = process.env.PORT || 8000;
app.listen(PORT, ()=>{
    console.log(`Server running on ${PORT}` )
})