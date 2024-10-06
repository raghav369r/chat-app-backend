const { GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const S3Client = require("../client/s3");

const signedUrl = async (imageUrl) => {
  if (!imageUrl) return imageUrl;
  const getObjectParams = {
    Bucket: process.env.BUCKET_NAME,
    Key: imageUrl,
  };
  const command = new GetObjectCommand(getObjectParams);
  var url = imageUrl;
  try {
    url = await getSignedUrl(S3Client, command, { expiresIn: 3600 });
  } catch (ex) {
    console.log(ex);
    url = "";
  }
  return url;
};
module.exports = { signedUrl };
