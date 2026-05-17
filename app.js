require('dotenv').config(); 
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path'); // Tambahan untuk mengatur path folder

const app = express();

// =========================================================================
// 1. MIDDLEWARE & CONFIGURATION
// =========================================================================

// Set View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // Memastikan folder views terbaca dengan benar

// Serve Static Files (buat CSS, Gambar, atau JS frontend nanti)
app.use(express.static(path.join(__dirname, 'public')));

// Body Parser Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret-key', // Sebaiknya simpan secret di .env juga
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // Sesi berlaku 1 hari
}));

// =========================================================================
// 2. DATABASE CONNECTION (Menggunakan variabel dari .env)
// =========================================================================
const dbURI = process.env.MONGO_URI;

mongoose.connect(dbURI)
    .then(() => console.log('Koneksi ke MongoDB Atlas Berhasil!'))
    .catch((err) => console.error('Gagal Koneksi Database:', err));



// =========================================================================
// 2. IMPORT MODELS
// =========================================================================
const Karyawan = require('./models/Karyawan');
const Divisi = require('./models/Divisi');
const Absensi = require('./models/Absensi');
const Cuti = require('./models/Cuti');

// =========================================================================
// 3. KONEKSI MONGODB
// =========================================================================
mongoose.connect('mongodb://127.0.0.1:27017/absensi_karyawan')
    .then(() => console.log('Terhubung ke MongoDB (absensi_karyawan)'))
    .catch(err => console.error('Koneksi Gagal:', err));

// =========================================================================
// 4. SISTEM LOGIN & AUTHENTICATION
// =========================================================================
const auth = (req, res, next) => {
    if (req.session.isLoggedIn) return next();
    res.redirect('/');
};

app.get('/', (req, res) => res.render('login'));

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'admin') {
        req.session.isLoggedIn = true;
        res.redirect('/dashboard');
    } else {
        res.send('Login Gagal. <a href="/">Kembali</a>');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.get('/dashboard', auth, (req, res) => res.render('dashboard'));

// =========================================================================
// 5. CRUD DIVISI (Langsung di app.js)
// =========================================================================
app.get('/divisi', auth, async (req, res) => {
    const data = await Divisi.find();
    res.render('divisi/index', { data });
});

app.post('/divisi/add', auth, async (req, res) => {
    try {
        await Divisi.create(req.body);
        res.redirect('/divisi');
    } catch (err) {
        res.send('Gagal tambah divisi: ' + err.message);
    }
});

// Menangani Update Data dari Modal Edit Divisi
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
app.get('/karyawan', auth, async (req, res) => {
    const data = await Karyawan.find().populate('departmentId');
    const divisi = await Divisi.find(); 
    res.render('karyawan/index', { data, divisi });
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
    const data = await Absensi.find().populate('id_karyawan');
    const karyawan = await Karyawan.find(); 
    res.render('absensi/index', { data, karyawan });
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
    const data = await Cuti.find();
    res.render('cuti/index', { data });
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
        await Cuti.findByIdAndUpdate(req.params.id, req.body);
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

// Gunakan port dari sistem hosting, atau 3000 jika dijalankan di laptop sendiri
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server sedang berjalan di port ${PORT}`);
});