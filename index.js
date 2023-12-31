const express = require('express');
const cors = require('cors');
const app = express()
// const jwt = require('jsonwebtoken');
require('dotenv').config()
const stripe = require('stripe')(process.env.PAYMENT_SECRETE_KEY)
// const stripe = require("stripe")(process.env.PAYMENT_SECRETE_KEY)

const port = process.env.PORT || 5000;

app.use(cors())
app.use(express.json())





const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zwideqp.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)


        const verfyAdmin = async (req, res, next) => {
            const email = req.decode.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);

            if (user?.role !== 'admin') {
                return res.status(403).send({ error: true, message: 'Forbidden' })
            }
            next()
        }



        const usersCollection = client.db("cordaDB").collection("users")
        const classCollection = client.db("cordaDB").collection("classes")
        const selectedClassCollection = client.db("cordaDB").collection("selectedClasses")
        const paymentCollection = client.db("cordaDB").collection("payments")




        app.get('/users', async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result);
        })

        app.post('/users', async (req, res) => {
            const users = req.body;
            const query = { email: users.email }
            const existingUser = await usersCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'User Alrady Exist' })
            }
            const result = await usersCollection.insertOne(users);
            res.send(result)
        })

        // make admin api
        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;

            const query = { email: email };
            const user = await usersCollection.findOne(query);
            const result = { admin: user?.role === 'admin' };
            res.send(result)
        })

        // make instractor api
        app.patch('/users/instractor/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    role: 'instractor'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })


        app.get('/users/instractor/:email', async (req, res) => {
            const email = req.params.email;

            const query = { email: email };
            const user = await usersCollection.findOne(query);
            const result = { instractor: user?.role === 'instractor' };
            res.send(result)
        })


        // create classes api
        app.post('/classes', async (req, res) => {
            const classes = req.body;
            const result = await classCollection.insertOne(classes);
            res.send(result)
        })


        app.get('/classes', async (req, res) => {
            const result = await classCollection.find().toArray()
            res.send(result)
        })


        app.get('/classes', async (req, res) => {
            const email = req.query.email;
            console.log(email)
            if (!email) {
                res.send([])
            }
            const query = { instractorEmail: email }
            const result = await classCollection.find(query).toArray();
            res.send(result)
        })

        app.patch('/classes/deny/:idd', async (req, res) => {
            const id = req.params.idd
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    status: 'deny'
                }
            }
            const result = await classCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })

        app.patch('/classes/approved/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    status: 'approved'
                }
            }
            const result = await classCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })

        app.patch('/classes/feedback/:id', async (req, res) => {
            const feedback = req.body
            console.log(feedback)
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    feedback: feedback
                }
            }
            const result = await classCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })

        app.post('/selectedClasses', async (req, res) => {
            const classes = req.body;
            const result = await selectedClassCollection.insertOne(classes);
            res.send(result)
        })

        app.get('/selectedClasses', async (req, res) => {
            const result = await selectedClassCollection.find().toArray()
            res.send(result)
        })

        app.delete('/selectedClasses/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await selectedClassCollection.deleteOne(query);
            res.send(result)
        })

        app.post('/create-payment-intend', async (req, res) => {
            const { price } = req.body
            const amount = price * 100
            console.log(price, amount)
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'USD',
                payment_method_types: ['card']
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        })


        app.get('/payments/:email', async (req, res) => {
            try {
              const email = req.params.email;
              const query = { email: email };
              const payments = await paymentCollection.find(query).toArray();
              res.send( payments );
            } catch (error) {
              res.status(500).send({ success: false, error: 'An error occurred' });
            }
          });

        app.post('/payments', async (req, res) => {
          

            const payment = req.body;
            const insertedResult = await paymentCollection.insertOne(payment);
            const classId = payment.classesId;

            const classQuery = { _id: { $eq: new ObjectId(classId) } };
            const classData = await classCollection.findOne(classQuery);
            const availableSeats = parseInt(classData?.availableSeats);
            const enrolled = parseInt(classData?.enrolled);

            console.log('231',availableSeats,enrolled)

            const classUpdate = {
                $set: { availableSeats: availableSeats - 1, enrolled: enrolled + 1 },

            };

            const classUpdateResult = await classCollection.updateOne(classQuery, classUpdate);


            const query = { _id: { $in: [new ObjectId(payment.ClasId)] } };
            const deleteResult = await selectedClassCollection.deleteOne(query);


            res.send(deleteResult,insertedResult,classUpdateResult);


        })




        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);





app.get('/', (req, res) => {
    res.send('server is running')
})

app.listen(port, () => {
    console.log(`corda server is running on port ${port}`)
})