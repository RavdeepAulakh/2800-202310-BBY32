// All the diffrent libraries we need to use
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const saltRounds = 12;
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const axios = require('axios');
const axiosRetry = require('axios-retry');
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "vravdeep@gmail.com",
    pass: process.env.EMAIL_PASSWORD,
  },
});

const port = process.env.PORT || 3000;

// view engine
const app = express();
app.set("view engine", "ejs");

//server side input validation
const Joi = require("joi");

const expireTime = 1 * 60 * 60 * 1000; //expires after 1 hour  (hours * minutes * seconds * millis)

/* secret information section */
const {
  MONGODB_HOST,
  MONGODB_USER,
  MONGODB_PASSWORD,
  MONGODB_DATABASE,
  MONGODB_SESSION_SECRET,
  NODE_SESSION_SECRET,
} = process.env;

/* END secret section */

const database = require("./js/databaseConnection.js");

const userCollection = database.db(MONGODB_DATABASE).collection("users");

const avatarCollection = database.db(MONGODB_DATABASE).collection('avatars');

app.use(express.urlencoded({extended: true}));
app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/public'));
app.use(express.json());
app.use(express.static(__dirname + '/js'));
app.use(express.static(__dirname + '/style'));

var mongoStore = MongoStore.create({
	mongoUrl: `mongodb+srv://${MONGODB_USER}:${MONGODB_PASSWORD}@${MONGODB_HOST}/Comp2800Project`,
	crypto: {
		secret: MONGODB_SESSION_SECRET
	}
})

app.use(
  session({
    secret: NODE_SESSION_SECRET,
    store: mongoStore, //default is memory store
    saveUninitialized: false,
    resave: true,
  })
);

function isValidSession(req) {
  if (req.session.authenticated) {
    return true;
  }
  return false;
}

function sessionValidation(req, res, next) {
  if (isValidSession(req)) {
    next();
  } else {
    res.redirect("/login");
  }
}

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

app.get("/", (req, res) => {
  if (req.session.authenticated) {
    res.redirect("/loggedin");
    return;
  }
  res.render("index");
});

app.get("/password-reset", (req, res) => {
  res.render("passwordReset");
});

app.post("/password-reset", async (req, res) => {
  const email = req.body.email;
  const user = await userCollection.findOne({ email: email });

  if (!user) {
    return res.render("passwordResetEmailFail");
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

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
      return res.send("Error sending email.");
    }
    console.log("Email sent: " + info.response);
    res.render("passwordResetEmailSent");
  });
});

  app.get('/chat', async (req, res) => {

    if (!req.session.authenticated){
        res.redirect('/login');
        return;
    }

    res.render("chatbot");
  });

  axiosRetry(axios, {
    retries: 3,
    retryDelay: axiosRetry.exponentialDelay,
  });
  
  let chatHistory = [];  // Variable to store the chat history

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
            { role: 'system', content: 'You are a helpful assistant that is going to help the user decide what car they should buy based off what they tell you about them selves. Make sure to ask a few questions about the user to gain a better understanding of them and when giving your recommendations list them out and make sure to give a short review for why each is right for the user be specific give exact car year and trim as well.' },
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
  
      console.log('OpenAI API response:', response.data);
  
      const { choices } = response.data;
  
      if (choices && choices.length > 0) {
        const reply = response.data.choices[0].message.content;
        if (reply) {
          // Add the assistant's reply to the chat history
          chatHistory.push({ role: 'assistant', content: reply });
  
          console.log('Generated reply:', reply);
          res.json({ reply });
        } else {
          console.log('No reply generated.');
          res.status(500).send('No reply generated.');
        }
      } else {
        console.log('No reply generated.');
        res.status(500).send('No reply generated.');
      }
    } catch (error) {
      console.error(error);
      res.status(500).send('An error occurred.');
    }
  });
  

  app.get('/protected-reset', async (req, res) => {
    const token = req.query.token;
    const user = await userCollection.findOne({ passwordResetToken: token });
  
    if (!user) {
      return res.render("tokenExpired");
    }
  
    res.render('ActualResetPage', { token: token });
  });
  
  app.post('/protected-reset', async (req, res) => {
    const token = req.body.token;
    const user = await userCollection.findOne({ passwordResetToken: token });
  
    if (!user) {
      return res.send('Error: Invalid or expired token.');
    }
  
    const password = req.body.password;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
  
    await userCollection.updateOne(
      { _id: user._id },
      { $set: { password: hashedPassword }, $unset: { passwordResetToken: '' } }
    );
  
    res.render("passwordResetSuccess");
  });

app.get("/nosql-injection", async (req, res) => {
  var username = req.query.user;

  if (!username) {
    res.render("errorMessage", {
      message: `no user provided - try /nosql-injection?user=name or /nosql-injection?user[$ne]=name`,
    });
    return;
  }
  console.log("user: " + username);

  const schema = Joi.string().max(20).required();
  const validationResult = schema.validate(username);

  //If we didn't use Joi to validate and check for a valid URL parameter below
  // we could run our userCollection.find and it would be possible to attack.
  // A URL parameter of user[$ne]=name would get executed as a MongoDB command
  // and may result in revealing information about all users or a successful
  // login without knowing the correct password.
  if (validationResult.error != null) {
    console.log(validationResult.error);
    res.render("errorMessage", {
      message: "A NoSQL injection attack was detected!!",
    });
    return;
  }

  const result = await userCollection
    .find({ username: username })
    .project({ username: 1, password: 1, _id: 1 })
    .toArray();

  console.log(result);

  res.render("hellomessage", { username: username });
});

app.get("/about", (req, res) => {
  var color = req.query.color;

  res.render("about", { color: color });
});

app.get("/contact", (req, res) => {
  var missingEmail = req.query.missing;
  res.render("contact", { missing: missingEmail });
});

app.get("/submitEmail", (req, res) => {
  var email = req.body.email;
  if (!email) {
    res.redirect("/contact?missing=1");
  } else {
    res.render("submitEmail", { email: email });
  }
});

app.get("/admin", sessionValidation, adminAuthorization, async (req, res) => {
  const result = await userCollection
    .find()
    .project({ username: 1, user_type: 1, email: 1, _id: 1 })
    .toArray();

  res.render("admin", { users: result });
});

// Promote user to admin
app.post("/admin/promote", async (req, res) => {
  const email = req.body.email;

  try {
    // Update the user's user_type in the database
    await userCollection.updateOne(
      { email: email },
      { $set: { user_type: "admin" } }
    );
    console.log("User promoted to admin:", email);
    res.redirect("/admin");
  } catch (error) {
    console.error("Error promoting user:", error);
    res.redirect("/admin");
  }
});

// Demote admin to user
app.post("/admin/demote", async (req, res) => {
  const email = req.body.email;

  try {
    // Update the user's user_type in the database
    await userCollection.updateOne(
      { email: email },
      { $set: { user_type: "user" } }
    );
    console.log("Admin demoted to user:", email);
    res.redirect("/admin");
  } catch (error) {
    console.error("Error demoting admin:", error);
    res.redirect("/admin");
  }
});

app.get("/createUser", (req, res) => {
  res.render("createUser");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/submitUser", async (req, res) => {
  var username = req.body.username;
  var password = req.body.password;
  var email = req.body.email;
  var bioStart = "I am a member of the Cargain app!";

    if (!email){
        return res.render("submitError", {message: "Email cannot be blank"});
    }
    if(!password){
        return res.render("submitError", {message: "Password cannot be blank"});
    }
    if(!username){
        return res.render("submitError", {message: "Username cannot be blank"});
    }
	const schema = Joi.object(
		{
			username: Joi.string().alphanum().max(20).required(),
      email: Joi.string().email().required(),
			password: Joi.string().max(20).required()
		});
	
	const validationResult = schema.validate({username, password, email});
	if (validationResult.error != null) {
	   console.log(validationResult.error);
	   res.redirect("/createUser");
	   return;
   }

  var hashedPassword = await bcrypt.hash(password, saltRounds);
	// Adding avatar to the user document
  const avatar = await avatarCollection.aggregate([{ $sample: { size: 1 } }]).next();
  const avatarURL = avatar ? avatar.url : '';

	await userCollection.insertOne({username: username, password: hashedPassword, email: email, bio: bioStart, avatar: avatarURL});
	console.log("Inserted user");
    req.session.username = username;
    req.session.authenticated = true;
    req.session.email = email;
    req.session.bio = bioStart;
    req.session.cookie.maxAge = expireTime;
    req.session.avatar = avatarURL;
    res.redirect('/loggedin');
});

app.post("/loggingin", async (req, res) => {
  var email = req.body.email;
  var password = req.body.password;
  const schema = Joi.string().email().required();
  const validationResult = schema.validate(email);
  if (validationResult.error != null) {
    console.log(validationResult.error);
    res.redirect("/login");
    return;
  }

	const result = await userCollection.find({email: email}).project({username: 1, password: 1, user_type: 1, _id: 1, bio: 1, avatar: 1}).toArray();

	console.log(result);
	if (result.length != 1) {
		console.log("user not found");
		res.render("loginfail");
    return;
  }

  if (await bcrypt.compare(password, result[0].password)) {
    req.session.authenticated = true;
    req.session.email = email;
    req.session.username = result[0].username;;
    req.session.user_type = result[0].user_type;
    req.session.bio = result[0].bio;
    req.session.avatar = result[0].avatar;
	  req.session.cookie.maxAge = expireTime;

    res.redirect("/loggedin");
    return;
  } else {
    return res.render("loginfail");
  }
});

app.get("/loggedin", sessionValidation, (req, res) => {
  res.render("loggedin", { username: req.session.username });
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

app.get('/userProfile', sessionValidation, async (req, res) => {
  const avatars = await avatarCollection.find().toArray();
  res.render("userProfile", {user: req.session.username, email: req.session.email, bio: req.session.bio, avatar: req.session.avatar, avatars: avatars})
});

app.post('/updateInfo', async (req,res) => {
  const newUserName = req.body.username;
  const newBio = req.body.bio;
  const newEmail = req.body.email;
  let updateSchema;
  let validationResult = {error: null};

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
    res.render("errorMessage", { message: "Update failed, try again" });
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

  await userCollection.updateMany(filter, { $set: update });

    // Handle session and redirect as needed
    req.session.username = newUserName || req.session.username;
    req.session.bio = newBio || req.session.bio;
    req.session.email = newEmail || req.session.email;
    res.redirect('userProfile');
});

app.post('/changeAvatar', async (req, res) => {
  const newAvatarUrl = req.body.url;
  let newURLschema = Joi.string();
  let URLvalidation  = newURLschema.validate(newAvatarUrl);
  
  if (URLvalidation.error) {
    console.log(URLvalidation.error);
    res.render("errorMessage", {message: "Update failed, try again"});
    return;
  } else {
    const avatarFilter = {username: req.session.username, email: req.session.email};
    
    try {
      await userCollection.updateMany(avatarFilter, { $set: {avatar: newAvatarUrl} });
      req.session.avatar = newAvatarUrl;
      res.json({ success: true });
    } catch(err) {
      console.log(err);
      res.json({ success: false, error: err.message });
    }
  }
});

app.get("/predict", (req, res) => {
    // const input = req.body.input;
    input = "2015,honda,civic si coupe 2d,excellent,70000,clean,red,2021,1";
    console.log(input);
    
    // http://moilvqxphf.eu09.qoddiapp.com/predict
    axios.post('http://moilvqxphf.eu09.qoddiapp.com/predict', {
        input: input
    })
    .then(function (response) {
        console.log(response.data);
        res.render("predict", {price: response.data.prediction});
    })
    .catch(function (error) {
        console.log(error);
        res.render("errorMessage", {message: "Error predicting price"});
    })
});

app.get("*", (req, res) => {
  res.status(404);
  res.render("404");
});

app.listen(port, () => {
  console.log("Node application listening on port " + port);
});

module.exports = app;
