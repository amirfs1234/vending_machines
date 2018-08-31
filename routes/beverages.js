const express = require('express');
const router = express.Router();
const data = require('../dal/data');

router.get('/:beverageid/fetchprice', data.FetchBeveragePrice)

module.exports = router;