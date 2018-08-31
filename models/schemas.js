const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const purchasesSchema = new Schema({
  machineID: {type: Schema.Types.ObjectId, ref: 'Machine'},
  beverageID: {type: Schema.Types.ObjectId, ref: 'Beverage'},
  creditCard: Boolean,
  creationDate: Date,
  price: Number
})


const machinesSchema = new Schema({
  location: String,
  beverageIds: {type: Array, ref: 'Beverage'},
  beveragesInMachine: Object,
  fundsForCurrentPurchase: Number,
  totalFunds: Number,
  sugarAmount: Number,
  sugarUpdated: Boolean,
  currentBeverage: String,
  currentlyApprovedCreditCard: Boolean
})

const beveragesSchema = new Schema({
  name: String,
  price: Number,
  hot: Boolean
})

const malfunctionsSchema = new Schema({
  machineID: {type: String, ref: 'Machine'},
  creationDate: Date
})


const Beverage = mongoose.model('Beverages', beveragesSchema);
const Purchase = mongoose.model('Purchases', purchasesSchema);
const Machine = mongoose.model('Machines', machinesSchema);
const Malfunction = mongoose.model('Malfunctions', malfunctionsSchema);

module.exports = {
  Beverage,
  Purchase,
  Machine,
  Malfunction
};