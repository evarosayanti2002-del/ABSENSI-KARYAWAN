const mongoose = require('mongoose');
const DivisiSchema = new mongoose.Schema({
    kepala_divisi: String,
    kode: String,
    nama_divisi: String
});
module.exports = mongoose.model('Divisi', DivisiSchema);