const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const app = express();
require('dotenv').config()
const port = process.env.PORT || 5000;

// middleware
app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hlsud.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        const schoolInfoCollection = client.db('School').collection('schoolInfo');
        const teachersCollection = client.db('School').collection('teachers');
        const classesCollection = client.db('School').collection('classes');
        const usersCollection = client.db('School').collection('users');
        const studentsCollection = client.db('School').collection('students')

        //verify jwt middleware
        const verifyJWT = (req, res, next) => {
            const authorization = req.headers.authorization;
            if (!authorization) {
                return res.status(401).send({ error: true, message: 'unauthorized access' })
            }
            const token = authorization.split(' ')[1];

            jwt.verify(token, process.env.SECRET_TOKEN, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ error: true, message: 'unauthorized access' })
                }
                req.decoded = decoded;
                next()
            })

        }
        // admin verify middleware 
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'admin') {
                return res.status(403).send({ error: true, message: 'forbidden access' })
            }
            next();
        }


        // sign json web token
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.SECRET_TOKEN, { expiresIn: '1h' });
            res.send({ token })
        })

        app.get('/schoolInfo', async (req, res) => {
            const query = {}
            const result = await schoolInfoCollection.find(query).toArray();
            res.send(result)
        })
        app.get('/teachers', async (req, res) => {
            const query = {}
            const result = await teachersCollection.find(query).toArray();
            res.send(result)
        })

        // class and admission
        app.get('/classes', async (req, res) => {
            const query = {}
            const result = await classesCollection.find(query).toArray();
            res.send(result)
        });
        app.get('/class/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await classesCollection.findOne(query);
            res.send(result)
        });

        // save users in database
        app.post('/users', async (req, res) => {
            const user = req.body;

            // don't duplicate user added so it's for 
            const query = { email: user?.email };
            const existingUser = await usersCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: "user already exist" })
            }

            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {

            const query = {};
            const result = await usersCollection.find(query).toArray();
            res.send(result)
        })


        //admin make and maintain
        app.get('/users/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const decodedEmail = req.decoded.email;
            if (decodedEmail !== email) {
                res.send({ admin: false })
            }
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            const result = { admin: user?.role === 'admin' };
            res.send(result)
        })

        app.patch('/users/admin/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc);
            res.send(result)
        })

        app.delete('/users/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.send(result)
        })

        //student collection
        //generate unique id
        const generateStudentId = () => {
            const min = 1000;
            const max = 9999;
            return Math.floor(Math.random() * (max - min + 1) + min)
        };

        app.post('/students', async (req, res) => {
            const studentId = generateStudentId();
            const studentData = req.body;
            studentData.studentId = studentId;

            const query = { email: studentData?.email }
            const existingStudent = await studentsCollection.findOne(query)
            if (existingStudent) {
                return res.send({ message: "this student already exist" })
            }
            const result = await studentsCollection.insertOne(studentData);
            res.send(result)
        });

        app.get('/student', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const result = await studentsCollection.findOne(query)
            res.send(result)
        })

        app.get('/all-students', verifyJWT, verifyAdmin, async (req, res) => {
            const query = {};
            const result = await studentsCollection.find(query).toArray();
            res.send(result);
        });

        app.delete('/student/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await studentsCollection.deleteOne(query)
            res.send(result)
        })

    } finally {

    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send("welcome to my wisdom school")
})

app.listen(port, () => {
    console.log(`port is running on ${port}`)
})