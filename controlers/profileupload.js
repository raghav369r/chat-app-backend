const { PutObjectCommand } = require("@aws-sdk/client-s3");
const S3Client = require("../client/s3");
require("dotenv").config();

const express = require("express");
const multer = require("multer");
const prisma = require("../client/prisma");
const { signedUrl } = require("../services/s3");
const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post("/", upload.single("image"), async (req, res) => {
  const { id } = req.user || {};
  // console.log("id: ", id);
  var imagen = new Date().toLocaleString();
  // console.log(imagen);
  const image = req.file?.buffer;
  if (!image || !id)
    return res.json({ error: { message: "image is missing!" } });
  const params = {
    Bucket: process.env.BUCKET_NAME,
    Key: imagen,
    Body: req.file.buffer,
    ContentType: req.file.mimetype,
  };
  const command = new PutObjectCommand(params);
  try {
    if (req?.file?.buffer) await S3Client.send(command);
  } catch (ex) {
    imagen = null;
    console.log(ex);
  }
  await prisma.user.update({
    where: { id },
    data: { profileURL: imagen || "" },
  });
  res.status(200).send({
    success: "uploaded successfully",
    imagen: await signedUrl(imagen),
  });
});

module.exports = router;
