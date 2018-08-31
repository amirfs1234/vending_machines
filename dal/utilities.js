const mongoose = require('mongoose');
const moment = require('moment');
const { Malfunction } = require('../models/schemas');


const AddMalfunction = (res, machineId) => {
    let machineIDToAdd = machineId.toString();
    if(!machineId) {
        machineIDToAdd = 'unknown';
    }
    const newMalfunction = new Malfunction({ machineID: machineIDToAdd, creationDate: moment() });
    return newMalfunction.save()
        .then(result=> result.errors ? res.sendStatus(500) : res.sendStatus(400));
}

const ValidatedAfterFindById = (result, searchedId) => result._doc._id.toString() === searchedId.toString();

const ValidatedAfterUpdate = (results, expectedModifications) => results.nModified === expectedModifications;


module.exports = {
    ValidatedAfterFindById,
    ValidatedAfterUpdate,
    AddMalfunction
}