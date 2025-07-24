

export const fileFilter = (req: Express.Request, file: Express.Multer.File, callback: Function) => {
    /* console.log({ file }); */

    if (!file) {
        return callback(new Error('File is empty'), false);
    }

    const fileExtension = file.mimetype.split('/')[1];
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif'];

    if (!allowedExtensions.includes(fileExtension)) {
        return callback(new Error('Invalid file type'), false);
    }

    callback(null, true);

}