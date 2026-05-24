# 🔐 Secure Login App

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D%2014.0.0-brightgreen)](https://nodejs.org/)
[![Framework](https://img.shields.io/badge/framework-Express.js-blue)](https://expressjs.com/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

A robust, production-ready secure authentication system built with Node.js. This application demonstrates industry-standard security practices including password hashing, session management, and Two-Factor Authentication (2FA).

---

## 🚀 Features

- **🔐 Advanced Hashing:** Uses `bcrypt` with a high cost factor for secure password storage.
- **🛡️ SQL Injection Protection:** All database interactions utilize parameterized queries (SQLite).
- **📱 Two-Factor Authentication (TOTP):** Optional 2FA support using authenticator apps (Google Authenticator, Authy).
- **🎫 Session Security:** Secure session management with `express-session`, including session regeneration and HTTP-only cookies.
- **🎨 Modern UI:** Clean and responsive interface built with Bootstrap 5 and EJS templates.
- **🚪 Full Auth Flow:** Registration, Login, Dashboard, 2FA Setup, and Logout.

---

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** SQLite (Relational)
- **Security:** bcrypt, speakeasy, qrcode
- **Frontend:** EJS, Bootstrap 5

---

## 📥 Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/secure-login-app.git
   cd secure-login-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the server:**
   ```bash
   node server.js
   ```

4. **Access the app:**
   Open your browser and navigate to `http://localhost:3000`

---

## 🔒 Security Best Practices Implemented

### Password Storage
We never store plain-text passwords. Each password is salted and hashed using `bcrypt` with 12 rounds of processing, making it highly resistant to brute-force and rainbow table attacks.

### SQL Injection Mitigation
By using the `sqlite3` library's parameterized queries, we ensure that user input is never executed as code, effectively neutralizing SQL injection vectors.

### Session Management
- **Regeneration:** Upon successful login, the session ID is regenerated to prevent Session Fixation.
- **HttpOnly:** Cookies are set to `HttpOnly` to mitigate Cross-Site Scripting (XSS) risks.
- **Stateful 2FA:** The 2FA status is verified server-side before granting access to protected routes.

---

## 📸 Screenshots

| Login Page | 2FA Setup | Dashboard |
| :---: | :---: | :---: |
| ![Login](https://via.placeholder.com/300x200?text=Modern+Login+UI) | ![2FA](https://via.placeholder.com/300x200?text=Secure+2FA+QR+Code) | ![Dashboard](https://via.placeholder.com/300x200?text=User+Dashboard) |

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

---
<p align="center">Made with ❤️ for a more secure web.</p>
