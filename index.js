const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId} = require('mongodb');
const app = express();
require('dotenv').config()
const port = process.env.PORT || 5000;

//Middleware
app.use(cors({
  origin: [
    // 'http://localhost:5173',
    'https://cars-doctor-c7d8c.web.app',
    'https://cars-doctor-c7d8c.firebaseapp.com'
  ],
  credentials:true
}));
app.use(express.json());

app.use(cookieParser());

console.log(process.env.DB_USER);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qwmoe1d.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

//middlewares
const logger = (req,res,next) =>{
  console.log('log: ingfo',req.method, req.url);
  next();
}

const veryfyToken = (req,res,next) =>{
  const token = req?.cookies?.token;
  // console.log('tokkenin the middeleware' ,token);
  //no token available
  if(!token){
    return res.status(401).send({message: 'unauthorized access'})
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET,(err, decoded) =>{
    if(err){
      return res.status(401).send({message: 'unauthorized access'})
    }
    req.user = decoded;
    next();
  })
  // next();
}

const cookieOption = {
  httpOnly:true,
  sameSite:process.env.NODE_ENV === "production" ? "none" : "strict",
  secure: process.env.NODE_ENV === "production" ? true : false,
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const serviceCollection = client.db('carDoctor').collection('services');
    const bookingCollection = client.db('carDoctor').collection('bookings')

    // auth related api
   app.post('/jwt', logger, async(req,res) =>{
    const user = req.body;
    console.log('user for token', user);
    const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET , {expiresIn:'1h'});

    res.cookie('token' ,token, cookieOption)
    .send({success:true});
   })

   app.post('/logout',async(req,res) =>{
    const user = req.body;
    console.log('logging out',user);
    res.clearCookie('token',{ ...cookieOption , maxAge:0 }).send({success: true})
   })

    // services related api
    app.get('/services', async (req, res) => {
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get('/services/:id', async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id)
      }

      const options = {
        // Include only the `title` and `imdb` fields in the returned document
        projection: {
          title: 1,
          price: 1,
          service_id: 1,
          img: 1
        },
      };

      const result = await serviceCollection.findOne(query, options);
      res.send(result);
    })

    // bookings
    app.get('/bookings',logger,veryfyToken, async (req, res) => {
      console.log(req.query.email);
      console.log("token owner info",req.user);
      if(req.user.email !== req.query.email){
        return res.status(403

        ).send({message: 'Forbidden access'})
      }
      let query = {};
      if (req.query ?.email) {
        query = {
          email: req.query.email
        }
      }
      const cursor = bookingCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    })
    app.post('/bookings', async (req, res) => {
      const booking = req.body;
      console.log(booking);
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    })

    app.patch('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const filter = {
        _id: new ObjectId(id)
      };
      const updateBooking = req.body;
      console.log(updateBooking);
      const updateDoc = {
        $set: {
          status: updateBooking.status
        }
      }
      const result = await bookingCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    app.delete('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id)
      }
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    })

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1}); 
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get('/', (req, res) => {
  res.send('Car  Doctor Is running');
});

app.listen(port, () => {
  console.log(`Car Doctor Server running on port ${port}`);
});