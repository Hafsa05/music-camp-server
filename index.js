const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY);
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// jwt token varification middleware function
const verifyJWT = (req, res, next) => {
	const authorization = req.headers.authorization;
	if (!authorization) {
		return res.status(401).send({ error: true, message: 'Unauthorized Access' });
	}
	const token = authorization.split(' ')[1];
	jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
		if (err) {
			return res.status(401).send({ error: true, message: 'Unauthorized Access' })
		}
		req.decoded = decoded;
		next();
	})
}

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
		const coursePaymentCollection = client.db("musicCampDb").collection("coursePayment");

		// class add to server 
		app.post('/classes', async (req, res) => {
			const course = req.body;
			const result = await classesCollection.insertOne(course);
			res.send(result);
		})

		// classes collection fetch from server
		app.get('/classes', async (req, res) => {
			const result = await classesCollection.find().toArray();
			res.send(result);
		})

		// class status update
		app.patch('/classes/music-class/:id', async (req, res) => {
			const id = req.params.id;
			// console.log(id);
			const filter = { _id: new ObjectId(id) };
			console.log(filter);
			const updateDoc = {
				$set: {
					role: 'approved'
				},
			};
			const result = await classesCollection.updateOne(filter, updateDoc)
			res.send(result)
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
			// console.log(filter);
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
			// console.log(filter);
			const updateDoc = {
				$set: {
					role: 'Instructor'
				},
			};
			const result = await usersCollection.updateOne(filter, updateDoc)
			res.send(result)
		})

		// make student 
		app.patch('/users/student/:id', async (req, res) => {
			const id = req.params.id;
			const filter = { _id: new ObjectId(id) };
			// console.log(filter);
			const updateDoc = {
				$set: {
					role: 'Student'
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
			// console.log(course);
			const result = await courseCartCollection.insertOne(course);
			res.send(result);
		})

		//  get all courses from courseCart to show in selected courses
		app.get('/course-cart', async (req, res) => {
			const email = req.query.email;
			// console.log(email);
			if (!email) {
				res.send([]);
			}

			// jwt token
			// const decodedEmail = req.decoded.email;
			// if (email !== decodedEmail) {
			// 	return res.status(403).send({ error: true, message: 'Forbidden Access' })
			// }

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

		// jwt token generate  
		app.post('/jwt-token', (req, res) => {
			const user = req.body;
			const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '24h' });
			res.send({ token });
		})

		// create card payment intent 
		app.post('/payment-intend', async (req, res) => {
			const { courseFee } = req.body;
			const amount = courseFee * 100;
			console.log(courseFee, amount);
			const paymentIntent = await stripe.paymentIntents.create({
				amount: amount,
				currency: 'usd',
				payment_method_types: ['card']

			});

			res.send({
				clientSecret: paymentIntent.client_secret
			})
		})

		// payment data store in server 
		app.post('/course-payment', async (res, req) => {
			const payment = req.body;
			const insertResult = await coursePaymentCollection.insertOne(payment);

			const query = { _id: { $in: payment.classItems.map(id => new ObjectId(id)) } };
			const deleteResult = await coursePaymentCollection.deleteMany(query)

			res.send({insertResult, deleteResult});
		})

		// payment history data 
		app.get('/course-payment', async (res, req) => {})



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