import mongoose from 'mongoose';

// A scripted caller scenario. Uses the string scenario id (e.g. "interruption")
// as _id.
const scenarioSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    tests: { type: String, required: true },
    callerScript: { type: String, required: true },
    listenFor: { type: String, required: true },
  },
  { _id: false }
);

export const Scenario = mongoose.model('Scenario', scenarioSchema);
