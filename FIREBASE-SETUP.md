# Tetapan Firebase Realtime Database untuk Ekspres Cilik

Fungsi pengurusan tab dan pautan sudah disediakan. Untuk membolehkan perubahan disimpan dan disegerakkan antara peranti, sambungkan projek Firebase milik anda:

1. Cipta projek di Firebase Console dan tambah aplikasi Web.
2. Aktifkan **Realtime Database**.
3. Aktifkan **Authentication > Email/Password** dan cipta akaun pentadbir melalui Firebase Console. Jangan benarkan pendaftaran akaun awam.
4. Salin konfigurasi aplikasi Web ke `firebase-config.js`, menggantikan `null` dengan objek konfigurasi daripada Firebase Console. Contoh bentuk kod (gantikan nilai contoh dengan konfigurasi projek anda):

```js
window.FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
  appId: "YOUR_APP_ID"
};
```

Pastikan `databaseURL` menggunakan alamat sebenar yang dipaparkan dalam Firebase Console.
5. Gunakan peraturan Realtime Database berikut. Kandungan pautan/tab boleh dibaca oleh pelawat, tetapi hanya pengguna yang telah log masuk boleh menulis:

```json
{
  "rules": {
    "ekspresCilik": {
      ".read": true,
      ".write": "auth != null"
    }
  }
}
```

6. Muat naik semula keseluruhan folder laman web. Buka halaman **Tetapan**, log masuk menggunakan akaun pentadbir, kemudian simpan pautan atau tambah tab bahan.

**Penting:** Jangan letakkan service account key atau Firebase Admin SDK credentials dalam fail frontend. Konfigurasi Web Firebase bukan rahsia, tetapi keselamatan penulisan data bergantung pada Authentication dan Database Rules.

Tanpa konfigurasi projek Firebase, halaman Tetapan masih boleh digunakan untuk ujian pada peranti yang sama melalui localStorage; perubahan tersebut tidak disegerakkan antara peranti.
