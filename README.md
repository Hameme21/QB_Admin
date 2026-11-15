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

## Multiple PDF Upload

In **Upload Question**, choose **Multiple PDFs (Auto-detect Details)**, or select/drop several PDFs in the main file area. The batch uploader also accepts PDFs and ZIP archives together.

Filenames such as `OOP_Mid_251.pdf`, `CSE 1115_Final_241.pdf`, and `Object Oriented Programming_Final_Fall 2024_Trimester 4.pdf` fill in the course code/name, exam, semester, and curriculum trimester. Faculty names or initials are recognized when available. Review and edit each row before publishing; missing details must be completed. Files ending in `_sol` or `_solution` pair with their questions. Each file must be at most 5MB.

Run `npm test` to check filename detection and batch publishing with in-memory storage adapters.

## Tech Stack

- **Frontend:** Vanilla HTML/CSS/JS — `index.html` with filename detection in `question-upload.mjs`
- **Auth & Database:** Firebase (Authentication + Firestore)
- **File storage:** Cloudinary (asset preview/verification)
- **Backend API:** Node.js service hosted on Render

## Getting Started

This is a static app — no build step required.

```bash
git clone https://github.com/Hameme21/QB_Admin.git
cd QB_Admin
# serve the app locally (required for JavaScript modules)
npx serve .
```

> Note: this portal is only functional against the live Firebase project and backend, and login is restricted to authorized `@uiu.ac.bd` admin accounts.

## Related Projects

- [UIU_Question_Bank](https://github.com/Hameme21/UIU_Question_Bank) — the student-facing app this portal moderates content for

## License

Licensed under the Apache License, Version 2.0. See the [LICENSE](LICENSE) file for details.
