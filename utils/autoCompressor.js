const fsp = require('fs').promises;
const path = require('path');
const {createGzip} = require('zlib');
const {pipeline} = require('stream');
const readline = require('readline');
const {
    createReadStream,
    createWriteStream
} = require('fs');


function create(filePath) {
    return new Promise((resolve, reject) => {
        const source = createReadStream(filePath);
        const gzip = createGzip();
        const destination = createWriteStream(filePath + '.gz');
        pipeline(source, gzip, destination, (err) => {
            if (err) {
                process.exitCode = 1;
                return reject(err);
            } else {
                process.exitCode = 1;
                return resolve('success');
            }
        });
    });
}


const gzReg = new RegExp('\.gz$');


async function compress(pathValue) {
    console.log(`dist ${pathValue} start process`);
    const contentFolder = await fsp.readdir(pathValue);
    for (let i = 0; i < contentFolder.length; i++) {
        const contentFolderPath = path.join(pathValue, contentFolder[i]);
        const stat = await fsp.stat(contentFolderPath);
        if (stat.isFile()) {
            const gzFile = contentFolder.find(content => contentFolder[i] + '.gz' === content);
            if (gzFile) {
                const gzFileStat = await fsp.stat(path.join(pathValue, gzFile));
                if (stat.mtimeMs > gzFileStat.mtimeMs) {
                    console.log(`file ${contentFolderPath} modified, start gzipe`);
                    const result = await create(contentFolderPath);
                    if (result) {
                        console.log(`file ${contentFolderPath} gziped with ${result}`);
                    }
                } else {
                    console.log(`file ${contentFolderPath} has relevant gz`);
                }
            } else if (!gzReg.test(contentFolderPath)) {
                console.log(`file ${contentFolderPath} haven't gz, start gzipe`);
                const result = await create(contentFolderPath);
                if (result) {
                    console.log(`file ${contentFolderPath} gziped`);
                }
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
            .catch((e) => {
                console.log('FAIL', e);
                rl.close();
            });
    }

});

rl.on('close', () => {
    process.exit(0);
});
