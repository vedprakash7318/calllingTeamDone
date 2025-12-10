const express = require("express");
const multer = require("multer");
const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve public folder
app.use(express.static("public"));

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    const filetypes = /xlsx|xls/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only .xlsx and .xls files are allowed'));
  }
});

// ---------- HOME PAGE ----------
app.get("/", (req, res) => {
  const file = path.join(__dirname, "data.json");

  if (!fs.existsSync(file)) {
    return res.redirect("/upload.html");
  }

  res.sendFile(path.join(__dirname, "public/index.html"));
});

// ---------- API TO FETCH DATA WITH PAGINATION ----------
app.get("/api/data", (req, res) => {
  const file = path.join(__dirname, "data.json");

  if (!fs.existsSync(file)) {
    return res.json({ 
      data: [], 
      totalPages: 0, 
      currentPage: 1, 
      totalRecords: 0 
    });
  }

  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));

    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const start = (page - 1) * limit;
    const end = start + limit;

    const pageData = data.slice(start, end);
    const totalPages = Math.ceil(data.length / limit);

    res.json({ 
      data: pageData, 
      totalPages,
      currentPage: page,
      totalRecords: data.length
    });
  } catch (error) {
    res.status(500).json({ 
      error: "Error reading data file",
      message: error.message 
    });
  }
});

// ---------- FILE UPLOAD ----------
app.post("/upload", upload.single("excel"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("No file uploaded");
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // Format data (optional cleanup)
    const formattedData = data.map(row => {
      const formattedRow = {};
      Object.keys(row).forEach(key => {
        // Clean up column names
        const cleanKey = key.trim().replace(/\s+/g, ' ');
        formattedRow[cleanKey] = row[key];
      });
      return formattedRow;
    });

    fs.writeFileSync("data.json", JSON.stringify(formattedData, null, 2));
    
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.redirect("/");
  } catch (error) {
    res.status(500).send(`Error processing file: ${error.message}`);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).send(`Upload error: ${err.message}`);
  } else if (err) {
    return res.status(400).send(err.message);
  }
  next();
});

// ---------- SERVER ----------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started at http://localhost:${PORT}`));