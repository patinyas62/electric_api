const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FileSchema = new Schema({
    user: String,
    serialNumber: String,
    startAt: String,
    overall: String,
    result: [{}],
    create: Date
});

const File = mongoose.model('file', FileSchema);

module.exports = File;