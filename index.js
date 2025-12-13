const express = require("express");
const multer = require("multer");
const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

// ---------- MULTER CONFIG ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".xlsx" || ext === ".xls") {
      return cb(null, true);
    }
    cb(new Error("Only .xlsx and .xls files are allowed"));
  },
});

// ---------- HOME ----------
app.get("/", (req, res) => {
  if (!fs.existsSync("data.json")) {
    return res.redirect("/upload.html");
  }
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// ---------- API ----------
app.get("/api/data", (req, res) => {
  if (!fs.existsSync("data.json")) {
    return res.json({
      data: [],
      totalPages: 0,
      currentPage: 1,
      totalRecords: 0,
    });
  }

  const data = JSON.parse(fs.readFileSync("data.json", "utf8"));

  const page = parseInt(req.query.page) || 1;
  const limit = 100;
  const start = (page - 1) * limit;

  res.json({
    data: data.slice(start, start + limit),
    totalPages: Math.ceil(data.length / limit),
    currentPage: page,
    totalRecords: data.length,
  });
});

// ---------- UPLOAD ----------
app.post("/upload", upload.single("excel"), (req, res) => {
  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);

    fs.writeFileSync("data.json", JSON.stringify(data, null, 2));
    fs.unlinkSync(req.file.path);

    res.redirect("/");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// ---------- ERROR ----------
app.use((err, req, res, next) => {
  res.status(400).send(err.message);
});

// ---------- SERVER ----------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Server running → http://localhost:${PORT}`)
);
