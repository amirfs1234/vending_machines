const bodyParser = require('body-parser');
const express = require('express');
const app = express();
const mongoose = require('mongoose');

const beveragesRouter = require('./routes/beverages');
const machinesRouter = require('./routes/machines');

const async = require('async');
const cookieParser = require('cookie-parser');
const env = require('./env/development-env');

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static('public'));

app.use('/beverages', beveragesRouter);
app.use('/machines', machinesRouter);

async.waterfall([
  callback => mongoose.connect(process.env.CONNECTION_STRING, {useMongoClient: true}, err => callback(err)),
  callback => app.listen('3000', err => callback(err)) 
], (err, results) => {
  if (err) {
    return console.log(err);
  }
  return console.log(`Server up and running on port 3000 and connected to mongo DB`);
});
