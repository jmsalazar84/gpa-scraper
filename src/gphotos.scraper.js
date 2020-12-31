const puppeteer = require('puppeteer');
const axios = require('axios');
const evaluators = require('./gphotos.evaluator');
const ora = require('ora');
const logger = require('./factory').createLogger('gphotos-scraper');

const getMetadata = async (photoId, key) => {
  logger.debug(`getMetadata`, { photoId, key });
  const rpcid = 'fDcn4b';
  const bodyData = `f.req=%5B%5B%5B%22${rpcid}%22,%22%5B%5C%22${photoId}%5C%22,1,%5C%22${key}%5C%22%5D%22,null,%221%22%5D%5D%5D%5D`;
  const res = await axios.post(
    'https://photos.google.com/_/PhotosUi/data/batchexecute',
    bodyData,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
    }
  );
  let data = res.data.replace(`)]}'`, '');
  data = JSON.parse(data);
  data = JSON.parse(data[0][2]);
  const [id, description, name, createdAt, tmp1, size, width, height] = data[0];

  return {
    id,
    description,
    name,
    createdAt,
    size,
    width,
    height,
  };
};

module.exports = {
  start: async (url, repository) => {
    const spinner = ora('Loading resources').start();

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
    });
    spinner.text = 'Scraping gphotos album';
    const list = await page.evaluate(evaluators.getPhotoList);
    const albumData = await page.evaluate(evaluators.albumData);

    const albumDto = {
      id: albumData.id,
      url,
      name: albumData.name,
    };
    let album = await repository.getAlbumById(albumData.id);
    if (album) {
      album = await repository.updateAlbum(album.id, albumDto);
    } else {
      album = await repository.createAlbum(albumDto);
    }

    logger.info(`${list.length} photos found`);
    let index = 0;
    for await (const item of list) {
      index++;
      const { id, url } = item;
      spinner.text = `processing ${index}/${list.length}`;

      const photo = await repository.getPhoto(id);
      // console.log(`photo`, photo);
      if (!photo) {
        const metadata = await getMetadata(id, albumData.key);
        const { description, name, createdAt, size, width, height } = metadata;
        await repository.createPhoto(album, {
          id,
          url,
          description,
          name,
          createdAt,
          size,
          width,
          height,
        });
        spinner.text = `found ${name}`;
      } else {
        logger.debug(`photo already parsed`, {
          id: photo.id,
          name: photo.name,
        });
      }
    }

    await browser.close();
    if (spinner.isSpinning) {
      spinner.succeed('done');
    }
  },
};
