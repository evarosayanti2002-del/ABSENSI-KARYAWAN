const mongoose = require('mongoose');
const KaryawanSchema = new mongoose.Schema({
    nama_lengkap: String,
    jenis_kelamin: String,
    nip: { type: String, unique: true },
    email: String,
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Divisi' },
    jabatan: String,
    status: String
});
module.exports = mongoose.model('Karyawan', KaryawanSchema);