require('dotenv').config(); 
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');

const app = express();

// =========================================================================
// 1. MIDDLEWARE & CONFIGURATION
// =========================================================================

// Set View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve Static Files
app.use(express.static(path.join(__dirname, 'public')));

// Body Parser Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // Sesi berlaku 1 hari
}));

// =========================================================================
// 2. DATABASE CONNECTION (Hanya Menggunakan MongoDB Atlas Cloud)
// =========================================================================
const dbURI = process.env.MONGO_URI;

mongoose.connect(dbURI)
    .then(() => console.log('Koneksi ke MongoDB Atlas Berhasil!'))
    .catch((err) => console.error('Gagal Koneksi Database:', err));

// =========================================================================
// 3. IMPORT MODELS
// =========================================================================
const Karyawan = require('./models/Karyawan');
const Divisi = require('./models/Divisi');
const Absensi = require('./models/Absensi');
const Cuti = require('./models/Cuti');

// =========================================================================
// 4. SISTEM LOGIN & AUTHENTICATION (Menggunakan NIP & Session)
// =========================================================================
const auth = (req, res, next) => {
    if (req.session && req.session.isLoggedIn) {
        return next();
    }
    res.redirect('/');
};

// Halaman utama (Menampilkan Form Login)
app.get('/', (req, res) => {
    res.render('login', { error: null }); // Set default error null agar tidak crash
});

// Proses Login Mencocokkan Data ke MongoDB Atlas
app.post('/login', async (req, res) => {
    try {
        const { nip, password } = req.body;

        // Validasi Hardcode Cadangan untuk Admin Utama, atau cari ke database Karyawan
        if (nip === 'admin' && password === 'admin') {
            req.session.isLoggedIn = true;
            req.session.user = { nama_lengkap: 'Super Admin', jabatan: 'HRD' };
            return req.session.save(() => res.redirect('/dashboard'));
        }

        // Cari berdasarkan NIP dan Password di MongoDB Atlas
        const user = await Karyawan.findOne({ nip, password });
        
        if (user) {
            req.session.isLoggedIn = true;
            req.session.user = user;
            req.session.save(() => res.redirect('/dashboard'));
        } else {
            res.render('login', { error: 'NIP atau Password salah!' });
        }
    } catch (err) {
        console.error(err);
        res.render('login', { error: 'Terjadi kesalahan sistem login.' });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// SESUAIKAN: Menghitung total data untuk widget statistik di dashboard.ejs
app.get('/dashboard', auth, async (req, res) => {
    try {
        const countDivisi = await Divisi.countDocuments();
        const countKaryawan = await Karyawan.countDocuments();
        const countAbsensi = await Absensi.countDocuments();
        const countCuti = await Cuti.countDocuments();

        res.render('dashboard', { 
            user: req.session.user,
            countDivisi,
            countKaryawan,
            countAbsensi,
            countCuti
        });
    } catch (err) {
        console.error(err);
        res.render('dashboard', { 
            user: req.session.user,
            countDivisi: 0,
            countKaryawan: 0,
            countAbsensi: 0,
            countCuti: 0
        });
    }
});

// =========================================================================
// 5. CRUD DIVISI
// =========================================================================
app.get('/divisi', auth, async (req, res) => {
    try {
        const data = await Divisi.find();
        res.render('divisi/index', { data, user: req.session.user });
    } catch (err) {
        res.send('Gagal memuat halaman divisi: ' + err.message);
    }
});

app.post('/divisi/add', auth, async (req, res) => {
    try {
        await Divisi.create(req.body);
        res.redirect('/divisi');
    } catch (err) {
        res.send('Gagal tambah divisi: ' + err.message);
    }
});

app.post('/divisi/edit/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { kode, nama_divisi, kepala_divisi } = req.body;

        await Divisi.findByIdAndUpdate(id, {
            kode: kode,
            nama_divisi: nama_divisi,
            kepala_divisi: kepala_divisi
        });
        
        res.redirect('/divisi');
    } catch (err) {
        res.send('Gagal edit divisi: ' + err.message);
    }
});

app.get('/divisi/delete/:id', auth, async (req, res) => {
    try {
        await Divisi.findByIdAndDelete(req.params.id);
        res.redirect('/divisi');
    } catch (err) {
        res.send('Gagal hapus divisi: ' + err.message);
    }
});

// =========================================================================
// 6. CRUD KARYAWAN
// =========================================================================
// SESUAIKAN: Mengubah nama variabel data dari 'divisi' menjadi 'divisiData' agar cocok dengan karyawan/index.ejs
app.get('/karyawan', auth, async (req, res) => {
    try {
        const data = await Karyawan.find().populate('departmentId');
        const divisiData = await Divisi.find(); 
        res.render('karyawan/index', { data, divisiData, user: req.session.user });
    } catch (err) {
        res.send('Gagal memuat halaman karyawan: ' + err.message);
    }
});

app.post('/karyawan/add', auth, async (req, res) => {
    try {
        await Karyawan.create(req.body);
        res.redirect('/karyawan');
    } catch (err) {
        res.send('Gagal tambah karyawan: ' + err.message);
    }
});

app.post('/karyawan/edit/:id', auth, async (req, res) => {
    try {
        await Karyawan.findByIdAndUpdate(req.params.id, {
            nip: req.body.nip,
            nama_lengkap: req.body.nama_lengkap,
            jenis_kelamin: req.body.jenis_kelamin,
            email: req.body.email,
            departmentId: req.body.departmentId,
            jabatan: req.body.jabatan,
            status: req.body.status
        });
        res.redirect('/karyawan');
    } catch (err) {
        res.send('Gagal edit karyawan: ' + err.message);
    }
});

app.get('/karyawan/delete/:id', auth, async (req, res) => {
    try {
        await Karyawan.findByIdAndDelete(req.params.id);
        res.redirect('/karyawan');
    } catch (err) {
        res.send('Gagal hapus karyawan: ' + err.message);
    }
});

// =========================================================================
// 7. CRUD ABSENSI
// =========================================================================
app.get('/absensi', auth, async (req, res) => {
    try {
        const data = await Absensi.find().populate('id_karyawan');
        const karyawan = await Karyawan.find(); 
        res.render('absensi/index', { data, karyawan, user: req.session.user });
    } catch (err) {
        res.send('Gagal memuat halaman absensi: ' + err.message);
    }
});

app.post('/absensi/add', auth, async (req, res) => {
    try {
        await Absensi.create(req.body);
        res.redirect('/absensi');
    } catch (err) {
        res.send('Gagal tambah absen: ' + err.message);
    }
});

app.post('/absensi/edit/:id', auth, async (req, res) => {
    try {
        await Absensi.findByIdAndUpdate(req.params.id, req.body);
        res.redirect('/absensi');
    } catch (err) {
        res.send('Gagal edit absen: ' + err.message);
    }
});

app.get('/absensi/delete/:id', auth, async (req, res) => {
    try {
        await Absensi.findByIdAndDelete(req.params.id);
        res.redirect('/absensi');
    } catch (err) {
        res.send('Gagal hapus absen: ' + err.message);
    }
});

// =========================================================================
// 8. CRUD CUTI
// =========================================================================
app.get('/cuti', auth, async (req, res) => {
    try {
        const data = await Cuti.find();
        res.render('cuti/index', { data, user: req.session.user });
    } catch (err) {
        res.send('Gagal memuat halaman cuti: ' + err.message);
    }
});

app.post('/cuti/add', auth, async (req, res) => {
    try {
        await Cuti.create(req.body);
        res.redirect('/cuti');
    } catch (err) {
        res.send('Gagal mengajukan cuti: ' + err.message);
    }
});

app.post('/cuti/edit/:id', auth, async (req, res) => {
    try {
        await Cuti.create(req.body);
        res.redirect('/cuti');
    } catch (err) {
        res.send('Gagal update cuti: ' + err.message);
    }
});

app.get('/cuti/delete/:id', auth, async (req, res) => {
    try {
        await Cuti.findByIdAndDelete(req.params.id);
        res.redirect('/cuti');
    } catch (err) {
        res.send('Gagal hapus cuti: ' + err.message);
    }
});

// =========================================================================
// RUN SERVER
// =========================================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server sedang berjalan di port ${PORT}`);
});