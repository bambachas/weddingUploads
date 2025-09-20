import formidable from "formidable";
import fs from "fs";
import Dropbox from "dropbox";

export const config = {
  api: {
    bodyParser: false, // Απαραίτητο για file upload
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const dbx = new Dropbox.Dropbox({ accessToken: process.env.DROPBOX_ACCESS_TOKEN });

  const form = new formidable.IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).send("Error parsing form");

    const file = files.video;
    if (!file) return res.status(400).send("No file uploaded");

    const fileContent = fs.readFileSync(file.filepath);

    try {
      await dbx.filesUpload({
        path: `/${file.originalFilename}`,
        contents: fileContent,
        mode: "add",
        autorename: true,
      });

      // Σβήνουμε προσωρινό αρχείο
      fs.unlinkSync(file.filepath);

      res.status(200).send("Upload complete");
    } catch (uploadErr) {
      console.error(uploadErr);
      res.status(500).send("Dropbox upload failed");
    }
  });
}
