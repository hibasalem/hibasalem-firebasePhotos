const functions = require('firebase-functions');
const os = require('os');
const path = require('path');
const spawn = require('child-process-promise').spawn;
const cors = require('cors')({ origin: true });
const Busboy = require('busboy');
const fs = require('fs');
const UUID = require('uuid').v4;
const { Storage } = require('@google-cloud/storage');

const storage = new Storage({
  projectId: 'graphite-cell-321207',
  keyFileName: 'graphite-cell-321207-firebase-adminsdk-aoqar-6289780854.json',
});

exports.helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info('Hello logs!', { structuredData: true });
  console.log('hello');
  response.send('Hello from Firebase!');
});

exports.uploadFile = functions.https.onRequest((req, res) => {
  cors(req, res, () => {
    if (req.method !== 'POST') {
      return res.status(500).json({
        message: 'Not allowed',
      });
    }
    const busboy = new Busboy({ headers: req.headers });
    let uploadData = null;

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      const filepath = path.join(os.tmpdir(), filename);
      uploadData = { file: filepath, type: mimetype };
      file.pipe(fs.createWriteStream(filepath));
    });

    busboy.on('finish', () => {
      const bucket = storage.bucket('graphite-cell-321207.appspot.com');
      let uuid = UUID();
      bucket
        .upload(uploadData.file, {
          uploadType: 'media',
          metadata: {
            metadata: {
              contentType: uploadData.type,
              metadata: {
                firebaseStorageDownloadTokens: uuid,
              },
            },
          },
        })
        .then(async (result) => {
          const file = result[0];
          const signedUrlData = await file.getSignedUrl({
            action: 'read',
            expires: '03-17-2425',
          });
          const url = signedUrlData[0];
          res.status(200).json({
            message: 'It worked!',
            url,
          });
        })
        .catch((err) => {
          res.status(500).json({
            error: err,
          });
        });
    });
    busboy.end(req.rawBody);
  });
});
