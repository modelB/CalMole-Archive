
const path = require('path');
const dotenv = require('dotenv')
const eventController = require(path.resolve(__dirname, './controllers/eventController'));
const cors = require('cors')
const express = require('express');
const app = express();
const cookieParser = require('cookie-parser');
const apiRouter = require('./router/api');
const bodyParser = require('body-parser');
const passport = require('passport');
dotenv.config({path: path.resolve(__dirname, './config/config.env' )})
const GoogleStrategy = require('passport-google-oauth20').Strategy;

console.log('request came in here!');

//middleware
app.use(cors())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize());
app.use(passport.session());
// app.use(cookieSession({
//     name: 'session',
//     keys: ['key1','key2'],
// }))
console.log(`http://localhost:${process.env.PORT}/auth/google/callback`);

//passport strategy
passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: `http://localhost:${process.env.PORT}/auth/google/callback`,
},
async function(accessToken, refreshToken, profile, done) {
  // User.findOrCreate({ googleId: profile.id }, function (err, user) {
  //   return cb(err, user);
  // });
  console.log('access toke', accessToken);
  console.log('refresh token', refreshToken)
  console.log('profile', profile);

  //add user to db with their access token for future api calls
  try {
  await eventController.addUser(profile, accessToken, refreshToken);
  await eventController.pushCalEvents(accessToken, profile);
  } catch (err) {
    console.log(err);
  }

  return done(null, {
    profile: profile,
    accessToken: accessToken,
    refreshToken: refreshToken
  });
}
));
//passport hashing and dehashing
passport.serializeUser(function(user, cb) {
cb(null, user);
});

passport.deserializeUser(function(user, cb) {
// User.findById(id, function(err, user) {
  cb(null, user);
// });
});
console.log('made it just before redirect');

//passport routes
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events'], accessType: 'offline',
  prompt: 'consent'
 }));
// ^^ provides read write access to user calendars and events within calendar, see https://developers.google.com/calendar/api/guides/auth
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/loginfailure'}),
  function(req, res) {
    console.log(path.resolve(__dirname, '../build/index.html'));
    res.redirect('http://localhost:3000/home');
    // Successful authentication, redirect home.

  });

//dummy routes to see if auth worked!
app.get("/loginfailure",(req, res) => res.send('Authentication failed. Please return to homepage and try again.'));
app.use(express.static(path.resolve(__dirname, '../build')))

console.log('request came in here 2');
//receives callback with token for user from google

//root route though build should have already handled this
app.get('/', (req, res) => {
  console.log(path.resolve(__dirname, '../build/index.html'));
  res.status(200).sendFile(path.resolve(__dirname, 'build/index.html'))
})
app.get('/home', (req, res) => {
  console.log(path.resolve(__dirname, '../build/index.html'));
  res.status(200).sendFile(path.resolve(__dirname, 'build/index.html'))
})
app.get('/comparison', (req, res) => {
  console.log(path.resolve(__dirname, '../build/index.html'));
  res.status(200).sendFile(path.resolve(__dirname, 'build/index.html'))
})

app.get('/getEvents', eventController.getEvents, (req, res) => {
  res.status(200).json(res.locals.events);
})

app.get('/calendarComparison', eventController.analyzeEvents, eventController.newEvents, (req, res) => {
  console.log('compare data', res.locals.newEvents);
  res.status(200).json(res.locals.newEvents);
})

// Route all api calls to the api router
app.use('/api', apiRouter);



// catch-all route handler for any requests to an unknown route
app.use((req, res) => res.status(404).send('404 Fail whale'));

// Generic error handling
app.use((err, req, res, next) => {
  const defaultErr = {
    log: 'Express error handler caught unknown middleware error',
    status: 500,
    message: { err: 'An error occurred' },
  };
  const errorObj = Object.assign({}, defaultErr, err);
  console.log(errorObj.log);
  return res.status(errorObj.status).json(errorObj.message);
});

// Spin up server listening on port in config
app.listen(process.env.PORT, () => {
  console.log(`Server listening on port: ${process.env.PORT}...`);
});

module.exports = app;
