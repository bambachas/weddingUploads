const { Dropbox } = require("dropbox");
const formidable = require("formidable");
const fs = require("fs");

module.exports.config = {
  api: { bodyParser: false },
};

module.exports = async function handler(req, res) {
  console.log("=== New request received ===");
  console.log("Request method:", req.method);

  if (req.method !== "POST") {
    console.log("Invalid method");
    return res.status(405).send("Method Not Allowed");
  }

  if (!process.env.DROPBOX_ACCESS_TOKEN) {
    console.error("DROPBOX_ACCESS_TOKEN is not defined!");
    return res.status(500).send("Dropbox token missing");
  }

  const dbx = new Dropbox({ accessToken: process.env.DROPBOX_ACCESS_TOKEN });
  console.log("Dropbox client initialized");

  // ✅ Διόρθωση για formidable 3.x
  const form = new formidable.IncomingForm({ multiples: false });

  try {
    console.log("Parsing form...");
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => (err ? reject(err) : resolve({ fields, files })));
    });

    console.log("Form parsed successfully");
    console.log("Fields received:", fields);
    console.log("Files received:", files);

    // Υποστήριξη video ή εικόνας
    const fileArray = files.video || Object.values(files)[0];
    if (!fileArray || fileArray.length === 0) return res.status(400).send("No file uploaded");

    const file = fileArray[0];

    console.log("File info:");
    console.log("Original filename:", file.originalFilename);
    console.log("MIME type:", file.mimetype);
    console.log("File size (bytes):", file.size);
    console.log("File path:", file.filepath);

    // Έλεγχος τύπου αρχείου
    const allowedTypes = ["video", "image"];
    const fileType = file.mimetype.split("/")[0];
    if (!allowedTypes.includes(fileType)) {
      console.log("Invalid file type:", fileType);
      return res.status(400).send("Only video or image files are allowed");
    }

    const fileContent = fs.readFileSync(file.filepath);

    console.log("Uploading file to Dropbox...");
    await dbx.filesUpload({
      path: `/${file.originalFilename}`,
      contents: fileContent,
      mode: "add",
      autorename: true,
    });

    console.log("File uploaded successfully to Dropbox:", file.originalFilename);

    // Διαγραφή προσωρινού αρχείου
    fs.unlinkSync(file.filepath);
    console.log("Temporary file deleted:", file.filepath);

    res.status(200).send("Upload complete");
    console.log("=== Request completed successfully ===\n");
  } catch (err) {
    console.error("Upload failed:", err);
    res.status(500).send("Upload failed");
  }
};
