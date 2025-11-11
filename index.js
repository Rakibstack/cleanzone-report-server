const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const { MongoClient, ServerApiVersion } = require('mongodb');
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
    const token =authorization.split(' ')[1]
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

        app.post('/allissues',verifyfirebasetoken, async (req,res) => {
            
            const newissue = req.body
            const result = await Allissues.insertOne(newissue);
            res.send(result)      

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