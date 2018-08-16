const s3 = require('s3');

let client = null;

function getClient() {
    // upload the file to s3
    if (client === null) {
        client = s3.createClient({
            maxAsyncS3: 20,     // this is the default
            s3RetryCount: 3,    // this is the default
            s3RetryDelay: 1000, // this is the default
            multipartUploadThreshold: 20971520, // this is the default (20 MB)
            multipartUploadSize: 15728640, // this is the default (15 MB)
            s3Options: {
                accessKeyId: "AKIAJPRTXQPQA7RDVGWQ",
                secretAccessKey: "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",
            },
        });
    }
    return client;
}

exports.uploadFile = function (sourcePath, target) {

    // upload the zip
    const uploader = getClient().uploadFile({
        localFile: sourcePath,
        s3Params: {
            Bucket: "skipqdata-printerlogs",
            Key: target,
        },
    });
    uploader.on('error', function (err) {
        console.error("unable to upload:", err.stack);
    });
    uploader.on('end', function () {
        console.log("done uploading");
    });
};
