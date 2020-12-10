const fsp = require('fs').promises;
const path = require('path');
const {createGzip} = require('zlib');
const {pipeline} = require('stream');
const readline = require('readline');
const {
    createReadStream,
    createWriteStream
} = require('fs');
const gzip = createGzip();


function create(filePath) {
    if (!gzReg.test(filePath)) {
        const source = createReadStream(filePath);
        const destination = createWriteStream(filePath + '.gz');
        pipeline(source, gzip, destination, (err) => {
            if (err) {
                console.error('An error occurred:', err);
                process.exitCode = 1;
            }
        });
    }
}


const gzReg = new RegExp('\.gz$');


async function compress(pathValue) {

    const contentFolder = await fsp.readdir(pathValue);
    for (let i = 0; i < contentFolder.length; i++) {
        const contentFolderPath = path.join(pathValue, contentFolder[i]);
        const stat = await fsp.stat(contentFolderPath);
        if (stat.isFile()) {
            const gzFile = contentFolder.find(content => contentFolder[i] + '.gz' === content);
            if (gzFile) {
                const gzFileStat = await fsp.stat(path.join(pathValue, gzFile));
                if (stat.mtimeMs > gzFileStat.mtimeMs) {
                    create(contentFolderPath, stat);
                }
            } else {
                create(contentFolderPath, stat);
            }
        } else {
            await compress(contentFolderPath);
        }
    }

}
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'enter folder path> '
});

rl.prompt();
rl.on('line', path => {

    if (!path) {
        console.log('FAIL');
        rl.close();
    } else {
        compress(path)
            .then(() => {
                console.log('DONE');
                rl.close();
            })
            .catch(() => {
                console.log('FAIL');
                rl.close();
            });
    }

});

rl.on('close', () => {
    process.exit(0);
});
