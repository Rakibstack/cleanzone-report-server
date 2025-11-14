const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.port || 3000;
const admin = require("firebase-admin");
const PDFDocument = require("pdfkit");

const serviceAccount = require("./clean-zone-client-firebase-adminsdk-.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


// middleware.
app.use(cors());
app.use(express.json());

const verifyfirebasetoken = async (req, res, next) => {

    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send('unauthorize access')
    }
    const token = authorization.split(' ')[1]
    if (!token) {
        return res.status(401).send('unauthorize access')
    }

    try {
        const decoded = await admin.auth().verifyIdToken(token)
        req.token_email = decoded.email;
        next()

    }
    catch {
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
        const mycontribute = CleanZoneDB.collection('mycontribute')


        // Allissues Related Apis
        app.post('/allissues', verifyfirebasetoken, async (req, res) => {
            const newissue = req.body
            const result = await Allissues.insertOne(newissue);
            res.send(result)
        })

        app.get('/findAllissus', async (req, res) => {
            const courser = Allissues.find()
            const result = await courser.toArray()
            res.send(result);
        })

        app.get('/recent-issues', async (req, res) => {

            const courser = Allissues.find().sort({ date: -1 }).limit(6);
            const result = await courser.toArray()
            res.send(result);
        })

        app.get('/myissues', verifyfirebasetoken, async (req, res) => {

            const email = req.query.email;
            const query = {}
            if (email) {
                query.email = email
                if (email !== req.token_email) {
                    return res.status(403).send('forbidden access')
                }
            }
            const corsur = await Allissues.find(query).sort({ amount: 1 }).toArray()
            res.send(corsur)
        })

        app.patch('/updateissues/:id', verifyfirebasetoken, async (req, res) => {

            const id = req.params.id
            const Updateissue = req.body
            const query = { _id: new ObjectId(id) }
            const update = {
                $set: {
                    title: Updateissue.title,
                    category: Updateissue.category,
                    amount: Updateissue.amount,
                    description: Updateissue.description,
                    status: Updateissue.status
                }
            }
            const result = await Allissues.updateOne(query, update)
            res.send(result);
        })


        app.delete('/deleteissues/:id', verifyfirebasetoken, async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await Allissues.deleteOne(query)
            res.send(result);

        })

        app.get('/detailspage/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await Allissues.findOne(query)
            res.send(result);

        })
        // my contribute related apis
        app.post('/mycontribute', verifyfirebasetoken, async (req, res) => {
            const newcontribute = req.body
            const result = await mycontribute.insertOne(newcontribute)
            res.send(result);
        })

        app.get('/mycontribute/:productid', verifyfirebasetoken, async (req, res) => {
            const productid = req.params.productid
            const query = { productid: productid }
            const courser = mycontribute.find(query)
            const result = await courser.toArray();
            res.send(result);
        })

        app.get('/mycontribute', verifyfirebasetoken, async (req, res) => {

            const email = req.query.email;
            const query = {}
            if (email) {
                query.email = email
                if (email !== req.token_email) {

                    return res.status(403).send('forbidden access')
                }
            }
            const result = await mycontribute.find(query).toArray();
            res.send(result);
        })

        // Download Report pdf file apis

        app.get('/download-report/:id', verifyfirebasetoken, async (req, res) => {
            try {

                const id = req.params.id;

                const payment = await mycontribute.findOne({ _id: new ObjectId(id) });

                if (!payment) return res.status(404).send({ message: 'Payment not found' });

                if (payment.email !== req.token_email) {
                    return res.status(403).send({ message: 'You are not allowed to download this report' });
                }

                // Set headers for PDF download
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename=contribution-${id}.pdf`);

                // Create PDF and pipe to response
                const doc = new PDFDocument({ margin: 50 });

                doc.pipe(res);

                doc.fontSize(20).text('Cleanup Contribution Report', { align: 'center' });
                doc.moveDown();

                doc.fontSize(12).text(`Report ID: ${payment._id.toString()}`);
                doc.text(`User Email: ${payment.email}`);
                doc.text(`User name: ${payment.name}`);
                doc.text(`Issue Title: ${payment.title || payment.issueTitle || 'N/A'}`);
                doc.text(`address: ${payment.address || 'N/A'}`);
                doc.text(`Paid Amount: $${payment.amount}`);
                doc.text(`Date: ${new Date(payment.date).toLocaleString()}`);
                doc.moveDown();

                doc.text('Details:', { underline: true });
                if (payment.description) {
                    doc.text(payment.description);
                } else {
                    doc.text('No extra description provided.');
                }

                doc.moveDown(2);
                doc.text('Thank you for your contribution!', { align: 'center' });
                // -------------------------------------------

                doc.end();

            } catch (err) {
                console.error(err);
                res.status(500).send({ message: 'Server error' });
            }
        });


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