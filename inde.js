const express = require("express");
const multer = require("multer");
const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Upload folder
const upload = multer({ dest: "uploads/" });

// --------- HOME PAGE (DIRECT TABLE) ---------
app.get("/", (req, res) => {
  if (!fs.existsSync("data.json")) {
    return res.send(`
      <div style="font-family:Arial;padding:40px;text-align:center">
        <h2>No data uploaded yet</h2>
        <a href="/upload">
          <button style="padding:10px 20px;font-size:16px;">Upload Excel</button>
        </a>
      </div>
    `);
  }

  const data = JSON.parse(fs.readFileSync("data.json", "utf8"));

  let html = `
    <div style="font-family:Arial; padding:20px;">
      <h2>Students Table</h2>
      <a href="/upload">
        <button style="padding:10px 20px;margin-bottom:20px;">Upload New File</button>
      </a>

      <div style="overflow-x:auto;">
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;">
          <tr style="background:#f0f0f0;font-weight:bold;">
            <th>#</th>
            <th>Registered For</th>
            <th>Name</th>
            <th>Mobile</th>
            <th>Year</th>
            <th>Course</th>
            <th>College</th>
            <th>Actions</th>
          </tr>
  `;

  data.forEach(row => {
    const phone = row["Mobile"] || row["WhatsApp"] || "";
    const msg = encodeURIComponent(`Hello ${row["Name"] || ""}`);

    html += `
      <tr>
        <td>${row["#"] || ""}</td>
        <td>${row["Registered For"] || ""}</td>
        <td>${row["Name"] || ""}</td>
        <td>${row["Mobile"] || ""}</td>
        <td>${row["Year"] || ""}</td>
        <td>${row["Course"] || ""}</td>
        <td>${row["College"] || ""}</td>

        <td>
          <a href="https://wa.me/${phone}?text=${msg}" target="_blank">
            <button style="background:#25D366;color:white;padding:6px 10px;border:none;border-radius:4px;margin-bottom:5px;">WhatsApp</button>
          </a>
          <br/>
          <a href="tel:${phone}">
            <button style="background:#007bff;color:white;padding:6px 10px;border:none;border-radius:4px;">Call</button>
          </a>
        </td>
      </tr>
    `;
  });

  html += `
        </table>
      </div>
    </div>
  `;

  res.send(html);
});


// --------- UPLOAD PAGE ONLY FORM ---------
app.get("/upload", (req, res) => {
  res.send(`
    <div style="font-family:Arial;max-width:600px;margin:auto;padding:30px;">
      <h2>Upload Excel File</h2>

      <form action="/upload" method="post" enctype="multipart/form-data" style="margin-top:20px;">
        <input type="file" name="excel" accept=".xlsx,.xls" required />
        <button type="submit" style="padding:10px 20px;margin-left:10px;">Upload</button>
      </form>

      <br/>
      <a href="/">
        <button style="padding:10px 20px;">Back to Home</button>
      </a>
    </div>
  `);
});

// --------- PROCESS UPLOADED FILE ---------
app.post("/upload", upload.single("excel"), (req, res) => {
  const filePath = req.file.path;

  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

  fs.writeFileSync("data.json", JSON.stringify(data, null, 2));

  res.redirect("/");
});

// ---------- PORT FOR RENDER ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
