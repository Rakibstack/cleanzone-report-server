const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.port || 3000;
const admin = require("firebase-admin");

const serviceAccount = require("./clean-zone-client-firebase-adminsdk-.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


// middleware.
app.use(cors());
app.use(express.json());

const verifyfirebasetoken = async (req,res,next) => {

    const authorization = req.headers.authorization;
    if(!authorization){
        return res.status(401).send('unauthorize access')
    }
    const token = authorization.split(' ')[1]
    if(!token){
        return res.status(401).send('unauthorize access') 
    }

    try{
     const decoded = await admin.auth().verifyIdToken(token)
     req.token_email = decoded.email;
     console.log(decoded);
     next()
     
    }
    catch{
         return res.status(401).send('unauthorize access') 
    }
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster01.g0bc8bl.mongodb.net/?appName=Cluster01`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {

    try {
        await client.connect()
        const CleanZoneDB = client.db('CleanZoneDB')
        const Allissues = CleanZoneDB.collection('Allissues')
        const mycontribute =CleanZoneDB.collection('mycontribute')


        // Allissues Related Apis
        app.post('/allissues',verifyfirebasetoken, async (req,res) => {        
            const newissue = req.body
            const result = await Allissues.insertOne(newissue);
            res.send(result)      
        })

        app.get('/findAllissus',async (req,res)=> {
            const courser = Allissues.find()
            const result = await courser.toArray()
            res.send(result);
        })

        app.get('/recent-issues',async (req,res) => {

        const courser = Allissues.find().sort({date: -1}).limit(6);
        const result = await courser.toArray()
        res.send(result);
        })

        app.get('/detailspage/:id',async (req,res) => {
          const id = req.params.id;
          const query = { _id: new ObjectId(id)};
          const result = await Allissues.findOne(query)
          res.send(result);

        })
        // my contribute related apis
        app.post('/mycontribute',verifyfirebasetoken, async (req,res) => {
            const newcontribute = req.body
            const result = await mycontribute.insertOne(newcontribute)
            res.send(result);
        })

     
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!")
    }
    finally {

    }

}
run().catch(console.dir)

app.get('/', (req, res) => {
    res.send('Hello world')
})

app.listen(port, () => {
    console.log(`user server started on port ${port}`);

})