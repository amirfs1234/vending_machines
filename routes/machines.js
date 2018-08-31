const express = require('express');
const router = express.Router();
const data = require('../dal/data');

router.post('/addcoins', data.AddCoins);

router.post('/:machineid/:beverageid/getbeverage', data.GetAndUpdateBeverage);

router.post('/verifycreditcard', data.VerifyCC);

router.post('/updatesugar', data.UpdateSugar);

module.exports = router;