const mongoose = require('mongoose');
const AbsensiSchema = new mongoose.Schema({
    status: String, // Hadir, Izin, Alpa
    jam_masuk: String,
    id_karyawan: { type: mongoose.Schema.Types.ObjectId, ref: 'Karyawan' },
    tanggal: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Absensi', AbsensiSchema);