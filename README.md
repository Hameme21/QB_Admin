# UIU CSE Question Bank — Admin Portal

The admin dashboard for the [UIU Question Bank](https://github.com/Hameme21/UIU_Question_Bank), used to review, approve, reject, and manage student-submitted course materials.

**Backend:** [`qb-admin.onrender.com`](https://qb-admin.onrender.com)

## Features

- 🔐 **Restricted access** — sign-in gated to `@uiu.ac.bd` admin emails only, backed by Firebase Auth
- 📊 **Dashboard stats** — live counts of pending, approved, and rejected submissions
- ✅ **Review workflow** — approve, reject (with a comment/reason), or permanently delete submissions, with quick preset comment tags
- 📄 **Built-in PDF preview** — inspect uploaded question papers, solutions, and notes directly in-app (direct PDF or Google Docs viewer)
- 🗂️ **Filterable submissions table** — view by status (pending / approved / rejected)
- 🧭 **Full UIU CSE curriculum reference** — course codes, titles, credits, and trimester mapping built in for tagging/validation
- ⚡ **Real-time updates** via Firestore listeners

## Tech Stack

- **Frontend:** Vanilla HTML/CSS/JS — single-file architecture (`index.html`)
- **Auth & Database:** Firebase (Authentication + Firestore)
- **File storage:** Cloudinary (asset preview/verification)
- **Backend API:** Node.js service hosted on Render

## Getting Started

This is a static single-file app — no build step required.

```bash
git clone https://github.com/Hameme21/QB_Admin.git
cd QB_Admin
# open index.html directly, or serve it locally
npx serve .
```

> Note: this portal is only functional against the live Firebase project and backend, and login is restricted to authorized `@uiu.ac.bd` admin accounts.

## Related Projects

- [UIU_Question_Bank](https://github.com/Hameme21/UIU_Question_Bank) — the student-facing app this portal moderates content for

## License

*(add a license here if you'd like this to be open source, e.g. MIT)*
