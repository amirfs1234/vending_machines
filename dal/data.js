const mongoose = require('mongoose');
const moment = require('moment');
const utilities = require('./utilities');
const models = require('../models/schemas');
const hash = require('object-hash');
const { Beverage, Purchase, Machine } = models;
const { ValidatedAfterFindById, ValidatedAfterUpdate, AddMalfunction } = utilities;
const blueBirdPromise = require('bluebird');

mongoose.Promise = require('bluebird');

const FetchBeveragePrice = (req, res) => {
    const { beverageid } = req.params;
    let beverage = '';
    return Beverage.findById({ _id: beverageid }).select('price').exec()
        .then(returnedBeverage => {
            beverage = returnedBeverage[0]._doc;
            if(ValidatedAfterFindById(returnedBeverage, beverageid)) {
                res.send({Price:beverage.price})
            }
            else {
                res.sendStatus(500)
            }
        })
}


const AddCoins = (req, res) => {

    const { machineId, coinType } = req.body;
    if (!machineId || !coinType) {
        return AddMalfunction(res, machineId);
    }
    if (wrongCoinType(coinType)) {
        return res.status(400).send("Wrong Coin Type")
    }
    Machine.updateOne({ _id: machineId }, { $inc: { fundsForCurrentPurchase: coinType, totalFunds: coinType } }).exec()
        .then(results => {
            if(ValidatedAfterUpdate(results, 1)){
                res.sendStatus(200);
            }
            else {
                res.sendStatus(500);
            }
        })
}

function wrongCoinType(cointype) {
    return ![.1,.5,1,2,5].some(coin=>coin===cointype)
}

const GetAndUpdateBeverage = (req, res) => {
    const { machineId, beverageId } = req.body;
    if (!machineId || !beverageId) {
        return AddMalfunction(res, machineId);
    }
    return blueBirdPromise.join(Beverage.findById({ _id: beverageId }).exec(), 
    Machine.findOneAndUpdate({ _id: machineId },{currentBeverage:beverageId},{new:true}).exec(),
        (beverage, machine) => {
            if (ValidatedAfterFindById(beverage, beverageId) && machine.currentBeverage === beverageId) {
                choosePurchaseProcessByConditions (machine._doc, beverage._doc, res)
            }
            else {
                res.sendStatus(500)
            }

        })
}

function choosePurchaseProcessByConditions (machine, beverage, res) {
    if (machine.beveragesInMachine[beverage._id.toString()] > 0) {
        if (machine.fundsForCurrentPurchase >= beverage.price || machine.currentlyApprovedCreditCard) {
            chooseStepsBeforePurchaseByBeverageType(machine, beverage, res);
        }
        else {
            res.send(`Missing ${beverage.price - machine.fundsForCurrentPurchase} shekels`);
        }
    }
    else {
        return res.send('Out of Stock');
    }
}

function chooseStepsBeforePurchaseByBeverageType(machine, beverage, res) {
    if (beverage.hot) {
        if (machine.sugarUpdated) {
            addPurchaseAndUpdateMachine(res, machine, beverage)
        }
        else {
            return res.send("Choose Amount of Sugar")
        }
    }
    else {
        addPurchaseAndUpdateMachine(res, machine, beverage)
    }
}

function addPurchaseAndUpdateMachine(res, machine, beverage) {
    const newPurchase = new Purchase({
        machineID: machine._id,
        beverageID: beverage._id,
        creditCard: machine.currentlyApprovedCreditCard,
        price: beverage.price,
        creationDate: moment()
    });
    const change = machine.currentlyApprovedCreditCard ? 0 : machine.fundsForCurrentPurchase - beverage.price;
    const updateFieldsForMachine = generateUpdateFieldsForPurchase(machine, change, beverage._id);
    
    return blueBirdPromise.join(newPurchase.save(), Machine.updateOne({ _id: machine._id }, updateFieldsForMachine).exec(),
        (purchaseAdditionResult, machineResult) => {
            if(!purchaseAdditionResult.errors && ValidatedAfterUpdate(machineResult, 1)){
                res.send({change, beverage: beverage._id});
            }
            else{
                res.sendStatus(500);
            }

        })
}

function generateUpdateFieldsForPurchase(machine, change, beverageId) {
    const $inc = {
        totalFunds: -(machine.fundsForCurrentPurchase - change)
    }
    const updateBeveragesInMachine = `beveragesInMachine.${beverageId.toString()}`;
    $inc[updateBeveragesInMachine] = -1
    return {
        $inc,
        fundsForCurrentPurchase: 0,
        currentBeverage: '',
        currentlyApprovedCreditCard: false,
        sugarAmount: 0,
        sugarUpdated: false
    }
};

const UpdateSugar = (req, res) => {
    const { machineId, beverageId, sugarAmount } = req.body;
    if (!machineId || !beverageId || !sugarAmount) {
        return AddMalfunction(res, machineId);
    }
    blueBirdPromise.join(Machine.findById({ _id: machineId }).select('currentBeverage').exec(),
        Beverage.findById({ _id: beverageId }).select('hot').exec(),
        (machine, beverage) => {
            if (ValidatedAfterFindById(machine, machineId) && ValidatedAfterFindById(beverage, beverageId)) {
                if (machine._doc.currentBeverage && beverage._doc.hot) {
                    updateMachineSugarAtDatabase(machineId, sugarAmount, res);
                }
                else {
                    const hot = machine.currentBeverage ? 'Hot ' : '';
                    res.send(`Please Choose a ${hot}Drink`);
                }

            }
            else {
                res.sendStatus(500);
            }
        })
}

function updateMachineSugarAtDatabase(machineId, sugarAmount, res) {
    Machine.updateOne({ _id: machineId }, { sugarAmount, sugarUpdated: true })
    .then(results => {
        if (ValidatedAfterUpdate(results, 1)) {
            res.sendStatus(200);
        }
        else {
            res.sendStatus(500);
        }
    })
}


const VerifyCC = (req, res) => {
    const ccInfo = hash(req.body.ccInfo);
    const machineId = req.body.machineId;
    if (!ccInfo || !machineId) {
        return AddMalfunction(res, machineId);
    }
    //This will be done with a Payment Service Provider
    VerifyCCWithVerifyingBody(ccInfo)
        .then(results => {
            if (results.verified) {
                Machine.updateOne({ _id: machineId }, { currentlyApprovedCreditCard: results.verified })
                    .then(results => {
                        if (ValidatedAfterUpdate(results, 1)) {
                            return res.send('Please Choose a Beverage');
                        }
                        else {
                            return res.sendStatus(500);
                        }
                    })

            }
            else {
                return res.send('Credit Card not Verified');
            }

        })
        .catch(() => res.status(500).send('Connection Issues'));
}


module.exports = {
  FetchBeveragePrice,
  AddCoins,
  GetAndUpdateBeverage,
  UpdateSugar,
  VerifyCC
}