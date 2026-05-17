const mongoose = require('mongoose');
const CutiSchema = new mongoose.Schema({
    status: String,
    tgl_awal: Date,
    tgl_akhir: Date,
    nip: String,
    kepala_divisi: String
});
module.exports = mongoose.model('Cuti', CutiSchema);