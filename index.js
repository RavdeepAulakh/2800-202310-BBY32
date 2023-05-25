// Require necessary modules
require('dotenv').config(); // Loads environment variables from .env file
const express = require('express');
const session = require('express-session');
const fs = require('fs');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const saltRounds = 12;
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const axios = require('axios');
const axiosRetry = require('axios-retry');

// Create nodemailer transporter for email communication
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "vravdeep@gmail.com", // Gmail account username
    pass: process.env.EMAIL_PASSWORD, // Gmail account password stored in environment variable
  },
});

const port = process.env.PORT || 3000; // Use the specified port from environment variable or default to 3000

const app = express(); // Create express app
app.set("view engine", "ejs"); // Set EJS as the view engine

const Joi = require("joi"); // Require Joi for data validation

const expireTime = 1 * 60 * 60 * 1000; // Expire time for session set to 1 hour (hours * minutes * seconds * milliseconds)

/* Secret information section */
const {
  MONGODB_HOST,
  MONGODB_USER,
  MONGODB_PASSWORD,
  MONGODB_DATABASE,
  MONGODB_SESSION_SECRET,
  NODE_SESSION_SECRET,
} = process.env; // Load secret environment variables

/* END secret section */

const database = require("./js/databaseConnection.js"); // Require the database connection module

const userCollection = database.db(MONGODB_DATABASE).collection("users"); // Get the collection of users from the database

const avatarCollection = database.db(MONGODB_DATABASE).collection('avatars'); // Get the collection of avatars from the database

// Configure app to use necessary middleware
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.set('views', __dirname + '/views'); // Set the views directory
app.use(express.static(__dirname + '/public')); // Serve static files from the 'public' directory
app.use(express.json()); // Parse JSON bodies
app.use(express.static(__dirname + '/js')); // Serve static files from the 'js' directory
app.use(express.static(__dirname + '/style')); // Serve static files from the 'style' directory

// Create a MongoStore instance for session storage
var mongoStore = MongoStore.create({
  mongoUrl: `mongodb+srv://${MONGODB_USER}:${MONGODB_PASSWORD}@${MONGODB_HOST}/Comp2800Project`, // MongoDB connection URL
  crypto: {
    secret: MONGODB_SESSION_SECRET // Secret for encrypting session data
  }
});

// Configure session middleware for the Express app
app.use(
  session({
    secret: NODE_SESSION_SECRET, // Secret used to sign the session ID cookie
    store: mongoStore, // Store session data in MongoDB using MongoStore
    saveUninitialized: false, // Do not save uninitialized sessions
    resave: true, // Resave session even if it wasn't modified
  })
);

// Function to check if the session is valid and authenticated
function isValidSession(req) {
  if (req.session.authenticated) {
    return true;
  }
  return false;
}

// Middleware function for session validation
function sessionValidation(req, res, next) {
  if (isValidSession(req)) {
    next(); // Proceed to the next middleware if session is valid
  } else {
    res.redirect("/login");
  }
}

function authenticateUser(req, res, next) {
  if (isValidSession(req)) {
    res.locals.isUserAuthenticated = true;
    res.locals.userName = req.session.username;
  } else {
    res.locals.isUserAuthenticated = false;
  }

  next();
}

app.use(authenticateUser);

function isAdmin(req) {
  if (req.session.user_type == "admin") {
    return true;
  }
  return false;
}

function adminAuthorization(req, res, next) {
  if (!isAdmin(req)) {
    res.status(403);
    res.render("errorMessage", { message: "Not Authorized" });
    return;
  } else {
    next();
  }
}

// Route for the home page
app.get("/", (req, res) => {
  if (req.session.authenticated) {
    res.redirect("/loggedin"); // Redirect to the loggedin page if session is authenticated
    return;
  }
  res.render("index"); // Render the index view if session is not authenticated
});

// Route for the password reset page
app.get("/password-reset", (req, res) => {
  res.render("passwordReset"); // Render the passwordReset view
});

// Route for handling the password reset form submission
app.post("/password-reset", async (req, res) => {
  const email = req.body.email;
  const user = await userCollection.findOne({ email: email });

  if (!user) {
    return res.render("passwordResetEmailFail"); // Render the passwordResetEmailFail view if user does not exist
  }

  const token = crypto.randomBytes(20).toString("hex");

  await userCollection.updateOne(
    { email: email },
    { $set: { passwordResetToken: token } }
  );

  const resetLink = `https://2800-202310-bby-32.vercel.app/protected-reset?token=${token}`;
  const mailOptions = {
    from: "vravdeep@gmail.com",
    to: email,
    subject: "Password Reset Request",
    text: `You have requested to reset your password. Please follow this link to reset your password: ${resetLink}`,
    html: `You have requested to reset your password. Please follow this <a href="${resetLink}">link</a> to reset your password.`,
  };

  // Send the password reset email using the transporter
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
      return res.send("Error sending email.");
    }
    console.log("Email sent: " + info.response);
    res.render("passwordResetEmailSent"); // Render the passwordResetEmailSent view if email is sent successfully
  });
});

// Route for the chat page
app.get('/chat', async (req, res) => {

  if (!req.session.authenticated) {
    res.redirect('/login');
    return;
  }

  res.render("chatbot"); // Render the chatbot view
});

// Retry configuration for axios requests
axiosRetry(axios, {
  retries: 5,
  retryDelay: (retryCount) => {
    console.log(`retry attempt: ${retryCount}`);
    return retryCount * 5000;
  },
  retryCondition: (error) => {
    // Check if it is a 429 error (Too Many Requests)
    return error.response.status === 429;
  },
});

let chatHistory = [];  // Variable to store the chat history

// Route for handling chatbot messages
app.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    console.log('Received message:', message);

    // Add the user's message to the chat history
    chatHistory.push({ role: 'user', content: message });

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant that is going to help the user decide what car they should buy based off what they tell you about themselves. Make sure to ask a few questions about the user to gain a better understanding of them and when giving your recommendations list them out and make sure to give a short review for why each is right for the user be specific give exact car year and trim as well' },
          ...chatHistory,  // Include the entire chat history
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, // Set the API key for authorization
        },
      }
    );

    console.log('OpenAI API response:', response.data);

    const { choices } = response.data;

    if (choices && choices.length > 0) {
      const reply = response.data.choices[0].message.content;
      if (reply) {
        // Add the assistant's reply to the chat history
        chatHistory.push({ role: 'assistant', content: reply });

        console.log('Generated reply:', reply);
        res.json({ reply }); // Send the reply as JSON response
      } else {
        console.log('No reply generated.');
        res.status(500).send('No reply generated.'); // Send error response if no reply is generated
      }
    } else {
      console.log('No reply generated.');
      res.status(500).send('No reply generated.'); // Send error response if no reply is generated
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred please resend your messafe.'); // Send error response if an error occurs
  }
});

// Route for the password reset page with token verification
app.get('/protected-reset', async (req, res) => {
  const token = req.query.token; // Get the token from the query parameters
  const user = await userCollection.findOne({ passwordResetToken: token });

  if (!user) {
    return res.render("tokenExpired"); // Render the tokenExpired view if user does not exist
  }

  res.render('ActualResetPage', { token: token }); // Render the ActualResetPage view with the token
});

// Route for handling the password reset form submission
app.post('/protected-reset', async (req, res) => {
  const token = req.body.token; // Get the token from the request body
  const user = await userCollection.findOne({ passwordResetToken: token });

  if (!user) {
    return res.send('Error: Invalid or expired token.'); // Send error response if user does not exist
  }

  const password = req.body.password;
  const hashedPassword = await bcrypt.hash(password, saltRounds); // Hash the new password

  await userCollection.updateOne(
    { _id: user._id },
    { $set: { password: hashedPassword }, $unset: { passwordResetToken: '' } } // Update the user's password and remove the passwordResetToken field
  );

  res.render("passwordResetSuccess"); // Render the passwordResetSuccess view
});

// Route for the submitEmail page
app.get("/submitEmail", (req, res) => {
  var email = req.body.email;
  if (!email) {
    res.redirect("/contact?missing=1"); // Redirect to the contact page if email is missing
  } else {
    res.render("submitEmail", { email: email }); // Render the submitEmail view with the email
  }
});

// Route for the createUser page
app.get("/createUser", (req, res) => {
  res.render("createUser"); // Render the createUser view
});

// Route for the login page
app.get("/login", (req, res) => {
  res.render("login"); // Render the login view
});

// Route for handling the submitUser form submission
app.post("/submitUser", async (req, res) => {
  var username = req.body.username;
  var password = req.body.password;
  var email = req.body.email;
  var bioStart = "I am a member of the Cargain app!";

  if (!email) {
    return res.render("submitError", { message: "Email cannot be blank" }); // Render the submitError view if email is blank
  }
  if (!password) {
    return res.render("submitError", { message: "Password cannot be blank" }); // Render the submitError view if password is blank
  }
  if (!username) {
    return res.render("submitError", { message: "Username cannot be blank" }); // Render the submitError view if username is blank
  }

  const schema = Joi.object({
    username: Joi.string().alphanum().max(20).required(),
    email: Joi.string().email().required(),
    password: Joi.string().max(20).required(),
  });

  const validationResult = schema.validate({ username, password, email });
  if (validationResult.error != null) {
    console.log(validationResult.error);
    res.redirect("/createUser"); // Redirect to the createUser page if validation fails
    return;
  }

  const existingUser = await userCollection.findOne({ email: email });
  if (existingUser) {
    return res.render("createUserFail"); // Render the createUserFail view if user already exists
  }

  var hashedPassword = await bcrypt.hash(password, saltRounds); // Hash the password
  // Adding avatar to the user document
  const avatar = await avatarCollection.aggregate([{ $sample: { size: 1 } }]).next();
  const avatarURL = avatar ? avatar.url : '';

  await userCollection.insertOne({
    username: username,
    password: hashedPassword,
    email: email,
    bio: bioStart,
    avatar: avatarURL,
  });
  console.log("Inserted user");
  req.session.username = username;
  req.session.authenticated = true;
  req.session.email = email;
  req.session.bio = bioStart;
  req.session.cookie.maxAge = expireTime;
  req.session.avatar = avatarURL;
  res.redirect('/loggedin'); // Redirect to the loggedin page
});

// Route for handling the loggingin form submission
app.post("/loggingin", async (req, res) => {
  var email = req.body.email;
  var password = req.body.password;
  const schema = Joi.string().email().required();
  const validationResult = schema.validate(email);
  if (validationResult.error != null) {
    console.log(validationResult.error);
    res.redirect("/login"); // Redirect to the login page if email validation fails
    return;
  }

  const result = await userCollection.find({ email: email }).project({ username: 1, password: 1, user_type: 1, _id: 1, bio: 1, avatar: 1 }).toArray();

  console.log(result);
  if (result.length != 1) {
    console.log("user not found");
    res.render("loginfail"); // Render the loginfail view if user is not found
    return;
  }

  if (await bcrypt.compare(password, result[0].password)) {
    req.session.authenticated = true;
    req.session.email = email;
    req.session.username = result[0].username;
    req.session.user_type = result[0].user_type;
    req.session.bio = result[0].bio;
    req.session.avatar = result[0].avatar;
    req.session.cookie.maxAge = expireTime;

    res.redirect("/loggedin"); // Redirect to the loggedin page
    return;
  } else {
    return res.render("loginfail"); // Render the loginfail view if password is incorrect
  }
});


// Route for the loggedin page with session validation middleware
app.get("/loggedin", sessionValidation, (req, res) => {
  res.render("loggedin", { username: req.session.username }); // Render the loggedin view with the username from the session
});

// Route for handling the logout action
app.get("/logout", (req, res) => {
  req.session.destroy(); // Destroy the session
  res.redirect("/"); // Redirect to the home page
});

// Route for the userProfile page with session validation middleware
app.get('/userProfile', sessionValidation, async (req, res) => {
  const avatars = await avatarCollection.find().toArray(); // Fetch avatars from the avatarCollection
  res.render("userProfile", { user: req.session.username, email: req.session.email, bio: req.session.bio, avatar: req.session.avatar, avatars: avatars }); // Render the userProfile view with session data and avatars
});

// Route for updating user information
app.post('/updateInfo', async (req, res) => {
  const newUserName = req.body.username;
  const newBio = req.body.bio;
  const newEmail = req.body.email;
  let updateSchema;
  let validationResult = { error: null };

  if (newUserName) {
    updateSchema = Joi.string().alphanum().max(20);
    validationResult = updateSchema.validate(newUserName);
  }
  if (newBio) {
    updateSchema = Joi.string().max(250);
    validationResult = updateSchema.validate(newBio);
  }

  if (newEmail) {
    updateSchema = Joi.string().email();
    validationResult = updateSchema.validate(newEmail);
  }

  if (validationResult.error) {
    console.log(validationResult.error);
    res.render("errorMessage", { message: "Update failed, try again" }); // Render an error message if validation fails
    return;
  }

  const filter = { username: req.session.username, email: req.session.email };
  const update = {};

  if (newUserName) {
    update.username = newUserName;
  }

  if (newBio) {
    update.bio = newBio;
  }

  if (newEmail) {
    update.email = newEmail;
  }

  await userCollection.updateMany(filter, { $set: update }); // Update user information in the userCollection

  // Handle session and redirect as needed
  req.session.username = newUserName || req.session.username;
  req.session.bio = newBio || req.session.bio;
  req.session.email = newEmail || req.session.email;
  res.redirect('userProfile'); // Redirect to the userProfile page
});

// Route for changing the avatar
app.post('/changeAvatar', async (req, res) => {
  const newAvatarUrl = req.body.url;
  let newURLschema = Joi.string();
  let URLvalidation = newURLschema.validate(newAvatarUrl);

  if (URLvalidation.error) {
    console.log(URLvalidation.error);
    res.render("errorMessage", { message: "Update failed, try again" }); // Render an error message if validation fails
    return;
  } else {
    const avatarFilter = { username: req.session.username, email: req.session.email };

    try {
      await userCollection.updateMany(avatarFilter, { $set: { avatar: newAvatarUrl } }); // Update avatar URL in the userCollection
      req.session.avatar = newAvatarUrl;
      res.json({ success: true });
    } catch (err) {
      console.log(err);
      res.json({ success: false, error: err.message });
    }
  }
});

async function generateAdvice(carData) {
  const formattedCarData = `Car details: year-${carData.year}, manufacturer-${carData.manufacturer}, model-${carData.model}`;

  try {
    // Call OpenAI API to generate advice based on car details
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a knowledgeable car expert' },
          { role: 'system', content: 'Your task is to provide advice to a potential buyer based on the given car details, If possible, mention the ownership and maintenance cost' },
          { role: 'system', content: 'You should also mention what the buyer should look out for when buying a used model' },
          { role: 'system', content: 'This should be formatted like a car review and be quick to read.' },
          { role: 'user', content: formattedCarData }
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );
    const advice = response.data.choices[0].message.content;
    console.log('Generated advice:', advice);
    return advice;
  } catch (error) {
    console.error(error);
    return "Error generating advice";
  }
}

const path = require('path');
const logoDataPath = path.join(__dirname, 'logos', 'data.json');
const logoData = JSON.parse(fs.readFileSync(logoDataPath, 'utf8'));

app.get("/predictData", sessionValidation, async (req, res) => {
  console.log("predicting");
  const input = req.session.carData;
  const formatted = `${input.year},${input.manufacturer},${input.model},${input.condition},${input.odometer},${input.title_status},${input.paint_color},2021,5`;

  try {
    // Call external API to predict the car price
    const priceResponse = await axios.post('http://moilvqxphf.eu09.qoddiapp.com/predict', { input: formatted });
    console.log(priceResponse.data);
    const carLogo = logoData.find(logo => logo.name.toLowerCase() === input.manufacturer.toLowerCase());
    const logoUrl = carLogo ? carLogo.image.optimized : 'default-logo-url';

    delay(3000);

    const advice = await generateAdvice(input);
    res.json({ price: priceResponse.data.prediction, carData: input, advice: advice, logoUrl: logoUrl });
  } catch (error) {
    console.log(error);
    res.json({ error: "Error predicting price or generating advice" });
  }
});

// app.get("/predict", async (req, res) => {
//   console.log("predicting");
//   const input = req.session.carData;
//   const formatted = `${input.year},${input.manufacturer},${input.model},${input.condition},${input.odometer},${input.title_status},${input.paint_color},2023,5`;

//   try {
//     // Call external API to predict the car price
//     const priceResponse = await axios.post('http://moilvqxphf.eu09.qoddiapp.com/predict', { input: formatted });
//     console.log(priceResponse.data);
//     const carLogo = logoData.find(logo => logo.name.toLowerCase() === input.manufacturer.toLowerCase());
//     const logoUrl = carLogo ? carLogo.image.optimized : 'default-logo-url';

//     delay(3000);

//     const advice = await generateAdvice(input);
//     res.render("predict", { price: priceResponse.data.prediction, carData: input, advice: advice, logoUrl: logoUrl });
//   } catch (error) {
//     console.log(error);
//     res.render("errorMessage", { message: "Error predicting price or generating advice" });
//   }
// });

// Function to introduce a delay using a Promise
function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

app.get('/priceChat', (req, res) => {

  if (!req.session.authenticated) {
    res.redirect('/login');
    return;
  }

  // Initialize carData in session
  req.session.carData = {
    'year': null,
    'manufacturer': null,
    'model': null,
    'condition': null,
    'title_status': null,
    'paint_color': null
  };
  chatHistory = [];

  console.log(chatHistory);
  console.log(req.session.carData);
  res.render('pricechat', { initialMessage: "Tell me about the car to find the price." });
});


chatHistory = [];  // Variable to store the chat history

app.post('/priceChat', sessionValidation, async (req, res) => {
  const { message } = req.body;  // User's message

  // If carData is not initialized, initialize it
  if (!req.session.carData) {
    return res.redirect('/priceChat');
  }

  // If all car details are collected, redirect to /predict
  if (Object.values(req.session.carData).every(val => val !== null)) {
    return res.redirect('/predict');
  }

  try {
    // Add the user's message to the chat history
    chatHistory.push({ role: 'user', content: message });

    // Call to OpenAI API to generate assistant's reply
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are Cargain' },
          { role: 'system', content: 'Cargain only goal is to gathering the following car detail from the user: year, manufacturer, model, condition, odometer, title_status, paint_color' },
          { role: 'system', content: 'Cargain gives the user some advice if the user dosen`t know a detail of the car' },
          { role: 'system', content: 'Cargain avoids asking unrelated question as Cargain is efficient' },
          { role: 'system', content: 'Cargain automatically corrects any spelling errors when gathering the details' },
          { role: 'system', content: 'Cargain must respond in this format: "infoCollected-{year},{manufacturer},{model},{condition},{odometer},{title_status},{paint_color}-END" after gathering all the details' },
          { role: 'system', content: 'Cargain must not fail to respond in this format: "infoCollected-{year},{manufacturer},{model},{condition},{odometer},{title_status},{paint_color}-END" as it is mission critical for success' },
          ...chatHistory,  // Include the entire chat history
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );
    delay(2000);
    const reply = response.data.choices[0].message.content;
    console.log(chatHistory);
    console.log('Generated reply:', reply);

    // Search for 'infoCollected-' keyword in the reply
    const infoIndex = reply.indexOf('infoCollected-');

    // Check if the information is collected
    if (infoIndex !== -1) {
      // Extract the data from the reply
      const dataString = reply.slice(infoIndex + 'infoCollected-'.length);
      const dataEndIndex = dataString.indexOf('-END');
      const data = dataString.slice(0, dataEndIndex === -1 ? undefined : dataEndIndex).split(",");

      // Assign the data to the session variable
      req.session.carData = {
        'year': data[0],
        'manufacturer': data[1],
        'model': data[2],
        'condition': data[3],
        'odometer': data[4],
        'title_status': data[5],
        'paint_color': data[6]
      };
      console.log(req.session.carData);
      // If all car details are collected, send a signal to redirect to /predict
      if (Object.values(req.session.carData).every(val => val !== null)) {
        return res.json({ redirect: '/predict' });
      }
      // If information is collected, send the assistant's reply back to the client
      res.json({ reply });
    }

    res.json({ reply });  // Send the assistant's reply back to the client
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred please resend your message.');
  }
});

app.get("/predict", sessionValidation, (req, res) => {
  res.render("predict"); // Render the passwordReset view
});

// Default route for handling unknown routes
app.get("*", (req, res) => {
  res.status(404);
  res.render("404"); // Render the 404 view for unknown routes
});

// Start the application server
app.listen(port, () => {
  console.log("Node application listening on port " + port);
});

module.exports = app;
