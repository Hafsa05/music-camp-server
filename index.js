const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());


// mongodb driver connection code part 

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.afx5ss3.mongodb.net/?retryWrites=true&w=majority`;

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
		await client.connect();

		const classesCollection = client.db("musicCampDb").collection("classes");
		const instructorsCollection = client.db("musicCampDb").collection("instructors");
		const usersCollection = client.db("musicCampDb").collection("users");
		const courseCartCollection = client.db("musicCampDb").collection("courseCart");

		// classes collection 
		app.get('/classes', async (req, res) => {
			const result = await classesCollection.find().toArray();
			res.send(result);
		})

		// instructor data 
		app.get('/instructors', async (req, res) => {
			const result = await instructorsCollection.find().toArray();
			res.send(result);
		})

		// userCollection apis 
		// users data save from signup
		app.post('/users', async (req, res) => {
			const user = req.body;
			// console.log(user);
			const query = { email: user.email };
			const existingUser = await usersCollection.findOne(query);
			// console.log('existing user', existingUser);
			if (existingUser) {
				return res.send({ message: 'user already exist in DB' });
			}
			const result = await usersCollection.insertOne(user);
			res.send(result);
		})

		// get all users data from server 
		app.get('/users', async (req, res) => {
			const result = await usersCollection.find().toArray();
			res.send(result);
		})

		// make admin 
		app.patch('/users/admin/:id', async (req, res) => {
			const id = req.params.id;
			const filter = { _id: new ObjectId(id) };
			console.log(filter);
			const updateDoc = {
				$set: {
					role: 'Admin'
				},
			};
			const result = await usersCollection.updateOne(filter, updateDoc)
			res.send(result)
		})

		//  make instructor 
		app.patch('/users/instructor/:id', async (req, res) => {
			const id = req.params.id;
			const filter = { _id: new ObjectId(id) };
			console.log(filter);
			const updateDoc = {
				$set: {
					role: 'Instructor'
				},
			};
			const result = await usersCollection.updateOne(filter, updateDoc)
			res.send(result)
		})

		// delete any user 
		app.delete('/users/:id', async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const result = await usersCollection.deleteOne(query);
			res.send(result);
		})



		// courseCarts collection
		// add a course to courseCart
		app.post('/course-cart', async (req, res) => {
			const course = req.body;
			console.log(course);
			const result = await courseCartCollection.insertOne(course);
			res.send(result);
		})

		//  get all courses from courseCart
		app.get('/course-cart', async (req, res) => {
			const email = req.query.email;
			// console.log(email);
			if (!email) {
				res.send([]);
			}
			const query = { email: email };
			const result = await courseCartCollection.find(query).toArray();
			res.send(result);
		});

		// delete one course from courseCart
		app.delete('/course-cart/:id', async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const result = await courseCartCollection.deleteOne(query);
			res.send(result);
		})


		// Send a ping to confirm a successful connection
		await client.db("admin").command({ ping: 1 });
		console.log("Pinged your deployment. You successfully connected to MongoDB!");
	} finally {
		// Ensures that the client will close when you finish/error
		// await client.close();
	}
}
run().catch(console.dir);




app.get('/', (req, res) => {
	res.send("Music Camp is running");
})

app.listen(port, () => {
	console.log(`Music Camp is running on port ${port}`);
})



