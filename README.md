# 2800-202310-BBY32

<p align="center"><img src="./public/home-logo.png"></p>

## Project Pitch
Our project, Cargain, is developing AI powered used car price estimator to help people who are new to the used car market find reliable and affordable vehicles with Linear regressions and generative AI

## Technologies 
EJS, Python, CSS, Javascript, MongoDB, OpenAI API, Node, Tailwind, Bootstrap, Vercel

## Directory Structure
```bash
├── README.md
├── Sample.env
├── index.js
├── js
│   ├── databaseConnection.js
│   ├── easterEgg.js
│   └── tailwind.config.js
├── logos
│   ├── data.json
│   ├── optimized
│   ├── original
│   ├── read me.txt
│   └── thumb
├── package-lock.json
├── package.json
├── public
│   ├── buyorsellPageReadme.png
│   ├── car-crash.svg
│   ├── car.png
│   ├── findCarReadme.png
│   ├── footer.png
│   ├── garage-home.svg
│   ├── home-logo.png
│   ├── homePageReadme2.png
│   ├── logo.ico
│   ├── logo.png
│   ├── person.svg
│   ├── search.svg
│   └── signupPageReadme.png
├── py_scripts
│   ├── Create Models
│   └── Predict api
├── style
│   ├── loggedin.css
│   └── styles.css
├── vercel.json
└── views
    ├── 404.ejs
    ├── ActualResetPage.ejs
    ├── chatbot.ejs
    ├── createUser.ejs
    ├── createUserFail.ejs
    ├── errorMessage.ejs
    ├── garage.ejs
    ├── index.ejs
    ├── loggedin-info.ejs
    ├── loggedin.ejs
    ├── loggedout.ejs
    ├── login.ejs
    ├── loginfail.ejs
    ├── passwordReset.ejs
    ├── passwordResetEmailFail.ejs
    ├── passwordResetEmailSent.ejs
    ├── passwordResetSuccess.ejs
    ├── predict.ejs
    ├── pricechat.ejs
    ├── scripts
    ├── submitEmail.ejs
    ├── submitError.ejs
    ├── submitUser.ejs
    ├── templates
    ├── tokenExpired.ejs
    └── userProfile.ejs
```

## How to Run on your Machine

<b>Languages</b>: Python, Javascript, CSS \
\
<b>IDE</b>: Recommended is VS Code but something like PHP Storm will likely work as well \
\
<b>Databases</b>: Will need to set up a MongoDB database to connect to \
\
<b>Other Software</b>: Need to download Node\
\
<b>Enviroment Variables</b>: The enviroment variables you need are: 
```
MONGODB_HOST
MONGODB_USER
MONGODB_PASSWORD
MONGODB_DATABASE
MONGODB_SESSION_SECRET
NODE_SESSION_SECRET
EMAIL_PASSWORD
OPENAI_API_KEY
``` 
\
<b>Third Party API's</b>: Will need a API key for ChatGPT to use any of the chat bots on the site \
\
<b>Instructions to run</b>: After installing everything needed here are the steps to run the code: 
1. Open a terminal window
2. CD to the location of the project repo
3. Type the command ```node index.js``` into the terminal
4. Go to web browser and type in ```localhost:3000```
5. Your Done! The webpage should be up and running on this host

<b>Testing Sheet</b>: https://docs.google.com/spreadsheets/d/1Bi82VyTT5YOWnhw9vpYHLW4Sh8o6rsQfeRThbktHTJ0/edit?usp=sharing

## How to use

These steps will help you get started using the web app: 

1. On the landing page select the <i>Sign up</i> button: 

<img src="./public/homePageReadme2.png"></img>

2. Fill out all of the fields with your information:

<img src="./public/signupPageReadme.png">

3. Now you will be greeted with 4 options from which you can choose what to do next:

    a. If your unsure of which car is right for you select *find a car* where you will be meeted with a chatbot that will help you decide what is right for you:

    <img src="./public/findCarReadme.png">

    b. If you know what car you want to buy and just want to see what the price of that car is estimated to be you can select *Buy or Sell* where another chatbot will ask for information about your car which we will use to estimate the price:

    <img src="./public/buyorsellPageReadme.png">

    c. Those are the main two pages of the website the profile page is just to edit information about your profile like email, name, bio, and profile image and the garage page is just to quickly see your saved cars estimated prices

## Credits and References

This needs to be filled out still

## How we used AI

We used AI for a multitude of things in our application:

1. We used the AI ChatGPT to help us troubleshoot issues mainly and occasionally to help with styling elements of pages

2. We use a dataset we got from Kaggle to train a linear regression model to predict prices of cars using python

3. The web app also uses AI in the recommendation chat bot in order to recommend the user a car and in the price prediction chat bot in order to get the information needed from the user to predict the price of their car

The biggest limitation we encountered was with the ChatGPT AI rate limiting us a lot when we made requests to in order to get around this we implemented a wait time of 3 seconds before we make the request so we don't send to many requests to quickly and get errors. In case we still do we also have a error message prompting the user to just type their message again as the API will still work normally if you just re send your message.

## Contact Information

To contact us please email us at ```raulakh16@my.bcit.ca```